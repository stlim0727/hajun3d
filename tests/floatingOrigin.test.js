import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as THREE from 'three';

globalThis.THREE = THREE;
await import(pathToFileURL(resolve('web/js/flightsim_core_bundle.js')).href);
await import(pathToFileURL(resolve('web/js/geodesy.js')).href);
await import(pathToFileURL(resolve('web/js/floating_origin.js')).href);
const geo = globalThis.Geodesy;
const FloatingOrigin = globalThis.FloatingOrigin;

const CAMERA = { lat: 35.165199279785156, lon: 128.93899536132812 };

test('floating origin stages camera-relative ENU in float32 without ECEF jitter', () => {
  const origin = FloatingOrigin.create();
  origin.rebase(CAMERA.lat, CAMERA.lon);

  const target = { lat: CAMERA.lat + 0.01, lon: CAMERA.lon };
  const enu = origin.toCameraEnu(target.lat, target.lon);
  assert.ok(Math.abs(enu.north - 1109.44) < 2);
  assert.ok(Math.hypot(enu.east, enu.up) < 1);

  const render = origin.toRenderFloats(enu);
  assert.ok(render instanceof Float32Array);
  assert.ok(Math.abs(render[1] - enu.north) < 0.001);

  const ecef = geo.wgs84ToEcef(CAMERA.lat, CAMERA.lon, 0);
  const globalFloat = new Float32Array([ecef.x, ecef.y, ecef.z]);
  const ecefError = Math.hypot(globalFloat[0] - ecef.x, globalFloat[1] - ecef.y, globalFloat[2] - ecef.z);
  assert.ok(ecefError > 0.05, `expected metre-scale ECEF float32 error, got ${ecefError}`);
});

test('floating origin round-trips camera-relative ENU back to WGS84', () => {
  const origin = FloatingOrigin.create();
  origin.rebase(CAMERA.lat, CAMERA.lon);

  const target = { lat: CAMERA.lat, lon: CAMERA.lon + 0.01, height: 250 };
  const enu = origin.toCameraEnu(target.lat, target.lon, target.height);
  const back = origin.fromCameraEnu(enu.east, enu.north, enu.up);
  assert.ok(Math.abs(back.lat - target.lat) < 1e-9);
  assert.ok(Math.abs(back.lon - target.lon) < 1e-6);
});

test('stationary aircraft shows zero drift over ten minutes of rebasing', () => {
  const origin = FloatingOrigin.create();
  origin.rebase(CAMERA.lat, CAMERA.lon);
  const target = { lat: CAMERA.lat + 0.001, lon: CAMERA.lon + 0.001 };
  const baseline = origin.toCameraEnu(target.lat, target.lon);

  for (let i = 0; i < 600; i++) origin.rebase(CAMERA.lat, CAMERA.lon);
  const after = origin.toCameraEnu(target.lat, target.lon);
  assert.ok(Math.abs(after.east - baseline.east) < 1e-9);
  assert.ok(Math.abs(after.north - baseline.north) < 1e-9);
  assert.ok(Math.abs(after.up - baseline.up) < 1e-9);
});
