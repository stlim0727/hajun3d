import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadEffectsHarness() {
  const storage = new Map();
  const elements = new Map();

  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    applyQuaternion() { return this; }
  }

  class Quaternion {
    copy() { return this; }
  }

  const THREE = {
    Vector3,
    Quaternion,
    AdditiveBlending: 2,
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
        this.frustumCulled = true;
      }
    }
  };

  function AirplaneGame() {}

  const context = {
    THREE,
    AirplaneGame,
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v))
    },
    document: {
      getElementById: (id) => elements.get(id) || null,
      querySelectorAll: () => []
    }
  };
  vm.createContext(context);

  const effectsSrc = readFileSync(new URL('../web/js/effects.js', import.meta.url), 'utf8');
  vm.runInContext(effectsSrc, context, { filename: 'effects.js' });

  return { AirplaneGame, storage, elements, THREE };
}

test('speed effect intensity defaults to 0.35, clamps, and persists without rain-like speed lines', () => {
  const { AirplaneGame, storage, elements, THREE } = loadEffectsHarness();
  const vignetteEl = { style: { opacity: '0' } };
  elements.set('speed-vignette', vignetteEl);

  const game = new AirplaneGame();
  game.scene = { add: () => {} };
  game.planeGroup = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  game.particles = [];
  game.isOnGround = true;

  game.initSpeedEffects();
  assert.equal(game.speedEffectIntensity, 0.35);
  assert.equal(game.speedLinesGroup, undefined, 'Rain-like 3D speed lines must not be created');
  assert.equal(game.speedLineMaterial, undefined, 'Rain-like speed-line material must not be created');

  game.setSpeedEffectIntensity(1.5);
  assert.equal(game.speedEffectIntensity, 1.0);
  assert.equal(storage.get('hajun3d_speed_effect_intensity'), '1.00');

  game.setSpeedEffectIntensity(-0.2);
  assert.equal(game.speedEffectIntensity, 0.0);
  assert.equal(vignetteEl.style.opacity, '0');
  assert.equal(game.loadSpeedEffectIntensity(), 0.0);
});

test('updateSpeedEffects scales only the vignette by intensity and hides when OFF', () => {
  const { AirplaneGame, elements, THREE } = loadEffectsHarness();
  const vignetteEl = { style: { opacity: '0' } };
  elements.set('speed-vignette', vignetteEl);

  const game = new AirplaneGame();
  game.scene = { add: () => {} };
  game.planeGroup = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  game.particles = [];
  game.isOnGround = true;
  game.initSpeedEffects();

  // At 0% intensity, even 800 km/h produces no vignette
  game.setSpeedEffectIntensity(0);
  for (let i = 0; i < 10; i++) game.updateSpeedEffects(0.016, 800);
  assert.equal(vignetteEl.style.opacity, '0');

  // At 35% vs 100%, 100% produces a significantly stronger vignette
  game.setSpeedEffectIntensity(0.35);
  game.updateSpeedEffects(0.016, 800);
  const lowVignette = parseFloat(vignetteEl.style.opacity);

  game.setSpeedEffectIntensity(1.0);
  game.updateSpeedEffects(0.016, 800);
  const highVignette = parseFloat(vignetteEl.style.opacity);

  assert.ok(lowVignette > 0.1 && lowVignette < 0.4, `expected gentle 35% vignette, got ${lowVignette}`);
  assert.ok(highVignette > lowVignette * 2, `expected 100% vignette (${highVignette}) > 2x 35% (${lowVignette})`);
});

test('web/index.html includes PC and mobile speed effect intensity controls', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="effect-menu-btn"/);
  assert.match(html, /id="effect-settings-menu"/);
  assert.match(html, /id="effect-intensity-slider-pc"/);
  assert.match(html, /id="effect-intensity-slider-mobile"/);
  assert.match(html, /window\.setSpeedEffectIntensityPercent/);
});
