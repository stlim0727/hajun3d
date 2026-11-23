import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';
import * as THREE from 'three';

globalThis.THREE = THREE;

const ANCHOR = {
  lat: 35.165199279785156,
  lon: 128.93899536132812,
  headingDeg: 353.9,
  height: 33.25,
};

test('geo_config.js uses the exact geodesy frame for landmark offsets and inverse', () => {
  const sandbox = { window: {}, Math, Number, console };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/geodesy.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/geo_config.js', 'utf8'), sandbox);
  const win = sandbox.window;

  for (const point of Object.values(win.GEO_POINTS)) {
    const delta = win.geoLocalDelta(point);
    const exact = win.Geodesy.wgs84ToGame(point.lat, point.lon, win.GEO_ANCHOR);
    assert.deepEqual(delta.local, exact);

    const back = win.geoLocalToLatLon(delta.local.x, delta.local.z);
    assert.ok(Math.abs(back.lat - point.lat) < 1e-9);
    assert.ok(Math.abs(back.lon - point.lon) < 1e-9);
  }

  // Guard against silently reverting to flat-Earth degree scaling.
  const haeundae = win.GEO_POINTS.haeundae;
  const exact = win.Geodesy.wgs84ToGame(haeundae.lat, haeundae.lon, win.GEO_ANCHOR);
  const mid = (ANCHOR.lat + haeundae.lat) * 0.5 * Math.PI / 180;
  const east = (haeundae.lon - ANCHOR.lon) * 111320 * Math.cos(mid);
  const north = (haeundae.lat - ANCHOR.lat) * 110540;
  const r = ANCHOR.headingDeg * Math.PI / 180;
  const flat = {
    x: east * Math.cos(r) - north * Math.sin(r),
    z: -(east * Math.sin(r) + north * Math.cos(r)),
  };
  assert.ok(Math.hypot(exact.x - flat.x, exact.z - flat.z) > 30);
});

test('exact-frame terrain provider samples the tile at the exact WGS84 position', async () => {
  await import(pathToFileURL(resolve('web/js/geodesy.js')).href);
  await import(pathToFileURL(resolve('web/js/flightsim_core_bundle.js')).href);
  await import(pathToFileURL(resolve('web/js/terrain_provider.js')).href);
  const TP = globalThis.TerrainProvider;
  const geo = globalThis.Geodesy;

  const tile = new Uint8ClampedArray(256 * 256 * 4);
  for (let i = 0; i < tile.length; i += 4) {
    tile[i] = 0;
    tile[i + 1] = 10;
    tile[i + 2] = 0;
    tile[i + 3] = 255;
  }

  const requested = [];
  const provider = TP.createExactFrameTerrariumProvider({
    anchor: ANCHOR,
    simOffset: { x: 160, z: 1600 },
    zoom: 11,
    maxTiles: 8,
    loadTile: async (z, x, y) => {
      requested.push([z, x, y]);
      return tile;
    },
  });

  const sim = { x: -190000, z: -280000 }; // Incheon: flat/exact frames differ by ~4.8 km.
  provider.getHeight(sim.x, sim.z);
  await new Promise((resolve) => setTimeout(resolve, 20));

  const ll = geo.gameToWgs84(sim.x - 160, sim.z - 1600, ANCHOR);
  const { fx, fy } = TP.lonLatToTilePixel(ll.lat, ll.lon, 11);
  assert.deepEqual(requested[0], [11, Math.floor(fx), Math.floor(fy)]);
  provider.dispose();
});
