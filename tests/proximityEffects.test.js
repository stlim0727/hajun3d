import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadProximityHarness() {
  class Vector2 {
    constructor(x = 0, y = 0) {
      this.x = x; this.y = y;
    }
    set(x, y) { this.x = x; this.y = y; return this; }
  }

  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    applyQuaternion() { return this; }
    setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
  }

  class Quaternion {
    copy() { return this; }
  }

  const THREE = {
    Vector2,
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
        this.count = array.length / itemSize;
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
      createElement: () => {
        const canvas = {
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
            moveTo: () => {},
            lineTo: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createImageData: (w, h) => ({
              width: w,
              height: h,
              data: new Uint8ClampedArray(w * h * 4)
            }),
            putImageData: (img) => { canvas.lastImageData = img; }
          })
        };
        return canvas;
      }
    },
    performance: { now: () => 1000 },
    console
  };

  vm.runInNewContext(readFileSync('web/js/effects.js', 'utf8'), context);
  vm.runInNewContext(readFileSync('web/js/environment.js', 'utf8'), context);
  vm.runInNewContext(readFileSync('web/js/airports.js', 'utf8'), context);

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
  assert.equal(game.waterBowWakeMesh.visible, false);
});

test('water landing and planing activate bow wake, expanding ripple rings, and bilateral chine spray', () => {
  const { game } = loadProximityHarness();
  game.currentPlaneType = 'amphibian';
  game.initSpeedEffects();

  game.planeGroup.position.set(0, 0.35, -10000);
  game.isOnGround = true;

  game.triggerWaterTouchdownSplash(2.2);
  game.updateProximitySurfaceEffects(0.25, 140);

  assert.equal(game.waterBowWakeMesh.visible, true);
  assert.ok(game.waterBowWakeMesh.material.opacity > 0.2);

  const activeRipples = game.waterRipplePool.filter((r) => r.active && r.mesh.visible);
  assert.ok(activeRipples.length >= 4, 'Splash and planing must emit expanding concentric ripple rings');
  const initialScaleX = activeRipples[0].mesh.scale.x;

  game.updateProximitySurfaceEffects(0.35, 140);
  assert.ok(activeRipples[0].mesh.scale.x > initialScaleX, 'Active water ripple rings must expand over time');
  assert.ok(game.proximityParticlePool.some((p) => p.active && p.mesh.visible), 'Water planing must emit chine spray particles');
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
test('normal map textures encode outward tangent-space Z and non-flat slopes', () => {
  const { game } = loadProximityHarness();
  for (const make of [game.createTerrainNormalTexture, game.createOceanNormalTexture]) {
    const tex = make.call(game);
    const data = tex.canvas.lastImageData.data;
    let inward = 0, greenFlat = true, greenSample = data[1];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 2] <= 128) inward++;
      if (data[i + 1] !== greenSample) greenFlat = false;
    }
    assert.equal(inward, 0, 'normal map blue channel must be positive outward Z everywhere');
    assert.equal(greenFlat, false, 'normal map green channel must carry the second slope, not a constant');
  }
});

test('takeoff roll and low climb over runway/land spawn no ground dust particles', () => {
  const { game } = loadProximityHarness();
  game.initSpeedEffects();

  // Takeoff roll on departure runway (x = 0, z = 0 -> isWater = false)
  game.isOnGround = true;
  game.planeGroup.position.set(0, 6.84, 0);
  game.updateProximitySurfaceEffects(0.05, 220);
  assert.equal(game.proximityParticlePool.some((p) => p.active || p.mesh.visible), false);

  // Low-altitude climb over runway/land
  game.isOnGround = false;
  game.planeGroup.position.set(0, 10.84, -400);
  game.updateProximitySurfaceEffects(0.05, 260);
  assert.equal(game.proximityParticlePool.some((p) => p.active || p.mesh.visible), false);
});

test('createJetExhaustParticles does not emit flame or exhaust cubes at full takeoff throttle', () => {
  const { game, THREE } = loadProximityHarness();
  game.isPlaying = true;
  game.isDestroyed = false;
  game.throttle = 1.0;
  game.speed = 0.85;
  game.particles = [];
  game.engineExhaustPoints = [
    new THREE.Vector3(-6.5, -0.2, 5.0),
    new THREE.Vector3(6.5, -0.2, 5.0)
  ];
  game.sharedExhaustGeo = {};
  game.exhaustMatFull = {};
  game.exhaustMatNormal = {};

  for (let i = 0; i < 4; i++) {
    game.createJetExhaustParticles();
  }
  assert.equal(game.particles.length, 0);
});

