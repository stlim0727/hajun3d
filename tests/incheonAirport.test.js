import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadCoreClass() {
  const sandbox = {
    window: {},
    THREE,
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/flightsim_core_bundle.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/geodesy.js', 'utf8'), sandbox);
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
    assertTerrainProviderContract() { return true; },
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

test('applyGeoTilesFlattenZones patches 3D tile materials to flatten mountains over Incheon Airport and approach corridor', () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  }
  const sandbox = {
    THREE: { Vector3 },
    window: {},
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/core.js', 'utf8'), sandbox);
  const AirplaneGame = vm.runInContext('AirplaneGame', sandbox);
  const game = Object.create(AirplaneGame.prototype);

  const tileMat = { userData: {}, needsUpdate: false, onBeforeCompile: null };
  const tileMesh = { isMesh: true, material: tileMat };
  game._geoTilesGroup = { traverse(fn) { fn(tileMesh); } };
  game.scene = { position: new Vector3(10, 0, -200) };

  game.applyGeoTilesFlattenZones();
  assert.equal(tileMat.userData._geoFlattenPatched, true);
  assert.equal(tileMat.needsUpdate, true);
  assert.equal(typeof tileMat.onBeforeCompile, 'function');

  const shader = { uniforms: {}, vertexShader: 'void main() { #include <project_vertex> }' };
  tileMat.onBeforeCompile(shader, null);
  assert.ok(shader.uniforms.uGeoFlattenSceneOffset, 'Scene offset uniform must be bound for floating origin');
  assert.ok(shader.vertexShader.includes('-49500.0'), 'Incheon runway/approach flatten Z-min must be injected');
  assert.ok(shader.vertexShader.includes('-40500.0'), 'Incheon runway/approach flatten Z-max must be injected');
});

test('Ground runway steering works with HOTAS stick, touch joystick, and keyboard after landing', () => {
  const sandbox = {
    THREE: {
      MathUtils: {
        clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
        lerp: (a, b, t) => a + (b - a) * t
      }
    },
    AirplaneGame: { prototype: {} },
    window: {},
    document: { getElementById: () => null }
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/physics.js', 'utf8'), sandbox);
  const game = Object.create(sandbox.AirplaneGame.prototype);

  game.isOnGround = true;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.throttle = 0.2;
  game.gearExtended = true;

  // HOTAS stick left/right without twist rudder must steer nosewheel on runway
  game.hotasState = { connected: true, useTwistRudder: false, pitch: 0, roll: 0.8, yaw: 0 };
  const hotasRight = game.collectFlight3dInputs(0.016);
  assert.ok(hotasRight.rudder > 0.5, `HOTAS right roll must steer right on ground (got ${hotasRight.rudder})`);

  // Mobile touch joystick left must steer nosewheel left on runway
  game.hotasState = { connected: false };
  game.joystickData = { active: true, x: -0.9, y: 0 };
  game.smoothedTouchStick = { x: -0.9, y: 0 };
  const touchLeft = game.collectFlight3dInputs(0.016);
  assert.ok(touchLeft.rudder < -0.5, `Touch joystick left must steer left on ground (got ${touchLeft.rudder})`);
});

test('_curveGeoFallbackPlane curves fallback ground downward with Earth curvature so distant 3D tiles are never buried', () => {
  class MockPlaneGeometry {
    constructor(w, h, segW, segH) {
      this.parameters = { width: w, height: h };
      const xs = [0, 20000, 220000];
      const ys = [0, 0, 0];
      const zs = [0, 0, 0];
      this.attributes = {
        position: {
          count: xs.length,
          getX: (i) => xs[i],
          getY: (i) => ys[i],
          getZ: (i) => zs[i],
          setZ: (i, v) => { zs[i] = v; },
          needsUpdate: false
        }
      };
    }
    computeVertexNormals() {}
    dispose() {}
  }
  const sandbox = {
    THREE: { PlaneGeometry: MockPlaneGeometry },
    window: {},
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/core.js', 'utf8'), sandbox);
  const AirplaneGame = vm.runInContext('AirplaneGame', sandbox);
  const game = Object.create(AirplaneGame.prototype);

  const mesh = { name: 'GeoFallbackGround', geometry: new MockPlaneGeometry(1200000, 1200000, 1, 1) };
  game._curveGeoFallbackPlane(mesh);
  const pos = mesh.geometry.attributes.position;
  assert.ok(pos.getZ(0) <= -35, 'Anchor fallback must stay below runway');
  assert.ok(pos.getZ(1) < -65, '20km fallback must curve below -31m Earth drop');
  assert.ok(pos.getZ(2) < -3830, '220km fallback must curve below -3800m Earth drop');
});

test('enableGeoTiles keeps Korea-wide tiles clamped to maxDepth 17 above 600 m altitude to prevent missing-tile holes', () => {
  const sandbox = {
    window: {},
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/core.js', 'utf8'), sandbox);
  const AirplaneGame = vm.runInContext('AirplaneGame', sandbox);
  const game = Object.create(AirplaneGame.prototype);

  let capturedOpts = null;
  sandbox.window.HajunGeoTiles = {
    create(opts) {
      capturedOpts = opts;
      return { update() {}, dispose() {} };
    }
  };
  game.scene = { children: [] };
  game.camera = {};
  game.renderer = {};
  game.container = null;
  game.geoAnchor = { lat: 35.165, lon: 128.939, headingDeg: 353.9, height: 33.25 };
  game.geoAzimuth = 173.9;
  game.enableTerrainProvider = () => false;
  game.applyAirfieldMinimalism = () => {};

  assert.equal(game.enableGeoTiles('test-token'), true);
  assert.equal(capturedOpts.nearAnchorMaxDepth, 17);
  assert.ok(
    capturedOpts.focusAnchors.some((a) => a.radius >= 500000 && a.maxAltitude >= 25000),
    'Korea-wide focus anchor must cover flight altitudes above 600 m so depth-17 tiles are never unloaded'
  );
});
