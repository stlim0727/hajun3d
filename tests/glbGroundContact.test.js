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
        this.min = { y: scene.worldMinY };
        this.max = { y: scene.worldMinY + 10 };
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
    getWorldPosition: () => ({ y: groupWorldY })
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
