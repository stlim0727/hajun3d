#!/usr/bin/env node
/**
 * Remove stale headless-browser profile directories from the OS temp dir.
 * Each browser session gets a fresh profile; crashed or killed runs leave
 * them behind until tmpfs per-user quotas fill. Profiles still referenced by
 * a running process, owned by another user, or younger than the age limit
 * are kept.
 */
import { execFileSync } from 'node:child_process';
import { readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROFILE_PREFIXES = ['flight3d-', 'hajun-cdp-', 'hajun-ui-screens-'];

function parseArgs(argv) {
  let dryRun = false;
  let olderThanHours = 2;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--older-than-hours=')) {
      const value = Number(arg.slice('--older-than-hours='.length));
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid --older-than-hours: ${arg}`);
      olderThanHours = value;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/clean-temp-profiles.mjs [--dry-run] [--older-than-hours=N]');
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return { dryRun, olderThanHours };
}

function activeProfilePaths() {
  for (const args of [['-eo', 'args='], ['-axo', 'command=']]) {
    try {
      const out = execFileSync('ps', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      return new Set([...out.matchAll(/--?user-data-dir=(\S+)/g)].map((match) => match[1]));
    } catch {
      // Try the other platform's ps syntax.
    }
  }
  return new Set();
}

async function directoryBytes(root) {
  let total = 0;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile()) {
        try {
          total += (await stat(child)).size;
        } catch {
          // Vanished mid-scan; nothing to account for.
        }
      }
    }
  }
  return total;
}

async function main() {
  const { dryRun, olderThanHours } = parseArgs(process.argv.slice(2));
  const tmp = tmpdir();
  const active = activeProfilePaths();
  const cutoff = Date.now() - olderThanHours * 3600_000;
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  let removed = 0;
  let skipped = 0;
  let freed = 0;

  for (const entry of await readdir(tmp, { withFileTypes: true })) {
    if (!entry.isDirectory() || !PROFILE_PREFIXES.some((prefix) => entry.name.startsWith(prefix))) continue;
    const path = join(tmp, entry.name);
    if (active.has(path)) continue;

    let info;
    try {
      info = await stat(path);
    } catch {
      continue;
    }
    if (uid !== null && info.uid !== uid) continue;
    if (info.mtimeMs > cutoff) continue;

    if (dryRun) {
      console.log(`would remove ${path}`);
      removed += 1;
      continue;
    }
    const bytes = await directoryBytes(path);
    try {
      await rm(path, { recursive: true, force: true });
      removed += 1;
      freed += bytes;
    } catch {
      skipped += 1;
    }
  }

  const verb = dryRun ? 'Would remove' : 'Removed';
  const size = dryRun ? '' : `, freed ${(freed / 1073741824).toFixed(2)} GB`;
  console.log(`${verb} ${removed} stale browser profile(s)${size}; ${skipped} skipped.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
