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

  const api = {
    decodeTerrarium: core.decodeTerrarium,
    lonLatToTilePixel: core.lonLatToTilePixel,
    createAnchorFrame: core.createAnchorFrame,
    createTerrariumProvider: core.createTerrariumProvider,
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
