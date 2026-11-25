/**
 * floating_origin.js — camera-relative double-precision render frame.
 *
 * Simulation positions stay JS `number` (double). Only the values staged for
 * `mesh.position` are narrowed to float32, after subtracting the camera
 * origin. This avoids the ~0.5–1 m float32 ULP at Earth-radius magnitudes.
 */
(function (root) {
  'use strict';

  function create() {
    const geo = root.Geodesy;
    if (!geo || typeof geo.wgs84ToEcef !== 'function') {
      throw new Error('floating_origin.js requires geodesy.js');
    }

    let lat = 0;
    let lon = 0;
    let ecef = null;

    function frame() {
      return { lat, lon, height: 0 };
    }

    function rebase(nextLat, nextLon) {
      const a = Number(nextLat);
      const b = Number(nextLon);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new TypeError('floating origin rebase needs finite lat/lon');
      }
      lat = a;
      lon = b;
      ecef = geo.wgs84ToEcef(lat, lon, 0);
      return { lat, lon };
    }

    /** WGS84 point -> camera-relative ENU metres (double precision). */
    function toCameraEnu(pointLat, pointLon, height = 0) {
      if (!ecef) throw new Error('floating origin is not rebased');
      return geo.wgs84ToEnu(pointLat, pointLon, frame(), height);
    }

    /** Stage a camera-relative ENU triple as float32, as Mesh.position stores it. */
    function toRenderFloats(enu) {
      return new Float32Array([enu.east, enu.north, enu.up]);
    }

    /** Inverse of toCameraEnu, for diagnostics and round-trip checks. */
    function fromCameraEnu(east, north, up) {
      if (!ecef) throw new Error('floating origin is not rebased');
      return geo.enuToWgs84(east, north, up, frame());
    }

    function debug() {
      return {
        lat,
        lon,
        ecef: ecef ? { x: ecef.x, y: ecef.y, z: ecef.z } : null,
      };
    }

    return { rebase, toCameraEnu, toRenderFloats, fromCameraEnu, debug };
  }

  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FloatingOrigin = api;
})(typeof window !== 'undefined' ? window : globalThis);
