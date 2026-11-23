import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

function loadCore() {
  const sandbox = {
    THREE,
    window: {},
    document: { getElementById: () => null },
    location: { protocol: 'http:', hostname: 'localhost' },
    URLSearchParams,
    console,
    Math,
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/core.js', 'utf8'), sandbox);
  return vm.runInContext('AirplaneGame', sandbox);
}

function makeGame(AirplaneGame) {
  const game = Object.create(AirplaneGame.prototype);
  game.scene = { position: new THREE.Vector3() };
  game.camera = { position: new THREE.Vector3(1000010, 10, -2000030) };
  game.planeGroup = { position: new THREE.Vector3(1000000, 0, -2000000) };
  game.renderOrigin = new THREE.Vector3();
  game.renderOriginApplied = new THREE.Vector3();
  game.geoSimAnchorBase = { x: 160, y: 0, z: 1600 };
  game.geoRenderSimAnchor = { ...game.geoSimAnchorBase };
  game.geoFocusBases = [{ x: 500, y: 0, z: 900, radius: 12000, maxAltitude: 2000 }];
  game.geoRenderFocusAnchors = [{ ...game.geoFocusBases[0] }];
  return game;
}

test('applyFloatingOrigin rebases scene, camera and tile anchors without drift', () => {
  const game = makeGame(loadCore());
  game.applyFloatingOrigin();

  assert.equal(game.scene.position.x, -1000000);
  assert.ok(Math.abs(game.scene.position.y) < 1e-9);
  assert.equal(game.scene.position.z, 2000000);
  assert.deepEqual(game.camera.position.toArray(), [10, 10, -30]);
  assert.deepEqual(game.geoRenderSimAnchor, { x: 160 - 1000000, y: 0, z: 1600 + 2000000 });
  assert.equal(game.geoRenderFocusAnchors[0].x, 500 - 1000000);
  assert.equal(game.geoRenderFocusAnchors[0].z, 900 + 2000000);

  // A second rebase with no camera update must neither accumulate nor drift.
  game.applyFloatingOrigin();
  assert.deepEqual(game.camera.position.toArray(), [10, 10, -30]);
  assert.equal(game.scene.position.x, -1000000);
  assert.ok(Math.abs(game.scene.position.y) < 1e-9);
  assert.equal(game.scene.position.z, 2000000);
});

test('applyFloatingOrigin restores world camera before changing origin', () => {
  const game = makeGame(loadCore());
  game.applyFloatingOrigin();

  game.planeGroup.position.set(1000100, 0, -2000100);
  game.applyFloatingOrigin();

  assert.equal(game.scene.position.x, -1000100);
  assert.ok(Math.abs(game.scene.position.y) < 1e-9);
  assert.equal(game.scene.position.z, 2000100);
  assert.deepEqual(game.camera.position.toArray(), [-90, 10, 70]);
  assert.equal(game.geoRenderSimAnchor.x, 160 - 1000100);
  assert.equal(game.geoRenderFocusAnchors[0].z, 900 + 2000100);
});
