// 3D Geometry Utilities for Procedural GLB Model Generation

function transformPoint(p, matrix) {
  // Simple translation + scale if needed
  return p;
}

// Generates smooth normals for a set of positions and triangle indices
function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  const pCount = positions.length / 3;

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    // Cross product
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
  }

  // Normalize
  for (let i = 0; i < pCount; i++) {
    const idx = i * 3;
    const nx = normals[idx], ny = normals[idx + 1], nz = normals[idx + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    normals[idx] = nx / len;
    normals[idx + 1] = ny / len;
    normals[idx + 2] = nz / len;
  }

  return Array.from(normals);
}

// 1. Box geometry
function createBox(dx, dy, dz, cx = 0, cy = 0, cz = 0) {
  const hx = dx / 2, hy = dy / 2, hz = dz / 2;
  const rawPositions = [
    // Front (+Z)
    cx - hx, cy - hy, cz + hz,  cx + hx, cy - hy, cz + hz,  cx + hx, cy + hy, cz + hz,  cx - hx, cy + hy, cz + hz,
    // Back (-Z)
    cx + hx, cy - hy, cz - hz,  cx - hx, cy - hy, cz - hz,  cx - hx, cy + hy, cz - hz,  cx + hx, cy + hy, cz - hz,
    // Top (+Y)
    cx - hx, cy + hy, cz + hz,  cx + hx, cy + hy, cz + hz,  cx + hx, cy + hy, cz - hz,  cx - hx, cy + hy, cz - hz,
    // Bottom (-Y)
    cx - hx, cy - hy, cz - hz,  cx + hx, cy - hy, cz - hz,  cx + hx, cy - hy, cz + hz,  cx - hx, cy - hy, cz + hz,
    // Right (+X)
    cx + hx, cy - hy, cz + hz,  cx + hx, cy - hy, cz - hz,  cx + hx, cy + hy, cz - hz,  cx + hx, cy + hy, cz + hz,
    // Left (-X)
    cx - hx, cy - hy, cz - hz,  cx - hx, cy - hy, cz + hz,  cx - hx, cy + hy, cz + hz,  cx - hx, cy + hy, cz - hz
  ];

  const indices = [];
  for (let f = 0; f < 6; f++) {
    const base = f * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const normals = computeNormals(rawPositions, indices);
  return { positions: rawPositions, indices, normals };
}

// 2. Cylinder / Cone geometry along Z axis (or X or Y)
function createCylinder(rFront, rBack, length, segments = 16, cx = 0, cy = 0, cz = 0, axis = 'z') {
  const positions = [];
  const indices = [];
  const halfLen = length / 2;

  // Front cap center: index 0
  // Back cap center: index 1
  let fcx = cx, fcy = cy, fcz = cz;
  let bcx = cx, bcy = cy, bcz = cz;

  if (axis === 'z') {
    fcz -= halfLen; // Front is -Z
    bcz += halfLen; // Back is +Z
  } else if (axis === 'x') {
    fcx -= halfLen;
    bcx += halfLen;
  } else {
    fcy += halfLen;
    bcy -= halfLen;
  }

  positions.push(fcx, fcy, fcz);
  positions.push(bcx, bcy, bcz);

  const frontRingStart = 2;
  const backRingStart = 2 + segments;

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    if (axis === 'z') {
      positions.push(cx + cosT * rFront, cy + sinT * rFront, fcz);
    } else if (axis === 'x') {
      positions.push(fcx, cy + cosT * rFront, cz + sinT * rFront);
    } else {
      positions.push(cx + cosT * rFront, fcy, cz + sinT * rFront);
    }
  }

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    if (axis === 'z') {
      positions.push(cx + cosT * rBack, cy + sinT * rBack, bcz);
    } else if (axis === 'x') {
      positions.push(bcx, cy + cosT * rBack, cz + sinT * rBack);
    } else {
      positions.push(cx + bcy, bcy, cz + sinT * rBack);
    }
  }

  // Indices for front cap
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, frontRingStart + i, frontRingStart + next);
  }

  // Indices for back cap
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(1, backRingStart + next, backRingStart + i);
  }

  // Indices for side walls
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const f0 = frontRingStart + i;
    const f1 = frontRingStart + next;
    const b0 = backRingStart + i;
    const b1 = backRingStart + next;

    indices.push(f0, b0, f1);
    indices.push(f1, b0, b1);
  }

  const normals = computeNormals(positions, indices);
  return { positions, indices, normals };
}

