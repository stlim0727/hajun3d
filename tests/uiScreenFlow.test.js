import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const PANEL_IDS = [
  'overlay-screen', 'settings-screen', 'modal-title', 'modal-desc', 'start-btn',
  'takeoff-direct-btn', 'settings-done-btn', 'settings-new-flight-btn',
  'mobile-menu-modal', 'cam-mode-menu', 'effect-settings-menu', 'emergency-panel',
  'glb-modal', 'hotas-modal', 'place-picker-panel'
];

function createElement() {
  const classes = new Set();
  return {
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      }
    },
    style: {},
    textContent: '',
    innerHTML: '',
    querySelector: () => null
  };
}

function loadDispatcher() {
  const elements = new Map(PANEL_IDS.map((id) => [id, createElement()]));
  elements.get('modal-title').textContent = 'AIRPORT FLIGHT OPERATIONS';
  elements.get('modal-desc').innerHTML = 'default description';
  elements.get('settings-screen').classList.add('hidden');

  let keydownHandler = null;
  const documentStub = {
    readyState: 'loading',
    getElementById: (id) => elements.get(id) || null,
    addEventListener: (type, handler) => { if (type === 'keydown') keydownHandler = handler; }
  };
  const sandbox = {
    console,
    Date,
    setTimeout,
    URLSearchParams,
    requestAnimationFrame: () => {},
    document: documentStub,
    location: { search: '' },
    addEventListener: () => {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/game.js', 'utf8'), sandbox);
  return { window: sandbox, elements, keydown: (key) => keydownHandler({ key }) };
}

function makeGame() {
  return {
    isPlaying: false,
    screenPaused: false,
    keys: { up: true },
    resetHeldControls() { this.keys.up = false; },
    syncSettingsUI() { this.settingsSynced = true; },
    stopJetSound() { this.jetSoundStopped = true; },
  };
}

test('settings remembers lobby or game and pauses only a live flight', () => {
  const { window, elements, keydown } = loadDispatcher();
  const flow = window.ScreenFlow;
  const game = makeGame();
  window.airplaneGame = game;

  assert.equal(flow.current, 'lobby');
  window.openSettings();
  assert.equal(flow.current, 'settings');
  assert.equal(flow.returnTo, 'lobby');
  assert.equal(game.screenPaused, false);
  assert.equal(elements.get('overlay-screen').classList.contains('hidden'), true);
  assert.equal(elements.get('settings-screen').classList.contains('hidden'), false);

  flow.beginGame();
  assert.equal(flow.current, 'game');
  assert.equal(elements.get('settings-screen').classList.contains('hidden'), true);

  elements.get('mobile-menu-modal').classList.remove('hidden');
  window.openSettings();
  assert.equal(flow.returnTo, 'game');
  assert.equal(game.screenPaused, true);
  assert.equal(game.keys.up, false);
  assert.equal(elements.get('mobile-menu-modal').classList.contains('hidden'), true);

  keydown('Escape');
  assert.equal(flow.current, 'game');
  assert.equal(game.screenPaused, false);
  assert.equal(elements.get('settings-new-flight-btn').classList.contains('hidden'), false);
});

test('mission result copy stays on the result screen and is cleared on a new flight', () => {
  const { window, elements } = loadDispatcher();
  const flow = window.ScreenFlow;
  const game = makeGame();
  game.isPlaying = true;
  window.airplaneGame = game;

  const title = elements.get('modal-title');
  const desc = elements.get('modal-desc');
  const originalTitle = title.textContent;
  const originalDesc = desc.innerHTML;

  title.textContent = '🏆 FLIGHT MISSION COMPLETED';
  desc.innerHTML = '<b>report</b>';
  flow.go('lobby', { result: true });

  assert.equal(flow.current, 'lobby');
  assert.equal(game.isPlaying, false);
  assert.equal(title.textContent, '🏆 FLIGHT MISSION COMPLETED');
  assert.equal(desc.innerHTML, '<b>report</b>');

  window.openLobby();
  assert.equal(title.textContent, originalTitle);
  assert.equal(desc.innerHTML, originalDesc);
});

test('direct lobby exit from a live flight stops audio and restores setup', () => {
  const { window, elements } = loadDispatcher();
  const game = makeGame();
  game.isPlaying = true;
  window.airplaneGame = game;

  window.ScreenFlow.beginGame();
  window.openLobby();

  assert.equal(window.ScreenFlow.current, 'lobby');
  assert.equal(game.isPlaying, false);
  assert.equal(game.jetSoundStopped, true);
  assert.equal(elements.get('overlay-screen').classList.contains('hidden'), false);
  assert.equal(elements.get('modal-title').textContent, 'AIRPORT FLIGHT OPERATIONS');
});
