/**
 * Browser adapter for @stlim0727/flightsim-core terrain providers.
 *
 * Exposes the shared headless terrain contract and Terrarium elevation
 * provider from `globalThis.FlightSimCore` (loaded via `flightsim_core_bundle.js`)
 * alongside the browser-only PNG tile fetcher (`createBrowserTileLoader`) on
 * `window.TerrainProvider`.
 */
(function(root) {
  'use strict';

  const TILE_SIZE = 256;
  const core = root.FlightSimCore || root.Flight3dPhysics;
  if (!core || typeof core.createTerrariumProvider !== 'function') {
    throw new Error('terrain_provider.js requires flightsim_core_bundle.js to load first');
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
      const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(TILE_SIZE, TILE_SIZE)
        : Object.assign(document.createElement('canvas'), { width: TILE_SIZE, height: TILE_SIZE });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      if (typeof bitmap.close === 'function') bitmap.close();
      return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    };
  }

  /**
   * Terrarium provider aligned with the exact game frame from geodesy.js.
   * The vendored core provider still uses its flat createAnchorFrame(); this
   * adapter converts sim coordinates into the equivalent flat coordinates so
   * tile lookup and flat zones land on the same WGS84 points as landmarks and
   * the HUD. No vendored code is modified.
   */
  function createExactFrameTerrariumProvider(options) {
    const geo = root.Geodesy;
    if (!geo || typeof geo.gameToWgs84 !== 'function') {
      throw new Error('createExactFrameTerrariumProvider requires geodesy.js');
    }
    const o = options || {};
    if (!o.anchor) throw new Error('createExactFrameTerrariumProvider requires { anchor }');
    const anchor = o.anchor;
    const simOffset = o.simOffset || { x: 0, z: 0 };
    const r = (anchor.headingDeg || 0) * Math.PI / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const raw = core.createTerrariumProvider(o);

    // Inverse of the vendored flat frame: exact sim metres -> flat sim metres.
    function toFlat(x, z) {
      const ll = geo.gameToWgs84(x - simOffset.x, z - simOffset.z, anchor);
      const latMid = (anchor.lat + ll.lat) * 0.5 * Math.PI / 180;
      const east = (ll.lon - anchor.lon) * 111320 * Math.cos(latMid);
      const north = (ll.lat - anchor.lat) * 110540;
      const a = east * cos - north * sin;
      const b = east * sin + north * cos;
      return { x: a + simOffset.x, z: simOffset.z - b };
    }

    return {
      kind: raw.kind,
      zoom: raw.zoom,
      visualRoot: raw.visualRoot,
      getHeight(x, z) {
        const p = toFlat(x, z);
        return raw.getHeight(p.x, p.z);
      },
      isReady(x, z) {
        const p = toFlat(x, z);
        return raw.isReady(p.x, p.z);
      },
      isWater(x, z) {
        const p = toFlat(x, z);
        return raw.isWater(p.x, p.z);
      },
      getNormal(x, z) {
        const p = toFlat(x, z);
        return raw.getNormal(p.x, p.z);
      },
      update(position) {
        if (!position) return raw.update(position);
        const p = toFlat(position.x, position.z);
        return raw.update({ x: p.x, y: position.y, z: p.z });
      },
      dispose() { return raw.dispose(); }
    };
  }

  const api = {
    decodeTerrarium: core.decodeTerrarium,
    lonLatToTilePixel: core.lonLatToTilePixel,
    createAnchorFrame: core.createAnchorFrame,
    createTerrariumProvider: core.createTerrariumProvider,
    createExactFrameTerrariumProvider,
    analyticTerrainProvider: core.analyticTerrainProvider,
    assertTerrainProviderContract: core.assertTerrainProviderContract,
    toNormalVector3: core.toNormalVector3,
    createGroundSurfaceQueries: core.createGroundSurfaceQueries,
    createGroundHeightQuery: core.createGroundHeightQuery,
    resolveGroundHeight: core.resolveGroundHeight,
    createBrowserTileLoader,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TerrainProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
