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
  incheon: { lat: 37.4690, lon: 126.4510, old: { x: 0, z: -45000 } }
};

// Local-frame delta from a landmark's old compressed position to its real ENU
// position. Game frame: +X right, -Z forward along the runway heading.
window.geoLocalDelta = function (point) {
  const a = window.GEO_ANCHOR;
  const r = a.headingDeg * Math.PI / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const latMid = (a.lat + point.lat) * 0.5 * Math.PI / 180;
  const east = (point.lon - a.lon) * 111320 * Math.cos(latMid);
  const north = (point.lat - a.lat) * 110540;
  const x = east * cos - north * sin;
  const z = -(east * sin + north * cos);
  return {
    x: x - point.old.x,
    y: 0,
    z: z - point.old.z,
    local: { x, z }
  };
};

// Inverse of geoLocalDelta: maps local game-frame (x, z) back to approximate WGS84 (lat, lon).
window.geoLocalToLatLon = function (x, z) {
  const a = window.GEO_ANCHOR;
  const r = a.headingDeg * Math.PI / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const east = x * cos - z * sin;
  const north = -x * sin - z * cos;
  const lat = a.lat + north / 110540;
  const latMid = (a.lat + lat) * 0.5 * Math.PI / 180;
  const lon = a.lon + east / (111320 * Math.cos(latMid));
  return { lat, lon };
};
