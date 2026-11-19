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

test('MODEL_CATALOG includes a320_detailed, a320_simplified, and a350 with existing model files', () => {
  const viewerJs = readFileSync('web/js/glb_viewer.js', 'utf8');

  assert.ok(viewerJs.includes("id: 'a320_detailed'"), 'a320_detailed should be in MODEL_CATALOG');
  assert.ok(viewerJs.includes("id: 'a320_simplified'"), 'a320_simplified should be in MODEL_CATALOG');
  assert.ok(viewerJs.includes("id: 'a350'"), 'a350 should be in MODEL_CATALOG');

  assert.ok(existsSync('web/models/a320_detailed.glb'), 'web/models/a320_detailed.glb must exist');
  assert.ok(existsSync('web/models/a320_simplified.glb'), 'web/models/a320_simplified.glb must exist');
  assert.ok(existsSync('web/models/a350.glb'), 'web/models/a350.glb must exist');
  assert.ok(existsSync('web/assets/models/a320_detailed.glb'), 'web/assets/models/a320_detailed.glb must exist');
  assert.ok(existsSync('web/assets/models/a320_simplified.glb'), 'web/assets/models/a320_simplified.glb must exist');
  assert.ok(existsSync('web/assets/models/a350.glb'), 'web/assets/models/a350.glb must exist');
});

test('a320_detailed, a320_simplified, and a350 are valid GLB 2.0 binaries with realistic dimensions', () => {
  const detailed = getGLBHeader('web/models/a320_detailed.glb');
  const simplified = getGLBHeader('web/models/a320_simplified.glb');
  const a350 = getGLBHeader('web/models/a350.glb');

  // Verify glTF 2.0 binary headers
  assert.equal(detailed.magic, 0x46546C67);
  assert.equal(detailed.version, 2);
  assert.equal(detailed.totalLength, detailed.fileSize);

  assert.equal(simplified.magic, 0x46546C67);
  assert.equal(simplified.version, 2);
  assert.equal(simplified.totalLength, simplified.fileSize);

  assert.equal(a350.magic, 0x46546C67);
  assert.equal(a350.version, 2);
  assert.equal(a350.totalLength, a350.fileSize);

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
  assert.ok(simplifiedTris > 50000 && simplifiedTris < 150000, `Simplified model should be 50k-150k tris (got ${simplifiedTris})`);
  assert.ok(simplified.fileSize < 4000 * 1024, `Simplified model should be under 4MB (got ${(simplified.fileSize / 1024).toFixed(1)} KB)`);
});

test('glb_viewer enables logarithmicDepthBuffer and polygonOffset to prevent window flickering', () => {
  const viewerJs = readFileSync('web/js/glb_viewer.js', 'utf8');
  assert.ok(viewerJs.includes('logarithmicDepthBuffer: true'), 'Viewer must enable logarithmicDepthBuffer for sub-millimeter depth accuracy');
  assert.ok(viewerJs.includes('polygonOffset = true'), 'Viewer must apply polygonOffset to eliminate window flickering');
});

test('a320_simplified and a350 are packed into offline GLB_BUNDLE for instant loading', () => {
  const bundleJs = readFileSync('web/glb_bundle.js', 'utf8');
  assert.ok(bundleJs.includes('a320_simplified'), 'a320_simplified must be packed in GLB_BUNDLE');
  assert.ok(bundleJs.includes('a350'), 'a350 must be packed in GLB_BUNDLE');
});

test('GLBMovingPartsController provides shared moving parts and gallery demo loop without code duplication', () => {
  const html = readFileSync('web/glb-viewer.html', 'utf8');
  assert.ok(html.includes('js/glb_pipeline.js'), 'glb-viewer.html must load js/glb_pipeline.js');
  assert.ok(html.includes('js/glb_viewer.js'), 'glb-viewer.html must load js/glb_viewer.js');

  const pipelineJs = readFileSync('web/js/glb_pipeline.js', 'utf8');
  assert.ok(pipelineJs.includes('class GLBMovingPartsController'), 'glb_pipeline.js must define GLBMovingPartsController');
  assert.ok(pipelineJs.includes('window.GLBMovingParts = GLBMovingPartsController'), 'Must export window.GLBMovingParts');
  assert.ok(pipelineJs.includes('normalizeAircraftScene'), 'Must provide static normalizeAircraftScene');
  assert.ok(pipelineJs.includes('createTurbofanFan'), 'Must provide static createTurbofanFan');
  assert.ok(pipelineJs.includes('createGLBLandingGear'), 'Must provide static createGLBLandingGear');

  const viewerJs = readFileSync('web/js/glb_viewer.js', 'utf8');
  assert.ok(viewerJs.includes('this.movingPartsController = new window.GLBMovingParts'), 'glb_viewer must instantiate GLBMovingParts');
  assert.ok(viewerJs.includes('demoLoop: true'), 'glb_viewer must set demoLoop: true');
  assert.ok(viewerJs.includes('this.movingPartsController.update(dt)'), 'glb_viewer animate must update movingPartsController');
});
