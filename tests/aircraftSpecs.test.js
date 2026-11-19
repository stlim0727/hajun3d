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

  const requiredTypes = ['a320', 'a350', 'b737', 'b738', 'b747', 'dc10', 'md80', 'concorde', 'amphibian', 'ancestor'];

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

test('validates A350 specifications and in-game placement directly after A320', () => {
  const configCode = readFileSync('web/js/config.js', 'utf8');
  const indexHtml = readFileSync('web/index.html', 'utf8');
  const gameJs = readFileSync('web/game.js', 'utf8');

  const sandbox = { AirplaneGame: { prototype: {} } };
  vm.createContext(sandbox);
  vm.runInContext(configCode, sandbox);

  const spec = sandbox.AirplaneGame.prototype.getAircraftSpecs('a350');
  assert.ok(spec, 'A350 spec must exist');
  assert.equal(spec.name, 'Airbus A350-900 XWB');
  assert.equal(spec.mtowKg, 280000, 'A350 MTOW should be 280,000 kg');
  assert.equal(spec.wingSpan, 64.75, 'A350 wingspan should be 64.75 m');
  assert.equal(spec.wingArea, 442.0, 'A350 wing area should be 442 m²');
  assert.equal(spec.numEngines, 2, 'A350 is twin-engine');
  assert.equal(spec.maxThrust, 749000, 'A350 twin Trent XWB total thrust should be 749 kN');

  // Verify UI selector order: select-a350 must be right after select-a320
  const a320Idx = indexHtml.indexOf('id="select-a320"');
  const a350Idx = indexHtml.indexOf('id="select-a350"');
  const b747Idx = indexHtml.indexOf('id="select-b747"');

  assert.ok(a320Idx !== -1, 'select-a320 button must exist');
  assert.ok(a350Idx !== -1, 'select-a350 button must exist');
  assert.ok(a350Idx > a320Idx && a350Idx < b747Idx, 'select-a350 button must be immediately after select-a320');

  // Verify nextPlane cycle array has a350 right after a320
  assert.ok(gameJs.includes("'a320', 'a350'"), 'window.nextPlane must place a350 directly after a320');
});

test('validates in-game A320 uses simplified GLB binary and moving parts are attached', () => {
  const a320Buf = readFileSync('web/models/a320.glb');
  const simplifiedBuf = readFileSync('web/models/a320_simplified.glb');

  assert.equal(a320Buf.length, simplifiedBuf.length, 'In-game web/models/a320.glb must be replaced with a320_simplified.glb');
  assert.ok(a320Buf.length > 2000 * 1024, 'a320.glb must be the full manifold simplified CAD model (>2MB)');

  const builderCode = readFileSync('web/js/aircraft_builder.js', 'utf8');
  assert.ok(builderCode.includes('attachGLBMovingParts'), 'aircraft_builder must define attachGLBMovingParts');
  assert.ok(builderCode.includes('createGLBLandingGear'), 'aircraft_builder must define createGLBLandingGear');

  const pipelineCode = readFileSync('web/js/glb_pipeline.js', 'utf8');
  assert.ok(pipelineCode.includes('this.attachGLBMovingParts'), 'applyGLBScene must attach moving parts');
  assert.ok(pipelineCode.includes("scene.rotation.set(0, Math.PI, 0)"), 'applyGLBScene must orient A320/A350 forward');
  assert.ok(pipelineCode.includes('this.setupGLBControlSurfaceShaders'), 'applyGLBScene must setup control surface shaders');
  assert.ok(pipelineCode.includes('this.glbGearNodes'), 'applyGLBScene must track GLB landing gear nodes');

  const physicsCode = readFileSync('web/js/physics.js', 'utf8');
  assert.ok(physicsCode.includes('this.glbShaderUniforms'), 'physics must update glbShaderUniforms for deflections');
  assert.ok(physicsCode.includes('this.glbGearNodes'), 'physics must update glbGearNodes visibility');
});
