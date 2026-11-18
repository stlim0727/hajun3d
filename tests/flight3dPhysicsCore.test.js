import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as flightsimCore from '@stlim0727/flightsim-core';

function createThreeMathShim() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    divideScalar(s) { return s !== 0 ? this.multiplyScalar(1 / s) : this.set(0, 0, 0); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) {
      const { x, y, z } = this;
      this.x = y * v.z - z * v.y;
      this.y = z * v.x - x * v.z;
      this.z = x * v.y - y * v.x;
      return this;
    }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    applyAxisAngle(axis, angle) {
      return this.applyQuaternion(new Quaternion().setFromAxisAngle(axis, angle));
    }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { return this.divideScalar(this.length() || 1); }
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
    applyMatrix4(m) {
      const { x, y, z } = this;
      const e = m.elements;
      const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      return this;
    }
    applyQuaternion(q) {
      const { x, y, z } = this;
      const { x: qx, y: qy, z: qz, w: qw } = q;
      const ix = qw * x + qy * z - qz * y;
      const iy = qw * y + qz * x - qx * z;
      const iz = qw * z + qx * y - qy * x;
      const iw = -qx * x - qy * y - qz * z;
      this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
      return this;
    }
  }

  class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
    set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
    copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
    clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
    invert() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
    normalize() {
      const l = Math.hypot(this.x, this.y, this.z, this.w) || 1;
      this.x /= l; this.y /= l; this.z /= l; this.w /= l;
      return this;
    }
    multiply(b) {
      const ax = this.x, ay = this.y, az = this.z, aw = this.w;
      const bx = b.x, by = b.y, bz = b.z, bw = b.w;
      this.x = ax * bw + aw * bx + ay * bz - az * by;
      this.y = ay * bw + aw * by + az * bx - ax * bz;
      this.z = az * bw + aw * bz + ax * by - ay * bx;
      this.w = aw * bw - ax * bx - ay * by - az * bz;
      return this;
    }
    slerp(qb, t) {
      let cosHalf = this.w * qb.w + this.x * qb.x + this.y * qb.y + this.z * qb.z;
      let qbx = qb.x, qby = qb.y, qbz = qb.z, qbw = qb.w;
      if (cosHalf < 0) {
        cosHalf = -cosHalf; qbx = -qbx; qby = -qby; qbz = -qbz; qbw = -qbw;
      }
      if (cosHalf >= 1.0) return this;
      const sqrSin = 1.0 - cosHalf * cosHalf;
      if (sqrSin <= 1e-12) {
        this.x += (qbx - this.x) * t;
        this.y += (qby - this.y) * t;
        this.z += (qbz - this.z) * t;
        this.w += (qbw - this.w) * t;
        return this.normalize();
      }
      const sinHalf = Math.sqrt(sqrSin);
      const halfTheta = Math.atan2(sinHalf, cosHalf);
      const ra = Math.sin((1 - t) * halfTheta) / sinHalf;
      const rb = Math.sin(t * halfTheta) / sinHalf;
      this.x = this.x * ra + qbx * rb;
      this.y = this.y * ra + qby * rb;
      this.z = this.z * ra + qbz * rb;
      this.w = this.w * ra + qbw * rb;
      return this;
    }
    setFromAxisAngle(axis, angle) {
      const half = angle / 2, s = Math.sin(half);
      this.x = axis.x * s; this.y = axis.y * s; this.z = axis.z * s; this.w = Math.cos(half);
      return this;
    }
    setFromUnitVectors(vFrom, vTo) {
      let r = vFrom.dot(vTo) + 1;
      if (r < 1e-6) {
        r = 0;
        if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
          this.x = -vFrom.y; this.y = vFrom.x; this.z = 0; this.w = r;
        } else {
          this.x = 0; this.y = -vFrom.z; this.z = vFrom.y; this.w = r;
        }
      } else {
        this.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
        this.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
        this.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
        this.w = r;
      }
      return this.normalize();
    }
  }

  class Matrix4 {
    constructor() { this.elements = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
    compose(position, quaternion, scale) {
      const te = this.elements;
      const { x, y, z, w } = quaternion;
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      const sx = scale.x, sy = scale.y, sz = scale.z;
      te[0] = (1 - (yy + zz)) * sx; te[1] = (xy + wz) * sx; te[2] = (xz - wy) * sx; te[3] = 0;
      te[4] = (xy - wz) * sy; te[5] = (1 - (xx + zz)) * sy; te[6] = (yz + wx) * sy; te[7] = 0;
      te[8] = (xz + wy) * sz; te[9] = (yz - wx) * sz; te[10] = (1 - (xx + yy)) * sz; te[11] = 0;
      te[12] = position.x; te[13] = position.y; te[14] = position.z; te[15] = 1;
      return this;
    }
  }

  class Euler {
    constructor(x = 0, y = 0, z = 0, order = 'YXZ') {
      this.x = x; this.y = y; this.z = z; this.order = order;
    }
    setFromQuaternion(q) {
      const sinp = 2 * (q.w * q.x - q.y * q.z);
      this.x = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
      this.y = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.x * q.x + q.y * q.y));
      this.z = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.x * q.x + q.z * q.z));
      return this;
    }
  }

  const MathUtils = {
    degToRad: d => d * Math.PI / 180,
    radToDeg: r => r * 180 / Math.PI,
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp: (a, b, t) => a + (b - a) * t,
  };

  return { Vector3, Quaternion, Matrix4, Euler, MathUtils };
}

