import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { collectSyncEntries, DYNAMIC_FILES } from '../scripts/sync-flutter-web.mjs';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = join(ROOT_DIR, 'web');
const FLUTTER_WEB_DIR = join(ROOT_DIR, 'flutter_app', 'assets', 'web');

function localHtmlAssets(htmlText) {
  const refs = [];
  const pattern = /<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi;
  for (const match of htmlText.matchAll(pattern)) {
    const raw = match[1].trim();
    if (/^(?:https?:|data:|\/\/)/i.test(raw)) continue;
    refs.push(raw.split('#')[0].split('?')[0]);
  }
  return refs;
}

test('flutter_app/assets/web mirrors all runtime web/ assets without showcase bloat', () => {
  const entries = collectSyncEntries(ROOT_DIR);
  for (const required of [
    'index.html',
    'glb-viewer.html',
    'style.css',
    'game.js',
    'glb_bundle.js',
    'js/flightsim_core_bundle.js',
    'js/terrain_provider.js',
    'js/core.js',
    'js/physics.js',
  ]) {
    assert.ok(entries.includes(required), `Expected ${required} in collectSyncEntries()`);
  }

  for (const rel of entries) {
    const src = join(WEB_DIR, rel);
    const dst = join(FLUTTER_WEB_DIR, rel);
    assert.ok(existsSync(dst), `Missing flutter_app/assets/web/${rel}; run "npm run sync:flutter"`);
    if (!DYNAMIC_FILES.has(rel)) {
      assert.equal(
        readFileSync(src).equals(readFileSync(dst)),
        true,
        `Drift detected for flutter_app/assets/web/${rel}; run "npm run sync:flutter"`
      );
    }
  }

  assert.equal(existsSync(join(FLUTTER_WEB_DIR, 'screenshots')), false);
  assert.equal(existsSync(join(FLUTTER_WEB_DIR, 'screens.html')), false);
});

test('flutter_app/assets/web HTML files reference existing local assets in valid load order', () => {
  for (const page of ['index.html', 'glb-viewer.html']) {
    const html = readFileSync(join(FLUTTER_WEB_DIR, page), 'utf8');
    const refs = localHtmlAssets(html);
    assert.ok(refs.length > 0, `Expected local asset references in ${page}`);
    for (const rel of refs) {
      assert.ok(existsSync(join(FLUTTER_WEB_DIR, rel)), `Missing referenced asset in ${page}: ${rel}`);
    }
  }

  const indexHtml = readFileSync(join(FLUTTER_WEB_DIR, 'index.html'), 'utf8');
  const coreIdx = indexHtml.indexOf('js/flightsim_core_bundle.js');
  const terrainIdx = indexHtml.indexOf('js/terrain_provider.js');
  const physicsIdx = indexHtml.indexOf('js/physics.js');
  const gameIdx = indexHtml.indexOf('game.js');
  assert.ok(coreIdx > 0 && terrainIdx > coreIdx && physicsIdx > terrainIdx && gameIdx > physicsIdx);
});

test('flutter_app/assets/web runtime scripts initialize TerrainProvider and tile loader without OffscreenCanvas', async () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  }
  Vector3.prototype.isVector3 = true;

  let closed = false;
  let createdCanvasSize = null;
  const rgba = new Uint8ClampedArray(256 * 256 * 4).fill(128);
  const sandbox = {
    THREE: { Vector3, Quaternion: class {}, Euler: class {}, MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } },
    AirplaneGame: { prototype: {} },
    Math,
    fetch: async () => ({ ok: true, blob: async () => ({}) }),
    createImageBitmap: async () => ({ close() { closed = true; } }),
    document: {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        const el = {
          width: 0,
          height: 0,
          getContext(kind, opts) {
            assert.equal(kind, '2d');
            assert.equal(opts?.willReadFrequently, true);
            createdCanvasSize = [el.width, el.height];
            return {
              drawImage() {},
              getImageData: () => ({ data: rgba }),
            };
          },
        };
        return el;
      },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(readFileSync(join(FLUTTER_WEB_DIR, 'js', 'flightsim_core_bundle.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(join(FLUTTER_WEB_DIR, 'js', 'tile_engine.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(join(FLUTTER_WEB_DIR, 'js', 'terrain_provider.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(join(FLUTTER_WEB_DIR, 'js', 'physics.js'), 'utf8'), sandbox);

  assert.equal(sandbox.TerrainProvider.createTerrariumProvider, sandbox.FlightSimCore.createTerrariumProvider);
  assert.equal(typeof sandbox.TerrainProvider.createBrowserTileLoader, 'function');
  assert.equal(typeof sandbox.TileEngine.create, 'function');

  const game = Object.create(sandbox.AirplaneGame.prototype);
  game.groundY = 6.84;
  game.isOverAirport = () => true;
  assert.equal(game.buildFlight3dEnvironment().getGroundHeight(160, 0), 0);

  const loadTile = sandbox.TerrainProvider.createBrowserTileLoader('https://example.invalid/{z}/{x}/{y}.png');
  assert.equal(typeof loadTile.engine.loadTile, 'function', 'browser loader must delegate to tile_engine.js');
  const pixels = await loadTile(11, 1758, 809);
  assert.equal(pixels, rgba);
  assert.deepEqual(createdCanvasSize, [256, 256]);
  assert.equal(closed, true);
});
