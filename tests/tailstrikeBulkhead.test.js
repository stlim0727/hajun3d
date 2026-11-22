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

test('detachVerticalTailFinGeometry slices the entire vertical tail fin from merged GLB mesh and restores on reset', () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    applyQuaternion() { return this; }
    applyMatrix4() { return this; }
    fromBufferAttribute(attr, i) {
      this.x = attr.array[i * 3];
      this.y = attr.array[i * 3 + 1];
      this.z = attr.array[i * 3 + 2];
      return this;
    }
  }
  class Quaternion { copy() { return this; } }
  class Matrix4 {
    copy() { return this; }
    invert() { return this; }
    multiplyMatrices() { return this; }
  }
  class Box3 {
    constructor() {
      this.min = new Vector3(Infinity, Infinity, Infinity);
      this.max = new Vector3(-Infinity, -Infinity, -Infinity);
    }
    expandByPoint(p) {
      this.min.x = Math.min(this.min.x, p.x); this.min.y = Math.min(this.min.y, p.y); this.min.z = Math.min(this.min.z, p.z);
      this.max.x = Math.max(this.max.x, p.x); this.max.y = Math.max(this.max.y, p.y); this.max.z = Math.max(this.max.z, p.z);
      return this;
    }
    isEmpty() { return this.max.x < this.min.x; }
  }
  class BufferAttribute {
    constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; }
    getX(i) { return this.array[i]; }
  }
  class BufferGeometry {
    constructor() { this.attributes = {}; this.index = null; this.groups = []; }
    setAttribute(name, attr) { this.attributes[name] = attr; }
    setIndex(arr) {
      if (!arr) { this.index = null; return; }
      this.index = Array.isArray(arr) ? new BufferAttribute(arr, 1) : arr;
    }
    clearGroups() { this.groups = []; }
    addGroup(start, count, materialIndex) { this.groups.push({ start, count, materialIndex }); }
  }
  class Mesh {
    constructor(geometry, material) {
      this.isMesh = true; this.visible = true; this.geometry = geometry; this.material = material;
      this.matrixWorld = new Matrix4();
    }
    applyMatrix4() {}
  }
  class Group {
    constructor() {
      this.children = []; this.position = new Vector3(); this.quaternion = new Quaternion(); this.matrixWorld = new Matrix4();
    }
    add(c) { this.children.push(c); }
    remove(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }
    updateMatrixWorld() {}
    traverse(fn) { fn(this); for (const c of this.children) fn(c); }
  }

  const MOCK_THREE = { Vector3, Quaternion, Matrix4, Box3, BufferAttribute, BufferGeometry, Mesh, Group, Scene: Group };
  const sandbox = {
    THREE: MOCK_THREE,
    AirplaneGame: { prototype: {} },
    window: {},
    document: { getElementById: () => null },
    setTimeout: () => 0
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/emergency.js', 'utf8'), sandbox);
  const game = Object.create(sandbox.AirplaneGame.prototype);

  // Build a merged airliner geometry: fuselage (-18..18), wings (-17..17), h-stab (-6..6), vertical fin (y: 5.5..9, z: 13..18, x: 0)
  const positions = new Float32Array([
    // Tri 0: Fuselage nose
    -1, 0, -18,   1, 0, -18,   0, 2, -14,
    // Tri 1: Left wing
    -17, 0, 0,   -2, 0, -2,   -2, 0, 2,
    // Tri 2: Right wing
    17, 0, 0,    2, 0, -2,    2, 0, 2,
    // Tri 3: Left horizontal stabilizer (aft, low, wide)
    -6, 1.5, 16,  -2.5, 1.5, 14,  -2.5, 1.5, 17,
    // Tri 4: Vertical tail fin lower-mid (aft, high, centerline) -> MUST BE REMOVED
    0, 5.5, 13,   0, 8.8, 17.5,   0, 5.5, 17.5,
    // Tri 5: Vertical tail fin upper tip (aft, high, centerline) -> MUST BE REMOVED
    0.2, 6.2, 14,  0.2, 9.0, 18,   -0.2, 6.2, 18
  ]);
  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);

  const mesh = new Mesh(geom, {});
  const planeGroup = new Group();
  planeGroup.add(mesh);

  game.scene = new Group();
  game.planeGroup = planeGroup;
  game.currentPlaneType = 'a320';
  game.debrisPieces = [];
  game.particles = [];

  const res = game.detachVerticalTailFinGeometry();
  assert.equal(res.removedTriangles, 2, 'Both vertical tail fin triangles must be sheared off');
  assert.equal(mesh.geometry.index.count, 12, 'Remaining 4 airframe triangles (fuselage, wings, h-stab) must stay intact');
  assert.equal(game.debrisPieces.length, 1, 'Detached vertical fin debris group must be spawned');
  assert.ok(res.detachedGroup, 'Detached fin group must be returned');

  // Reset restores original 6 triangles (18 indices) and cleans up debris
  game.resetTailstrikeState();
  assert.equal(mesh.geometry.index.count, 18, 'Original merged geometry must be fully restored on reset');
  assert.equal(game.debrisPieces.length, 0, 'Detached fin debris must be removed on reset');
});
