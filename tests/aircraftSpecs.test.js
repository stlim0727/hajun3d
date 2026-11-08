import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('validates aircraft aerodynamic specs from config.js', () => {
  const code = readFileSync('web/js/config.js', 'utf8');
  const sandbox = {
    AirplaneGame: { prototype: {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const getSpecs = sandbox.AirplaneGame.prototype.getAircraftSpecs;
  assert.equal(typeof getSpecs, 'function', 'getAircraftSpecs should be attached to AirplaneGame.prototype');

  const requiredTypes = ['a320', 'b747', 'dc10', 'md80', 'concorde', 'amphibian', 'ancestor'];

  for (const type of requiredTypes) {
    const spec = getSpecs(type);
    assert.ok(spec, `Spec for ${type} should exist`);
    assert.ok(spec.name, `Aircraft ${type} must have a name`);
    assert.ok(spec.mass > 0, `Aircraft ${type} mass must be positive`);
    assert.ok(spec.wingArea > 0, `Aircraft ${type} wingArea must be positive`);
    assert.ok(spec.wingSpan > 0, `Aircraft ${type} wingSpan must be positive`);
    assert.ok(spec.maxThrust > 0, `Aircraft ${type} maxThrust must be positive`);
    assert.ok(spec.vRotateKmh > 0, `Aircraft ${type} vRotateKmh must be positive`);
    assert.ok(spec.vStallCleanKmh > 0, `Aircraft ${type} vStallCleanKmh must be positive`);
    assert.ok(spec.vRotateKmh > spec.vStallCleanKmh, `Rotation speed must exceed stall speed for ${type}`);
  }
});
