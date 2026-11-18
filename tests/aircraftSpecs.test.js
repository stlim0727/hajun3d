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

  const requiredTypes = ['a320', 'b737', 'b738', 'b747', 'dc10', 'md80', 'concorde', 'amphibian', 'ancestor'];

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

test('validates DC-10 and airliner rudder hinge rotation axis alignment in aircraft_builder.js', () => {
  const code = readFileSync('web/js/aircraft_builder.js', 'utf8');

  // Verify DC-10 rudder pivot alignment with the vertical stabilizer trailing edge
  const dc10Match = code.match(/if \(type === 'dc10'\) \{[\s\S]*?finMesh\.position\.set\(([^)]+)\);[\s\S]*?finMesh\.rotation\.x = ([^;]+);[\s\S]*?const rudderPivot = new THREE\.Group\(\);[\s\S]*?rudderPivot\.position\.set\(([^)]+)\);[\s\S]*?rudderPivot\.rotation\.x = ([^;]+);/);
  assert.ok(dc10Match, 'DC-10 must configure finMesh and rudderPivot');

  const finPos = dc10Match[1].split(',').map(s => parseFloat(s.trim()));
  const finRotX = parseFloat(dc10Match[2].trim());
  const pivotPos = dc10Match[3].split(',').map(s => parseFloat(s.trim()));
  const pivotRotX = parseFloat(dc10Match[4].trim());

  assert.equal(pivotRotX, finRotX, 'DC-10 rudderPivot must match finMesh sweep rotation.x');

  // Trailing edge center calculation: finMesh depth = 5.2 (halfDepth = 2.6)
  const expectedPivotY = finPos[1] - 2.6 * Math.sin(finRotX);
  const expectedPivotZ = finPos[2] + 2.6 * Math.cos(finRotX);

  assert.ok(Math.abs(pivotPos[1] - expectedPivotY) < 0.05, `DC-10 rudderPivot Y (${pivotPos[1]}) must match trailing edge Y (${expectedPivotY.toFixed(2)})`);
  assert.ok(Math.abs(pivotPos[2] - expectedPivotZ) < 0.05, `DC-10 rudderPivot Z (${pivotPos[2]}) must match trailing edge Z (${expectedPivotZ.toFixed(2)})`);
});
