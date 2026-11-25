/**
 * tile_engine.js — bounded Terrarium tile cache with Worker-side decode.
 *
 * In-flight dedup, the priority queue, concurrency limit, scheduling metrics
 * and disposal come from core.createTileScheduler (flightsim_core_bundle.js).
 * This layer owns fetch/decode, Worker fallback and byte-budget LRU eviction.
 */
(function (root) {
  'use strict';

  const core = root.FlightSimCore || root.Flight3dPhysics;
  if (!core || typeof core.createTileScheduler !== 'function') {
    throw new Error('tile_engine.js requires flightsim_core_bundle.js to load first');
  }

  const DEFAULT_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const DEFAULT_MAX_BYTES = 32 * 1024 * 1024;
  const DEFAULT_MAX_CONCURRENT = 4;
  const DEFAULT_TIMEOUT_MS = 6000;
  const RADIANS = Math.PI / 180;

  function keyOf(z, x, y) {
    return `${z}/${x}/${y}`;
  }

  function tileOf(lat, lon, zoom) {
    const n = 2 ** zoom;
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = Math.max(-85.0511, Math.min(85.0511, lat)) * RADIANS;
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    return { x, y, zoom };
  }

  function defaultWorkerFactory(workerUrl) {
    if (typeof Worker === 'undefined' || typeof document === 'undefined') return null;
    try {
      const url = workerUrl || new URL('tile_decode_worker.js', document.baseURI).href;
      return new Worker(url);
    } catch (_) {
      return null;
    }
  }

  function defaultDecodeMain(blob) {
    if (typeof createImageBitmap !== 'function') {
      return Promise.reject(new Error('createImageBitmap unavailable'));
    }
    return createImageBitmap(blob).then((bitmap) => {
      const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(256, 256)
        : Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      if (typeof bitmap.close === 'function') bitmap.close();
      return ctx.getImageData(0, 0, 256, 256).data;
    });
  }

  function create(options = {}) {
    const urlTemplate = options.urlTemplate || DEFAULT_URL;
    const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error('tile_engine.js requires fetch');
    const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : DEFAULT_MAX_BYTES;
    const maxConcurrent = Math.max(1, options.maxConcurrent || DEFAULT_MAX_CONCURRENT);
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    const decodeMain = options.decodeMain || defaultDecodeMain;
    const workerFactory = options.workerFactory || defaultWorkerFactory;
    let worker = workerFactory(options.workerUrl);
    const workerPending = new Map();
    let workerId = 0;

    const cache = new Map();
    const stats = {
      hits: 0, evictions: 0, bytes: 0, tiles: 0, worker: Boolean(worker),
    };
    let cameraTile = { x: 0, y: 0, zoom: 0 };
    let disposed = false;

    function priorityOf(value, context) {
      const center = context && context.zoom ? context : cameraTile;
      if (!center.zoom) return 0;
      const scale = 2 ** Math.abs(value.z - center.zoom);
      const cx = center.x * (value.z >= center.zoom ? scale : 1 / scale);
      const cy = center.y * (value.z >= center.zoom ? scale : 1 / scale);
      return Math.hypot(value.x - cx, value.y - cy);
    }

    const scheduler = core.createTileScheduler({ maxConcurrent, priorityOf });

    function cacheGet(key) {
      if (!cache.has(key)) return null;
      const entry = cache.get(key);
      cache.delete(key);
      cache.set(key, entry); // refresh LRU order
      return entry.data;
    }

    function cachePut(key, data) {
      if (disposed) return;
      const bytes = data.byteLength;
      cache.set(key, { data, bytes });
      stats.bytes += bytes;
      stats.tiles = cache.size;
      while (stats.bytes > maxBytes && cache.size > 0) {
        const oldest = cache.keys().next().value;
        const evicted = cache.get(oldest);
        cache.delete(oldest);
        stats.bytes -= evicted.bytes;
        stats.evictions++;
        if (typeof options.onEvict === 'function') options.onEvict(oldest, evicted.data);
      }
      stats.tiles = cache.size;
    }

    function workerDecode(blob) {
      return new Promise((resolve, reject) => {
        const id = ++workerId;
        const timer = setTimeout(() => {
          workerPending.delete(id);
          reject(new Error('worker decode timeout'));
        }, timeoutMs);
        workerPending.set(id, { resolve, reject, timer });
        worker.postMessage({ id, blob });
      });
    }

    function handleWorkerMessage(event) {
      const data = event && event.data;
      const pending = data && workerPending.get(data.id);
      if (!pending) return;
      workerPending.delete(data.id);
      clearTimeout(pending.timer);
      if (data.error) pending.reject(new Error(data.error));
      else pending.resolve(new Uint8ClampedArray(data.data));
    }

    if (worker) {
      worker.onmessage = handleWorkerMessage;
      worker.onerror = () => {
        stats.worker = false;
        for (const pending of workerPending.values()) {
          clearTimeout(pending.timer);
          pending.reject(new Error('tile decode worker failed'));
        }
        workerPending.clear();
        worker = null;
      };
    }

    async function decode(z, x, y) {
      const response = await fetchImpl(urlOf(z, x, y), { mode: 'cors' });
      if (!response.ok) throw new Error(`tile ${response.status}`);
      const blob = await response.blob();
      if (worker) {
        try {
          return await workerDecode(blob);
        } catch (_) {
          stats.worker = false;
          worker = null;
        }
      }
      return decodeMain(blob);
    }

    function urlOf(z, x, y) {
      return urlTemplate.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
    }

    function loadTile(z, x, y) {
      const key = keyOf(z, x, y);
      const cached = cacheGet(key);
      if (cached) {
        stats.hits++;
        return Promise.resolve(cached);
      }
      return scheduler.schedule(key, { z, x, y, key }, (value) =>
        decode(value.z, value.x, value.y).then((data) => {
          cachePut(value.key, data);
          return data;
        })
      );
    }

    function setCamera(lat, lon, zoom) {
      if (![lat, lon, zoom].every(Number.isFinite)) return;
      cameraTile = tileOf(lat, lon, Math.max(0, Math.floor(zoom)));
      scheduler.setPriorityContext(cameraTile);
    }

    function neighborhood(lat, lon, zoom, radius = 1) {
      const center = tileOf(lat, lon, Math.max(0, Math.floor(zoom)));
      const tiles = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const y = center.y + dy;
          if (y < 0 || y >= 2 ** center.zoom) continue;
          tiles.push({
            z: center.zoom,
            x: (center.x + dx + 2 ** center.zoom) % (2 ** center.zoom),
            y,
            priority: dx * dx + dy * dy,
          });
        }
      }
      return tiles.sort((a, b) => a.priority - b.priority);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      scheduler.dispose();
      if (worker && typeof worker.terminate === 'function') worker.terminate();
      worker = null;
      workerPending.clear();
      cache.clear();
      stats.bytes = 0;
      stats.tiles = 0;
      stats.worker = false;
    }

    return {
      loadTile, setCamera, neighborhood, dispose,
      stats: () => {
        const scheduled = scheduler.stats();
        return {
          ...stats,
          misses: scheduled.misses,
          errors: scheduled.errors,
          active: scheduled.active,
          queued: scheduled.queued,
        };
      },
    };
  }

  const api = { create, keyOf, tileOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TileEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
