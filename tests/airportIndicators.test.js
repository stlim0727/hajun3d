import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadIndicators() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('web/js/airport_indicators.js', 'utf8'), sandbox);
  return sandbox.window.AirportIndicators;
}

test('RKPK to RKSI indicator uses real great-circle distance and true bearing', () => {
  const nav = loadIndicators();

  assert.ok(Math.abs(nav.routeDistanceKm - 339.5) < 1, `route distance ${nav.routeDistanceKm}`);
  assert.ok(Math.abs(nav.routeBearingDeg - 319.7) < 1, `route bearing ${nav.routeBearingDeg}`);

  const start = nav.positionAlongRoute(0);
  const halfway = nav.positionAlongRoute(0.5);
  const end = nav.positionAlongRoute(1);

  assert.ok(Math.abs(start.lat - nav.origin.lat) < 1e-6);
  assert.ok(Math.abs(start.lon - nav.origin.lon) < 1e-6);
  assert.ok(Math.abs(end.lat - nav.destination.lat) < 1e-6);
  assert.ok(Math.abs(end.lon - nav.destination.lon) < 1e-6);
  assert.ok(Math.abs(nav.distanceKm(start, halfway) - nav.routeDistanceKm / 2) < 0.5);
});

test('indicators cover departure, destination, and nearby real airports', () => {
  const nav = loadIndicators();

  assert.deepEqual(Array.from(nav.airports, airport => airport.icao), [
    'RKPK', 'RKSI', 'RKSS', 'RKPC', 'RKTN', 'RKJK', 'RJFF'
  ]);

  const incheonFromGimhae = nav.indicatorFrom(nav.origin, nav.byIcao.RKSI);
  assert.ok(Math.abs(incheonFromGimhae.distanceKm - nav.routeDistanceKm) < 1e-6);

  const incheonAtDestination = nav.indicatorFrom(nav.destination, nav.byIcao.RKSI);
  assert.ok(incheonAtDestination.distanceKm < 0.01);

  const jejuFromGimhae = nav.indicatorFrom(nav.origin, nav.byIcao.RKPC);
  assert.ok(jejuFromGimhae.distanceKm > 280 && jejuFromGimhae.distanceKm < 300);
  assert.ok(jejuFromGimhae.bearingDeg > 225 && jejuFromGimhae.bearingDeg < 238);

  for (const indicator of nav.airports.map(airport => nav.indicatorFrom(nav.origin, airport))) {
    assert.ok(indicator.bearingDeg >= 0 && indicator.bearingDeg < 360);
    assert.ok(Number.isFinite(indicator.distanceKm));
  }
});