function loadPhysicsSandbox() {
  const THREE = createThreeMathShim();
  const sandbox = {
    THREE,
    AirplaneGame: { prototype: {} },
    window: {},
    globalThis: null,
    performance: { now: () => 0 },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(readFileSync('web/js/flightsim_core_bundle.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/config.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/input.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/physics.js', 'utf8'), sandbox);
  return sandbox;
}

test('loads flightsim-core npm package and instantiates FlightPhysicsCore for all 9 hajun3d aircraft', () => {
  const sandbox = loadPhysicsSandbox();
  const { Flight3dPhysics, FlightSimCore, AirplaneGame } = sandbox;
  assert.ok(Flight3dPhysics?.FlightPhysicsCore, 'FlightPhysicsCore must be exported');
  assert.ok(FlightSimCore?.FlightPhysicsCore, 'FlightSimCore must be exported');
  assert.equal(flightsimCore.FlightPhysicsCore.name, 'FlightPhysicsCore');
  assert.equal(Flight3dPhysics.FlightPhysicsCore.name, 'FlightPhysicsCore');
  assert.ok(Flight3dPhysics.BOEING_737_800);
  assert.ok(flightsimCore.FlightControlLaws, 'FlightControlLaws must be exported');
  assert.ok(flightsimCore.FlightWarningsCore, 'FlightWarningsCore must be exported');
  assert.ok(flightsimCore.AutopilotController, 'AutopilotController must be exported');

  const types = ['a320', 'b737', 'b738', 'b747', 'dc10', 'md80', 'concorde', 'amphibian', 'ancestor'];
  for (const type of types) {
    const cfg = AirplaneGame.prototype.getFlight3dConfig(type);
    const core = new Flight3dPhysics.FlightPhysicsCore({ config: cfg });
    const res = core.step(1 / 60, { throttle: 0.85, gearHandleDown: true }, {});
    assert.equal(res.substeps, 2, `${type} at 1/60s must run 2 substeps at 120 Hz`);
    assert.ok(Number.isFinite(res.position.y), `${type} position.y must be finite`);
    assert.ok(Number.isFinite(res.telemetry.iasKnots), `${type} IAS must be finite`);
  }

  assert.equal(
    AirplaneGame.prototype.getFlight3dConfig('b738'),
    Flight3dPhysics.BOEING_737_800,
    'b738 must use Flight3dPhysics.BOEING_737_800 directly'
  );
});

test('updateFlightPhysics drives 120 Hz FlightPhysicsCore takeoff acceleration and syncs hajun3d state', () => {
  const sandbox = loadPhysicsSandbox();
  const { THREE, AirplaneGame } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.currentPlaneType = 'b738';
  game.groundY = 6.84;
  game.planeGroup = {
    position: new THREE.Vector3(160, 6.84, 1400),
    quaternion: new THREE.Quaternion(),
  };
  game.velocity = new THREE.Vector3(0, 0, -50);
  game.throttle = 1.0;
  game.n1 = 90;
  game.flapIndex = 1;
  game.gearExtended = true;
  game.isOnGround = true;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.isOverAirport = () => true;
  game.showPopup = () => {};
  game.checkFlightMovementReactions = () => {};
  game.checkGPWS = () => {};
  game.clearGPWS = () => {};

  const initialZ = game.planeGroup.position.z;
  for (let i = 0; i < 60; i++) {
    game.updateFlightPhysics(1 / 60);
  }

  assert.ok(game.planeGroup.position.z < initialZ, 'Aircraft must advance forward (-Z) on runway');
  assert.ok(game.groundSpeed > 50, `TOGA thrust must accelerate aircraft beyond 50 m/s (got ${game.groundSpeed.toFixed(2)})`);
  assert.ok(Number.isFinite(game.n1) && game.n1 > 90, 'N1 must spool up toward TOGA');
  assert.ok(Number.isFinite(game.currentG), 'G-force telemetry must remain finite');
});

test('catastrophic water impact triggers waterCrash, marks core crashed, and invokes triggerWaterCrash', () => {
  const sandbox = loadPhysicsSandbox();
  const { THREE, AirplaneGame } = sandbox;

  let waterCrashCause = null;
  const game = Object.create(AirplaneGame.prototype);
  game.currentPlaneType = 'b738';
  game.groundY = 6.84;
  game.planeGroup = {
    position: new THREE.Vector3(0, 1.5, -10000),
    quaternion: new THREE.Quaternion(),
  };
  game.velocity = new THREE.Vector3(0, -10, -80);
  game.throttle = 0.2;
  game.n1 = 40;
  game.flapIndex = 0;
  game.gearExtended = false;
  game.isOnGround = false;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.isOverAirport = () => false;
  game.showPopup = () => {};
  game.checkFlightMovementReactions = () => {};
  game.checkGPWS = () => {};
  game.clearGPWS = () => {};
  game.triggerWaterCrash = (cause) => { waterCrashCause = cause; };

  for (let i = 0; i < 60 && !waterCrashCause; i++) {
    game.updateFlightPhysics(1 / 60);
  }

  assert.ok(waterCrashCause, 'High-sink-rate water impact must invoke triggerWaterCrash');
  assert.equal(game._flight3dCore.isCrashed, true, 'FlightPhysicsCore must enter isCrashed state');
  assert.equal(game._flight3dCore.waterDitching.catastrophic, true, 'WaterDitching must record catastrophic impact');
});

test('survivable water ditching floats and decelerates at sea surface without plunging underwater', () => {
  const sandbox = loadPhysicsSandbox();
  const { THREE, AirplaneGame } = sandbox;

  let waterCrashCalled = false;
  const game = Object.create(AirplaneGame.prototype);
  game.currentPlaneType = 'b738';
  game.groundY = 6.84;
  game.planeGroup = {
    position: new THREE.Vector3(0, 1.0, -10000),
    quaternion: new THREE.Quaternion(),
  };
  game.velocity = new THREE.Vector3(0, -1.5, -75);
  game.throttle = 0.0;
  game.n1 = 30;
  game.flapIndex = 2;
  game.gearExtended = false;
  game.isOnGround = false;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.isOverAirport = () => false;
  game.showPopup = () => {};
  game.checkFlightMovementReactions = () => {};
  game.checkGPWS = () => {};
  game.clearGPWS = () => {};
  game.triggerWaterCrash = () => { waterCrashCalled = true; };

  for (let i = 0; i < 180; i++) {
    game.updateFlightPhysics(1 / 60);
  }

  assert.equal(waterCrashCalled, false, 'Gentle level water ditching must not trigger waterCrash');
  assert.equal(game.isWaterLanding, true, 'Gentle ditching must latch isWaterLanding');
  assert.ok(game.planeGroup.position.y > -5.0, `Aircraft must remain near sea surface (got y=${game.planeGroup.position.y.toFixed(2)})`);
  assert.ok(game.groundSpeed < 75, `Hydrodynamic drag must decelerate aircraft (got ${game.groundSpeed.toFixed(2)} m/s)`);
});

test('amphibian floats without sinking on gentle water landing and crashes on excessive impact', () => {
  const sandbox = loadPhysicsSandbox();
  const { THREE, AirplaneGame } = sandbox;

  // 1. Gentle water landing: floats with zero flooding and can taxi/accelerate on water
  let crashCalled = false;
  const game = Object.create(AirplaneGame.prototype);
  game.currentPlaneType = 'amphibian';
  game.groundY = 6.84;
  game.planeGroup = {
    position: new THREE.Vector3(0, 1.0, -10000),
    quaternion: new THREE.Quaternion(),
  };
  game.velocity = new THREE.Vector3(0, -2.0, -38);
  game.throttle = 0.0;
  game.n1 = 25;
  game.flapIndex = 2;
  game.gearExtended = true;
  game.isOnGround = false;
  game.score = 0;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.isOverAirport = () => false;
  game.showPopup = () => {};
  game.checkFlightMovementReactions = () => {};
  game.checkGPWS = () => {};
  game.clearGPWS = () => {};
  game.triggerWaterCrash = () => { crashCalled = true; };

  for (let i = 0; i < 300; i++) {
    game.updateFlightPhysics(1 / 60);
  }

  assert.equal(crashCalled, false, 'Normal amphibian water touchdown must not crash');
  assert.equal(game._flight3dCore.waterDitching.flooding, 0, 'Amphibian hull must stay watertight (no flooding)');
  assert.equal(game._flight3dCore.waterDitching.submerged, false, 'Amphibian must not sink');
  assert.equal(game._flight3dCore.landingIncident, false, 'Amphibian water landing is not an emergency incident');

  // Verify amphibian can accelerate on water with full throttle (accounting for 3.2s engine spool-up)
  game.throttle = 1.0;
  const speedBefore = game.groundSpeed;
  for (let i = 0; i < 240; i++) {
    game.updateFlightPhysics(1 / 60);
  }
  assert.ok(game.groundSpeed > speedBefore + 3, `Amphibian must accelerate on water under TOGA (before=${speedBefore.toFixed(1)}, after=${game.groundSpeed.toFixed(1)})`);

  // 2. Catastrophic water impact for amphibian (e.g. high sink rate > 5.5 m/s)
  let crashCause = null;
  const crashGame = Object.create(AirplaneGame.prototype);
  crashGame.currentPlaneType = 'amphibian';
  crashGame.groundY = 6.84;
  crashGame.planeGroup = {
    position: new THREE.Vector3(0, 1.0, -10000),
    quaternion: new THREE.Quaternion(),
  };
  crashGame.velocity = new THREE.Vector3(0, -10.0, -50);
  crashGame.throttle = 0.3;
  crashGame.n1 = 40;
  crashGame.flapIndex = 0;
  crashGame.gearExtended = true;
  crashGame.isOnGround = false;
  crashGame.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  crashGame.isOverAirport = () => false;
  crashGame.showPopup = () => {};
  crashGame.checkFlightMovementReactions = () => {};
  crashGame.checkGPWS = () => {};
  crashGame.clearGPWS = () => {};
  crashGame.triggerWaterCrash = (cause) => { crashCause = cause; };

  for (let i = 0; i < 60 && !crashCause; i++) {
    crashGame.updateFlightPhysics(1 / 60);
  }

  assert.ok(crashCause, 'Steep/hard amphibian water impact must trigger waterCrash');
  assert.equal(crashGame._flight3dCore.isCrashed, true, 'Amphibian core must enter isCrashed on fatal impact');
});

test('DC-10 and B738 rotate nose-up and lift off cleanly near Vr', () => {
  const sandbox = loadPhysicsSandbox();
  const { Flight3dPhysics, AirplaneGame, THREE } = sandbox;

  for (const [type, speedKt] of [['dc10', 160], ['b738', 150]]) {
    const cfg = AirplaneGame.prototype.getFlight3dConfig(type);
    const vMs = speedKt / 1.94384;
    const core = new Flight3dPhysics.FlightPhysicsCore({
      config: cfg,
      position: new THREE.Vector3(0, cfg.landingGear.cgGroundHeightM, 0),
      linearVelocity: new THREE.Vector3(0, 0, -vMs),
    });
    core.aero.flapsIndex = 1;
    core.aero.currentFlapAngle = core.aero.flapAngles[1] || 0;

    let res;
    for (let i = 0; i < 12; i++) {
      res = core.step(1 / 60, { throttle: 1.0, elevator: 0, flapsIndex: 1, gearHandleDown: true }, {});
    }
    for (let i = 0; i < 180; i++) {
      res = core.step(1 / 60, { throttle: 1.0, elevator: 1.0, flapsIndex: 1, gearHandleDown: true }, {});
    }

    assert.ok(res.telemetry.pitchDeg >= 8.0, `${type} must pitch up during ${speedKt} kt rotation (got ${res.telemetry.pitchDeg.toFixed(2)} deg)`);
    assert.equal(res.telemetry.wow, false, `${type} must lift off within 3s of rotation at ${speedKt} kt`);
  }
});

test('Atmosphere, input gyro math, and stick shaping are offloaded to flightsim-core', () => {
  const sandbox = loadPhysicsSandbox();
  const { FlightSimCore, AirplaneGame } = sandbox;

  assert.ok(FlightSimCore, 'FlightSimCore bundle must be exposed in sandbox');
  assert.equal(AirplaneGame.prototype.Atmosphere, FlightSimCore.Atmosphere, 'Atmosphere must delegate directly to FlightSimCore.Atmosphere');

  // Atmosphere calculations
  const cond = AirplaneGame.prototype.Atmosphere.getConditions(1000);
  assert.ok(cond.density > 1.0 && cond.density < 1.25, 'Troposphere air density');
  assert.equal(AirplaneGame.prototype.Atmosphere.msToKnots(100), FlightSimCore.Atmosphere.msToKnots(100));

  // Touch stick shaping
  const [pitch, roll] = AirplaneGame.prototype.shapeTouchStick(0.02, 0.02);
  assert.equal(pitch, 0, 'Stick shaping must apply 6% deadzone');
  assert.equal(roll, 0);

  const [fullPitch] = AirplaneGame.prototype.shapeTouchStick(1.0, 0);
  assert.ok(Math.abs(fullPitch - 1.0) < 1e-4, 'Stick shaping reaches full deflection');

  // Gyro screen orientation math
  const tilt = AirplaneGame.prototype.screenTilt(10, 15, 90);
  assert.ok(Number.isFinite(tilt.pitch) && Number.isFinite(tilt.roll));
  assert.equal(AirplaneGame.prototype.angleDelta(350, 10), -20);
});

test('Expanded aircraft configs are sourced from FlightSimCore registry with proper characteristics', () => {
  const sandbox = loadPhysicsSandbox();
  const { FlightSimCore, AirplaneGame } = sandbox;

  const fleet = ['a320', 'b747', 'dc10', 'md80', 'concorde', 'amphibian'];
  for (const planeType of fleet) {
    const cfg = AirplaneGame.prototype.getFlight3dConfig(planeType);
    assert.ok(cfg, `Config for ${planeType} must be returned`);
    assert.ok(cfg.aerodynamics, `${planeType} must have aerodynamics`);
    assert.ok(cfg.massProperties, `${planeType} must have massProperties`);
    assert.ok(cfg.landingGear, `${planeType} must have landingGear`);
    if (planeType === 'amphibian') {
      assert.equal(cfg.isAmphibious, true, 'CL-215 must have isAmphibious flag');
      assert.ok(Array.isArray(cfg.landingGear.bodySupportPoints), 'CL-215 must have body support points for water hull interaction');
    }
  }
});

test('FlightWarningsCore is wired into physics and triggers GPWS alerts', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.isPlaying = true;
  game.isDestroyed = false;
  game.currentPlaneType = 'b738';
  game.groundY = 0;
  game.planeGroup = {
    position: new THREE.Vector3(0, 100, 0),
    rotation: new THREE.Euler(),
    quaternion: new THREE.Quaternion(),
  };
  game.velocity = new THREE.Vector3(0, 0, 0);
  game.throttle = 0.5;
  game.speed = 0.6;
  game.keys = {};
  game.gearExtended = false;
  game.isOnGround = false;

  let triggered = null;
  game.triggerGPWS = (type, text, subtext) => {
    triggered = { type, text, subtext };
  };
  game.speakGPWS = () => {};
  game.playGPWSWhoopSiren = () => {};
  game.playCautionChime = () => {};
  game.clearGPWS = () => { triggered = null; };

  game.initFlight3dPhysics();
  assert.ok(game._flightWarningsCore, 'FlightWarningsCore must be instantiated on physics init');

  // Simulate severe descent near ground without gear -> triggers PULL UP / TOO LOW GEAR
  game.verticalSpeed = -25; // -25 m/s sink rate
  game.planeGroup.position.y = 80;
  game.checkGPWS(0.1);
  assert.ok(triggered, 'GPWS must trigger on high sink rate near ground');
  assert.ok(triggered.type === 'PULL_UP' || triggered.type === 'GEAR' || triggered.type === 'SINK_RATE');
});

