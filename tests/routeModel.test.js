import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ANCHOR = {
  lat: 35.165199279785156,
  lon: 128.93899536132812,
  headingDeg: 353.9,
  height: 33.25,
};

function loadRouteModel() {
  const sandbox = { window: {}, Math, Number };
  sandbox.window.GEO_ANCHOR = { ...ANCHOR };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/geodesy.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/airport_indicators.js', 'utf8'), sandbox);
  vm.runInContext(readFileSync('web/js/route_model.js', 'utf8'), sandbox);
  return { window: sandbox.window, route: sandbox.window.RouteModel, nav: sandbox.window.AirportIndicators };
}

test('compressed corridor reports real great-circle progress and remaining distance', () => {
  const { route, nav } = loadRouteModel();
  assert.ok(Math.abs(route.progress('RKSI', 160, 0, true)) < 1e-6);
  assert.ok(Math.abs(route.remainingKm('RKSI', 160, 0, true) - nav.routeDistanceKm) < 0.01);

  const midpoint = route.currentLatLon(160, -22500, true);
  assert.ok(Math.abs(nav.distanceKm(midpoint, nav.byIcao.RKSI) - nav.routeDistanceKm / 2) < 1);

  assert.ok(Math.abs(route.progress('RKSI', 160, -45000, true) - 1) < 1e-6);
  assert.ok(route.remainingKm('RKSI', 160, -45000, true) < 0.01);
  assert.equal(route.destinationSim('RKSI', true).z, -45000);
});

test('compressed route drives the from-destination and landing phase thresholds', () => {
  const { route } = loadRouteModel();
  assert.equal(route.isFromDestination('RKSI', 160, -20000, true), false);
  assert.equal(route.isFromDestination('RKSI', 160, -25000, true), true);
  assert.equal(route.isDestinationLanding('RKSI', 160, -25000, true), false);
  assert.equal(route.isDestinationLanding('RKSI', 160, -30000, true), true);
});

test('geo-tile mode measures progress from the active WGS84 anchor, not z', () => {
  const { window, route, nav } = loadRouteModel();
  const dest = nav.byIcao.RKSI;
  const local = window.Geodesy.wgs84ToGame(dest.lat, dest.lon, window.GEO_ANCHOR);
  const sim = { x: local.x + route.SIM_ORIGIN_X, z: local.z };

  assert.ok(route.remainingKm('RKSI', sim.x, sim.z, false) < 0.01);
  assert.ok(route.progress('RKSI', sim.x, sim.z, false) > 0.999);
  assert.ok(Math.abs(route.destinationSim('RKSI', false).x - sim.x) < 1e-6);
  assert.ok(Math.abs(route.destinationSim('RKSI', false).z - sim.z) < 1e-6);
  assert.ok(route.remainingKm('RKSI', 160, 0, false) > 300);
});

test('geo-tile mode respects retargeted GEO_SIM_ANCHOR for position and destination', () => {
  const { window, route, nav } = loadRouteModel();
  const tokyo = { lat: 35.5494, lon: 139.7798, headingDeg: 353.9, height: 10 };
  window.GEO_ANCHOR = { ...tokyo };
  const tokyoSimAnchor = { x: 981794, z: 8352 };
  window.GEO_SIM_ANCHOR = { ...tokyoSimAnchor };

  const cur = route.currentLatLon(tokyoSimAnchor.x, tokyoSimAnchor.z, false, 'RKSI');
  assert.ok(Math.abs(cur.lat - tokyo.lat) < 1e-4);
  assert.ok(Math.abs(cur.lon - tokyo.lon) < 1e-4);

  const dest = nav.byIcao.RKSI;
  const local = window.Geodesy.wgs84ToGame(dest.lat, dest.lon, tokyo);
  const destSim = route.destinationSim('RKSI', false);
  assert.ok(Math.abs(destSim.x - (local.x + tokyoSimAnchor.x)) < 1e-4);
  assert.ok(Math.abs(destSim.z - (local.z + tokyoSimAnchor.z)) < 1e-4);
});
