// Cesium ion access token for streamed terrain (Gimhae-anchored world).
// Restricted in the ion dashboard to assets:read, asset 2275207, and https://stlim0727.github.io.
// Community plan: personal / non-commercial use only; upgrade before commercial deployment.
window.GEO_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IkVqdjlkZVlyQkw0aVJRYTgiLCJqdGkiOiI5OWQwOTE4YS1hODJiLTRhYjEtYWQ0Ni01MTU3NzRiOTZhMDEiLCJpZCI6NTUzMjk4LCJzdWIiOiJ0b3RvaGVybyIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJoYWp1bjNkIiwiaWF0IjoxNzk1MTU0ODUzfQ.MG8Eqi7Be9X1cNL7gNEUTFmSvE4iU2KOPedE17upyo8';


// Gimhae International Airport (RKPK/PUS), runway 18R/36L threshold (36L end).
window.GEO_ANCHOR = {
  lat: 35.165199279785156,
  lon: 128.93899536132812,
  headingDeg: 353.9,
  // Align the WGS84 tile elevations to the simulator runway at the ground LOD.
  height: 33.25
};

// Landmarks to place at real geodetic offsets from the Gimhae anchor.
// `old` is their previous compressed local position in the game world.
window.GEO_POINTS = {
  haeundae: { lat: 35.1603056, lon: 129.1690, old: { x: -180, z: -28700 } },
  incheon: { lat: 37.4690, lon: 126.4510, old: { x: 0, z: -45000 } },
  jeju: { lat: 33.5141, lon: 126.5117, old: { x: 0, z: 0 } },
};

// Local-frame delta from a landmark's old compressed position to its real ENU
// position. Game frame: +X right, -Z forward along the runway heading.
// Exact WGS84/ECEF projection comes from geodesy.js, loaded before this file.
window.geoLocalDelta = function (point) {
  const local = window.Geodesy.wgs84ToGame(point.lat, point.lon, window.GEO_ANCHOR);
  return {
    x: local.x - point.old.x,
    y: 0,
    z: local.z - point.old.z,
    local
  };
};

// Baseline default anchor and simulation anchor coordinates.
window.DEFAULT_GEO_ANCHOR = { ...window.GEO_ANCHOR };
window.GEO_SIM_ANCHOR = { x: 160, z: 0 };

// Inverse of geoLocalDelta: maps local game-frame (x, z) back to WGS84 (lat, lon).
window.geoLocalToLatLon = function (x, z) {
  return window.Geodesy.gameToWgs84(x, z, window.GEO_ANCHOR);
};
