import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function createThreeMock() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    clone() { return new Vector3(this.x, this.y, this.z); }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    applyQuaternion(q) {
      // Rotate around Y axis for yaw testing: q = { yaw }
      if (q && Number.isFinite(q.yaw)) {
        const c = Math.cos(q.yaw);
        const s = Math.sin(q.yaw);
        const nx = this.x * c + this.z * s;
        const nz = -this.x * s + this.z * c;
        this.x = nx;
        this.z = nz;
      }
      return this;
    }
  }
  return { Vector3 };
}

function loadUiRuntime() {
  const THREE = createThreeMock();
  const sandbox = {
    THREE,
    AirplaneGame: { prototype: {} },
    window: {},
    document: {
      querySelectorAll: () => [],
      getElementById: () => null
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/geodesy.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/geo_config.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/airport_indicators.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/ui.js', 'utf8'), sandbox);
  return {
    THREE,
    window: sandbox.window,
    proto: sandbox.AirplaneGame.prototype
  };
}

test('geoLocalToLatLon inverts geoLocalDelta accurately', () => {
  const { window } = loadUiRuntime();
  const jeju = window.AirportIndicators.byIcao.RKPC;
  const delta = window.geoLocalDelta({ lat: jeju.lat, lon: jeju.lon, old: { x: 0, z: 0 } });
  const roundTrip = window.geoLocalToLatLon(delta.local.x, delta.local.z);
  assert.ok(Math.abs(roundTrip.lat - jeju.lat) < 1e-4, `lat mismatch: ${roundTrip.lat} vs ${jeju.lat}`);
  assert.ok(Math.abs(roundTrip.lon - jeju.lon) < 1e-3, `lon mismatch: ${roundTrip.lon} vs ${jeju.lon}`);
});

test('getAircraftHeadingDeg computes true heading and cardinal direction from aircraft orientation', () => {
  const { proto } = loadUiRuntime();
  const game = Object.create(proto);
  game.planeGroup = { quaternion: { yaw: 0 } };

  // Runway 36L heading is 353.9° -> 354° N
  assert.equal(game.getAircraftHeadingDeg(), 354);
  assert.equal(game.getCardinalDirection(354), 'N');

  // Turn right 90° (yaw = -PI/2 in right-handed Y-up) -> 084° E
  game.planeGroup.quaternion.yaw = -Math.PI / 2;
  assert.equal(game.getAircraftHeadingDeg(), 84);
  assert.equal(game.getCardinalDirection(84), 'E');

  // Turn 180° -> 174° S
  game.planeGroup.quaternion.yaw = Math.PI;
  assert.equal(game.getAircraftHeadingDeg(), 174);
  assert.equal(game.getCardinalDirection(174), 'S');

  // Turn left 90° (yaw = +PI/2) -> 264° W
  game.planeGroup.quaternion.yaw = Math.PI / 2;
  assert.equal(game.getAircraftHeadingDeg(), 264);
  assert.equal(game.getCardinalDirection(264), 'W');
});

test('setDestinationAirport switches active destination and updates navigation target', () => {
  const { THREE, proto } = loadUiRuntime();
  const game = Object.create(proto);
  game.groundY = 6.84;
  game.flightPhase = 'CLIMB_CRUISE';
  game.cruiseMultiplier = 1;
  game.planeGroup = { position: new THREE.Vector3(160, 6.84, 0) };
  game.destinationSelect = { value: 'RKSI' };
  const popups = [];
  game.showPopup = (msg) => popups.push(msg);

  // Default RKSI points to z = -45000
  const rksiState = game.getDestinationNavigationState(0);
  assert.equal(rksiState.activeIcao, 'RKSI');
  assert.equal(rksiState.targetPos.z, -45000);
  assert.ok(rksiState.targetLabel.includes('인천국제공항'));

  // Select Jeju (RKPC) -> points southwest (x < 0, z > 0) and updates select + popup
  game.setDestinationAirport('RKPC');
  assert.equal(game.selectedDestinationIcao, 'RKPC');
  assert.equal(game.destinationSelect.value, 'RKPC');
  assert.ok(popups.some((m) => m.includes('제주국제공항')));

  const jejuState = game.getDestinationNavigationState(0);
  assert.equal(jejuState.activeIcao, 'RKPC');
  assert.ok(jejuState.targetPos.x < -100000, 'Jeju must lie west of Gimhae');
  assert.ok(jejuState.targetPos.z > 100000, 'Jeju must lie south of Gimhae');
  assert.ok(jejuState.targetLabel.includes('제주국제공항'));
  assert.ok(jejuState.targetLabel.includes('BRG'));

  // Select Gimhae (RKPK) -> points back to runway 36L (160, groundY, 0)
  game.setDestinationAirport('RKPK');
  const gimhaeState = game.getDestinationNavigationState(0);
  assert.equal(gimhaeState.activeIcao, 'RKPK');
  assert.equal(gimhaeState.targetPos.x, 160);
  assert.equal(gimhaeState.targetPos.z, 0);
  assert.ok(gimhaeState.targetLabel.includes('김해국제공항'));
});

test('web/index.html exposes heading readout and destination selector controls', () => {
  const html = readFileSync('web/index.html', 'utf8');
  assert.ok(html.includes('id="heading-val"'), 'index.html must include #heading-val');
  assert.ok(html.includes('id="heading-cardinal"'), 'index.html must include #heading-cardinal');
  assert.ok(html.includes('id="destination-select"'), 'index.html must include #destination-select');
  assert.ok(html.includes('window.setDestinationAirport'), 'index.html must wire setDestinationAirport');
});
