/**
 * Terrain provider contract + Terrarium elevation provider.
 *
 * A TerrainProvider supplies ground height to physics independent of how the
 * terrain is drawn (procedural meshes, 3D Tiles, raster tiles...).
 *
 *   getHeight(x, z)   -> sim-frame metres (airport = 0) or null when unknown
 *   getNormal(x, z)   -> {x,y,z} unit vector or null
 *   isReady(x, z)     -> true when getHeight(x, z) is authoritative
 *   update(position)  -> optional; prefetch data around the aircraft
 *   dispose()         -> optional
 *
 * Pure JS: no DOM, no THREE. Loads as a classic script (window.TerrainProvider)
 * and as a CommonJS/ESM-interop module for tests.
 */
(function(root) {
  'use strict';

  const TILE_SIZE = 256;
  const DEFAULT_ZOOM = 11;
  const D2R = Math.PI / 180;
  const RETRY_MS = 5000;

  /** Terrarium PNG RGBA -> Float32 heights (metres above MSL). */
  function decodeTerrarium(rgba) {
    const heights = new Float32Array(rgba.length / 4);
    for (let i = 0, j = 0; i < heights.length; i++, j += 4) {
      heights[i] = rgba[j] * 256 + rgba[j + 1] + rgba[j + 2] / 256 - 32768;
    }
    return heights;
  }

  function lonLatToTilePixel(lat, lon, zoom) {
    const n = 2 ** zoom;
    const latRad = lat * D2R;
    const fx = ((lon + 180) / 360) * n;
    const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
    return { fx, fy };
  }

  /**
   * Sim (x, z) <-> WGS84 around a runway anchor. Same frame as geoLocalDelta():
   * +X right, -Z forward along the runway heading.
   */
  function createAnchorFrame(anchor, simOffset = { x: 0, z: 0 }) {
    const r = anchor.headingDeg * D2R;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    return {
      toWgs84(x, z) {
        const a = x - simOffset.x;
        const b = -(z - simOffset.z);
        const east = a * cos + b * sin;
        const north = -a * sin + b * cos;
        const lat = anchor.lat + north / 110540;
        const latMid = (anchor.lat + lat) * 0.5 * D2R;
        const lon = anchor.lon + east / (111320 * Math.cos(latMid));
        return { lat, lon };
      },
    };
  }

  function zoneDistance(x, z, zone) {
    const dx = x < zone.minX ? zone.minX - x : x > zone.maxX ? x - zone.maxX : 0;
    const dz = z < zone.minZ ? zone.minZ - z : z > zone.maxZ ? z - zone.maxZ : 0;
    return Math.hypot(dx, dz);
  }

  /**
   * Elevation-only provider backed by Terrarium tiles. `loadTile(z, x, y)` must
   * resolve to a Uint8ClampedArray of 256x256 RGBA pixels (or reject).
   * Heights are re-referenced so the runway anchor reads 0 in the sim frame,
   * which also absorbs the geoid/ellipsoid offset of the anchor height.
   */
  function createTerrariumProvider(options) {
    const {
      anchor,
      simOffset = { x: 0, z: 0 },
      loadTile,
      zoom = DEFAULT_ZOOM,
      maxTiles = 24,
      prefetchRadius = 1,
      flatZones = [],
    } = options;
    if (!anchor || typeof loadTile !== 'function') {
      throw new Error('createTerrariumProvider needs { anchor, loadTile }');
    }

    function applyFlatZones(x, z, rawHeight) {
      if (!flatZones.length) return rawHeight;
      let bestW = 0;
      let bestH = rawHeight;
      for (let i = 0; i < flatZones.length; i++) {
        const zone = flatZones[i];
        const dist = zoneDistance(x, z, zone);
        const targetH = zone.height ?? 0;
        if (dist === 0) return targetH;
        const margin = zone.blendMargin ?? 400;
        if (margin > 0 && dist < margin) {
          const t = dist / margin;
          const w = 1 - t * t * (3 - 2 * t);
          if (w > bestW) {
            bestW = w;
            bestH = targetH * w + rawHeight * (1 - w);
          }
        }
      }
      return bestH;
    }

    const frame = createAnchorFrame(anchor, simOffset);
    const tiles = new Map(); // key -> Float32Array | 'pending' | 'failed'
    const order = [];
    let datumM = null;
    let disposed = false;

    const keyOf = (x, y) => `${zoom}/${x}/${y}`;

    const failedAt = new Map(); // key -> ms; failed tiles are retried after RETRY_MS

    function request(tx, ty) {
      const key = keyOf(tx, ty);
      if (tiles.has(key)) {
        const state = tiles.get(key);
        if (state !== 'failed' || Date.now() - (failedAt.get(key) || 0) < RETRY_MS) return state;
        tiles.delete(key);
        const at = order.indexOf(key);
        if (at >= 0) order.splice(at, 1);
      }
      tiles.set(key, 'pending');
      order.push(key);
      while (order.length > maxTiles) tiles.delete(order.shift());
      Promise.resolve()
        .then(() => loadTile(zoom, tx, ty))
        .then(rgba => {
          if (disposed || !tiles.has(key)) return;
          tiles.set(key, decodeTerrarium(rgba));
        })
        .catch(() => {
          if (disposed || !tiles.has(key)) return;
          tiles.set(key, 'failed');
          failedAt.set(key, Date.now());
        });
      return 'pending';
    }

    function pixel(tx, ty, px, py) {
      const data = tiles.get(keyOf(tx, ty));
      if (!(data instanceof Float32Array)) return null;
      const cx = Math.min(TILE_SIZE - 1, Math.max(0, px));
      const cy = Math.min(TILE_SIZE - 1, Math.max(0, py));
      return data[cy * TILE_SIZE + cx];
    }

    /** Bilinear elevation above MSL at sim (x, z), or null when not loaded. */
    function sampleMsl(x, z, fetchMissing) {
      const { lat, lon } = frame.toWgs84(x, z);
      const { fx, fy } = lonLatToTilePixel(lat, lon, zoom);
      const gx = (fx - Math.floor(fx)) * TILE_SIZE - 0.5;
      const gy = (fy - Math.floor(fy)) * TILE_SIZE - 0.5;
      const tx = Math.floor(fx);
      const ty = Math.floor(fy);
      if (fetchMissing) request(tx, ty);
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const wx = gx - x0;
      const wy = gy - y0;
      // Neighbouring-tile samples at the seam are clamped to this tile's edge;
      // the error is below one pixel (~60 m) of lateral position.
      const h00 = pixel(tx, ty, x0, y0);
      const h10 = pixel(tx, ty, x0 + 1, y0);
      const h01 = pixel(tx, ty, x0, y0 + 1);
      const h11 = pixel(tx, ty, x0 + 1, y0 + 1);
      if (h00 === null || h10 === null || h01 === null || h11 === null) return null;
      return (h00 * (1 - wx) + h10 * wx) * (1 - wy) + (h01 * (1 - wx) + h11 * wx) * wy;
    }

    function ensureDatum() {
      if (datumM !== null) return true;
      const h = sampleMsl(simOffset.x, simOffset.z, true);
      if (h === null) return false;
      datumM = h;
      return true;
    }

    const provider = {
      kind: 'terrarium',
      zoom,
      getHeight(x, z) {
        // Always request the tile for (x, z), even while the datum tile is still loading.
        const h = sampleMsl(x, z, true);
        if (!ensureDatum()) return null;
        return h === null ? null : applyFlatZones(x, z, h - datumM);
      },
      isReady(x, z) {
        return ensureDatum() && sampleMsl(x, z, false) !== null;
      },
      isWater(x, z) {
        if (!ensureDatum()) return false;
        for (let i = 0; i < flatZones.length; i++) {
          if (zoneDistance(x, z, flatZones[i]) === 0) return false;
        }
        const msl = sampleMsl(x, z, false);
        return msl !== null && msl <= 0.1;
      },
      getNormal(x, z) {
        const d = 30;
        const hl = provider.getHeight(x - d, z);
        const hr = provider.getHeight(x + d, z);
        const hf = provider.getHeight(x, z - d);
        const hb = provider.getHeight(x, z + d);
        if ([hl, hr, hf, hb].some(v => v === null)) return null;
        const nx = hl - hr;
        const nz = hf - hb;
        const ny = 2 * d;
        const len = Math.hypot(nx, ny, nz);
        return { x: nx / len, y: ny / len, z: nz / len };
      },
      update(position) {
        if (!position) return;
        ensureDatum();
        const { lat, lon } = frame.toWgs84(position.x, position.z);
        const { fx, fy } = lonLatToTilePixel(lat, lon, zoom);
        const cx = Math.floor(fx);
        const cy = Math.floor(fy);
        for (let dy = -prefetchRadius; dy <= prefetchRadius; dy++) {
          for (let dx = -prefetchRadius; dx <= prefetchRadius; dx++) request(cx + dx, cy + dy);
        }
      },
      dispose() {
        disposed = true;
        tiles.clear();
        order.length = 0;
      },
    };
    return provider;
  }

  function toNormalVector3(normal, Vector3Ctor) {
    if (!normal) return null;
    const { x, y, z } = normal;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    if (x * x + y * y + z * z <= 0.0001) return null;
    if (normal.isVector3) return normal;
    const Ctor = Vector3Ctor || root.THREE?.Vector3;
    return typeof Ctor === 'function' ? new Ctor(x, y, z) : { x, y, z };
  }

  function sampleReady(provider, x, z) {
    if (!provider?.isReady?.(x, z)) return null;
    const h = provider.getHeight?.(x, z);
    return Number.isFinite(h) ? h : null;
  }

  /**
   * Paired ground height, normal, and water queries for physics so contact
   * forces, normal slopes, and water ditching always describe the same surface.
   */
  function createGroundSurfaceQueries({
    getProvider,
    getFallbackHeight,
    getFallbackNormal = () => null,
    minHeight = -Infinity,
    waterFloorHeight,
    Vector3,
  }) {
    return {
      getGroundHeight(x, z) {
        const provider = getProvider();
        const h = sampleReady(provider, x, z);
        if (h !== null) {
          if (Number.isFinite(waterFloorHeight) && provider.isWater?.(x, z)) {
            return waterFloorHeight;
          }
          return Math.max(minHeight, h);
        }
        return getFallbackHeight(x, z);
      },
      getGroundNormal(x, z) {
        const provider = getProvider();
        if (sampleReady(provider, x, z) !== null) {
          if (Number.isFinite(waterFloorHeight) && provider.isWater?.(x, z)) return null;
          return toNormalVector3(provider.getNormal?.(x, z) ?? null, Vector3);
        }
        return toNormalVector3(getFallbackNormal(x, z), Vector3);
      },
      isWater(x, z) {
        const provider = getProvider();
        if (sampleReady(provider, x, z) === null) return null;
        return Boolean(provider.isWater?.(x, z));
      },
    };
  }

  /**
   * Physics height: provider when ready, otherwise the legacy fallback.
   * Never returns null/NaN, so a loading or failed tile cannot break physics.
   */
  function resolveGroundHeight(getProvider, fallback) {
    return (x, z) => {
      const provider = getProvider();
      if (provider && provider.isReady(x, z)) {
        const h = provider.getHeight(x, z);
        if (Number.isFinite(h)) return h;
      }
      return fallback(x, z);
    };
  }

  /** Browser tile loader: fetch PNG -> RGBA pixels. */
  function createBrowserTileLoader(urlTemplate) {
    const template = urlTemplate
      || 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
    return async function loadTile(z, x, y) {
      const url = template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`tile ${response.status}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    };
  }

  const api = {
    decodeTerrarium,
    lonLatToTilePixel,
    createAnchorFrame,
    createTerrariumProvider,
    createBrowserTileLoader,
    toNormalVector3,
    createGroundSurfaceQueries,
    resolveGroundHeight,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TerrainProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
