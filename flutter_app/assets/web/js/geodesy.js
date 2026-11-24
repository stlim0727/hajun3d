/**
 * geodesy.js — local game-frame adapter over the core WGS84 geo primitives.
 *
 * All ellipsoid math lives in @stlim0727/flightsim-core (loaded via
 * flightsim_core_bundle.js). This module keeps hajun3d's existing conventions:
 * +X right, -Z forward along `origin.headingDeg`, and `{ lat, lon }` results.
 */
(function (root) {
  'use strict';

  const core = root.FlightSimCore || root.Flight3dPhysics;
  if (!core || typeof core.wgs84ToEcef !== 'function' ||
      typeof core.ecefToWgs84 !== 'function' ||
      typeof core.wgs84ToEnu !== 'function' ||
      typeof core.enuToWgs84 !== 'function') {
    throw new Error('geodesy.js requires flightsim_core_bundle.js to load first');
  }

  const D2R = Math.PI / 180;
  const WGS84_A = core.WGS84_A;
  const WGS84_B = core.WGS84_B;

  function finite(value, name) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
    return value;
  }

  function originOf(origin) {
    if (!origin) throw new TypeError('origin is required');
    return {
      lat: finite(origin.lat, 'origin.lat'),
      lon: finite(origin.lon, 'origin.lon'),
      height: finite(origin.height || 0, 'origin.height'),
      headingDeg: finite(origin.headingDeg || 0, 'origin.headingDeg'),
    };
  }

  /** Geodetic degrees -> ECEF metres (core WGS84 ellipsoid). */
  function wgs84ToEcef(latitude, longitude, height = 0) {
    return core.wgs84ToEcef(latitude, longitude, height);
  }

  /** ECEF metres -> geodetic degrees in the legacy { lat, lon } shape. */
  function ecefToWgs84(x, y, z) {
    const point = core.ecefToWgs84(x, y, z);
    return { lat: point.latitude, lon: point.longitude };
  }

  /** Geodetic point -> local ENU metres relative to origin. */
  function wgs84ToEnu(latitude, longitude, origin, height = 0) {
    return core.wgs84ToEnu(latitude, longitude, originOf(origin), height);
  }

  /** Local ENU metres -> geodetic degrees in the legacy { lat, lon } shape. */
  function enuToWgs84(east, north, up, origin) {
    const point = core.enuToWgs84(east, north, up, originOf(origin));
    return { lat: point.latitude, lon: point.longitude };
  }

  /** Geodetic point -> game-frame {x, z} metres around origin. */
  function wgs84ToGame(latitude, longitude, origin, height = 0) {
    const o = originOf(origin);
    const enu = core.wgs84ToEnu(latitude, longitude, o, height);
    const r = o.headingDeg * D2R;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    return {
      x: enu.east * cos - enu.north * sin,
      z: -(enu.east * sin + enu.north * cos),
    };
  }

  /** Game-frame {x, z} metres -> geodetic degrees around origin. */
  function gameToWgs84(x, z, origin) {
    const o = originOf(origin);
    const gx = finite(x, 'x');
    const gz = finite(z, 'z');
    const r = o.headingDeg * D2R;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const east = gx * cos - gz * sin;
    const north = -gx * sin - gz * cos;
    return enuToWgs84(east, north, 0, o);
  }

  const api = {
    WGS84_A,
    WGS84_B,
    wgs84ToEcef,
    ecefToWgs84,
    wgs84ToEnu,
    enuToWgs84,
    wgs84ToGame,
    gameToWgs84,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Geodesy = api;
})(typeof window !== 'undefined' ? window : globalThis);