// 3. Multi-stage Fuselage Lofter
// profiles: array of { z, rx, ry, cy } where z goes from nose to tail
function createLoftFuselage(profiles, segments = 20) {
  const positions = [];
  const indices = [];

  const rings = [];
  let vertIdx = 0;

  for (let p = 0; p < profiles.length; p++) {
    const { z, rx, ry, cy = 0, cx = 0 } = profiles[p];
    const ring = [];
    if (rx <= 0.001 && ry <= 0.001) {
      // Tip point
      positions.push(cx, cy, z);
      ring.push(vertIdx++);
    } else {
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const x = cx + Math.cos(theta) * rx;
        const y = cy + Math.sin(theta) * ry;
        positions.push(x, y, z);
        ring.push(vertIdx++);
      }
    }
    rings.push(ring);
  }

  // Stitch rings together
  for (let p = 0; p < profiles.length - 1; p++) {
    const rA = rings[p];
    const rB = rings[p + 1];

    if (rA.length === 1 && rB.length > 1) {
      // Nose cone tip fan
      const tip = rA[0];
      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        indices.push(tip, rB[s], rB[next]);
      }
    } else if (rA.length > 1 && rB.length === 1) {
      // Tail cone tip fan
      const tip = rB[0];
      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        indices.push(tip, rA[next], rA[s]);
      }
    } else if (rA.length > 1 && rB.length > 1) {
      // Quads between two rings
      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        const a0 = rA[s];
        const a1 = rA[next];
        const b0 = rB[s];
        const b1 = rB[next];

        indices.push(a0, b0, a1);
        indices.push(a1, b0, b1);
      }
    }
  }

  const normals = computeNormals(positions, indices);
  return { positions, indices, normals };
}

// 4. Swept Wing Builder (left or right wing)
function createSweptWing({
  rootX = 0, rootY = 0, rootZ = 0,
  span = 17,
  rootChord = 7.0,
  tipChord = 2.0,
  sweepBack = 6.0,
  dihedralY = 1.2,
  thickness = 0.5,
  isLeft = false
}) {
  const sign = isLeft ? -1 : 1;
  const tipX = rootX + sign * span;
  const tipY = rootY + dihedralY;
  const tipZ = rootZ + sweepBack;

  const rThick = thickness;
  const tThick = thickness * 0.45;

  // Root profile: 4 vertices (top-front, top-back, bot-back, bot-front)
  const rfTop = [rootX, rootY + rThick / 2, rootZ - rootChord * 0.4];
  const rbTop = [rootX, rootY + rThick * 0.3, rootZ + rootChord * 0.6];
  const rbBot = [rootX, rootY - rThick * 0.3, rootZ + rootChord * 0.6];
  const rfBot = [rootX, rootY - rThick / 2, rootZ - rootChord * 0.4];

  // Tip profile
  const tfTop = [tipX, tipY + tThick / 2, tipZ - tipChord * 0.4];
  const tbTop = [tipX, tipY + tThick * 0.3, tipZ + tipChord * 0.6];
  const tbBot = [tipX, tipY - tThick * 0.3, tipZ + tipChord * 0.6];
  const tfBot = [tipX, tipY - tThick / 2, tipZ - tipChord * 0.4];

  const positions = [
    ...rfTop, ...rbTop, ...rbBot, ...rfBot, // 0, 1, 2, 3
    ...tfTop, ...tbTop, ...tbBot, ...tfBot  // 4, 5, 6, 7
  ];

  const indices = [];

  // Top surface
  indices.push(0, 4, 5, 0, 5, 1);
  // Bottom surface
  indices.push(3, 2, 6, 3, 6, 7);
  // Leading edge
  indices.push(0, 3, 7, 0, 7, 4);
  // Trailing edge
  indices.push(1, 5, 6, 1, 6, 2);
  // Tip cap
  indices.push(4, 7, 6, 4, 6, 5);

  const normals = computeNormals(positions, indices);
  return { positions, indices, normals };
}

