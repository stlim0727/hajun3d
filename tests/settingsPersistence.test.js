import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadGamePrototype(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value))
  };
  const elements = new Map([
    ['sound-btn', { textContent: '🔊' }],
    ['settings-sound-btn', { textContent: '' }],
    ['settings-time-btn', { textContent: '' }],
    ['settings-effect-slider', { value: '35' }],
    ['settings-effect-value', { textContent: '' }]
  ]);
  const sandbox = {
    localStorage,
    window: { localStorage },
    document: {
      getElementById: (id) => elements.get(id) || null,
      querySelectorAll: () => []
    },
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../web/js/core.js', import.meta.url), 'utf8'), sandbox);
  const AirplaneGame = vm.runInContext('AirplaneGame', sandbox);
  vm.runInContext(readFileSync(new URL('../web/js/audio.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../web/js/ui.js', import.meta.url), 'utf8'), sandbox);

  return { AirplaneGame, storage, elements };
}

test('saved sound-off and night choices restore on a fresh game instance', () => {
  const { AirplaneGame } = loadGamePrototype({
    hajun3d_sound_enabled: 'false',
    hajun3d_time_of_day: 'night'
  });
  const game = Object.create(AirplaneGame.prototype);
  game.soundEnabled = true;
  game.timeOfDay = 'day';

  game.restoreUserSettings();

  assert.equal(game.soundEnabled, false, 'saved mute must survive a reload');
  assert.equal(game.timeOfDay, 'night', 'saved time of day must survive a reload');
});

test('toggling sound writes the preference used by the next restore', () => {
  const { AirplaneGame, storage } = loadGamePrototype();
  const game = Object.create(AirplaneGame.prototype);
  game.soundEnabled = true;
  game.syncAudioHint = () => {};
  game.resumeAudio = () => {};

  game.setMuted(true);

  assert.equal(storage.get('hajun3d_sound_enabled'), 'false');
  const restored = Object.create(AirplaneGame.prototype);
  restored.restoreUserSettings();
  assert.equal(restored.soundEnabled, false);
});

test('day/night choice persists and constructor restore stays silent', () => {
  const { AirplaneGame, storage } = loadGamePrototype();
  const game = Object.create(AirplaneGame.prototype);
  game.timeOfDay = 'day';
  let announcements = 0;
  game.showPopup = () => { announcements++; };

  game.setTimeOfDay('night');

  assert.equal(storage.get('hajun3d_time_of_day'), 'night');
  assert.equal(announcements, 1, 'user-initiated toggle should announce');

  const restored = Object.create(AirplaneGame.prototype);
  restored.restoreUserSettings();
  assert.equal(restored.timeOfDay, 'night');

  game.setTimeOfDay('day', { announce: false });
  assert.equal(announcements, 1, 'startup restore should not show a popup');
});

test('settings UI mirrors restored sound state', () => {
  const { AirplaneGame, elements } = loadGamePrototype({
    hajun3d_sound_enabled: 'false'
  });
  const game = Object.create(AirplaneGame.prototype);
  game.restoreUserSettings();
  game.speedEffectIntensity = 0.35;

  game.syncSettingsUI();

  assert.equal(elements.get('sound-btn').textContent, '🔇');
  assert.equal(elements.get('settings-sound-btn').textContent, '🔇 사운드 OFF');
});
