import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';

await import(pathToFileURL(resolve('web/js/terrain_provider.js')).href);
const TP = globalThis.TerrainProvider;

const ANCHOR = { lat: 35.1652, lon: 128.939, headingDeg: 353.9 };
const GIMHAE_OFFSET = { x: 160, z: 1600 };
const GIMHAE_FLAT_ZONE = { minX: -700, maxX: 700, minZ: -2200, maxZ: 2200, height: 0, blendMargin: 400 };

// Terrarium encodes metres as (R*256 + G + B/256) - 32768.
function encodeTerrariumTile(heightFn) {
  const rgba = new Uint8ClampedArray(256 * 256 * 4);
  for (let py = 0; py < 256; py++) {
    for (let px = 0; px < 256; px++) {
      const m = typeof heightFn === 'function' ? heightFn(px, py) : heightFn;
      const v = Math.max(0, Math.min(65535.99, m + 32768));
      const idx = (py * 256 + px) * 4;
      rgba[idx] = Math.floor(v / 256);
      rgba[idx + 1] = Math.floor(v % 256);
      rgba[idx + 2] = Math.round((v - Math.floor(v)) * 256) % 256;
      rgba[idx + 3] = 255;
    }
  }
  return rgba;
}
const flatTile = (metres) => encodeTerrariumTile(metres);

function tilePixelToSim(anchor, simOffset, zoom, tx, ty, px, py) {
  const n = 2 ** zoom;
  const fx = tx + (px + 0.5) / 256;
  const fy = ty + (py + 0.5) / 256;
  const lon = (fx / n) * 360 - 180;
  const mercN = Math.PI - (2 * Math.PI * fy) / n;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(mercN) - Math.exp(-mercN)));
  const d2r = Math.PI / 180;
  const latMid = (anchor.lat + lat) * 0.5 * d2r;
  const east = (lon - anchor.lon) * 111320 * Math.cos(latMid);
  const north = (lat - anchor.lat) * 110540;
  const r = anchor.headingDeg * d2r;
  const a = east * Math.cos(r) - north * Math.sin(r);
  const b = east * Math.sin(r) + north * Math.cos(r);
  return { x: simOffset.x + a, z: simOffset.z - b };
}
const settle = () => new Promise(r => setTimeout(r, 15));

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

test('getHeight requests its own tile before the datum tile has loaded', async () => {
  const requested = [];
  const provider = TP.createTerrariumProvider({
    anchor: ANCHOR,
    loadTile: async (z, x, y) => { requested.push(`${x}/${y}`); return flatTile(5); },
  });
  provider.getHeight(0, -20000); // ~20 km north: a different tile than the anchor's
  assert.ok(new Set(requested).size >= 2 || (await settle(), new Set(requested).size >= 2));
  provider.dispose();
});

test('failed tiles are retried after the cooldown', async () => {
  let calls = 0;
  const realNow = Date.now;
  const provider = TP.createTerrariumProvider({
    anchor: ANCHOR,
    loadTile: async () => { calls += 1; if (calls === 1) throw new Error('offline'); return flatTile(5); },
  });
  provider.getHeight(0, 0);
  await settle();
  const first = calls;
  Date.now = () => realNow() + 6000;
  try {
    provider.getHeight(0, 0);
    await settle();
    provider.getHeight(0, 0);
  } finally { Date.now = realNow; }
  assert.ok(calls > first);
  assert.equal(provider.isReady(0, 0), true);
  provider.dispose();
});

test('flatZones flatten Gimhae runway DEM spikes, blend across 400 m margin, and preserve hills beyond', async () => {
  const provider = TP.createTerrariumProvider({
    anchor: ANCHOR,
    simOffset: GIMHAE_OFFSET,
    flatZones: [GIMHAE_FLAT_ZONE],
    loadTile: async (z, tx, ty) => encodeTerrariumTile((px, py) => {
      const { x, z: sz } = tilePixelToSim(ANCHOR, GIMHAE_OFFSET, z, tx, ty, px, py);
      if (Math.abs(x - 160) < 350 && Math.abs(sz + 800) < 350) return 35; // +33m runway spike above 2m datum
      if (sz <= -2200) return 102; // +100m above datum north of airport
      return 2; // 2m airport datum
    }),
  });

  // Prime tiles around anchor and north boundary
  provider.getHeight(160, 1600);
  provider.getHeight(160, -800);
  provider.getHeight(160, -2400);
  provider.getHeight(160, -2800);
  await settle();

  // Runway centerline including the +33 m spike at z = -800 must stay completely flat at 0.0 with upright normal
  for (const sz of [1600, 0, -800, -1600, -2200]) {
    assert.ok(Math.abs(provider.getHeight(160, sz)) < 1e-6, `Expected 0 at z=${sz}, got ${provider.getHeight(160, sz)}`);
  }
  const runwayNormal = provider.getNormal(160, -800);
  assert.ok(runwayNormal && runwayNormal.y > 0.9999 && Math.abs(runwayNormal.x) < 1e-6 && Math.abs(runwayNormal.z) < 1e-6);

  // Midpoint of 400 m blend margin (z = -2400) blends smoothly halfway between 0 and 100 m
  const blendH = provider.getHeight(160, -2400);
  assert.ok(blendH > 40 && blendH < 60, `Expected smooth midpoint ~50m at z=-2400, got ${blendH}`);

  // Beyond 400 m margin (z = -2800) returns full Terrarium elevation (~100 m)
  const hillH = provider.getHeight(160, -2800);
  assert.ok(Math.abs(hillH - 100) < 1.0, `Expected ~100m at z=-2800, got ${hillH}`);
  provider.dispose();
});