test('Touchdown evaluates landing ratings using FlightSimCore.classifyLanding', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.currentPlaneType = 'b738';
  let popupMessage = null;
  game.showPopup = (msg) => { popupMessage = msg; };
  game.clearGPWS = () => {};
  game.score = 0;

  // 1. Soft touchdown -> BUTTER
  game.handleFlight3dEvents([{ type: 'touchdown', sinkRate: 0.5 }], { telemetry: { gForce: 1.1 } });
  assert.ok(popupMessage.includes('BUTTER LANDING'), `Expected butter landing, got: ${popupMessage}`);

  // 2. High G / hard touchdown
  popupMessage = null;
  game.handleFlight3dEvents([{ type: 'touchdown', sinkRate: 2.0 }], { telemetry: { gForce: 1.7 } });
  assert.ok(popupMessage.includes('하드 랜딩') || popupMessage.includes('다소 강한 접지'), `Expected hard landing note, got: ${popupMessage}`);
});

test('GPWS triggers flap and gear overspeed warnings from configuration limits', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.isPlaying = true;
  game.isDestroyed = false;
  game.currentPlaneType = 'b738';
  game.groundY = 0;
  game.planeGroup = {
    position: new THREE.Vector3(0, 3000, 0),
    rotation: new THREE.Euler(),
    quaternion: new THREE.Quaternion(),
  };
  game.verticalSpeed = 0;
  game.gearExtended = false;
  game.isOnGround = false;
  game.speed = 1.2; // High speed

  let triggered = null;
  game.triggerGPWS = (type, text, subtext) => {
    triggered = { type, text, subtext };
  };
  game.speakGPWS = () => {};
  game.playCautionChime = () => {};
  game.clearGPWS = () => { triggered = null; };

  game.initFlight3dPhysics();

  // Simulate flap overspeed telemetry
  game._flight3dCore.telemetry = {
    configurationOverspeed: { flap: true, gear: false },
  };
  game.checkGPWS(0.1);
  assert.ok(triggered, 'Warning must trigger for flap overspeed');
  assert.equal(triggered.type, 'OVERSPEED');
  assert.ok(triggered.text.includes('FLAP OVERSPEED'));

  // Simulate gear overspeed telemetry
  triggered = null;
  if (game._flightWarningsCore?.reset) {
    game._flightWarningsCore.reset();
  }
  game._flight3dCore.telemetry = {
    configurationOverspeed: { flap: false, gear: true },
  };
  game.checkGPWS(0.1);
  assert.ok(triggered, 'Warning must trigger for gear overspeed');
  assert.equal(triggered.type, 'OVERSPEED');
  assert.ok(triggered.text.includes('GEAR OVERSPEED'));
});

