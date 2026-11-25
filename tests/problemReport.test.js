import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadProblemReportEnv() {
  const storage = new Map([
    ['flight3d.renderQuality', 'high'],
    ['flight3d.aircraft', 'a320'],
    ['flight3d_client_id', 'secret-client-id'],
    ['ph_phc_token_posthog', 'secret-posthog'],
    ['flight3d.bookmarks.v1', '[{"name":"home"}]'],
    ['hajun-airline-skin', 'korean-air'],
  ]);

  class AirplaneGame {}
  const listeners = new Map();
  const sandbox = {
    AirplaneGame,
    window: null,
    globalThis: null,
    location: { href: 'https://stlim0727.github.io/hajun3d/' },
    navigator: { userAgent: 'TestAgent', platform: 'Linux', language: 'ko-KR', onLine: true },
    screen: { width: 384, height: 832 },
    innerWidth: 384,
    innerHeight: 646,
    devicePixelRatio: 2,
    performance: { memory: { usedJSHeapSize: 100, totalJSHeapSize: 200, jsHeapSizeLimit: 300 } },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      key: (i) => Array.from(storage.keys())[i],
      get length() { return storage.size; },
    },
    document: {
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => ({ click: () => {}, style: {}, appendChild: () => {} }),
      body: { appendChild: () => {}, removeChild: () => {} },
    },
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => {},
    },
    Blob: class MockBlob {
      constructor(parts) { this.parts = parts; }
    },
    TextEncoder,
    TextDecoder,
    DOMException: globalThis.DOMException || Error,
    atob: globalThis.atob,
    Uint8Array,
    Uint32Array,
    DataView,
    setTimeout: () => 0,
    console: { log: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    addEventListener: (name, fn) => listeners.set(name, fn),
    Math,
  };
  // Make Object.keys(localStorage) return our test keys
  for (const key of storage.keys()) {
    Object.defineProperty(sandbox.localStorage, key, { enumerable: true, value: storage.get(key) });
  }
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/three_core_bundle.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/problem_report.js', 'utf8'), sandbox);
  return sandbox;
}

test('collectProblemReportData includes camera, render origin, attitude, tilesStats, rendererInfo, and safe settings', () => {
  const sandbox = loadProblemReportEnv();
  const { AirplaneGame, THREE, HajunGeoTiles } = sandbox;
  const game = new AirplaneGame();

  const scene = new THREE.Scene();
  scene.position.set(-160, -145, 1359);
  const camera = new THREE.PerspectiveCamera(72, 384 / 646, 1.2, 70000);
  camera.position.set(0, 2.5, 49.4);
  camera.rotation.set(0.05, 0, 0);
  camera.updateMatrixWorld();

  const renderer = {
    getPixelRatio: () => 1.5,
    getDrawingBufferSize: (v) => v.set(384, 646),
    getSize: (v) => v.set(384, 646),
    getContext: () => null,
    info: {
      render: { calls: 42, triangles: 12345, lines: 0, points: 0 },
      memory: { geometries: 18, textures: 9 },
      programs: [{}, {}],
    },
  };

  game.scene = scene;
  game.camera = camera;
  game.renderer = renderer;
  game.geoAnchor = { lat: 35.165, lon: 128.939, headingDeg: 353.9, height: 33.25 };
  game.renderOrigin = new THREE.Vector3(160, 145, -1359);
  game.planeGroup = new THREE.Group();
  game.planeGroup.position.set(160, 145, -1359);
  game.planeGroup.rotation.set(10 * Math.PI / 180, 0, -5 * Math.PI / 180);
  game.groundY = 6.84;
  game.speed = 1.35;
  game.velocity = new THREE.Vector3(0, 14, -106);

  game.geoLayer = HajunGeoTiles.create({
    ionToken: 'test-token',
    lat: 35.165,
    lon: 128.939,
    height: 33.25,
    azimuth: 173.9,
    simAnchor: { x: 160, y: 0, z: 1600 },
    nearAnchorMaxDepth: 17,
    scene,
    camera,
    renderer,
  });

  const report = JSON.parse(JSON.stringify(game.collectProblemReportData()));

  assert.deepEqual(report.geo.renderOrigin, { x: 160, y: 145, z: -1359 });
  assert.deepEqual(report.geo.scenePosition, { x: -160, y: -145, z: 1359 });
  assert.deepEqual(report.geo.camera.position, { x: 0, y: 2.5, z: 49.4 });
  assert.deepEqual(report.geo.camera.matrixWorldPosition, { x: 0, y: 2.5, z: 49.4 });
  assert.equal(report.geo.camera.fov, 72);
  assert.ok(report.geo.geoTilesDebug.tilesStats, 'geoTilesDebug.tilesStats should be present');
  assert.equal(report.geo.geoTilesDebug.errorTarget, 16);

  assert.equal(report.flight.pitchDeg, 10);
  assert.equal(report.flight.rollDeg, -5);
  assert.equal(report.flight.headingDeg, 353.9);
  assert.equal(report.flight.altitudeM, 145);
  assert.equal(report.flight.aglM, 138.16);
  assert.equal(report.flight.iasKmh, 378);

  assert.equal(report.environment.rendererInfo.calls, 42);
  assert.equal(report.environment.rendererInfo.triangles, 12345);
  assert.equal(report.environment.rendererInfo.programs, 2);
  assert.equal(report.environment.rendererInfo.pixelRatio, 1.5);

  assert.equal(report.environment.settings['flight3d.renderQuality'], 'high');
  assert.equal(report.environment.settings['hajun-airline-skin'], 'korean-air');
  assert.equal(report.environment.settings['flight3d_client_id'], undefined);
  assert.equal(report.environment.settings['ph_phc_token_posthog'], undefined);
  assert.equal(report.environment.settings['flight3d.bookmarks.v1'], undefined);

  game.geoLayer.dispose();
});

test('downloadProblemReport captures screenshot before serializing ui-layout.json so UI rects are non-empty', () => {
  const sandbox = loadProblemReportEnv();
  const { AirplaneGame } = sandbox;
  const game = new AirplaneGame();

  const callOrder = [];
  let capturedArchive = null;
  sandbox.Blob = class CaptureBlob {
    constructor(parts) { capturedArchive = parts[0]; }
  };

  game.showPopup = () => {};
  game.collectProblemReportData = function () {
    callOrder.push('collect');
    return { geo: {}, flight: {}, environment: {}, logs: [] };
  };
  game.captureProblemScreenshot = function () {
    callOrder.push('screenshot');
    this._lastCapturedUIRects = [{ id: 'hud-test', left: 10, top: 20, width: 100, height: 40, text: 'HDG 354' }];
    return 'data:image/png;base64,iVBORw0KGgo=';
  };

  const result = game.downloadProblemReport();
  assert.ok(result && result.screenshot);
  assert.deepEqual(callOrder, ['collect', 'screenshot']);

  const zipText = Buffer.from(capturedArchive).toString('utf8');
  assert.ok(zipText.includes('"id": "hud-test"'), 'ui-layout.json in ZIP must include freshly captured UI rects');
});