test('isWater distinguishes sea pixels, flat airport zones, and elevated terrain', async () => {
  const provider = TP.createTerrariumProvider({
    anchor: ANCHOR,
    simOffset: GIMHAE_OFFSET,
    flatZones: [GIMHAE_FLAT_ZONE],
    loadTile: async (z, tx, ty) => encodeTerrariumTile((px, py) => {
      const { z: sz } = tilePixelToSim(ANCHOR, GIMHAE_OFFSET, z, tx, ty, px, py);
      if (sz < -2600) return 150; // hills
      if (sz > 3000) return -2;   // open sea
      return -1;                  // even if airport DEM reads <= 0, flatZone suppresses water
    }),
  });

  provider.getHeight(160, 1600);
  provider.getHeight(160, -4000);
  provider.getHeight(160, 5000);
  await settle();

  assert.equal(provider.isWater(160, 1600), false);
  assert.equal(provider.isWater(160, -800), false);
  assert.equal(provider.isWater(160, -4000), false);
  assert.equal(provider.isWater(160, 5000), true);
  provider.dispose();
});

test('createGroundSurfaceQueries pairs height/normal with THREE.Vector3 adaptation, sea floor, and fallback', () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  }
  Vector3.prototype.isVector3 = true;

  let provider = null;
  const fallbackNormal = { x: 0, y: 1, z: 0 };
  const surface = TP.createGroundSurfaceQueries({
    getProvider: () => provider,
    getFallbackHeight: (x) => (x === 0 ? 0 : -48),
    getFallbackNormal: () => fallbackNormal,
    minHeight: -48,
    waterFloorHeight: -48,
    Vector3,
  });

  // No provider -> fallback height & adapted fallback normal
  assert.equal(surface.getGroundHeight(100, 0), -48);
  assert.equal(surface.isWater(100, 0), null);
  const fn = surface.getGroundNormal(100, 0);
  assert.equal(fn.isVector3, true);
  assert.equal(fn.y, 1);

  // Ready sea location -> waterFloorHeight + null normal + isWater true
  provider = {
    isReady: () => true,
    isWater: () => true,
    getHeight: () => -2,
    getNormal: () => ({ x: 0.1, y: 0.99, z: 0 }),
  };
  assert.equal(surface.getGroundHeight(0, 5000), -48);
  assert.equal(surface.getGroundNormal(0, 5000), null);
  assert.equal(surface.isWater(0, 5000), true);

  // Ready land location with plain slope normal -> adapted THREE.Vector3
  provider = {
    isReady: () => true,
    isWater: () => false,
    getHeight: () => 220,
    getNormal: () => ({ x: -0.2, y: 0.98, z: 0 }),
  };
  assert.equal(surface.getGroundHeight(0, -5000), 220);
  assert.equal(surface.isWater(0, -5000), false);
  const ln = surface.getGroundNormal(0, -5000);
  assert.equal(ln.isVector3, true);
  assert.ok(Math.abs(ln.x + 0.2) < 1e-9 && ln.lengthSq() > 0.9);

  // Ready provider omitting normal -> returns null rather than leaking fallbackNormal
  provider = {
    isReady: () => true,
    isWater: () => false,
    getHeight: () => 50,
    getNormal: () => null,
  };
  assert.equal(surface.getGroundHeight(0, -3000), 50);
  assert.equal(surface.getGroundNormal(0, -3000), null);

  // Unready or misbehaving provider -> falls back consistently
  provider = { isReady: () => true, getHeight: () => null, getNormal: () => ({ x: -0.5, y: 0.86, z: 0 }) };
  assert.equal(surface.getGroundHeight(100, 0), -48);
  assert.equal(surface.getGroundNormal(100, 0).y, 1);
  assert.equal(surface.isWater(100, 0), null);
});

