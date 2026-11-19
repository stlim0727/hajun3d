import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const defaultInput = join(process.env.HOME || '/home/stlim', 'fff', 'airbus_a320-200.glb');
const inputPath = process.argv[2] ? resolve(process.argv[2]) : defaultInput;

if (!existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

console.log(`✈️ Source Model: ${inputPath}`);

// Helper to transform GLB root node: rotation +90 deg around Y, scale 0.209364 for real A320 meters
function applyA320Transform(rawGlbPath, outGlbPath) {
  const buf = readFileSync(rawGlbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));

  if (!gltf.nodes || gltf.nodes.length === 0) {
    throw new Error('No nodes found in GLB');
  }

  // +90 deg around Y (nose -Z, tail +Z, wings on X) & scale to real-world meters
  gltf.nodes[0].rotation = [0, 0.70710678, 0, 0.70710678];
  gltf.nodes[0].scale = [0.209364, 0.209364, 0.209364];

  const newJsonStr = JSON.stringify(gltf);
  const padLen = (4 - (newJsonStr.length % 4)) % 4;
  const paddedJsonStr = newJsonStr + ' '.repeat(padLen);
  const newJsonBuf = Buffer.from(paddedJsonStr, 'utf8');

  const binChunkOffset = 20 + jsonLen;
  const binChunk = buf.subarray(binChunkOffset);

  const totalLen = 12 + 8 + newJsonBuf.length + binChunk.length;
  const outBuf = Buffer.alloc(totalLen);
  outBuf.writeUInt32LE(0x46546C67, 0); // 'glTF'
  outBuf.writeUInt32LE(2, 4);          // version 2
  outBuf.writeUInt32LE(totalLen, 8);
  outBuf.writeUInt32LE(newJsonBuf.length, 12);
  outBuf.writeUInt32LE(0x4E4F534A, 16); // 'JSON'
  newJsonBuf.copy(outBuf, 20);
  binChunk.copy(outBuf, 20 + newJsonBuf.length);

  writeFileSync(outGlbPath, outBuf);
}

const detailedRaw = join(projectRoot, 'web', 'models', '.tmp_a320_detailed_raw.glb');
const detailedFinal = join(projectRoot, 'web', 'models', 'a320_detailed.glb');

const simplifiedRaw = join(projectRoot, 'web', 'models', '.tmp_a320_simplified_raw.glb');
const simplifiedFinal = join(projectRoot, 'web', 'models', 'a320_simplified.glb');

try {
  // 1. Detailed Model: Full geometry (732k tris), merged primitives for draw call optimization
  console.log('📦 Generating A320 Detailed Model (100% polygons)...');
  execSync(`npx -y gltfpack -i "${inputPath}" -o "${detailedRaw}" -noq -mm`, { stdio: 'inherit' });
  applyA320Transform(detailedRaw, detailedFinal);
  console.log(`✅ A320 Detailed Model created: ${detailedFinal} (${(readFileSync(detailedFinal).length / 1024).toFixed(1)} KB)`);

  // 2. Simplified Model: Meshoptimizer QEM decimation (-r 0.03, ~21k tris)
  console.log('📦 Generating A320 Simplified Model (QEM decimation -r 0.03)...');
  execSync(`npx -y gltfpack -i "${inputPath}" -o "${simplifiedRaw}" -si 0.03 -sa -noq -mm`, { stdio: 'inherit' });
  applyA320Transform(simplifiedRaw, simplifiedFinal);
  console.log(`✅ A320 Simplified Model created: ${simplifiedFinal} (${(readFileSync(simplifiedFinal).length / 1024).toFixed(1)} KB)`);

  // 3. Mirror to other model asset directories
  const targetDirs = [
    join(projectRoot, 'web', 'assets', 'models'),
    join(projectRoot, 'flutter_app', 'assets', 'web', 'models'),
    join(projectRoot, 'flutter_app', 'assets', 'web', 'assets', 'models')
  ];

  for (const dir of targetDirs) {
    if (existsSync(dir)) {
      copyFileSync(detailedFinal, join(dir, 'a320_detailed.glb'));
      copyFileSync(simplifiedFinal, join(dir, 'a320_simplified.glb'));
      console.log(`📋 Mirrored A320 models to ${dir}`);
    }
  }
} finally {
  if (existsSync(detailedRaw)) unlinkSync(detailedRaw);
  if (existsSync(simplifiedRaw)) unlinkSync(simplifiedRaw);
}