// Merge multiple geometries into one
function mergeGeometries(geoList) {
  const allPositions = [];
  const allIndices = [];
  const hasColors = geoList.some(g => Array.isArray(g.colors) && g.colors.length === g.positions.length);
  const allColors = hasColors ? [] : null;
  let offset = 0;

  for (const g of geoList) {
    for (let i = 0; i < g.positions.length; i++) {
      allPositions.push(g.positions[i]);
    }
    if (hasColors) {
      if (g.colors && g.colors.length === g.positions.length) {
        for (let i = 0; i < g.colors.length; i++) {
          allColors.push(g.colors[i]);
        }
      } else {
        for (let i = 0; i < g.positions.length; i++) {
          allColors.push(1.0);
        }
      }
    }
    for (let i = 0; i < g.indices.length; i++) {
      allIndices.push(g.indices[i] + offset);
    }
    offset += g.positions.length / 3;
  }

  const normals = computeNormals(allPositions, allIndices);
  return hasColors
    ? { positions: allPositions, indices: allIndices, normals, colors: allColors }
    : { positions: allPositions, indices: allIndices, normals };
}

// Cone geometry along Y axis (for mountains, hills, palm trees)
function createCone(radius, height, segments = 16, cx = 0, cy = 0, cz = 0) {
  const positions = [];
  const indices = [];

  // Apex vertex: index 0
  positions.push(cx, cy + height, cz);
  // Base center vertex: index 1
  positions.push(cx, cy, cz);

  const baseStart = 2;
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    positions.push(cx + Math.cos(theta) * radius, cy, cz + Math.sin(theta) * radius);
  }

  // Side triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, baseStart + i, baseStart + next);
  }

  // Base cap triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(1, baseStart + next, baseStart + i);
  }

  const normals = computeNormals(positions, indices);
  return { positions, indices, normals };
}

// Flat 2D horizontal plane (Y = cy)
function createHorizontalPlane(width, length, cx = 0, cy = 0, cz = 0) {
  const hx = width / 2;
  const hz = length / 2;
  const positions = [
    cx - hx, cy, cz - hz,
    cx + hx, cy, cz - hz,
    cx + hx, cy, cz + hz,
    cx - hx, cy, cz + hz
  ];
  const indices = [0, 2, 1, 0, 3, 2];
  const normals = [
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0
  ];
  return { positions, indices, normals };
}

function _terrainHash2D(ix, iz, seed) {
  const n = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function _terrainNoise2D(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);

  const a = _terrainHash2D(ix, iz, seed);
  const b = _terrainHash2D(ix + 1, iz, seed);
  const c = _terrainHash2D(ix, iz + 1, seed);
  const d = _terrainHash2D(ix + 1, iz + 1, seed);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function _terrainFbm(x, z, seed, octaves = 4) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * (_terrainNoise2D(x * freq, z * freq, seed + i * 17.3) * 2 - 1);
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return val / norm;
}

function _terrainRidgedFbm(x, z, seed, octaves = 4) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = _terrainNoise2D(x * freq, z * freq, seed + i * 29.1) * 2 - 1;
    const ridge = 1.0 - Math.abs(n);
    val += amp * (ridge * ridge);
    norm += amp;
    amp *= 0.5;
    freq *= 2.13;
  }
  return val / norm;
}

function _hexToLinearRgb(hex) {
  const r = Math.pow(((hex >> 16) & 255) / 255, 2.2);
  const g = Math.pow(((hex >> 8) & 255) / 255, 2.2);
  const b = Math.pow((hex & 255) / 255, 2.2);
  return [r, g, b];
}

function createOrganicBeachGeometry(radius, height, radialSegments = 32, cx = 0, cy = 0, cz = 0, seed = 1) {
  const geo = createCylinder(radius, radius * 1.15, height, radialSegments, 0, 0, 0, 'y');
  for (let i = 0; i < geo.positions.length; i += 3) {
    const x = geo.positions[i];
    const z = geo.positions[i + 2];
    const len = Math.hypot(x, z);
    if (len > 0.001) {
      const warp = 1.0 + 0.16 * _terrainFbm((x / len) * 2.2, (z / len) * 2.2, seed, 3);
      geo.positions[i] = x * warp + cx;
      geo.positions[i + 2] = z * warp + cz;
    } else {
      geo.positions[i] = x + cx;
      geo.positions[i + 2] = z + cz;
    }
    geo.positions[i + 1] += cy;
  }
  geo.normals = computeNormals(geo.positions, geo.indices);
  return geo;
}