test('environment.js getTerrainColliderHit skips hidden procedural hills when geoLayer is active and uses terrainProvider mountains', () => {
  function AirplaneGame() {}
  const ctx = { AirplaneGame, THREE: {}, Math, Float32Array };
  vm.createContext(ctx);
  vm.runInContext(readFileSync('web/js/environment.js', 'utf8'), ctx);

  const game = Object.create(AirplaneGame.prototype);
  game.initTerrainColliders();
  // Legacy mode without geoLayer hits procedural island at (-450, -3500)
  assert.ok(game.getTerrainColliderHit(-450, 15, -3500, 6.0));

  // Streamed geoLayer hides procedural colliders and checks real terrainProvider hills
  game.geoLayer = { update() {}, dispose() {} };
  game.terrainProvider = {
    isReady: () => true,
    isWater: (_x, z) => z > 3000,
    getHeight: (_x, z) => (z < -5000 ? 300 : 0),
  };
  assert.equal(game.getTerrainColliderHit(-450, 15, -3500, 6.0), null);
  assert.equal(game.getTerrainColliderHit(-3200, 300, -2500, 6.0), null);
  assert.equal(game.getTerrainColliderHit(160, 3.64, -800, 6.0), null);
  assert.equal(game.getTerrainColliderHit(160, -5, 5000, 6.0), null);

  const mountainHit = game.getTerrainColliderHit(160, 250, -9000, 6.0);
  assert.ok(mountainHit);
  assert.equal(mountainHit.collider.name, '산악 지형');
  assert.ok(Math.abs(mountainHit.terrainY - 302.12) < 1e-6);
  assert.equal(game.getTerrainColliderHit(160, 310, -9000, 6.0), null);
});

test('physics.js buildFlight3dEnvironment and checkGPWS integrate terrainProvider normals, land/sea, and GPWS conflict', () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  }
  Vector3.prototype.isVector3 = true;

  const sandbox = {
    THREE: { Vector3, Quaternion: class {}, Euler: class {}, MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } },
    AirplaneGame: { prototype: {} },
    TerrainProvider: TP,
    Math,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/flightsim_core_bundle.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/physics.js', 'utf8'), sandbox);

  const game = Object.create(sandbox.AirplaneGame.prototype);
  game.groundY = 6.84;
  game.isOverAirport = (x, z) => Math.abs(x) <= 700 && Math.abs(z) <= 2200;

  // 1. Legacy without terrainProvider: airport=0/-100, off-airport=seaSimY-45 / seaSimY, normal=null
  const legacyEnv = game.buildFlight3dEnvironment();
  assert.equal(legacyEnv.getGroundHeight(160, 0), 0);
  assert.equal(legacyEnv.getGroundNormal(160, 0), null);
  assert.equal(legacyEnv.getWaterLevel(160, 0), -100);
  assert.ok(legacyEnv.getWaterLevel(0, -9000) > -10);

  // 2. With ready terrainProvider: slope Vector3 normal & mountain land not treated as water
  game.terrainProvider = {
    isReady: () => true,
    isWater: (_x, z) => z > 3000,
    getHeight: (_x, z) => (z < -4000 ? 250 : z > 3000 ? -2 : 0),
    getNormal: (_x, z) => (z < -4000 ? { x: -0.15, y: 0.988, z: 0 } : { x: 0, y: 1, z: 0 }),
  };
  const env = game.buildFlight3dEnvironment();
  assert.equal(env.getGroundHeight(160, -9000), 250);
  const norm = env.getGroundNormal(160, -9000);
  assert.equal(norm.isVector3, true);
  assert.ok(Math.abs(norm.x + 0.15) < 1e-9);
  assert.equal(env.getWaterLevel(160, -9000), -100);
  assert.ok(env.getWaterLevel(160, 5000) > -10);
  assert.ok(env.getGroundHeight(160, 5000) < env.getWaterLevel(160, 5000) - 2);

  // 3. checkGPWS detects mountain terrain ahead via terrainConflictSeconds when flying toward rising slope
  const gpwsAlerts = [];
  game.isPlaying = true;
  game.isDestroyed = false;
  game.isOnGround = false;
  game.gearExtended = false;
  game.speed = 1.0;
  game.throttle = 0.8;
  game.verticalSpeed = 0;
  game.planeGroup = { position: new Vector3(160, 200, -3500), rotation: { z: 0 } };
  game.velocity = new Vector3(0, 0, -150);
  game._flightWarningsCore = new sandbox.FlightSimCore.FlightWarningsCore('B738');
  game.triggerGPWS = (type, text) => gpwsAlerts.push({ type, text });
  game.clearGPWS = () => {};
  game.speakGPWS = () => {};
  game.playGPWSWhoopSiren = () => {};
  game.playCautionChime = () => {};

  game.checkGPWS(0.1);
  assert.ok(gpwsAlerts.some(a => a.type === 'PULL_UP'), 'Must warn PULL_UP before hitting rising mountain ahead');
});
