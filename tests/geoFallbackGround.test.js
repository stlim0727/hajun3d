import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadTiles() {
  const sandbox = {
    window: {},
    document: {
      createElement: () => ({ style: {}, appendChild: () => {} }),
    },
    location: { protocol: 'https:', hostname: 'stlim0727.github.io' },
    DOMException: globalThis.DOMException || Error,
    TextDecoder: globalThis.TextDecoder,
    TextEncoder: globalThis.TextEncoder,
    URL: globalThis.URL,
    fetch: () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
    console,
    Math,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/three_core_bundle.js', 'utf8'), sandbox);
  return { HajunGeoTiles: sandbox.HajunGeoTiles, THREE: sandbox.THREE };
}

test('HajunGeoTiles creates neutral ground and ocean planes at worldAnchor and disposes them cleanly', () => {
  const { HajunGeoTiles, THREE } = loadTiles();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const renderer = {
    getPixelRatio: () => 1,
    getDrawingBufferSize: (v) => v.set(384, 646),
    getSize: (v) => v.set(384, 646),
  };

  const worldAnchor = { x: 160, y: 0, z: 1600 };
  const renderAnchor = { x: 160 - 100, y: 0, z: 1600 - 500 };
  const layer = HajunGeoTiles.create({
    ionToken: 'test-token',
    lat: 35.165199,
    lon: 128.938995,
    height: 33.25,
    azimuth: 173.9,
    simAnchor: worldAnchor,
    worldAnchor,
    simAnchorRender: renderAnchor,
    nearAnchorMaxDepth: 17,
    scene,
    camera,
    renderer,
  });

  assert.ok(layer, 'Layer should be created');

  const fallbackGround = scene.getObjectByName('GeoFallbackGround');
  assert.ok(fallbackGround, 'GeoFallbackGround must be added to scene');
  assert.equal(fallbackGround.position.x, 160);
  assert.equal(fallbackGround.position.y, -2.0);
  assert.equal(fallbackGround.position.z, 1600);
  assert.equal(fallbackGround.material.polygonOffset, true);

  const fallbackWater = scene.getObjectByName('GeoFallbackWater');
  assert.ok(fallbackWater, 'GeoFallbackWater must be added to scene');
  assert.equal(fallbackWater.position.x, 160);
  assert.equal(fallbackWater.position.y, -3.5);
  assert.equal(fallbackWater.position.z, 1600);

  // Verification of dispose
  layer.dispose();
  assert.equal(scene.getObjectByName('GeoFallbackGround'), undefined);
  assert.equal(scene.getObjectByName('GeoFallbackWater'), undefined);
});

test('HajunGeoTiles update compares camera against render-frame anchors without drift', () => {
  const { HajunGeoTiles, THREE } = loadTiles();
  const scene = new THREE.Scene();
  scene.position.set(-500, 0, 1000); // scene shifted by -renderOrigin
  const camera = new THREE.PerspectiveCamera();
  const renderer = {
    getPixelRatio: () => 1,
    getDrawingBufferSize: (v) => v.set(384, 646),
    getSize: (v) => v.set(384, 646),
  };

  const worldAnchor = { x: 160, y: 0, z: 1600 };
  const renderAnchor = { x: 160 - 500, y: 0, z: 1600 + 1000 };
  const layer = HajunGeoTiles.create({
    ionToken: 'test-token',
    lat: 35.165199,
    lon: 128.938995,
    height: 33.25,
    azimuth: 173.9,
    simAnchor: worldAnchor,
    worldAnchor,
    simAnchorRender: renderAnchor,
    nearAnchorMaxDepth: 17,
    scene,
    camera,
    renderer,
  });

  // When camera is close to anchor in render frame
  camera.position.set(renderAnchor.x + 10, 50, renderAnchor.z + 10);
  layer.update();
  assert.equal(layer.debug().maxDepth, 17, 'maxDepth should be 17 when near anchor in render frame');

  // When camera moves far away
  camera.position.set(renderAnchor.x + 20000, 50, renderAnchor.z + 20000);
  layer.update();
  assert.equal(layer.debug().maxDepth, 0, 'maxDepth should be 0 when far from anchor');

  layer.dispose();
});

test('three_core_bundle embeds a single unified Three.js instance with no duplicate three.core.js', () => {
  const bundleSrc = readFileSync('web/js/three_core_bundle.js', 'utf8');
  const coreMatches = bundleSrc.match(/\/\/ .*three\/build\/three\.core\.js/g) || [];
  assert.equal(coreMatches.length, 1, `Expected exactly 1 three.core.js in bundle, found ${coreMatches.length}: ${coreMatches.join(', ')}`);
  assert.ok(!bundleSrc.includes('var REVISION2 ='), 'Bundle must not contain duplicate Three.js REVISION2');
});

test('HajunGeoTiles.update refreshes scene and camera world matrices after floating-origin shift following camera.lookAt', () => {
  const { HajunGeoTiles, THREE } = loadTiles();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 384 / 646, 1.2, 70000);
  const renderer = {
    getPixelRatio: () => 1,
    getDrawingBufferSize: (v) => v.set(384, 646),
    getSize: (v) => v.set(384, 646),
  };

  const worldAnchor = { x: 160, y: 0, z: 1600 };
  const layer = HajunGeoTiles.create({
    ionToken: 'test-token',
    lat: 35.165199,
    lon: 128.938995,
    height: 33.25,
    azimuth: 173.9,
    simAnchor: worldAnchor,
    worldAnchor,
    nearAnchorMaxDepth: 17,
    scene,
    camera,
    renderer,
  });

  // Simulate updateCameraFromPhysics() calling camera.lookAt() in world space,
  // which bakes world-space position into camera.matrixWorld / matrixWorldInverse.
  camera.position.set(160, 111.5, -1061);
  camera.lookAt(160, 113.5, -1150);
  assert.equal(Math.round(camera.matrixWorld.elements[14]), -1061);

  // Simulate applyFloatingOrigin() shifting scene and camera into render space.
  scene.position.set(-160, -109, 1110);
  camera.position.set(0, 2.5, 49);

  // layer.update() must refresh world matrices before TilesRenderer traversal.
  layer.update();

  assert.ok(Math.abs(camera.matrixWorld.elements[12] - 0) < 1e-6);
  assert.ok(Math.abs(camera.matrixWorld.elements[13] - 2.5) < 1e-6);
  assert.ok(Math.abs(camera.matrixWorld.elements[14] - 49) < 1e-6);

  const tilesGroup = scene.children.find((c) => c && c.isTilesGroup);
  assert.ok(tilesGroup, 'TilesGroup should be in scene');
  assert.ok(Math.abs(tilesGroup.matrixWorld.elements[14] - 1110) < 1e-6);

  const coreSrc = readFileSync('web/js/core.js', 'utf8');
  const applyStart = coreSrc.indexOf('applyFloatingOrigin() {');
  const applySlice = coreSrc.slice(applyStart, applyStart + 1800);
  assert.ok(applySlice.includes('this.scene.updateMatrixWorld()'), 'applyFloatingOrigin must refresh scene.matrixWorld');
  assert.ok(applySlice.includes('this.camera.updateMatrixWorld()'), 'applyFloatingOrigin must refresh camera.matrixWorld');

  layer.dispose();
});
