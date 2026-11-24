import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as THREE from 'three';

globalThis.THREE = THREE;
await import(pathToFileURL(resolve('web/js/flightsim_core_bundle.js')).href);
await import(pathToFileURL(resolve('web/js/geodesy.js')).href);
const geo = globalThis.Geodesy;

const ANCHOR = {
  lat: 35.165199279785156,
  lon: 128.93899536132812,
  headingDeg: 353.9,
  height: 33.25,
};

const POINTS = [
  ANCHOR,
  { lat: 35.1603056, lon: 129.1690 },  // Haeundae LCT
  { lat: 37.4690, lon: 126.4510 },     // Incheon
  { lat: 33.5141, lon: 126.5117 },     // Jeju
];

function closeDeg(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);
}

test('ECEF conversion uses the WGS84 ellipsoid and round-trips geodetic points', () => {
  const equator = geo.wgs84ToEcef(0, 0, 0);
  assert.ok(Math.abs(equator.x - geo.WGS84_A) < 1e-6);
  assert.ok(Math.abs(equator.y) < 1e-6);
  assert.ok(Math.abs(equator.z) < 1e-6);

  for (const point of POINTS) {
    const ecef = geo.wgs84ToEcef(point.lat, point.lon, 0);
    const back = geo.ecefToWgs84(ecef.x, ecef.y, ecef.z);
    closeDeg(back.lat, point.lat, 'ECEF latitude round-trip');
    closeDeg(back.lon, point.lon, 'ECEF longitude round-trip');
  }
});

test('ENU projection round-trips across regional distances', () => {
  for (const point of POINTS) {
    const enu = geo.wgs84ToEnu(point.lat, point.lon, ANCHOR);
    const back = geo.enuToWgs84(enu.east, enu.north, enu.up, ANCHOR);
    closeDeg(back.lat, point.lat, 'ENU latitude round-trip');
    closeDeg(back.lon, point.lon, 'ENU longitude round-trip');
  }
});

test('game-frame projection round-trips and follows the runway heading', () => {
  for (const point of POINTS) {
    const local = geo.wgs84ToGame(point.lat, point.lon, ANCHOR);
    const back = geo.gameToWgs84(local.x, local.z, ANCHOR);
    closeDeg(back.lat, point.lat, 'game-frame latitude round-trip');
    closeDeg(back.lon, point.lon, 'game-frame longitude round-trip');
  }

  // With heading 0, +X is East and -Z is North in the game frame.
  const northOrigin = { lat: 0, lon: 0, headingDeg: 0 };
  const east = geo.wgs84ToGame(0, 0.001, northOrigin);
  const north = geo.wgs84ToGame(0.001, 0, northOrigin);
  assert.ok(east.x > 0 && Math.abs(east.z) < 1e-6);
  assert.ok(north.z < 0 && Math.abs(north.x) < 1e-6);
});

test('local offsets near the anchor stay metric and consistent with ECEF', () => {
  const origin = { lat: 35, lon: 129, headingDeg: 0, height: 0 };
  const enu = geo.wgs84ToEnu(35.001, 129.001, origin);
  assert.ok(Math.abs(enu.east - 91.29) < 1);
  assert.ok(Math.abs(enu.north - 110.94) < 1);

  const back = geo.enuToWgs84(1000, -2000, 0, origin);
  // Analytic degree scaling stays within ~6 m of the ellipsoidal inverse at 2 km.
  assert.ok(Math.abs(back.lat - (35 - 2000 / 110574)) < 1e-4);
  assert.ok(Math.abs(back.lon - (129 + 1000 / (111320 * Math.cos(35 * Math.PI / 180)))) < 1e-4);
});

test('enuToWgs84 fallback preserves positive North direction beyond the tangent horizon', () => {
  const origin = { lat: 35, lon: 129, headingDeg: 0, height: 0 };
  const res = geo.enuToWgs84(0, 6500000, 0, origin);
  assert.ok(res.lat > origin.lat, `Northward ENU displacement must increase latitude (got ${res.lat})`);
});
