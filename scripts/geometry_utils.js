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
  let offset = 0;

  for (const g of geoList) {
    for (let i = 0; i < g.positions.length; i++) {
      allPositions.push(g.positions[i]);
    }
    for (let i = 0; i < g.indices.length; i++) {
      allIndices.push(g.indices[i] + offset);
    }
    offset += g.positions.length / 3;
  }

  const normals = computeNormals(allPositions, allIndices);
  return { positions: allPositions, indices: allIndices, normals };
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

module.exports = {
  createBox,
  createCylinder,
  createLoftFuselage,
  createSweptWing,
  createCone,
  createHorizontalPlane,
  mergeGeometries,
  computeNormals
};
