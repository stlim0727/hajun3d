import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadEnvironmentPrototype() {
  class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = array.length / itemSize;
    }
    getX(i) { return this.array[i * this.itemSize]; }
    getY(i) { return this.array[i * this.itemSize + 1]; }
    getZ(i) { return this.array[i * this.itemSize + 2]; }
    setX(i, v) { this.array[i * this.itemSize] = v; }
    setY(i, v) { this.array[i * this.itemSize + 1] = v; }
    setZ(i, v) { this.array[i * this.itemSize + 2] = v; }
  }

  class BufferGeometry {
    constructor() {
      this.attributes = {};
      this.index = null;
      this.normalsComputed = false;
    }
    setIndex(indices) {
      this.index = { array: indices, count: indices.length };
    }
    setAttribute(name, attr) {
      this.attributes[name] = attr;
    }
    computeVertexNormals() {
      this.normalsComputed = true;
    }
  }

  class CylinderGeometry extends BufferGeometry {
    constructor(rt, rb, h, radialSegments = 16) {
      super();
      const verts = [];
      for (let i = 0; i < radialSegments; i++) {
        const a = (i / radialSegments) * Math.PI * 2;
        verts.push(Math.cos(a) * rt, h / 2, Math.sin(a) * rt);
        verts.push(Math.cos(a) * rb, -h / 2, Math.sin(a) * rb);
      }
      this.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
    }
  }

  class Color {
    constructor() {
      this.r = 0;
      this.g = 0;
      this.b = 0;
    }
    setHex(hex) {
      this.r = ((hex >> 16) & 255) / 255;
      this.g = ((hex >> 8) & 255) / 255;
      this.b = (hex & 255) / 255;
      return this;
    }
    copy(other) {
      this.r = other.r;
      this.g = other.g;
      this.b = other.b;
      return this;
    }
    lerp(other, alpha) {
      this.r += (other.r - this.r) * alpha;
      this.g += (other.g - this.g) * alpha;
      this.b += (other.b - this.b) * alpha;
      return this;
    }
  }

  function AirplaneGame() {}
  const context = {
    AirplaneGame,
    THREE: { BufferGeometry, BufferAttribute, CylinderGeometry, Color },
    Math,
    Float32Array
  };

  const code = readFileSync('web/js/environment.js', 'utf8');
  vm.runInNewContext(code, context);
  return AirplaneGame.prototype;
}

test('createProceduralTerrainGeometry builds high-poly varied mountains and hills', () => {
  const proto = loadEnvironmentPrototype();

  const variants = ['alpine', 'ridge', 'twin', 'massif', 'volcanic', 'rolling'];
  const vertexSignatures = [];

  for (const variant of variants) {
    const isMountain = ['alpine', 'ridge', 'twin', 'massif'].includes(variant);
    const geo = proto.createProceduralTerrainGeometry({
      radius: isMountain ? 1200 : 90,
      height: isMountain ? 1300 : 35,
      radialSegments: isMountain ? 44 : 32,
      heightRings: isMountain ? 18 : 12,
      variant,
      seed: 42.5,
      isMountain,
      hasSnow: isMountain
    });

    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    assert.ok(pos, `${variant} must have position attribute`);
    assert.ok(col, `${variant} must have color attribute`);
    assert.ok(geo.normalsComputed, `${variant} must compute vertex normals`);

    const expectedVerts = 1 + (isMountain ? 44 * 18 : 32 * 12);
    assert.equal(pos.count, expectedVerts);

    const triCount = geo.index.count / 3;
    assert.ok(triCount >= 700, `${variant} should use high polygon count (got ${triCount} tris)`);

    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
      assert.ok(y >= 0, `${variant} vertex y must be >= 0 (got ${y})`);
      if (y > maxY) maxY = y;

      const r = col.array[i * 3];
      const g = col.array[i * 3 + 1];
      const b = col.array[i * 3 + 2];
      assert.ok(r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1);
    }

    assert.ok(maxY > (isMountain ? 600 : 15), `${variant} should have substantial peak height`);
    vertexSignatures.push(Array.from(pos.array.slice(0, 60)).map(v => v.toFixed(2)).join(','));
  }

  // Every variant produces a distinct shape
  const uniqueSignatures = new Set(vertexSignatures);
  assert.equal(uniqueSignatures.size, variants.length);
});

test('createOrganicBeachGeometry warps coastline organically with finite vertices', () => {
  const proto = loadEnvironmentPrototype();
  const geo = proto.createOrganicBeachGeometry(100, 3.5, 32, 101);
  const pos = geo.attributes.position;
  assert.ok(pos.count >= 64);
  assert.ok(geo.normalsComputed);
  for (let i = 0; i < pos.count; i++) {
    assert.ok(Number.isFinite(pos.getX(i)));
    assert.ok(Number.isFinite(pos.getY(i)));
    assert.ok(Number.isFinite(pos.getZ(i)));
  }
});

test('getTerrainColliderHit detects mountain impacts and skips high-altitude or outside positions', () => {
  const proto = loadEnvironmentPrototype();
  const radius = 1900;
  const height = 1850;
  const seed = 501 + 10 * 43.9;
  const variant = 'alpine';
  const maxR = radius * 1.6;
  const game = Object.create(proto);
  game.terrainColliders = [{
    x: 0,
    z: -56000,
    baseY: -20,
    radius,
    maxRadiusSq: maxR * maxR,
    height,
    variant,
    seed,
    isMountain: true,
    params: proto._getTerrainParams(variant, seed),
    name: '대륙 산악 지형 (1850m)'
  }];

  // Inside mountain core at low altitude -> collision
  const hit = game.getTerrainColliderHit(0, 300, -56000, 6.0);
  assert.ok(hit, 'Expected collision inside mountain core at 300m altitude');
  assert.equal(hit.collider.name, '대륙 산악 지형 (1850m)');
  assert.ok(hit.terrainY > 300);

  // High above the summit -> no collision
  assert.equal(game.getTerrainColliderHit(0, 2200, -56000, 6.0), null);

  // Far outside the mountain footprint -> no collision
  assert.equal(game.getTerrainColliderHit(5000, 300, -56000, 6.0), null);
});
