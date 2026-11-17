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
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    normalize() {
      const len = Math.sqrt(this.lengthSq()) || 1;
      return this.multiplyScalar(1 / len);
    }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
    applyQuaternion() { return this; }
    applyAxisAngle() { return this; }
    applyMatrix4(m) {
      if (m && m.offset) {
        this.x += m.offset.x;
        this.y += m.offset.y;
        this.z += m.offset.z;
      }
      return this;
    }
  }

  class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x; this.y = y; this.z = z; this.w = w;
    }
    copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
  }

  return {
    Vector3,
    Quaternion,
    MathUtils: {
      lerp: (a, b, t) => a + (b - a) * t,
      clamp: (v, min, max) => Math.max(min, Math.min(max, v))
    }
  };
}

function loadCameraRuntime() {
  const THREE = createThreeMock();
  const sandbox = {
    THREE,
    AirplaneGame: { prototype: {} },
    window: {},
    document: {
      querySelectorAll: () => [],
      getElementById: () => null
    },
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/physics.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/ui.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/input.js', 'utf8'), sandbox);
  return { THREE, proto: sandbox.AirplaneGame.prototype };
}

test('Flight3d-style camera modes: all 8 modes cycle, update, and clamp ground clearance', () => {
  const { THREE, proto } = loadCameraRuntime();

  const game = Object.create(proto);
  game.cameraMode = '3rd';
  game.currentPlaneType = 'a320';
  game.isOnGround = true;
  game.groundSpeed = 0;
  game.verticalSpeed = 0;
  game.currentG = 1.0;
  game.isStalling = false;
  game.buffetVibration = 0;
  game.camModeText = { textContent: '' };
  game.showPopup = () => {};
  game.camera = {
    fov: 60,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    up: new THREE.Vector3(0, 1, 0),
    lookAtTarget: null,
    lookAt(v) { this.lookAtTarget = v.clone(); },
    updateProjectionMatrix() {}
  };
  game.planeGroup = {
    position: new THREE.Vector3(160, 6.84, 0),
    quaternion: new THREE.Quaternion(),
    matrixWorld: { offset: new THREE.Vector3(160, 6.84, 0) },
    updateMatrixWorld() { this.matrixWorld.offset.copy(this.position); }
  };

  const defs = game.getCameraModeDefs();
  assert.equal(defs.length, 8);
  assert.deepEqual(Array.from(defs, (d) => d.id), ['3rd', '1st', 'wing', 'drone', 'flyby', 'tower', 'gear', 'hud']);

  // Verify cycling through all 8 modes returns to '3rd'
  const visited = [];
  for (let i = 0; i < defs.length; i++) {
    game.toggleCamera();
    visited.push(game.cameraMode);
  }
  assert.equal(visited.length, 8);
  assert.equal(visited[visited.length - 1], '3rd');

  // Verify updateCameraFromPhysics works cleanly in every mode
  for (const def of defs) {
    game.setCameraMode(def.id);
    game.updateCameraFromPhysics(260, 0.016);
    assert.ok(Number.isFinite(game.camera.position.x), `${def.id} x finite`);
    assert.ok(Number.isFinite(game.camera.position.y), `${def.id} y finite`);
    assert.ok(Number.isFinite(game.camera.position.z), `${def.id} z finite`);
    assert.ok(game.camera.position.y >= 2.6, `${def.id} must not clip below runway (${game.camera.position.y})`);
  }

  // Verify tower mode selects Incheon ATC tower when near Incheon (z < -22500)
  game.planeGroup.position.set(-155, 6.84, -45000);
  game.setCameraMode('tower');
  game.updateCameraFromPhysics(0, 0.016);
  assert.equal(game.camera.position.x, -395);
  assert.equal(game.camera.position.z, -45850);

  // Verify resetCameraLook restores neutral angles
  const cs = game.ensureCameraState();
  cs.chaseYaw = 1.2;
  cs.lookYaw = -0.8;
  cs.wingLookPitch = 0.4;
  game.resetCameraLook();
  assert.equal(cs.chaseYaw, 0);
  assert.equal(cs.lookYaw, 0);
  assert.equal(cs.wingLookPitch, 0);
});

test('web/index.html includes camera mode selector menu and mobile camera buttons', () => {
  const html = readFileSync('web/index.html', 'utf8');
  assert.ok(html.includes('id="cam-mode-menu"'), 'PC camera mode menu must exist');
  assert.ok(html.includes('id="cam-menu-btn"'), 'Camera dropdown button must exist');
  for (const mode of ['3rd', '1st', 'wing', 'drone', 'flyby', 'tower', 'gear', 'hud']) {
    assert.ok(html.includes(`data-cam-mode="${mode}"`), `index.html must include data-cam-mode="${mode}"`);
  }
});
