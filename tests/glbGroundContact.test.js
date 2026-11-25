import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadPipeline() {
  const THREE = {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    },
    Box3: class {
      setFromObject(scene) {
        const parentY = scene.parent?.matrixWorldY || 0;
        this.min = { y: scene.worldMinY + parentY };
        this.max = { y: this.min.y + 10 };
        return this;
      }
    }
  };
  const sandbox = { THREE, AirplaneGame: function AirplaneGame() {}, console };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/glb_pipeline.js', 'utf8'), sandbox, { filename: 'glb_pipeline.js' });
  return sandbox.AirplaneGame;
}

function makeGame(proto, groundY, groupWorldY) {
  const game = Object.create(proto);
  game.groundY = groundY;
  game.planeGroup = {
    matrixWorldY: 0,
    getWorldPosition() {
      this.matrixWorldY = groupWorldY;
      return { y: groupWorldY };
    }
  };
  return game;
}

function makeScene(localMinY, groupWorldY) {
  return {
    worldMinY: localMinY + groupWorldY,
    position: { y: 0 },
    updated: false,
    updateMatrixWorld() { this.updated = true; }
  };
}

test('GLB gear contacts are aligned to the runway surface for deeply suspended models', () => {
  const AirplaneGame = loadPipeline();
  const game = makeGame(AirplaneGame.prototype, 6.84, 6.84);

  const fan = { position: { y: -6.04 } };
  const b747 = makeScene(-7.59, 6.84);
  game.planeGroup.children = [b747, fan];
  game.alignGLBToRunway(b747);
  assert.ok(Math.abs((b747.worldMinY + b747.position.y) - 2.12) < 1e-6);
  assert.equal(b747.updated, true);
  assert.equal(fan.position.y, -6.04 + b747.position.y);

  const dc10 = makeScene(-7.54, 6.84);
  game.planeGroup.children = [dc10];
  game.alignGLBToRunway(dc10);
  assert.ok(Math.abs((dc10.worldMinY + dc10.position.y) - 2.12) < 1e-6);
});

test('alignment respects non-jet ground height and leaves already aligned models alone', () => {
  const AirplaneGame = loadPipeline();

  const ancestorGame = makeGame(AirplaneGame.prototype, 1.65, 1.65);
  const ancestor = makeScene(-1.34, 1.65);
  ancestorGame.alignGLBToRunway(ancestor);
  assert.ok(Math.abs((ancestor.worldMinY + ancestor.position.y) - 2.12) < 1e-6);

  const aligned = makeScene(-4.72, 6.84);
  const jetGame = makeGame(AirplaneGame.prototype, 6.84, 6.84);
  jetGame.alignGLBToRunway(aligned);
  assert.equal(aligned.position.y, 0);
});

test('airborne rebuild does not bake current altitude into GLB alignment', () => {
  const AirplaneGame = loadPipeline();
  const game = makeGame(AirplaneGame.prototype, 6.84, 1100);
  const scene = {
    worldMinY: 12.48,
    userData: { normalizedMinY: 12.48 },
    position: { y: 0 },
    updated: false,
    updateMatrixWorld() { this.updated = true; }
  };

  game.alignGLBToRunway(scene);

  assert.ok(Math.abs(scene.position.y + 17.2) < 1e-6);
  assert.ok(Math.abs((scene.userData.normalizedMinY + scene.position.y) - (2.12 - 6.84)) < 1e-6);
  assert.equal(scene.updated, true);
});

test('alignGLBToRunway includes attached landing gear (e.g. A350) so tires sit on runway instead of sinking', () => {
  const AirplaneGame = loadPipeline();
  const game = makeGame(AirplaneGame.prototype, 6.84, 6.84);
  const scene = {
    worldMinY: 6.84 - 2.0,
    userData: { normalizedMinY: -2.0 },
    position: { y: 0 },
    updateMatrixWorld() {}
  };
  const noseGear = { position: { y: -1.0 }, userData: { localBottomY: -4.42 } };
  const mainGear = { position: { y: 0.39 }, userData: { localBottomY: -4.01 } };
  game.landingGears = [noseGear, mainGear];
  game.planeGroup.children = [scene, noseGear, mainGear];

  game.alignGLBToRunway(scene);

  // Lowest tire (-4.42) + correction must equal runwaySurfaceY - groundY (2.12 - 6.84 = -4.72)
  const expectedCorrection = (2.12 - 6.84) - (-4.42);
  assert.ok(Math.abs(scene.position.y - expectedCorrection) < 1e-6);
  assert.ok(Math.abs((noseGear.userData.localBottomY + scene.position.y) - (2.12 - 6.84)) < 1e-6);
});
