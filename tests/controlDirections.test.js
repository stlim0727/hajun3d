import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.THREE = THREE;
globalThis.AirplaneGame = class {};
await import('../web/js/physics.js');

const proto = globalThis.AirplaneGame.prototype;

function visualState(overrides = {}) {
  const calls = [];
  const self = {
    keys: { left: false, right: false, up: false, down: false },
    joystickData: { active: false },
    hotasState: { connected: false },
    touchRudder: 0,
    isTouchRudderReleasing: false,
    controlSurfaces: {},
    glbMovingPartsController: {
      updateFlightControls(_dt, state) { calls.push(state); }
    },
    ...overrides
  };
  proto.updateControlSurfaces.call(self, 0.016);
  assert.equal(calls.length, 1, 'GLB controller must receive one visual control frame');
  return calls[0];
}

test('climb input raises the elevator trailing edge', () => {
  // ArrowDown is pull-back/climb in this simulator. The visual convention is
  // negative elevator deflection = trailing edge up = nose up.
  const state = visualState({ keys: { left: false, right: false, up: false, down: true } });
  assert.ok(state.targetElevator < 0, `expected negative elevator, got ${state.targetElevator}`);
});

test('right roll drives ailerons and coordinated right rudder', () => {
  const state = visualState({ keys: { left: false, right: true, up: false, down: false } });
  assert.ok(state.targetAileron > 0, `expected right-roll aileron, got ${state.targetAileron}`);
  // Coordinated flight yaws the nose the same way as the roll, not against it.
  assert.ok(state.targetRudder > 0, `expected coordinated right rudder, got ${state.targetRudder}`);
});

test('right rudder input yaws the nose right', () => {
  const state = visualState({ touchRudder: 1 });
  assert.ok(state.targetRudder > 0, `expected right rudder, got ${state.targetRudder}`);
});

test('left roll mirrors aileron and rudder directions', () => {
  const state = visualState({ keys: { left: true, right: false, up: false, down: false } });
  assert.ok(state.targetAileron < 0, `expected left-roll aileron, got ${state.targetAileron}`);
  assert.ok(state.targetRudder < 0, `expected coordinated left rudder, got ${state.targetRudder}`);
});
