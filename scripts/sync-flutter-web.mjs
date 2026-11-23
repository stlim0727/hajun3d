#!/usr/bin/env node
// Synchronizes runtime web assets from web/ into flutter_app/assets/web/.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_FILES = ['index.html', 'glb-viewer.html', 'style.css', 'game.js', 'glb_bundle.js', 'tile_decode_worker.js'];
export const DYNAMIC_FILES = new Set(['js/build_info.js']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, '..');

/**
 * Return runtime asset paths relative to `web/` that must stay mirrored inside
 * `flutter_app/assets/web/`. Excludes dev/CI showcase screenshots and preview pages.
 */
export function collectSyncEntries(rootDir = DEFAULT_ROOT) {
  const entries = [...ROOT_FILES];
  const jsDir = path.join(rootDir, 'web', 'js');
  const jsFiles = readdirSync(jsDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
    .map(dirent => `js/${dirent.name}`)
    .sort();
  return [...entries, ...jsFiles];
}

export function syncFlutterWebAssets(rootDir = DEFAULT_ROOT, { checkOnly = false } = {}) {
  const webRoot = path.join(rootDir, 'web');
  const flutterRoot = path.join(rootDir, 'flutter_app', 'assets', 'web');
  const entries = collectSyncEntries(rootDir);
  const issues = [];
  let updated = 0;
  let unchanged = 0;

  for (const rel of entries) {
    const src = path.join(webRoot, rel);
    const dst = path.join(flutterRoot, rel);
    if (!existsSync(src)) {
      throw new Error(`Missing source asset: ${path.relative(rootDir, src)}`);
    }

    const dstExists = existsSync(dst);
    const sameBytes = dstExists && readFileSync(src).equals(readFileSync(dst));

    if (checkOnly) {
      if (!dstExists) {
        issues.push(`missing: flutter_app/assets/web/${rel}`);
      } else if (!DYNAMIC_FILES.has(rel) && !sameBytes) {
        issues.push(`drifted: flutter_app/assets/web/${rel}`);
      }
      continue;
    }

    if (sameBytes) {
      unchanged++;
      continue;
    }

    mkdirSync(path.dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    updated++;
  }

  return { entries, issues, updated, unchanged };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const { entries, issues, updated, unchanged } = syncFlutterWebAssets(DEFAULT_ROOT, { checkOnly });

  if (checkOnly) {
    if (issues.length) {
      console.error('Flutter WebView assets are out of sync with web/:');
      for (const issue of issues) console.error(`  - ${issue}`);
      console.error('Run `npm run sync:flutter` to update flutter_app/assets/web/.');
      process.exitCode = 1;
      return;
    }
    console.log(`✔ flutter_app/assets/web/ matches web/ (${entries.length} runtime files checked)`);
    return;
  }

  console.log(`✔ Synced flutter_app/assets/web/ with web/ (${updated} updated, ${unchanged} unchanged, ${entries.length} total)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