test('applyEnvironmentTexturesToGLB assigns UVs, textures, displacement maps, and white base color to GLB ground/ocean meshes', () => {
  const { game, THREE } = loadProximityHarness();

  const makeMat = (name, hex = 0x1e293b) => {
    const mat = {
      name,
      color: { _hex: hex, setHex(h) { this._hex = h; } },
      map: null,
      bumpMap: null,
      bumpScale: 0,
      roughness: 0.5,
      metalness: 0.5,
      vertexColors: false,
      polygonOffset: false,
      polygonOffsetFactor: 0,
      polygonOffsetUnits: 0,
      needsUpdate: false,
      clone() {
        return makeMat(this.name, this.color._hex);
      }
    };
    return mat;
  };

  const makeMesh = (verts, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    return {
      isMesh: true,
      geometry: geo,
      material: mat,
      position: new THREE.Vector3()
    };
  };

  const quadVerts = (x0, x1, y, z0, z1) => [
    x0, y, z0,
    x1, y, z0,
    x1, y, z1,
    x0, y, z1
  ];

  const oceanMesh = makeMesh(quadVerts(-60000, 60000, -1.5, -85000, 35000), makeMat('VastOceanFloor', 0x026bb8));
  const haeundaeWaterMesh = makeMesh(quadVerts(-2500, 2500, 0, -28000, -26000), makeMat('OceanWater', 0x0f70ad));
  const continentMesh = makeMesh(quadVerts(-25000, 25000, 0, -68000, -28000), makeMat('ContinentalMainlandGrass', 0x24612e));
  const airportMesh = makeMesh(quadVerts(-700, 700, 2, -2200, 2200), makeMat('AirportGround', 0x333d4d));
  const sharedAsphaltMat = makeMat('AsphaltRunway', 0x1f242e);
  const runwayMesh = makeMesh(quadVerts(110, 210, 2.1, -1900, 1900), sharedAsphaltMat);
  const taxiwayVerts = [
    ...quadVerts(-150, -90, 2.08, -1900, 1900),
    ...quadVerts(-90, 130, 2.08, -1625, -1575),
    ...quadVerts(-90, 130, 2.08, -825, -775),
    ...quadVerts(-90, 130, 2.08, -25, 25),
    ...quadVerts(-90, 130, 2.08, 775, 825),
    ...quadVerts(-90, 130, 2.08, 1575, 1625)
  ];
  const taxiwayMesh = makeMesh(taxiwayVerts, sharedAsphaltMat);
  const sandMesh = makeMesh(quadVerts(-25000, 25000, 0.04, -28300, -27700), makeMat('GoldenCoastlineSand', 0xf5d140));
  const mountainMesh = makeMesh([0, 0, -56000, 100, 500, -56000, -100, 0, -56000], makeMat('MountainProceduralTerrain', 0xffffff));

  const meshes = [
    oceanMesh,
    haeundaeWaterMesh,
    continentMesh,
    airportMesh,
    runwayMesh,
    taxiwayMesh,
    sandMesh,
    mountainMesh
  ];
  const mockScene = {
    traverse(fn) {
      meshes.forEach(fn);
    }
  };

  game.applyEnvironmentTexturesToGLB(mockScene, 'terrain');

  assert.ok(game.oceanTexture, 'oceanTexture should be populated on the game instance');
  assert.equal(game.oceanMaterial, oceanMesh.material);

  for (const m of [oceanMesh, haeundaeWaterMesh, continentMesh, airportMesh, runwayMesh, taxiwayMesh, sandMesh]) {
    const uv = m.geometry.attributes.uv;
    const pos = m.geometry.attributes.position;
    assert.ok(uv, `${m.material.name} must receive uv attribute`);
    assert.equal(uv.itemSize, 2);
    assert.equal(uv.array.length, (pos.array.length / 3) * 2);
    assert.ok(m.material.map, `${m.material.name} must receive diffuse map`);
    assert.ok(m.material.normalMap || m.material.bumpMap, `${m.material.name} must receive terrain displacement map (normal or bump)`);
    assert.equal(m.material.color._hex, 0xffffff, `${m.material.name} base color must reset to white`);
  }

  assert.equal(haeundaeWaterMesh.position.y, -1.46);
  assert.equal(haeundaeWaterMesh.material.polygonOffset, true);

  assert.notEqual(runwayMesh.material, taxiwayMesh.material, 'Runway and taxiway must clone shared AsphaltRunway material');
  assert.equal(runwayMesh.material.map, game.runwayAsphaltTexture);
  assert.equal(taxiwayMesh.material.map, game.taxiwayAsphaltTexture);
  assert.equal(runwayMesh.geometry.attributes.uv.array[0], 0);
  assert.equal(runwayMesh.geometry.attributes.uv.array[2], 1);

  assert.ok(mountainMesh.geometry.attributes.uv, 'Mountain terrain must receive uv attribute for normal mapping');
  assert.equal(mountainMesh.material.vertexColors, true);
  assert.equal(mountainMesh.material.normalMap, game.terrainNormalTexture);
  assert.equal(mountainMesh.material.map, null);
});