function createProceduralTerrainGeometry({
  radius,
  height,
  radialSegments = 44,
  heightRings = 18,
  variant = 'alpine',
  seed = 1,
  isMountain = true,
  hasSnow = false,
  cx = 0,
  cy = 0,
  cz = 0
}) {
  const vertexCount = 1 + radialSegments * heightRings;
  const positions = new Array(vertexCount * 3);
  const colors = new Array(vertexCount * 3);
  const indices = [];

  const aspectX = variant === 'ridge' ? 1.32 : (variant === 'twin' ? 1.24 : (variant === 'massif' ? 1.15 : 1.0));
  const aspectZ = variant === 'ridge' ? 0.74 : (variant === 'twin' ? 0.84 : 1.0);
  const ridgeRot = (seed * 1.37) % Math.PI;
  const cosR = Math.cos(ridgeRot);
  const sinR = Math.sin(ridgeRot);
  const summitOffsetX = (_terrainHash2D(1, 2, seed) - 0.5) * 0.22;
  const summitOffsetZ = (_terrainHash2D(3, 4, seed) - 0.5) * 0.22;
  const spurCount = 3 + Math.floor(_terrainHash2D(5, 6, seed) * 4);
  const spurPhase = _terrainHash2D(7, 8, seed) * Math.PI * 2;

  const evalPoint = (t, theta) => {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const edgeNoise = _terrainFbm(cosT * 2.1, sinT * 2.1, seed + 5.1, 3);
    const rScale = 1.0 + 0.18 * edgeNoise * Math.pow(t, 0.65);

    let lx = cosT * t * rScale * aspectX;
    let lz = sinT * t * rScale * aspectZ;

    const shiftFade = Math.pow(1 - t, 1.4);
    lx += summitOffsetX * shiftFade;
    lz += summitOffsetZ * shiftFade;

    const wx = cx + (lx * cosR - lz * sinR) * radius;
    const wz = cz + (lx * sinR + lz * cosR) * radius;

    const distNorm = Math.min(1.0, Math.hypot(lx / aspectX, lz / aspectZ));
    let baseProfile = 0;

    if (variant === 'twin') {
      const d1 = Math.hypot((lx - 0.30) / 0.72, lz / 0.85);
      const d2 = Math.hypot((lx + 0.34) / 0.76, (lz - 0.08) / 0.88);
      const p1 = Math.max(0, 1 - d1);
      const p2 = Math.max(0, 1 - d2) * 0.82;
      const saddle = Math.max(p1, p2) + 0.22 * Math.min(p1, p2);
      baseProfile = Math.pow(Math.min(1, saddle), 1.2) * (1 - Math.pow(t, 3.2));
    } else if (variant === 'massif') {
      baseProfile = Math.pow(Math.max(0, 1 - distNorm * distNorm), 0.85);
      baseProfile += 0.045 * Math.sin(baseProfile * Math.PI * 5.0) * (1 - t);
    } else if (variant === 'ridge') {
      const spineDist = Math.abs(lz / aspectZ);
      const alongSpine = Math.abs(lx / aspectX);
      const spineProfile = Math.max(0, 1 - spineDist * 1.15) * Math.max(0, 1 - alongSpine * 0.82);
      baseProfile = Math.pow(spineProfile, 1.15) * (1 - Math.pow(t, 3.5));
    } else if (variant === 'volcanic') {
      baseProfile = Math.pow(Math.max(0, 1 - t), 1.25);
      if (t < 0.14) {
        const crater = (0.14 - t) / 0.14;
        baseProfile -= 0.07 * crater * crater;
      }
    } else if (variant === 'rolling') {
      baseProfile = 0.5 * (1 + Math.cos(Math.min(1, t) * Math.PI));
      baseProfile = Math.pow(baseProfile, 0.85);
    } else {
      baseProfile = Math.pow(Math.max(0, 1 - t), 1.32);
    }

    const ridgeNoise = _terrainRidgedFbm(lx * 2.6, lz * 2.6, seed + 11.7, 4);
    const detailNoise = _terrainFbm(lx * 5.2, lz * 5.2, seed + 23.4, 3);
    const spurWave = 0.5 + 0.5 * Math.cos(theta * spurCount + spurPhase + edgeNoise * 1.6);

    const envelope = Math.sin(Math.min(1, t) * Math.PI);
    const upperEnvelope = (1 - t) * Math.pow(t, 0.35);

    const ridgeAmp = isMountain ? 0.34 : 0.24;
    const spurAmp = isMountain ? 0.14 : 0.10;
    const detailAmp = isMountain ? 0.09 : 0.07;

    let hNorm = baseProfile
      + (ridgeNoise - 0.42) * ridgeAmp * (0.35 + 0.65 * envelope)
      + (spurWave - 0.5) * spurAmp * upperEnvelope
      + detailNoise * detailAmp * envelope;

    const baseFade = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1.0;
    hNorm = Math.max(0, hNorm * baseFade);

    const wy = cy + hNorm * height;
    return { x: wx, y: wy, z: wz, hNorm, ridgeNoise, detailNoise };
  };

  const assignColor = (idx, hNorm, ridgeNoise, detailNoise) => {
    let rgb;
    if (isMountain) {
      const snowLine = hasSnow ? (0.73 + detailNoise * 0.08 - (ridgeNoise - 0.5) * 0.06) : 1.5;
      const rockThreshold = 0.36 + detailNoise * 0.08 - (ridgeNoise - 0.5) * 0.14;
      if (hNorm >= snowLine) {
        rgb = _hexToLinearRgb(hNorm > snowLine + 0.08 ? 0xf8fafc : 0xe2e8f0);
      } else if (hNorm >= 0.58 || (hNorm >= rockThreshold && ridgeNoise > 0.52)) {
        rgb = _hexToLinearRgb(detailNoise > 0.05 ? 0x64748b : 0x78716c);
      } else if (hNorm >= 0.26) {
        const blend = (hNorm - 0.26) / 0.32;
        const c1 = _hexToLinearRgb(detailNoise > 0 ? 0x2d6a4f : 0x3a6b4c);
        const c2 = _hexToLinearRgb(0x52796f);
        rgb = [
          c1[0] + (c2[0] - c1[0]) * blend,
          c1[1] + (c2[1] - c1[1]) * blend,
          c1[2] + (c2[2] - c1[2]) * blend
        ];
      } else {
        rgb = _hexToLinearRgb(detailNoise > 0 ? 0x1b4332 : 0x2d6a4f);
      }
    } else {
      if (hNorm >= 0.68 && (variant === 'volcanic' || ridgeNoise > 0.58)) {
        rgb = _hexToLinearRgb(0x57534e);
      } else if (hNorm >= 0.50) {
        rgb = _hexToLinearRgb(detailNoise > 0 ? 0x2d6a4f : 0x3f7d3a);
      } else if (hNorm >= 0.18) {
        rgb = _hexToLinearRgb(detailNoise > 0 ? 0x15803d : 0x166534);
      } else {
        rgb = _hexToLinearRgb(0x16a34a);
      }
    }
    colors[idx * 3] = rgb[0];
    colors[idx * 3 + 1] = rgb[1];
    colors[idx * 3 + 2] = rgb[2];
  };

  const apex = evalPoint(0, 0);
  positions[0] = apex.x;
  positions[1] = apex.y;
  positions[2] = apex.z;
  assignColor(0, apex.hNorm, apex.ridgeNoise, apex.detailNoise);

  for (let ring = 1; ring <= heightRings; ring++) {
    const t = ring / heightRings;
    for (let seg = 0; seg < radialSegments; seg++) {
      const theta = (seg / radialSegments) * Math.PI * 2;
      const vIdx = 1 + (ring - 1) * radialSegments + seg;
      const p = evalPoint(t, theta);
      positions[vIdx * 3] = p.x;
      positions[vIdx * 3 + 1] = p.y;
      positions[vIdx * 3 + 2] = p.z;
      assignColor(vIdx, p.hNorm, p.ridgeNoise, p.detailNoise);
    }
  }

  for (let seg = 0; seg < radialSegments; seg++) {
    const nextSeg = (seg + 1) % radialSegments;
    indices.push(0, 1 + nextSeg, 1 + seg);
  }

  for (let ring = 1; ring < heightRings; ring++) {
    const rowStart = 1 + (ring - 1) * radialSegments;
    const nextRowStart = 1 + ring * radialSegments;
    for (let seg = 0; seg < radialSegments; seg++) {
      const nextSeg = (seg + 1) % radialSegments;
      const a = rowStart + seg;
      const b = rowStart + nextSeg;
      const c = nextRowStart + seg;
      const d = nextRowStart + nextSeg;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const normals = computeNormals(positions, indices);
  return { positions, indices, normals, colors };
}

module.exports = {
  createBox,
  createCylinder,
  createLoftFuselage,
  createSweptWing,
  createCone,
  createHorizontalPlane,
  createOrganicBeachGeometry,
  createProceduralTerrainGeometry,
  mergeGeometries,
  computeNormals
};