test('Windshear emergency injects 3D downdraft and wind vector in flight environment', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.currentEmergency = 'windshear';
  const env = game.buildFlight3dEnvironment();

  const out = new THREE.Vector3();
  env.getWindWorld(new THREE.Vector3(0, 500, 0), 2.0, out);

  // Must inject negative Y downdraft (< -10 m/s) and lateral wind
  assert.ok(out.y < -10.0, `Microburst must have downdraft < -10 m/s (got ${out.y})`);
  assert.ok(Math.abs(out.x) > 0 || Math.abs(out.z) > 0, 'Microburst must have crosswind / headwind components');
});

test('FLRS auto-retracts takeoff flaps (FLAPS 1) on high-speed climb without triggering FLAP OVERSPEED', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.isPlaying = true;
  game.isDestroyed = false;
  game.currentPlaneType = 'a320';
  game.groundY = 0;
  game.planeGroup = {
    position: new THREE.Vector3(0, 1500, 0),
    rotation: new THREE.Euler(),
    quaternion: new THREE.Quaternion(),
  };
  // ~262 kt TAS at 1500 m => ~243 kt IAS (above A320 Flaps 1 Vfe 230 kt)
  game.velocity = new THREE.Vector3(0, 0, -135);
  game.throttle = 0.9;
  game.n1 = 90;
  game.flaps = ['UP', '1', '2', 'FULL'];
  game.flapIndex = 1;
  game.gearExtended = false;
  game.isOnGround = false;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.isOverAirport = () => false;

  const popups = [];
  let gpwsTriggered = null;
  let flapsUiCalls = 0;
  game.showPopup = (msg) => { popups.push(msg); };
  game.updateFlapsUI = () => { flapsUiCalls++; };
  game.checkFlightMovementReactions = () => {};
  game.triggerGPWS = (type, text, subtext) => { gpwsTriggered = { type, text, subtext }; };
  game.speakGPWS = () => {};
  game.playGPWSWhoopSiren = () => {};
  game.playCautionChime = () => {};
  game.clearGPWS = () => { gpwsTriggered = null; };

  game.initFlight3dPhysics();
  game.updateFlightPhysics(1 / 60);

  assert.equal(game.flapIndex, 0, 'Takeoff flaps (FLAPS 1) must auto-retract to UP above Vfe');
  assert.equal(game.currentFlapAngle, 0, 'Flap angle must reset to 0 after FLRS auto-retract');
  assert.equal(game._flight3dCore.telemetry.configurationOverspeed.flap, false, 'Flap overspeed telemetry must be cleared');
  assert.equal(gpwsTriggered, null, 'GPWS FLAP OVERSPEED banner must not trigger on FLAPS 1 auto-retract');
  assert.ok(flapsUiCalls >= 1, 'updateFlapsUI must be called after FLRS auto-retract');
  assert.ok(popups.some(msg => msg.includes('FLRS 자동 수납')), `Expected FLRS popup, got: ${JSON.stringify(popups)}`);
});

