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

test('speed effect intensity defaults to 0.35, clamps, and persists', () => {
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
  assert.equal(game.speedLinesGroup.visible, true);

  game.setSpeedEffectIntensity(1.5);
  assert.equal(game.speedEffectIntensity, 1.0);
  assert.equal(storage.get('hajun3d_speed_effect_intensity'), '1.00');

  game.setSpeedEffectIntensity(-0.2);
  assert.equal(game.speedEffectIntensity, 0.0);
  assert.equal(game.speedLinesGroup.visible, false);
  assert.equal(game.speedLineMaterial.opacity, 0);
  assert.equal(game.loadSpeedEffectIntensity(), 0.0);
});

test('updateSpeedEffects scales opacity by intensity and hides when OFF', () => {
  const { AirplaneGame, elements, THREE } = loadEffectsHarness();
  const vignetteEl = { style: { opacity: '0' } };
  elements.set('speed-vignette', vignetteEl);

  const game = new AirplaneGame();
  game.scene = { add: () => {} };
  game.planeGroup = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  game.particles = [];
  game.isOnGround = true;
  game.initSpeedEffects();

  // At 0% intensity, even 800 km/h produces no speed lines or vignette
  game.setSpeedEffectIntensity(0);
  for (let i = 0; i < 10; i++) game.updateSpeedEffects(0.016, 800);
  assert.equal(game.speedLinesGroup.visible, false);
  assert.equal(game.speedLineMaterial.opacity, 0);
  assert.equal(vignetteEl.style.opacity, '0');

  // At 35% vs 100%, 100% produces significantly stronger opacity
  game.setSpeedEffectIntensity(0.35);
  for (let i = 0; i < 30; i++) game.updateSpeedEffects(0.016, 800);
  const lowOpacity = game.speedLineMaterial.opacity;
  const lowVignette = parseFloat(vignetteEl.style.opacity);

  game.setSpeedEffectIntensity(1.0);
  for (let i = 0; i < 30; i++) game.updateSpeedEffects(0.016, 800);
  const highOpacity = game.speedLineMaterial.opacity;
  const highVignette = parseFloat(vignetteEl.style.opacity);

  assert.ok(lowOpacity > 0.05 && lowOpacity < 0.3, `expected gentle 35% opacity, got ${lowOpacity}`);
  assert.ok(highOpacity > lowOpacity * 2, `expected 100% opacity (${highOpacity}) > 2x 35% (${lowOpacity})`);
  assert.ok(highVignette > lowVignette, `expected 100% vignette (${highVignette}) > 35% (${lowVignette})`);
});

test('web/index.html includes PC and mobile speed effect intensity controls', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="effect-menu-btn"/);
  assert.match(html, /id="effect-settings-menu"/);
  assert.match(html, /id="effect-intensity-slider-pc"/);
  assert.match(html, /id="effect-intensity-slider-mobile"/);
  assert.match(html, /window\.setSpeedEffectIntensityPercent/);
});
