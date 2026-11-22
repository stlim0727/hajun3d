import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function createThreeMock() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    applyQuaternion() { return this; }
  }
  class Quaternion {
    copy() { return this; }
  }
  return {
    Vector3,
    Quaternion,
    MathUtils: {
      clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
      lerp: (a, b, t) => a + (b - a) * t
    }
  };
}

function loadTailstrikeRuntime() {
  const THREE = createThreeMock();
  const sandbox = {
    THREE,
    AirplaneGame: { prototype: {} },
    window: {},
    document: { getElementById: () => null },
    setTimeout: () => 0
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/emergency.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/physics.js', 'utf8'), sandbox);
  return { THREE, proto: sandbox.AirplaneGame.prototype };
}

test('Takeoff tailstrike triggers high-altitude tail fin separation without ending flight, allowing emergency landing', () => {
  const { THREE, proto } = loadTailstrikeRuntime();
  const game = Object.create(proto);

  const rudderPivot = { visible: true };
  const vstabMesh = { isMesh: true, name: 'Vertical_Stabilizer_Fin', visible: true };

  game.isPlaying = true;
  game.isDestroyed = false;
  game.isOnGround = true;
  game.flightPhase = 'TAKEOFF_RUN';
  game.groundY = 6.84;
  game.hullIntegrity = 100;
  game.score = 0;
  game.throttle = 1.0;
  game.keys = { up: false, down: true, left: false, right: true, fastForward: false, brake: false };
  game.touchRudder = 0.8;
  game.partDamage = {
    nose: 'normal', belly: 'normal', tail: 'normal',
    wingL: 'normal', wingR: 'normal', engineL: 'normal', engineR: 'normal'
  };
  game.glbMovingPartsController = { controlPanels: [{ control: 'rudder', pivot: rudderPivot }] };
  game.planeGroup = {
    position: new THREE.Vector3(160, 6.84, -400),
    quaternion: new THREE.Quaternion(),
    traverse(fn) { fn(vstabMesh); }
  };

  const popups = [];
  const gpwsAlerts = [];
  game.showPopup = (msg) => popups.push(msg);
  game.triggerGPWS = (code, title) => gpwsAlerts.push({ code, title });
  game.speakGPWS = () => {};
  game.playCautionChime = () => {};
  game.triggerPassengerReaction = () => {};

  // 1. Takeoff tailstrike recorded on runway — does NOT break tail fin yet or end game
  assert.equal(game.recordTakeoffTailstrike(), true);
  assert.equal(game.hasTakeoffTailstrike, true);
  assert.equal(game.tailFinDetached, false);
  assert.equal(game.isDestroyed, false);
  assert.equal(game.isPlaying, true);
  assert.equal(game.partDamage.tail, 'damaged');
  assert.ok(game.tailBulkheadTriggerAltM >= 1500 && game.tailBulkheadTriggerAltM <= 1900);

  // 2. Climbing below trigger altitude keeps tail fin intact
  game.isOnGround = false;
  game.flightPhase = 'CLIMB_CRUISE';
  game.planeGroup.position.y = game.groundY + game.tailBulkheadTriggerAltM - 100;
  assert.equal(game.checkTailstrikeAltitudeFailure(), false);
  assert.equal(game.tailFinDetached, false);

  // 3. Climbing to trigger altitude detaches tail fin WITHOUT ending the flight
  game.planeGroup.position.y = game.groundY + game.tailBulkheadTriggerAltM + 20;
  assert.equal(game.checkTailstrikeAltitudeFailure(), true);
  assert.equal(game.tailFinDetached, true);
  assert.equal(game.currentEmergency, 'tail_loss');
  assert.equal(game.partDamage.tail, 'failed');
  assert.equal(game.isDestroyed, false, 'Tail fin breakoff must NOT end the game');
  assert.equal(game.isPlaying, true, 'Player must remain in flight to attempt emergency landing');
  assert.equal(rudderPivot.visible, false, 'Rudder panel should visually detach');
  assert.equal(vstabMesh.visible, false, 'Vertical fin mesh should visually detach');
  assert.ok(gpwsAlerts.some((a) => a.title.includes('TAIL FIN SEPARATED')));

  // 4. Controls lose airborne rudder but retain degraded pitch & roll for emergency landing
  const inputs = game.collectFlight3dInputs(0.016);
  assert.equal(inputs.rudder, 0, 'Airborne rudder authority must be lost after tail fin separation');
  assert.ok(inputs.elevator > 0 && inputs.elevator < 0.7, 'Pitch must be degraded yet controllable');
  assert.ok(inputs.aileron > 0 && inputs.aileron < 0.8, 'Roll must be degraded yet controllable');

  // 5. Emergency landing succeeds and awards heroic bonus
  game.checkEmergencyLandingSuccess('runway_landing');
  assert.equal(game.emergencyBonusGiven, true);
  assert.equal(game.score, 3000);
  assert.ok(popups.some((p) => p.includes('꼬리날개 파손')));

  // 6. Reset restores detached tail nodes cleanly
  game.resetTailstrikeState();
  assert.equal(game.hasTakeoffTailstrike, false);
  assert.equal(game.tailFinDetached, false);
  assert.equal(rudderPivot.visible, true);
  assert.equal(vstabMesh.visible, true);
});
