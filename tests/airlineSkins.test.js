import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadBuilder() {
  const storage = new Map();
  const buttons = ['default', 'jeju', 'jin', 'eastar', 'korean', 'asiana', 'tway'].map(id => ({
    dataset: { skin: id },
    classList: { toggle(name, on) { this[name] = on; } }
  }));
  const sandbox = {
    AirplaneGame: { prototype: {} },
    THREE: { CanvasTexture: class {} },
    window: {
      localStorage: {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, value)
      }
    },
    document: { querySelectorAll: () => buttons }
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/aircraft_builder.js', 'utf8'), sandbox);
  return { proto: sandbox.AirplaneGame.prototype, storage, buttons };
}

function material(name, hex, options = {}) {
  let current = hex;
  return {
    name,
    transparent: !!options.transparent,
    map: options.map || null,
    userData: {},
    needsUpdate: false,
    color: {
      get r() { return ((current >> 16) & 255) / 255; },
      get g() { return ((current >> 8) & 255) / 255; },
      get b() { return (current & 255) / 255; },
      setHex(value) { current = value; }
    },
    hex: () => current
  };
}

function sceneWith(materials) {
  return { traverse(callback) { materials.forEach(m => callback({ isMesh: true, material: m })); } };
}

test('Korean airline skins cover Jeju, Jin Air and Eastar Jet with distinct accent colors', () => {
  const { proto } = loadBuilder();
  const skins = Object.create(proto).getAirlineSkins();
  for (const id of ['jeju', 'jin', 'eastar', 'korean', 'asiana', 'tway']) {
    assert.ok(skins.some(s => s.id === id), `${id} must be selectable`);
  }
  assert.equal(new Set(skins.map(s => s.accent)).size, skins.length, 'Each airline needs its own accent color');
});

test('skin recoloring paints GLB body and accent materials but leaves glass, tires and textured parts alone', () => {
  const { proto } = loadBuilder();
  const game = Object.create(proto);
  game.currentPlaneType = 'b747';
  game.activeSkinId = 'jeju';
  const body = material('WhiteFuselage', 0xf5f7fc);
  const accent = material('AirlineBlue', 0x027acc);
  const secondary = material('AirlineRed', 0xe01f26);
  const glass = material('CockpitTintedGlass', 0x101a29, { transparent: true });
  const tire = material('Tire', 0x1e293b);
  const textured = material('Body_White_Fuselage', 0xffffff, { map: {} });
  const scene = sceneWith([body, accent, secondary, glass, tire, textured]);

  game.applyAirlineSkin(scene);
  const jeju = game.getAirlineSkins().find(s => s.id === 'jeju');
  assert.equal(body.hex(), jeju.base);
  assert.equal(accent.hex(), jeju.accent);
  assert.equal(secondary.hex(), jeju.secondary);
  assert.equal(glass.hex(), 0x101a29);
  assert.equal(tire.hex(), 0x1e293b);
  assert.equal(textured.hex(), 0xffffff);
});

test('changing skin repaints the current GLB immediately and persists the choice', () => {
  const { proto, storage, buttons } = loadBuilder();
  const game = Object.create(proto);
  game.currentPlaneType = 'md80';
  game.activeSkinId = 'jeju';
  const accent = material('AirlineBlue', 0x027acc);
  game.customGLBModel = sceneWith([accent]);

  game.setAirlineSkin('jin');
  const jin = game.getAirlineSkins().find(s => s.id === 'jin');
  assert.equal(accent.hex(), jin.accent, 'Current aircraft must repaint without a model reload');
  assert.equal(storage.get('hajun-airline-skin'), 'jin');
  assert.equal(buttons.find(b => b.dataset.skin === 'jin').classList.active, true);
  assert.equal(buttons.find(b => b.dataset.skin === 'jeju').classList.active, false);

  const restored = Object.create(proto);
  assert.equal(restored.getActiveAirlineSkin().id, 'jin', 'Persisted skin survives a fresh game instance');
});

test('A320 gray fuselage and colored markings are painted; procedural livery uses the airline title', () => {
  const { proto } = loadBuilder();
  const game = Object.create(proto);
  game.currentPlaneType = 'a320';
  game.activeSkinId = 'eastar';
  const fuselage = material('Material.019', 0x919191);
  const marking = material('Material.014', 0xff0000);
  game.applyAirlineSkin(sceneWith([fuselage, marking]));
  const eastar = game.getAirlineSkins().find(s => s.id === 'eastar');
  assert.equal(fuselage.hex(), eastar.base);
  assert.equal(marking.hex(), eastar.secondary);

  const stops = [];
  const texts = [];
  const fills = [];
  game.fuselageCanvas = {};
  game.fuselageCtx = {
    set fillStyle(value) { fills.push(value); },
    clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, closePath() {}, fill() {}, stroke() {}, save() {}, restore() {},
    translate() {}, rotate() {}, roundRect() {}, rect() {}, ellipse() {}, strokeRect() {},
    createLinearGradient() { return { addColorStop(position, color) { stops.push(color); } }; },
    fillText(text) { texts.push(text); }
  };
  game.fuselageTexture = { needsUpdate: false };
  game.updateFuselageTexture('a320', false);
  assert.ok(texts.includes('EASTAR JET'), 'Fuselage lettering must follow the chosen airline');
  assert.ok(stops.some(color => color === 'rgb(255, 255, 255)'), 'Fuselage base must use the skin base color');

  assert.ok(fills.includes(game._skinCss(eastar.accent, 1.45)), 'Cheatline must use the skin accent color');
});
