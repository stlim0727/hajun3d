/**
 * geodesy.js — exact WGS84 geodetic / ECEF / local ENU transforms.
 *
 * Pure math, no Three.js or renderer dependency. All intermediate values stay
 * in JS `number` (double); callers convert to float32 only at mesh writes.
 *
 * Game frame convention (same as geo_config.js):
 *   +X right, -Z forward along `origin.headingDeg`.
 */
(function (root) {
  'use strict';

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const WGS84_A = 6378137.0;
  const WGS84_B = 6356752.314245;
  const WGS84_E2 = 6.6943799901413165e-3;
  const WGS84_E2_PRIME = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B);
  const A2 = WGS84_A * WGS84_A;
  const B2 = WGS84_B * WGS84_B;

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

  /** Geodetic degrees -> ECEF metres. */
  function wgs84ToEcef(latitude, longitude, height = 0) {
    const lat = finite(latitude, 'latitude') * D2R;
    const lon = finite(longitude, 'longitude') * D2R;
    const h = finite(height, 'height');
    const sinLat = Math.sin(lat);
    const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
    return {
      x: (n + h) * Math.cos(lat) * Math.cos(lon),
      y: (n + h) * Math.cos(lat) * Math.sin(lon),
      z: (n * (1 - WGS84_E2) + h) * sinLat,
    };
  }

  /** ECEF metres -> geodetic degrees (Bowring's algorithm). */
  function ecefToWgs84(x, y, z) {
    const X = finite(x, 'x');
    const Y = finite(y, 'y');
    const Z = finite(z, 'z');
    const p = Math.hypot(X, Y);
    const theta = Math.atan2(Z * WGS84_A, p * WGS84_B);
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    const lat = Math.atan2(
      Z + WGS84_E2_PRIME * WGS84_B * st * st * st,
      p - WGS84_E2 * WGS84_A * ct * ct * ct
    );
    return { lat: lat * R2D, lon: Math.atan2(Y, X) * R2D };
  }

  /** Unit vectors of the local ENU frame at an origin, expressed in ECEF. */
  function axes(origin) {
    const lat = origin.lat * D2R;
    const lon = origin.lon * D2R;
    const sl = Math.sin(lat);
    const cl = Math.cos(lat);
    const so = Math.sin(lon);
    const co = Math.cos(lon);
    return {
      east: [-so, co, 0],
      north: [-sl * co, -sl * so, cl],
      up: [cl * co, cl * so, sl],
    };
  }

  /** Geodetic point -> local East/North/Up metres relative to origin. */
  function wgs84ToEnu(latitude, longitude, origin, height = 0) {
    const o = originOf(origin);
    const p = wgs84ToEcef(latitude, longitude, height);
    const c = wgs84ToEcef(o.lat, o.lon, o.height);
    const a = axes(o);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const dz = p.z - c.z;
    return {
      east: a.east[0] * dx + a.east[1] * dy + a.east[2] * dz,
      north: a.north[0] * dx + a.north[1] * dy + a.north[2] * dz,
      up: a.up[0] * dx + a.up[1] * dy + a.up[2] * dz,
    };
  }

  /**
   * Local ENU metres -> geodetic degrees. Uses an exact ellipsoid intersection
   * so regional distances stay sub-metre instead of drifting with flat-Earth
   * degree scaling.
   */
  function enuToWgs84(east, north, up, origin) {
    const o = originOf(origin);
    const e = finite(east, 'east');
    const n = finite(north, 'north');
    const u = finite(up || 0, 'up');
    const c = wgs84ToEcef(o.lat, o.lon, o.height);
    const a = axes(o);

    const px = c.x + a.east[0] * e + a.north[0] * n + a.up[0] * u;
    const py = c.y + a.east[1] * e + a.north[1] * n + a.up[1] * u;
    const pz = c.z + a.east[2] * e + a.north[2] * n + a.up[2] * u;

    const A = (a.up[0] * a.up[0] + a.up[1] * a.up[1]) / A2 + (a.up[2] * a.up[2]) / B2;
    const B = 2 * ((px * a.up[0] + py * a.up[1]) / A2 + (pz * a.up[2]) / B2);
    const C = (px * px + py * py) / A2 + (pz * pz) / B2 - 1;
    const disc = B * B - 4 * A * C;

    let qx;
    let qy;
    let qz;
    if (disc >= 0) {
      const y1 = (-B + Math.sqrt(disc)) / (2 * A);
      const y2 = (-B - Math.sqrt(disc)) / (2 * A);
      const y = Math.abs(y1) < Math.abs(y2) ? y1 : y2;
      qx = px + a.up[0] * y;
      qy = py + a.up[1] * y;
      qz = pz + a.up[2] * y;
    } else {
      // Beyond the tangent horizon: fall back to the analytic local expansion.
      const lat = o.lat * D2R;
      const sinLat = Math.sin(lat);
      const rn = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
      const rm = (WGS84_A * (1 - WGS84_E2)) / Math.pow(1 - WGS84_E2 * sinLat * sinLat, 1.5);
      return {
        lat: (o.lat - (n / rm) * R2D),
        lon: (o.lon + (e / (rn * Math.cos(lat))) * R2D),
      };
    }
    return ecefToWgs84(qx, qy, qz);
  }

  /** Geodetic point -> game-frame {x, z} metres around origin. */
  function wgs84ToGame(latitude, longitude, origin, height = 0) {
    const o = originOf(origin);
    const enu = wgs84ToEnu(latitude, longitude, o, height);
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
