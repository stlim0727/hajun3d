import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function getGLBHeader(filePath) {
  const buf = readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const totalLength = buf.readUInt32LE(8);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  const jsonStr = buf.subarray(20, 20 + jsonChunkLen).toString('utf8');
  const gltf = JSON.parse(jsonStr);

  return { magic, version, totalLength, fileSize: buf.length, jsonChunkType, gltf };
}

test('MODEL_CATALOG includes a320_detailed and a320_simplified with existing model files', () => {
  const viewerJs = readFileSync('web/js/glb_viewer.js', 'utf8');

  assert.ok(viewerJs.includes("id: 'a320_detailed'"), 'a320_detailed should be in MODEL_CATALOG');
  assert.ok(viewerJs.includes("id: 'a320_simplified'"), 'a320_simplified should be in MODEL_CATALOG');

  assert.ok(existsSync('web/models/a320_detailed.glb'), 'web/models/a320_detailed.glb must exist');
  assert.ok(existsSync('web/models/a320_simplified.glb'), 'web/models/a320_simplified.glb must exist');
  assert.ok(existsSync('web/assets/models/a320_detailed.glb'), 'web/assets/models/a320_detailed.glb must exist');
  assert.ok(existsSync('web/assets/models/a320_simplified.glb'), 'web/assets/models/a320_simplified.glb must exist');
});

test('a320_detailed and a320_simplified are valid GLB 2.0 binaries with realistic dimensions', () => {
  const detailed = getGLBHeader('web/models/a320_detailed.glb');
  const simplified = getGLBHeader('web/models/a320_simplified.glb');

  // Verify glTF 2.0 binary headers
  assert.equal(detailed.magic, 0x46546C67);
  assert.equal(detailed.version, 2);
  assert.equal(detailed.totalLength, detailed.fileSize);

  assert.equal(simplified.magic, 0x46546C67);
  assert.equal(simplified.version, 2);
  assert.equal(simplified.totalLength, simplified.fileSize);

  // Check polygon count reduction
  let detailedTris = 0;
  for (const m of detailed.gltf.meshes) {
    for (const p of m.primitives) {
      if (p.indices !== undefined) detailedTris += detailed.gltf.accessors[p.indices].count / 3;
    }
  }

  let simplifiedTris = 0;
  for (const m of simplified.gltf.meshes) {
    for (const p of m.primitives) {
      if (p.indices !== undefined) simplifiedTris += simplified.gltf.accessors[p.indices].count / 3;
    }
  }

  assert.ok(detailedTris > 700000, `Detailed model should preserve >700k tris (got ${detailedTris})`);
  assert.ok(simplifiedTris > 15000 && simplifiedTris < 30000, `Simplified model should be 15k-30k tris (got ${simplifiedTris})`);
  assert.ok(simplified.fileSize < 1000 * 1024, `Simplified model should be under 1MB (got ${(simplified.fileSize / 1024).toFixed(1)} KB)`);
});

test('a320_simplified is packed into offline GLB_BUNDLE for instant loading', () => {
  const bundleJs = readFileSync('web/glb_bundle.js', 'utf8');
  assert.ok(bundleJs.includes('a320_simplified'), 'a320_simplified must be packed in GLB_BUNDLE');
});