test('toggleFlaps retracts directly to UP at high speed instead of cycling through Flaps 2/FULL and locks deployment above Vfe', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.currentPlaneType = 'a320';
  game.groundY = 0;
  game.planeGroup = {
    position: new THREE.Vector3(0, 1500, 0),
    rotation: new THREE.Euler(),
    quaternion: new THREE.Quaternion(),
  };
  game.velocity = new THREE.Vector3(0, 0, -120);
  game.flaps = ['UP', '1', '2', 'FULL'];
  game.flapIndex = 1;
  game.gearExtended = false;
  game.isOnGround = false;

  const popups = [];
  let chimeCount = 0;
  game.playFlapSound = () => {};
  game.updateFlapsUI = () => {};
  game.playCautionChime = () => { chimeCount++; };
  game.showPopup = (msg) => { popups.push(msg); };

  game.initFlight3dPhysics();

  // 1. At 220 kt IAS (> A320 Flaps 2 limit 200 kt - 5), retracting from Flaps 1 goes directly to UP (0)
  game._flight3dCore.telemetry = { iasKnots: 220 };
  game.toggleFlaps();
  assert.equal(game.flapIndex, 0, 'toggleFlaps must retract directly to UP (0) at 220 kt instead of stepping into Flaps 2');
  assert.ok(popups.at(-1).includes('FLAPS UP'));

  // 2. At 245 kt IAS (> A320 Flaps 1 limit 230 kt), attempting to extend from UP (0) is locked out
  game._flight3dCore.telemetry = { iasKnots: 245 };
  game.toggleFlaps();
  assert.equal(game.flapIndex, 0, 'toggleFlaps must lock out flap extension from UP above Vfe');
  assert.equal(chimeCount, 1, 'Lockout must play caution chime');
  assert.ok(popups.at(-1).includes('플랩 전개 잠금(FLRS)'));
});

