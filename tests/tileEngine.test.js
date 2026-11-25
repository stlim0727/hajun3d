import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as THREE from 'three';

globalThis.THREE = THREE;
await import(pathToFileURL(resolve('web/js/flightsim_core_bundle.js')).href);
await import(pathToFileURL(resolve('web/js/tile_engine.js')).href);
const TileEngine = globalThis.TileEngine;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function fakeFetch(requests) {
  return async (url) => {
    requests.push(url);
    return { ok: true, blob: async () => ({ url }) };
  };
}

test('tile engine deduplicates in-flight requests and serves cached tiles', async () => {
  const requests = [];
  const engine = TileEngine.create({
    fetchImpl: fakeFetch(requests),
    workerFactory: () => null,
    decodeMain: async (blob) => new Uint8ClampedArray([blob.url.length]),
  });

  const results = await Promise.all([
    engine.loadTile(10, 1, 2),
    engine.loadTile(10, 1, 2),
    engine.loadTile(10, 1, 2),
  ]);
  assert.equal(requests.length, 1);
  assert.ok(results[0] === results[1] && results[1] === results[2]);
  assert.equal(engine.stats().misses, 1);
  const cached = await engine.loadTile(10, 1, 2);
  assert.ok(cached === results[0]);
  assert.equal(engine.stats().hits, 1);
  engine.dispose();
});

test('tile engine caps concurrent decodes and evicts by byte budget', async () => {
  let active = 0;
  let peak = 0;
  const evicted = [];
  const engine = TileEngine.create({
    fetchImpl: fakeFetch([]),
    workerFactory: () => null,
    decodeMain: async () => {
      active++;
      peak = Math.max(peak, active);
      await delay(5);
      active--;
      return new Uint8ClampedArray(4);
    },
    maxConcurrent: 2,
    maxBytes: 8,
    onEvict: (key) => evicted.push(key),
  });

  await Promise.all([0, 1, 2, 3, 4].map((x) => engine.loadTile(10, x, 0)));
  assert.equal(peak, 2);
  assert.equal(engine.stats().tiles, 2);
  assert.ok(engine.stats().bytes <= 8);
  assert.ok(evicted.length >= 3);
  engine.dispose();
});

test('tile engine loads priority tiles first around the camera', async () => {
  const order = [];
  const engine = TileEngine.create({
    fetchImpl: async (url) => {
      order.push(url);
      return { ok: true, blob: async () => ({ url }) };
    },
    workerFactory: () => null,
    decodeMain: async () => new Uint8ClampedArray(4),
    maxConcurrent: 1,
  });
  engine.setCamera(0, 0, 10);

  await Promise.all([
    engine.loadTile(10, 515, 512),
    engine.loadTile(10, 512, 512),
    engine.loadTile(10, 513, 512),
  ]);
  assert.ok(order[0].endsWith('/512/512.png'), `first request was ${order[0]}`);
  assert.ok(order[1].endsWith('/513/512.png'), `second request was ${order[1]}`);
  engine.dispose();
});

test('tile engine decodes in a worker and falls back on worker failure', async () => {
  const worker = {
    onmessage: null,
    onerror: null,
    postMessage(message) {
      setTimeout(() => this.onmessage({
        data: { id: message.id, data: new Uint8ClampedArray([7, 8, 9, 10]).buffer },
      }), 0);
    },
    terminate() {},
  };
  const ok = TileEngine.create({
    fetchImpl: fakeFetch([]),
    workerFactory: () => worker,
    decodeMain: async () => { throw new Error('should not run'); },
  });
  const data = await ok.loadTile(10, 0, 0);
  assert.deepEqual(Array.from(data), [7, 8, 9, 10]);
  assert.equal(ok.stats().worker, true);
  ok.dispose();

  const broken = {
    onmessage: null,
    onerror: null,
    postMessage() { setTimeout(() => this.onerror(new Error('worker failed')), 0); },
    terminate() {},
  };
  const fallback = TileEngine.create({
    fetchImpl: fakeFetch([]),
    workerFactory: () => broken,
    decodeMain: async () => new Uint8ClampedArray([42]),
  });
  const fallbackData = await fallback.loadTile(10, 0, 0);
  assert.equal(fallbackData[0], 42);
  assert.equal(fallback.stats().worker, false);
  fallback.dispose();
});

test('tile engine neighborhood is ordered by distance from the aircraft tile', () => {
  const engine = TileEngine.create({
    fetchImpl: fakeFetch([]),
    workerFactory: () => null,
    decodeMain: async () => new Uint8ClampedArray(4),
  });
  const tiles = engine.neighborhood(0, 0, 10, 1);
  engine.dispose();
  assert.equal(tiles.length, 9);
  assert.equal(tiles[0].x, 512);
  assert.equal(tiles[0].y, 512);
  assert.equal(tiles[0].priority, 0);
  assert.ok(tiles.every((tile, index) => index === 0 || tile.priority >= tiles[index - 1].priority));
});
