import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

await import(pathToFileURL(resolve('web/js/terrain_provider.js')).href);
const TP = globalThis.TerrainProvider;

const ANCHOR = { lat: 35.1652, lon: 128.939, headingDeg: 353.9 };

// Terrarium encodes metres as (R*256 + G + B/256) - 32768.
function flatTile(metres) {
  const v = metres + 32768;
  const rgba = new Uint8ClampedArray(256 * 256 * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = Math.floor(v / 256);
    rgba[i + 1] = Math.floor(v % 256);
    rgba[i + 2] = Math.round((v - Math.floor(v)) * 256) % 256;
    rgba[i + 3] = 255;
  }
  return rgba;
}
const settle = () => new Promise(r => setTimeout(r, 5));

test('decodeTerrarium round-trips metres', () => {
  const h = TP.decodeTerrarium(flatTile(123.5));
  assert.ok(Math.abs(h[0] - 123.5) < 0.01);
  assert.ok(Math.abs(TP.decodeTerrarium(flatTile(-40))[100] + 40) < 0.01);
});

test('anchor frame maps the anchor to itself and respects heading', () => {
  const f = TP.createAnchorFrame(ANCHOR);
  const o = f.toWgs84(0, 0);
  assert.ok(Math.abs(o.lat - ANCHOR.lat) < 1e-9 && Math.abs(o.lon - ANCHOR.lon) < 1e-9);
  // Forward is -Z along heading 353.9deg (almost due north): latitude rises.
  assert.ok(f.toWgs84(0, -1000).lat > ANCHOR.lat + 0.008);
});

test('provider is not ready until tiles load, then heights are runway-relative', async () => {
  const provider = TP.createTerrariumProvider({
    anchor: ANCHOR,
    loadTile: async () => flatTile(250),
  });
  assert.equal(provider.getHeight(0, 0), null);
  assert.equal(provider.isReady(0, 0), false);
  await settle();
  // Flat 250 m everywhere -> datum absorbs it, so every point reads 0.
  assert.ok(Math.abs(provider.getHeight(0, 0)) < 0.01);
  assert.equal(provider.isReady(0, 0), true);
  const n = provider.getNormal(0, 0);
  assert.ok(n === null || n.y > 0.999);
  provider.dispose();
});

test('resolveGroundHeight falls back while loading and when tiles fail', async () => {
  const provider = TP.createTerrariumProvider({
    anchor: ANCHOR,
    loadTile: async () => { throw new Error('offline'); },
  });
  const ground = TP.resolveGroundHeight(() => provider, () => -45);
  assert.equal(ground(0, 0), -45);
  await settle();
  assert.equal(ground(0, 0), -45);
  assert.equal(TP.resolveGroundHeight(() => null, () => 7)(1, 2), 7);
});

test('resolveGroundHeight prefers provider heights when ready', async () => {
  const provider = TP.createTerrariumProvider({ anchor: ANCHOR, loadTile: async () => flatTile(10) });
  provider.getHeight(0, 0);
  await settle();
  const ground = TP.resolveGroundHeight(() => provider, () => -45);
  assert.ok(Math.abs(ground(0, 0)) < 0.01);
});
