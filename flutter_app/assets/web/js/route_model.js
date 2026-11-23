/**
 * route_model.js — metric route progress for HUD and mission phases.
 *
 * Legacy arcade flights still use the compressed z corridor
 * (z = 0 → -45000 for RKPK → RKSI). Distances and bearings are always great
 * circle values from AirportIndicators; geo-tile flights use the active exact
 * geodetic anchor instead of compressed z.
 */
(function (root) {
  'use strict';

  const SIM_ORIGIN_X = 160;
  const SIM_ROUTE_END_Z = -45000;
  const SIM_GATE_X_OFFSET = -490;
  const FROM_DEST_PROGRESS = 0.55;
  const LANDING_PROGRESS = 0.66;

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  function indicators() {
    return root.AirportIndicators || null;
  }

  function anchor() {
    return root.GEO_ANCHOR || { lat: 35.165199, lon: 128.938995 };
  }

  function simAnchor() {
    return root.GEO_SIM_ANCHOR || { x: SIM_ORIGIN_X, z: 0 };
  }

  function destination(icao) {
    const nav = indicators();
    const key = String(icao || 'RKSI').toUpperCase();
    return (nav && nav.byIcao && nav.byIcao[key]) || (nav ? nav.destination : null);
  }

  function isDefaultRoute(icao) {
    return String(icao || 'RKSI').toUpperCase() === 'RKSI';
  }

  /** Aircraft world position -> WGS84. Compressed default corridor maps z onto the great circle. */
  function currentLatLon(x, z, compressed, icao) {
    const nav = indicators();
    if ((!compressed || !isDefaultRoute(icao)) && root.Geodesy) {
      const sa = simAnchor();
      return root.Geodesy.gameToWgs84(x - sa.x, z - (sa.z || 0), anchor());
    }
    if (nav && typeof nav.positionAlongRoute === 'function') {
      return nav.positionAlongRoute(-z / 45000);
    }
    return { lat: anchor().lat, lon: anchor().lon };
  }

  /** Real great-circle distance remaining to the selected destination. */
  function remainingKm(icao, x, z, compressed) {
    const nav = indicators();
    const dest = destination(icao);
    if (!nav || !dest) return null;
    return nav.distanceKm(currentLatLon(x, z, compressed, icao), dest);
  }

  /** Progress 0..1 along the active anchor -> destination great circle. */
  function progress(icao, x, z, compressed) {
    const nav = indicators();
    const dest = destination(icao);
    const remaining = remainingKm(icao, x, z, compressed);
    if (!nav || !dest || remaining === null) return clamp01(-z / 45000);
    const total = nav.distanceKm(anchor(), dest);
    return total > 0 ? clamp01(1 - remaining / total) : 1;
  }

  /** Destination threshold in world metres (compressed z for the default corridor). */
  function destinationSim(icao, compressed) {
    const dest = destination(icao);
    if ((!compressed || !isDefaultRoute(icao)) && root.Geodesy && dest) {
      const local = root.Geodesy.wgs84ToGame(dest.lat, dest.lon, anchor());
      const sa = simAnchor();
      return { x: local.x + sa.x, y: 0, z: local.z + (sa.z || 0) };
    }
    return { x: SIM_ORIGIN_X, y: 0, z: SIM_ROUTE_END_Z };
  }

  function gateSim(icao, compressed) {
    const dest = destinationSim(icao, compressed);
    return { x: dest.x + SIM_GATE_X_OFFSET, y: 0, z: dest.z };
  }

  function isFromDestination(icao, x, z, compressed) {
    return progress(icao, x, z, compressed) >= FROM_DEST_PROGRESS;
  }

  function isDestinationLanding(icao, x, z, compressed) {
    return progress(icao, x, z, compressed) >= LANDING_PROGRESS;
  }

  const api = {
    SIM_ORIGIN_X,
    SIM_ROUTE_END_Z,
    currentLatLon,
    remainingKm,
    progress,
    destinationSim,
    gateSim,
    isFromDestination,
    isDestinationLanding,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RouteModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
