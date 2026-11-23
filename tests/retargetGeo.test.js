import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadCore() {
  const sandbox = {
    window: {},
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console,
    Math,
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/core.js', 'utf8'), sandbox);
  return { AirplaneGame: vm.runInContext('AirplaneGame', sandbox), window: sandbox.window };
}

test('retargetGeo disposes the old layer/provider and re-anchors tiles and physics', () => {
  const { AirplaneGame, window } = loadCore();
  window.GEO_ANCHOR = { lat: 35.165199, lon: 128.938995, headingDeg: 353.9, height: 33.25 };

  let createdOptions = null;
  let providerConfig = null;
  let oldLayerDisposed = false;
  let oldProviderDisposed = false;
  window.HajunGeoTiles = {
    create(options) {
      createdOptions = options;
      return { update() {}, dispose() {} };
    },
  };
  window.TerrainProvider = {
    createExactFrameTerrariumProvider(config) {
      providerConfig = config;
      return { dispose() {} };
    },
    createBrowserTileLoader() { return async () => new Uint8Array(0); },
  };

  const game = Object.create(AirplaneGame.prototype);
  game.scene = {};
  game.camera = {};
  game.renderer = {};
  game.container = null;
  game.planeGroup = { position: { x: -243337, z: 155399 } };
  game.geoAnchor = { ...window.GEO_ANCHOR };
  game.geoIonToken = '';
  game.geoLayer = { dispose() { oldLayerDisposed = true; } };
  game.terrainProvider = { dispose() { oldProviderDisposed = true; } };

  const simAnchor = { x: -243337, y: 0, z: 155399 };
  assert.equal(game.retargetGeo(
    { lat: 33.5141, lon: 126.5117, height: 36 },
    { ionToken: 'test-token', simAnchor }
  ), true);
  assert.equal(oldLayerDisposed, true);
  assert.equal(oldProviderDisposed, true);
  assert.equal(createdOptions.lat, 33.5141);
  assert.equal(createdOptions.lon, 126.5117);
  assert.equal(createdOptions.height, 36);
  assert.equal(createdOptions.simAnchor.x, simAnchor.x);
  assert.equal(createdOptions.simAnchor.y, simAnchor.y);
  assert.equal(createdOptions.simAnchor.z, simAnchor.z);
  assert.equal(window.GEO_ANCHOR.lat, 33.5141);
  assert.equal(game.geoAnchor.lon, 126.5117);
  assert.deepEqual(providerConfig.simOffset, simAnchor);
  assert.equal(providerConfig.flatZones.length, 0);
});

test('retargetGeo refuses to re-anchor without a tile token', () => {
  const { AirplaneGame, window } = loadCore();
  window.GEO_ANCHOR = { lat: 35.165199, lon: 128.938995, headingDeg: 353.9, height: 33.25 };
  window.HajunGeoTiles = { create() { throw new Error('should not create'); } };
  window.TerrainProvider = {
    createExactFrameTerrariumProvider() { throw new Error('should not create'); },
    createBrowserTileLoader() { return async () => new Uint8Array(0); },
  };

  const game = Object.create(AirplaneGame.prototype);
  game.scene = {};
  game.geoAnchor = { ...window.GEO_ANCHOR };
  game.geoIonToken = '';
  assert.equal(game.retargetGeo({ lat: 33.5141, lon: 126.5117 }), false);
  assert.equal(window.GEO_ANCHOR.lat, 35.165199);
});