test('FLAPS >= 2 overspeed applies 8-kt hysteresis, 0.6s debounce, and 2.2s FLRS auto-retract without jamming', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const game = Object.create(AirplaneGame.prototype);
  game.isPlaying = true;
  game.isDestroyed = false;
  game.currentPlaneType = 'a320';
  game.groundY = 0;
  game.planeGroup = {
    position: new THREE.Vector3(0, 1500, 0),
    rotation: new THREE.Euler(),
    quaternion: new THREE.Quaternion(),
  };
  // ~242 kt TAS at 1500 m => ~225 kt IAS (above A320 Flaps 2 limit 200 + 8 kt)
  game.velocity = new THREE.Vector3(0, 0, -124.5);
  game.throttle = 0.85;
  game.n1 = 85;
  game.flaps = ['UP', '1', '2', 'FULL'];
  game.flapIndex = 2;
  game.gearExtended = false;
  game.isOnGround = false;
  game.keys = { up: false, down: false, left: false, right: false, fastForward: false, brake: false };
  game.isOverAirport = () => false;

  const popups = [];
  let gpwsTriggered = null;
  game.showPopup = (msg) => { popups.push(msg); };
  game.updateFlapsUI = () => {};
  game.checkFlightMovementReactions = () => {};
  game.triggerGPWS = (type, text, subtext) => { gpwsTriggered = { type, text, subtext }; };
  game.speakGPWS = () => {};
  game.playGPWSWhoopSiren = () => {};
  game.playCautionChime = () => {};
  game.clearGPWS = () => { gpwsTriggered = null; };

  game.initFlight3dPhysics();

  // First 0.5s: debounced, no FLAP OVERSPEED yet
  for (let i = 0; i < 10; i++) {
    game.updateFlightPhysics(0.05);
  }
  assert.equal(game.flapIndex, 2);
  assert.equal(gpwsTriggered, null, 'Overspeed below 0.6s debounce must not trigger GPWS');

  // At 0.7s: warning appears, flaps still at 2
  for (let i = 0; i < 4; i++) {
    game.updateFlightPhysics(0.05);
  }
  assert.equal(game.flapIndex, 2);
  assert.ok(gpwsTriggered && gpwsTriggered.text.includes('FLAP OVERSPEED'), 'Sustained overspeed (0.6s..2.2s) must warn pilot');

  // Past 2.2s: FLRS auto-retracts flaps to UP and clears damage
  for (let i = 0; i < 35; i++) {
    game.updateFlightPhysics(0.05);
  }
  assert.equal(game.flapIndex, 0, 'Sustained overspeed >= 2.2s must trigger FLRS auto-retract');
  assert.equal(game._flight3dCore.aero.leftFlapDamage, 0, 'Flap damage must be reset on FLRS auto-retract');
  assert.ok(popups.some(msg => msg.includes('FLRS 자동 보호')));
});

