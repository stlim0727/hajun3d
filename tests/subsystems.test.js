import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';

const EXPECTED_SUBSYSTEMS = [
  'core.js',
  'config.js',
  'physics.js',
  'audio.js',
  'environment.js',
  'airports.js',
  'aircraft_builder.js',
  'glb_pipeline.js',
  'effects.js',
  'input.js',
  'emergency.js',
  'speech.js',
  'ui.js'
];

test('all 13 modular subsystems exist in web/js and are non-empty', () => {
  for (const name of EXPECTED_SUBSYSTEMS) {
    const path = `web/js/${name}`;
    assert.ok(existsSync(path), `Subsystem file ${path} must exist`);
    const stat = statSync(path);
    assert.ok(stat.size > 100, `Subsystem file ${path} must have substantial content (size: ${stat.size} bytes)`);
  }
});
