// Check tracked application/tooling JavaScript without executing browser code.
import { execFileSync, spawnSync } from 'node:child_process';

const files = execFileSync('git', [
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '-z',
  '--',
  'web/js',
  'web/game.js',
  'scripts',
  'tests'
], { encoding: 'utf8' })
  .split('\0')
  .filter(file => file && /\.m?js$/.test(file) && !file.includes('glb_bundle.js'));

if (!files.length) {
  throw new Error('No JavaScript files found to check; ensure git tracking and correct paths.');
}

let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) failures++;
}

console.log(`Syntax checked ${files.length} JavaScript files; failures: ${failures}`);
if (failures) process.exitCode = 1;
