import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadCoreClass() {
  const sandbox = {
    window: {},
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/geo_config.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/core.js', 'utf8'), sandbox);
  return {
    AirplaneGame: vm.runInContext('AirplaneGame', sandbox),
    window: sandbox.window
  };
}

test('Incheon Airport remains at the playable -45000 route and stays visible with geoTiles active', () => {
  const { AirplaneGame, window } = loadCoreClass();
  const game = Object.create(AirplaneGame.prototype);

  const cityPos = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  const incheonPos = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  const incheonRunwayNode = { name: 'Incheon_Airfield_And_Dual_Runways', visible: true };
  const incheonTerminalNode = { name: 'Incheon_Terminals_Concourse_And_Tower', visible: true };
  const departureGlbNode = { name: 'DepartureAirfieldGLB', visible: true };

  game.cityGroup = { position: cityPos };
  game.airportGroup = {
    traverse(fn) { fn(departureGlbNode); },
    getObjectByName() { return null; }
  };
  game.incheonAirportGroup = {
    position: incheonPos,
    traverse(fn) {
      fn(incheonRunwayNode);
      fn(incheonTerminalNode);
    }
  };
  game.obstacles = [
    { name: '제1여객터미널' },
    { name: '인천국제공항 T1' }
  ];

  // applyGeodeticPlacement relocates Haeundae without teleporting Incheon away from z = -45000
  game.applyGeodeticPlacement();
  assert.notEqual(cityPos.x, 0, 'Haeundae cityGroup should still be geodetically placed');
  assert.equal(incheonPos.x, 0, 'Incheon airport group must stay at x = 0');
  assert.equal(incheonPos.y, 0, 'Incheon airport group must stay at y = 0');
  assert.equal(incheonPos.z, 0, 'Incheon airport group must stay at z = 0 (meshes at z = -45000)');

  // applyAirfieldMinimalism hides departure GLB ground but keeps Incheon runways and terminals visible
  game.applyAirfieldMinimalism();
  assert.equal(departureGlbNode.visible, false, 'Departure GLB airfield ground should be hidden');
  assert.equal(incheonRunwayNode.visible, true, 'Incheon runways must remain visible');
  assert.equal(incheonTerminalNode.visible, true, 'Incheon terminals and tower must remain visible');
  assert.ok(
    game.obstacles.some((o) => o.name === '인천국제공항 T1'),
    'Incheon T1 obstacle should remain active'
  );

  // enableTerrainProvider flattens both Gimhae (z = 0) and Incheon (z = -45000)
  let capturedConfig = null;
  window.TerrainProvider = {
    createTerrariumProvider(cfg) {
      capturedConfig = cfg;
      return { sampleHeight: () => 0 };
    },
    createBrowserTileLoader() {
      return async () => new Uint8Array(0);
    }
  };
  game.geoAnchor = { lat: 35.165, lon: 128.939, headingDeg: 353.9, height: 33.25 };
  assert.equal(game.enableTerrainProvider(), true);
  assert.ok(
    capturedConfig.flatZones.some(
      (z) => z.minX <= 160 && z.maxX >= 160 && z.minZ <= -45000 && z.maxZ >= -45000
    ),
    'TerrainProvider must include a flat zone covering Incheon Runway 16R at (160, -45000)'
  );
});
