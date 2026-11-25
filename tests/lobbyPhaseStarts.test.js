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
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { return this.set(v.x, v.y, v.z); }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    applyQuaternion() { return this; }
    sub() { return this; }
  }
  class Quaternion {
    setFromAxisAngle() { return this; }
    copy() { return this; }
    multiply() { return this; }
  }
  return { Vector3, Quaternion };
}

function loadUiRuntime() {
  const THREE = createThreeMock();
  const sandbox = {
    THREE,
    AirplaneGame: { prototype: {} },
    window: {
      GEO_SIM_ANCHOR: { x: 160, z: 0 },
      GEO_POINTS: { haeundae: { lat: 35.16, lon: 129.1 } }
    },
    document: {
      querySelectorAll: () => [],
      getElementById: () => null
    }
  };
  vm.createContext(sandbox);
  for (const file of ['flightsim_core_bundle.js', 'geodesy.js', 'geo_config.js', 'airport_indicators.js', 'route_model.js', 'ui.js']) {
    vm.runInContext(readFileSync(`web/js/${file}`, 'utf8'), sandbox);
  }
  return { THREE, proto: sandbox.AirplaneGame.prototype };
}

function makeGame(proto, THREE) {
  const game = Object.create(proto);
  game.overlay = { classList: { add() {}, remove() {} } };
  game.planeGroup = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    visible: false
  };
  game.cameraState = null;
  game.currentPlaneType = 'a320';
  game.phaseDisplay = { textContent: '' };
  game.velocity = { set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  game.popups = [];
  game.showPopup = (msg) => game.popups.push(msg);
  game.buildAircraft = () => {};
  game.updateGearUI = () => {};
  game.updateFlapsUI = () => {};
  game.updateSpoilerUI = () => {};
  game.updateReverserUI = () => {};
  game.showGateActionPrompt = () => {};
  game.clearGPWS = () => {};
  game.startJetSound = () => {};
  game.resetFlight3dPhysics = () => {};
  game.getSelectedPlace = () => null;
  return game;
}

test('cruise lobby action starts airborne at cruise state toward the destination', () => {
  const { proto, THREE } = loadUiRuntime();
  const game = makeGame(proto, THREE);
  game.startCruisePhase();
  assert.equal(game.flightPhase, 'CLIMB_CRUISE');
  assert.equal(game.isPlaying, true);
  assert.equal(game.gearExtended, false);
  assert.equal(game.throttle > 0, true);
  assert.match(game.phaseDisplay.textContent, /Cruise/);
  assert.match(game.popups.join(' '), /순항/);
});

test('approach lobby action starts on final with gear and flaps configured', () => {
  const { proto, THREE } = loadUiRuntime();
  const game = makeGame(proto, THREE);
  game.startApproachPhase();
  assert.equal(game.flightPhase, 'FINAL_APPROACH');
  assert.equal(game.gearExtended, true);
  assert.equal(game.gearPhase, 'DOWN');
  assert.equal(game.flapIndex, 3);
  assert.equal(game.velocity.y < 0, true);
  assert.match(game.phaseDisplay.textContent, /Approach/);
  assert.match(game.popups.join(' '), /착륙 접근/);
});

test('takeoff lobby action keeps runway takeoff behavior', () => {
  const { proto, THREE } = loadUiRuntime();
  const game = makeGame(proto, THREE);
  game.startTakeoffPhase();
  assert.equal(game.flightPhase, 'TAKEOFF_RUN');
  assert.equal(game.gearExtended, true);
  assert.equal(game.throttle, 1);
  assert.equal(game.groundSpeed, 0);
});
