import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function createThreeMock() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    applyQuaternion() { return this; }
    applyMatrix4() { return this; }
    fromBufferAttribute(attr, i) {
      this.x = attr.array[i * 3];
      this.y = attr.array[i * 3 + 1];
      this.z = attr.array[i * 3 + 2];
      return this;
    }
  }
  class Quaternion {
    clone() { return new Quaternion(); }
    copy() { return this; }
  }
  class Matrix4 {
    clone() { return new Matrix4(); }
    copy() { return this; }
    invert() { return this; }
    multiplyMatrices() { return this; }
  }
  class Box3 {
    constructor() {
      this.min = new Vector3(Infinity, Infinity, Infinity);
      this.max = new Vector3(-Infinity, -Infinity, -Infinity);
    }
    expandByPoint(p) {
      this.min.x = Math.min(this.min.x, p.x); this.min.y = Math.min(this.min.y, p.y); this.min.z = Math.min(this.min.z, p.z);
      this.max.x = Math.max(this.max.x, p.x); this.max.y = Math.max(this.max.y, p.y); this.max.z = Math.max(this.max.z, p.z);
      return this;
    }
    isEmpty() { return this.max.x < this.min.x; }
    getCenter(target) {
      return target.set(
        (this.min.x + this.max.x) * 0.5,
        (this.min.y + this.max.y) * 0.5,
        (this.min.z + this.max.z) * 0.5
      );
    }
  }
  class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = array.length / itemSize;
    }
    getX(i) { return this.array[i]; }
  }
  class BufferGeometry {
    constructor() {
      this.attributes = {};
      this.index = null;
      this.disposed = false;
    }
    setAttribute(name, attr) { this.attributes[name] = attr; }
    setIndex(arr) {
      this.index = Array.isArray(arr) ? new BufferAttribute(arr, 1) : arr;
    }
    dispose() { this.disposed = true; }
  }
  class Mesh {
    constructor(geometry, material) {
      this.isMesh = true;
      this.visible = true;
      this.geometry = geometry;
      this.material = material;
      this.matrixWorld = new Matrix4();
      this.userData = {};
    }
    applyMatrix4() {}
    traverse(fn) { fn(this); }
  }
  class Group {
    constructor() {
      this.children = [];
      this.position = new Vector3();
      this.quaternion = new Quaternion();
      this.matrixWorld = new Matrix4();
      this.userData = {};
    }
    add(c) { this.children.push(c); }
    remove(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }
    updateMatrixWorld() {}
    traverse(fn) {
      fn(this);
      for (const c of this.children) {
        if (typeof c.traverse === 'function') c.traverse(fn);
        else fn(c);
      }
    }
  }
  return { Vector3, Quaternion, Matrix4, Box3, BufferAttribute, BufferGeometry, Mesh, Group, Scene: Group };
}

test('spawnAirframeDebris slices the actual aircraft mesh at 1:1 scale into structural debris chunks and clears on reset', () => {
  const THREE = createThreeMock();
  const sandbox = {
    THREE,
    AirplaneGame: { prototype: {} },
    window: {},
    document: { getElementById: () => null }
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/effects.js', 'utf8'), sandbox);
  const game = Object.create(sandbox.AirplaneGame.prototype);

  // Full-scale B747-sized aircraft geometry (length 70m, span 64m, height 19m)
  const positions = new Float32Array([
    // Tri 0: Nose (-35..-26)
    -2, 1, -35,   2, 1, -35,   0, 3, -26,
    // Tri 1: Center fuselage (-10..10)
    -2, 1, -10,   2, 1, -10,   0, 4, 8,
    // Tri 2: Left wing (-32..-6)
    -32, 0, 2,   -6, 0, -4,   -6, 0, 6,
    // Tri 3: Right wing (6..32)
    32, 0, 2,     6, 0, -4,    6, 0, 6,
    // Tri 4: Vertical tail fin (high, aft, centerline)
    0, 12, 24,    0, 19, 34,   0, 12, 34,
    // Tri 5: Aft horizontal tail (low, aft)
    -9, 3, 28,    9, 3, 28,    0, 3, 35
  ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);

  const liveryMat = { name: 'B747_Livery_Mat' };
  const aircraftMesh = new THREE.Mesh(geom, liveryMat);
  const planeGroup = new THREE.Group();
  planeGroup.position.set(160, 120, -5000);
  planeGroup.add(aircraftMesh);

  game.scene = new THREE.Scene();
  game.planeGroup = planeGroup;
  game.currentPlaneType = 'b747';
  game.velocity = new THREE.Vector3(0, 0, -80);
  game.debrisPieces = [];

  const chunks = game.spawnAirframeDebris(planeGroup.position, null);
  assert.equal(chunks.length, 6, 'All 6 structural aircraft sections must be sliced into debris chunks');
  assert.equal(game.debrisPieces.length, 6);

  const bySection = Object.fromEntries(chunks.map((c) => [c.userData.debrisSection, c]));
  assert.deepEqual(
    Object.keys(bySection).sort(),
    ['aftTail', 'centerFuselage', 'leftWing', 'nose', 'rightWing', 'tailFin']
  );

  // Every triangle of the aircraft is preserved in the debris with the original aircraft material
  const totalTris = chunks.reduce((sum, c) => sum + c.userData.triCount, 0);
  assert.equal(totalTris, 6);
  for (const chunk of chunks) {
    const inner = chunk.children[0];
    const pieceMesh = inner.children[0];
    assert.equal(pieceMesh.material, liveryMat, 'Debris piece must reuse the actual aircraft livery material');
  }

  // Real 1:1 spatial placement relative to crash position (160, 120, -5000)
  assert.ok(bySection.leftWing.position.x < 150, 'Left wing debris spawns to the left at real wing span');
  assert.ok(bySection.rightWing.position.x > 170, 'Right wing debris spawns to the right at real wing span');
  assert.ok(bySection.nose.position.z < -5025, 'Nose debris spawns at real nose length (~30m forward)');
  assert.ok(bySection.tailFin.position.z > -4975, 'Tail fin debris spawns at real tail length (~30m aft)');

  // Reset clears and disposes all debris cleanly
  game.resetPartialDamageState();
  assert.equal(game.debrisPieces.length, 0);
  assert.equal(game.scene.children.length, 0);
});
