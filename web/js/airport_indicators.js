// Real-world airport reference data and great-circle navigation helpers.
// Sources: KOCA eAIP AD 2 (RKPK, RKSI), ATISVIEW/OurAirports directory snapshot 2026-11-17.
// Simulator world geometry is compressed; these functions always use real geodetic values.
(function () {
  'use strict';

  const EARTH_RADIUS_KM = 6371.0088;
  const DEG = Math.PI / 180;

  const airports = [
    {
      icao: 'RKPK', iata: 'PUS', name: '김해국제공항', short: '김해',
      lat: 35.165199, lon: 128.938995, elevationM: 4, towerMHz: 118.1,
      runways: ['18R/36L 3200×60', '18L/36R 2743×46']
    },
    {
      icao: 'RKSI', iata: 'ICN', name: '인천국제공항', short: '인천',
      lat: 37.4690, lon: 126.4510, elevationM: 7, towerMHz: 118.2,
      runways: ['15R/33L 3750×60', '15L/33R 3750×60', '16L/34R 4000×60', '16R/34L 3750×60']
    },
    {
      icao: 'RKSS', iata: 'GMP', name: '김포국제공항', short: '김포',
      lat: 37.5583, lon: 126.7910, elevationM: 18, towerMHz: 118.05,
      runways: ['14L/32R 3600×45', '14R/32L 3200×60']
    },
    {
      icao: 'RKPC', iata: 'CJU', name: '제주국제공항', short: '제주',
      lat: 33.5121, lon: 126.4925, elevationM: 36, towerMHz: 118.2,
      runways: ['07/25 3180×45', '13/31 1911×45']
    },
    {
      icao: 'RKTN', iata: 'TAE', name: '대구국제공항', short: '대구',
      lat: 35.8944, lon: 128.6570, elevationM: 35, towerMHz: 126.2,
      runways: ['13L/31R 2743×46', '13R/31L 2755×46']
    },
    {
      icao: 'RKJK', iata: 'KUV', name: '군산공항', short: '군산',
      lat: 35.9038, lon: 126.6160, elevationM: 9, towerMHz: 126.5,
      runways: ['18/36 2743×46']
    },
    {
      icao: 'RJFF', iata: 'FUK', name: '후쿠오카공항', short: '후쿠오카',
      lat: 33.5859, lon: 130.4510, elevationM: 10, towerMHz: 118.4,
      runways: ['16L/34R 2800×60', '16R/34L 2500×60']
    }
  ];

  const byIcao = {};
  for (const airport of airports) byIcao[airport.icao] = airport;

  const origin = byIcao.RKPK;
  const destination = byIcao.RKSI;

  function toVector(point) {
    const lat = point.lat * DEG;
    const lon = point.lon * DEG;
    const cosLat = Math.cos(lat);
    return { x: cosLat * Math.cos(lon), y: Math.sin(lat), z: cosLat * Math.sin(lon) };
  }

  function distanceKm(from, to) {
    const lat1 = from.lat * DEG;
    const lat2 = to.lat * DEG;
    const dLat = lat2 - lat1;
    const dLon = (to.lon - from.lon) * DEG;
    const half = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(half)));
  }

  function bearingDeg(from, to) {
    const lat1 = from.lat * DEG;
    const lat2 = to.lat * DEG;
    const dLon = (to.lon - from.lon) * DEG;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) / DEG + 360) % 360;
  }

  // The simulator compresses the route into 45,000 world units along -Z.
  // Map that progress back onto the real great circle between the two airports.
  function positionAlongRoute(progress) {
    const t = Math.min(1, Math.max(0, progress));
    const a = toVector(origin);
    const b = toVector(destination);
    const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
    const omega = Math.acos(dot);
    if (omega < 1e-8) return { lat: destination.lat, lon: destination.lon };

    const sinOmega = Math.sin(omega);
    const wa = Math.sin((1 - t) * omega) / sinOmega;
    const wb = Math.sin(t * omega) / sinOmega;
    const x = wa * a.x + wb * b.x;
    const y = wa * a.y + wb * b.y;
    const z = wa * a.z + wb * b.z;
    const norm = Math.hypot(x, y, z);
    return {
      lat: Math.asin(y / norm) / DEG,
      lon: Math.atan2(z, x) / DEG
    };
  }

  function indicatorFrom(position, airport) {
    return {
      icao: airport.icao,
      iata: airport.iata,
      short: airport.short,
      runways: airport.runways,
      distanceKm: distanceKm(position, airport),
      bearingDeg: bearingDeg(position, airport)
    };
  }

  window.AirportIndicators = {
    airports,
    byIcao,
    origin,
    destination,
    routeDistanceKm: distanceKm(origin, destination),
    routeBearingDeg: bearingDeg(origin, destination),
    distanceKm,
    bearingDeg,
    positionAlongRoute,
    indicatorFrom
  };
})();