test('CL-215 normal water landing approach suppresses false PULL_UP and GEAR warnings while steep dives still warn', () => {
  const sandbox = loadPhysicsSandbox();
  const { AirplaneGame, THREE } = sandbox;

  const makeGame = () => {
    const game = Object.create(AirplaneGame.prototype);
    game.isPlaying = true;
    game.isDestroyed = false;
    game.currentPlaneType = 'amphibian';
    game.groundY = 6.84;
    game.planeGroup = {
      position: new THREE.Vector3(0, 25, -10000),
      rotation: new THREE.Euler(),
      quaternion: new THREE.Quaternion(),
    };
    game.velocity = new THREE.Vector3(0, -3.5, -38);
    game.throttle = 0.25;
    game.speed = 135 / 280;
    game.keys = {};
    game.gearExtended = false;
    game.flapIndex = 2;
    game.isOnGround = false;
    game.isOverAirport = () => false;
    game.triggered = null;
    game.triggerGPWS = (type, text, subtext) => {
      game.triggered = { type, text, subtext };
    };
    game.speakGPWS = () => {};
    game.playGPWSWhoopSiren = () => {};
    game.playCautionChime = () => {};
    game.clearGPWS = () => { game.triggered = null; };
    return game;
  };

  // 1. With FlightWarningsCore active across multiple frames (closure accumulation)
  const gameWithCore = makeGame();
  gameWithCore.initFlight3dPhysics();
  for (const gearDown of [false, true]) {
    gameWithCore.gearExtended = gearDown;
    gameWithCore._flightWarningsCore.reset();
    for (let step = 0; step < 8; step++) {
      const alt = 30 - step * 3.5;
      gameWithCore.planeGroup.position.y = alt;
      gameWithCore.verticalSpeed = -3.5;
      gameWithCore.checkGPWS(0.2);
      assert.equal(
        gameWithCore.triggered,
        null,
        `Normal CL-215 water approach (gear=${gearDown}, y=${alt}) must not warn (got ${gameWithCore.triggered?.type})`
      );
    }
    gameWithCore.planeGroup.position.y = 12;
    gameWithCore.verticalSpeed = -4.8;
    gameWithCore.checkGPWS(0.2);
    assert.equal(gameWithCore.triggered, null, `Gentle 4.8 m/s flare over water (gear=${gearDown}) must not warn`);
  }

  // Excessive sink rate (> 5.2 m/s) over water must still trigger PULL_UP
  gameWithCore._flightWarningsCore.reset();
  gameWithCore.planeGroup.position.y = 25;
  gameWithCore.verticalSpeed = -7.0;
  gameWithCore.checkGPWS(0.2);
  assert.equal(gameWithCore.triggered?.type, 'PULL_UP', 'Steep 7.0 m/s dive over water must still trigger PULL_UP');

  // 2. Fallback GPWS branch without _flightWarningsCore
  const fallbackGame = makeGame();
  fallbackGame._flightWarningsCore = null;
  fallbackGame.planeGroup.position.y = 20;
  fallbackGame.verticalSpeed = -3.5;
  fallbackGame.checkGPWS(0.1);
  assert.equal(fallbackGame.triggered, null, 'Fallback GPWS must allow normal CL-215 water approach with gear up');

  fallbackGame.planeGroup.position.y = 25;
  fallbackGame.verticalSpeed = -7.0;
  fallbackGame.checkGPWS(0.1);
  assert.equal(fallbackGame.triggered?.type, 'PULL_UP', 'Fallback GPWS must trigger PULL_UP on 7.0 m/s water dive');
});



