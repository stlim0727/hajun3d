/**
 * Browser adapter for @stlim0727/flightsim-core terrain providers.
 *
 * Exposes the shared headless terrain contract and Terrarium elevation
 * provider from `globalThis.FlightSimCore` (loaded via `flightsim_core_bundle.js`)
 * alongside the browser tile loader (`createBrowserTileLoader`), which delegates
 * exclusively to tile_engine.js.
 */
(function(root) {
  'use strict';

  const core = root.FlightSimCore || root.Flight3dPhysics;
  if (!core || typeof core.createTerrariumProvider !== 'function') {
    throw new Error('terrain_provider.js requires flightsim_core_bundle.js to load first');
  }
  if (!root.TileEngine || typeof root.TileEngine.create !== 'function') {
    throw new Error('terrain_provider.js requires tile_engine.js to load first');
  }

  /** Browser tile loader: tile_engine.js cache + Worker decode. */
  function createBrowserTileLoader(urlTemplate, options = {}) {
    const template = urlTemplate
      || 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
    const engine = root.TileEngine.create({ urlTemplate: template, ...options });
    const loader = (z, x, y) => engine.loadTile(z, x, y);
    loader.engine = engine;
    return loader;
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
