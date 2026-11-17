import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadProximityHarness() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    applyQuaternion() { return this; }
    setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
  }

  class Quaternion {
    copy() { return this; }
  }

  const THREE = {
    Vector3,
    Quaternion,
    AdditiveBlending: 2,
    RepeatWrapping: 1000,
    MathUtils: {
      lerp: (a, b, t) => a + (b - a) * t
    },
    BufferGeometry: class {
      constructor() { this.attributes = {}; }
      setAttribute(name, attr) { this.attributes[name] = attr; }
    },
    BufferAttribute: class {
      constructor(array, itemSize) {
        this.array = array;
        this.itemSize = itemSize;
        this.needsUpdate = false;
      }
    },
    PlaneGeometry: class {},
    IcosahedronGeometry: class {},
    LineBasicMaterial: class {
      constructor(opts = {}) { Object.assign(this, opts); }
    },
    LineSegments: class {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.position = new Vector3();
        this.quaternion = new Quaternion();
        this.visible = true;
      }
    },
    MeshBasicMaterial: class {
      constructor(opts = {}) {
        Object.assign(this, opts);
        this.color = { setHex: (hex) => { this._hex = hex; } };
      }
    },
    Mesh: class {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.position = new Vector3();
        this.rotation = new Vector3();
        this.scale = new Vector3(1, 1, 1);
        this.visible = true;
      }
    },
    CanvasTexture: class {
      constructor(canvas) {
        this.canvas = canvas;
        const repeat = {
          rx: 1,
          ry: 1,
          set(x, y) { this.rx = x; this.ry = y; }
        };
        this.repeat = repeat;
      }
    },
    DirectionalLight: class {
      constructor() {
        this.position = new Vector3();
        this.target = { position: new Vector3(), updateMatrixWorld: () => {} };
        this.shadow = {
          mapSize: { width: 0, height: 0 },
          camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 }
        };
      }
    },
    AmbientLight: class {},
    HemisphereLight: class {}
  };

  class AirplaneGame {}

  const context = {
    THREE,
    AirplaneGame,
    DEFAULT_SPEED_EFFECT_INTENSITY: 0.35,
    SPEED_EFFECT_STORAGE_KEY: 'hajun3d_speed_effect_intensity',
    localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      getElementById: () => null,
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          lineCap: 'round',
          fillRect: () => {},
          beginPath: () => {},
          arc: () => {},
          fill: () => {},
          stroke: () => {},
          bezierCurveTo: () => {},
          lineTo: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} })
        })
      })
    },
    performance: { now: () => 1000 },
    console
  };

  vm.runInNewContext(readFileSync('web/js/effects.js', 'utf8'), context);
  vm.runInNewContext(readFileSync('web/js/environment.js', 'utf8'), context);

  const game = new AirplaneGame();
  game.scene = { add: () => {} };
  game.planeGroup = {
    position: new Vector3(0, 6.84, 0),
    rotation: new Vector3(),
    quaternion: new Quaternion()
  };
  game.groundY = 6.84;
  game.currentPlaneType = 'b737';
  game.isOnGround = false;
  return { game, THREE };
}

test('getSurfaceUnderPlane distinguishes airports, continent, and open ocean', () => {
  const { game } = loadProximityHarness();
  const s1 = game.getSurfaceUnderPlane(0, 0);
  assert.equal(s1.surfaceY, 2.0);
  assert.equal(s1.isWater, false);

  const s2 = game.getSurfaceUnderPlane(150, -15000);
  assert.equal(s2.surfaceY, -1.5);
  assert.equal(s2.isWater, true);

  const s3 = game.getSurfaceUnderPlane(5000, -35000);
  assert.equal(s3.surfaceY, 0.0);
  assert.equal(s3.isWater, false);

  const s4 = game.getSurfaceUnderPlane(0, -45000);
  assert.equal(s4.surfaceY, 2.0);
  assert.equal(s4.isWater, false);
});

test('updateProximitySurfaceEffects activates shadow, water wake ring, and spray at low water altitude', () => {
  const { game } = loadProximityHarness();
  game.initSpeedEffects();

  // Fly 10m above open ocean (surfaceY = -1.5, gearOffset = 4.84 -> pos.y = 13.34 gives clearance = 10m)
  game.planeGroup.position.set(0, 13.34, -10000);
  game.updateProximitySurfaceEffects(0.05, 260);

  assert.equal(game.proximityShadowMesh.visible, true);
  assert.ok(game.proximityShadowMesh.material.opacity > 0.2);
  assert.equal(game.waterWakeRingMesh.visible, true);
  assert.ok(game.waterWakeRingMesh.material.opacity > 0.1);
  assert.ok(game.proximityParticlePool.some((p) => p.active && p.mesh.visible));

  // Climb to 250m above water: shadow and wake ring hide
  game.planeGroup.position.set(0, 260, -10000);
  game.updateProximitySurfaceEffects(0.05, 260);
  assert.equal(game.proximityShadowMesh.visible, false);
  assert.equal(game.waterWakeRingMesh.visible, false);
});

test('updateSunShadowTarget tracks aircraft position across the entire flight path', () => {
  const { game } = loadProximityHarness();
  game.initLights();
  game.planeGroup.position.set(320, 45, -24500);
  game.updateSunShadowTarget();

  assert.ok(Math.abs(game.sunLight.target.position.x - 320) < 1.0);
  assert.ok(Math.abs(game.sunLight.target.position.z - (-24500)) < 1.0);
  assert.ok(Math.abs(game.sunLight.position.x - 820) < 1.0);
  assert.ok(Math.abs(game.sunLight.position.z - (-24100)) < 1.0);
});

test('ocean and terrain canvas textures use high-frequency tiling for low-altitude optical flow', () => {
  const { game } = loadProximityHarness();
  const oceanTex = game.createOceanCanvasTexture();
  const terrainTex = game.createTerrainCanvasTexture();

  assert.equal(oceanTex.repeat.rx, 1200);
  assert.equal(oceanTex.repeat.ry, 1200);
  assert.equal(terrainTex.repeat.rx, 500);
  assert.equal(terrainTex.repeat.ry, 400);
});
