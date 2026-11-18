// Generator for Stylized Low-Poly and Faceted Aircraft GLB Models
// Hajun Plane 3D - Antigravity Model Lab

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// -------------------------------------------------------------
// 1. Pure Binary glTF 2.0 (GLB) Builder
// -------------------------------------------------------------
export class GLBBuilder {
  constructor() {
    this.nodes = [];
    this.materials = [];
    this.meshes = [];
    this.accessors = [];
    this.bufferViews = [];
    this.binaryChunks = [];
    this.currentOffset = 0;
  }

  addMaterial(name, options = {}) {
    const matIndex = this.materials.length;
    const pbr = {
      baseColorFactor: options.color || [1.0, 1.0, 1.0, 1.0],
      metallicFactor: options.metallic !== undefined ? options.metallic : 0.2,
      roughnessFactor: options.roughness !== undefined ? options.roughness : 0.4
    };
    const mat = {
      name: name || `Material_${matIndex}`,
      pbrMetallicRoughness: pbr,
      doubleSided: options.doubleSided !== undefined ? options.doubleSided : true
    };
    if (options.emissive) {
      mat.emissiveFactor = options.emissive;
    }
    this.materials.push(mat);
    return matIndex;
  }

  appendBuffer(dataBuffer, targetType) {
    const pad = (4 - (this.currentOffset % 4)) % 4;
    if (pad > 0) {
      this.binaryChunks.push(Buffer.alloc(pad));
      this.currentOffset += pad;
    }

    const viewOffset = this.currentOffset;
    const viewLength = dataBuffer.byteLength;
    this.binaryChunks.push(Buffer.from(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength));
    this.currentOffset += viewLength;

    const bufferViewIndex = this.bufferViews.length;
    const bView = {
      buffer: 0,
      byteOffset: viewOffset,
      byteLength: viewLength
    };
    if (targetType) {
      bView.target = targetType;
    }
    this.bufferViews.push(bView);
    return bufferViewIndex;
  }

  addMesh(name, primitives) {
    const meshIndex = this.meshes.length;
    const prims = primitives.map(p => {
      const posBuf = new Float32Array(p.positions);
      const posMin = [Infinity, Infinity, Infinity];
      const posMax = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < p.positions.length; i += 3) {
        const x = p.positions[i], y = p.positions[i + 1], z = p.positions[i + 2];
        if (x < posMin[0]) posMin[0] = x;
        if (y < posMin[1]) posMin[1] = y;
        if (z < posMin[2]) posMin[2] = z;
        if (x > posMax[0]) posMax[0] = x;
        if (y > posMax[1]) posMax[1] = y;
        if (z > posMax[2]) posMax[2] = z;
      }
      const posView = this.appendBuffer(posBuf, 34962);
      const posAccessor = this.accessors.length;
      this.accessors.push({
        bufferView: posView,
        byteOffset: 0,
        componentType: 5126,
        count: p.positions.length / 3,
        type: 'VEC3',
        min: posMin,
        max: posMax
      });

      let normAccessor = null;
      if (p.normals && p.normals.length === p.positions.length) {
        const normBuf = new Float32Array(p.normals);
        const normView = this.appendBuffer(normBuf, 34962);
        normAccessor = this.accessors.length;
        this.accessors.push({
          bufferView: normView,
          byteOffset: 0,
          componentType: 5126,
          count: p.normals.length / 3,
          type: 'VEC3'
        });
      }

      const isLarge = (p.positions.length / 3) > 65535;
      const idxBuf = isLarge ? new Uint32Array(p.indices) : new Uint16Array(p.indices);
      const idxComponentType = isLarge ? 5125 : 5123;
      const idxView = this.appendBuffer(idxBuf, 34963);
      const idxAccessor = this.accessors.length;
      this.accessors.push({
        bufferView: idxView,
        byteOffset: 0,
        componentType: idxComponentType,
        count: p.indices.length,
        type: 'SCALAR'
      });

      return {
        attributes: {
          POSITION: posAccessor,
          ...(normAccessor !== null ? { NORMAL: normAccessor } : {})
        },
        indices: idxAccessor,
        material: p.materialIndex !== undefined ? p.materialIndex : 0,
        mode: 4
      };
    });

    this.meshes.push({
      name: name || `Mesh_${meshIndex}`,
      primitives: prims
    });
    return meshIndex;
  }

  addNode(options = {}) {
    const nodeIndex = this.nodes.length;
    const node = {
      name: options.name || `Node_${nodeIndex}`
    };
    if (options.meshIndex !== undefined) node.mesh = options.meshIndex;
    if (options.translation) node.translation = options.translation;
    if (options.rotation) node.rotation = options.rotation;
    if (options.scale) node.scale = options.scale;
    if (options.children) node.children = options.children;
    this.nodes.push(node);
    return nodeIndex;
  }

  buildGLBBuffer(rootNodeIndices) {
    const binTotalLength = this.currentOffset;
    const binPadding = (4 - (binTotalLength % 4)) % 4;
    const binData = Buffer.concat([
      ...this.binaryChunks,
      Buffer.alloc(binPadding, 0)
    ]);
    const binChunkLength = binData.length;

    const gltfJson = {
      asset: {
        version: "2.0",
        generator: "Hajun Plane 3D - Antigravity LowPoly Lab"
      },
      scene: 0,
      scenes: [{ name: "MainScene", nodes: rootNodeIndices || [0] }],
      nodes: this.nodes,
      materials: this.materials,
      meshes: this.meshes,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: binChunkLength }]
    };

    let jsonBuffer = Buffer.from(JSON.stringify(gltfJson), 'utf8');
    const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
    if (jsonPadding > 0) {
      jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
    }
    const jsonChunkLength = jsonBuffer.length;

    const totalLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546C67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(totalLength, 8);

    const chunk0Header = Buffer.alloc(8);
    chunk0Header.writeUInt32LE(jsonChunkLength, 0);
    chunk0Header.writeUInt32LE(0x4E4F534A, 4);

    const chunk1Header = Buffer.alloc(8);
    chunk1Header.writeUInt32LE(binChunkLength, 0);
    chunk1Header.writeUInt32LE(0x004E4942, 4);

    return Buffer.concat([header, chunk0Header, jsonBuffer, chunk1Header, binData]);
  }
}

// -------------------------------------------------------------
// 2. Geometry Utilities & Flat Shading Transform
// -------------------------------------------------------------
export function toFlatShadedGeometry(geo) {
  const flatPositions = [];
  const flatIndices = [];
  const flatNormals = [];

  for (let i = 0; i < geo.indices.length; i += 3) {
    const i0 = geo.indices[i] * 3;
    const i1 = geo.indices[i + 1] * 3;
    const i2 = geo.indices[i + 2] * 3;

    const ax = geo.positions[i0], ay = geo.positions[i0 + 1], az = geo.positions[i0 + 2];
    const bx = geo.positions[i1], by = geo.positions[i1 + 1], bz = geo.positions[i1 + 2];
    const cx = geo.positions[i2], cy = geo.positions[i2 + 1], cz = geo.positions[i2 + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    nx /= len; ny /= len; nz /= len;

    const baseIdx = flatPositions.length / 3;
    flatPositions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    flatNormals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    flatIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
  }

  return { positions: flatPositions, indices: flatIndices, normals: flatNormals };
}

export function transformGeo(geo, { rx = 0, ry = 0, rz = 0, tx = 0, ty = 0, tz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const cx = Math.cos(rx), sxRot = Math.sin(rx);
  const cyRot = Math.cos(ry), syRot = Math.sin(ry);
  const cz = Math.cos(rz), szRot = Math.sin(rz);
  const positions = [];

  for (let i = 0; i < geo.positions.length; i += 3) {
    let x = geo.positions[i] * sx;
    let y = geo.positions[i + 1] * sy;
    let z = geo.positions[i + 2] * sz;

    if (rx !== 0) {
      const y1 = y * cx - z * sxRot;
      const z1 = y * sxRot + z * cx;
      y = y1; z = z1;
    }
    if (ry !== 0) {
      const x1 = x * cyRot + z * syRot;
      const z1 = -x * syRot + z * cyRot;
      x = x1; z = z1;
    }
    if (rz !== 0) {
      const x1 = x * cz - y * szRot;
      const y1 = x * szRot + y * cz;
      x = x1; y = y1;
    }
    positions.push(x + tx, y + ty, z + tz);
  }

  return {
    positions,
    indices: geo.indices.slice(),
    normals: geo.normals ? geo.normals.slice() : []
  };
}

export function mergeGeometries(geoList) {
  const positions = [];
  const indices = [];
  const normals = [];

  for (const g of geoList) {
    if (!g || !g.positions || !g.positions.length) continue;
    const baseVertex = positions.length / 3;
    for (let i = 0; i < g.positions.length; i++) {
      positions.push(g.positions[i]);
    }
    for (let i = 0; i < g.indices.length; i++) {
      indices.push(baseVertex + g.indices[i]);
    }
    if (g.normals && g.normals.length === g.positions.length) {
      for (let i = 0; i < g.normals.length; i++) {
        normals.push(g.normals[i]);
      }
    }
  }

  return { positions, indices, normals };
}

export function createBox(dx, dy, dz, cx = 0, cy = 0, cz = 0) {
  const hx = dx / 2, hy = dy / 2, hz = dz / 2;
  const rawPositions = [
    cx - hx, cy - hy, cz + hz,  cx + hx, cy - hy, cz + hz,  cx + hx, cy + hy, cz + hz,  cx - hx, cy + hy, cz + hz,
    cx + hx, cy - hy, cz - hz,  cx - hx, cy - hy, cz - hz,  cx - hx, cy + hy, cz - hz,  cx + hx, cy + hy, cz - hz,
    cx - hx, cy + hy, cz + hz,  cx + hx, cy + hy, cz + hz,  cx + hx, cy + hy, cz - hz,  cx - hx, cy + hy, cz - hz,
    cx - hx, cy - hy, cz - hz,  cx + hx, cy - hy, cz - hz,  cx + hx, cy - hy, cz + hz,  cx - hx, cy - hy, cz + hz,
    cx + hx, cy - hy, cz + hz,  cx + hx, cy - hy, cz - hz,  cx + hx, cy + hy, cz - hz,  cx + hx, cy + hy, cz + hz,
    cx - hx, cy - hy, cz - hz,  cx - hx, cy - hy, cz + hz,  cx - hx, cy + hy, cz + hz,  cx - hx, cy + hy, cz - hz
  ];
  const indices = [];
  for (let f = 0; f < 6; f++) {
    const b = f * 4;
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return toFlatShadedGeometry({ positions: rawPositions, indices });
}

export function createCylinder(rFront, rBack, length, segments = 12, cx = 0, cy = 0, cz = 0, axis = 'z') {
  const positions = [];
  const indices = [];
  const halfLen = length / 2;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    let p0, p1, p2, p3;
    if (axis === 'z') {
      p0 = [cx + cos0 * rFront, cy + sin0 * rFront, cz - halfLen];
      p1 = [cx + cos1 * rFront, cy + sin1 * rFront, cz - halfLen];
      p2 = [cx + cos1 * rBack, cy + sin1 * rBack, cz + halfLen];
      p3 = [cx + cos0 * rBack, cy + sin0 * rBack, cz + halfLen];
    } else if (axis === 'y') {
      p0 = [cx + cos0 * rFront, cy - halfLen, cz + sin0 * rFront];
      p1 = [cx + cos1 * rFront, cy - halfLen, cz + sin1 * rFront];
      p2 = [cx + cos1 * rBack, cy + halfLen, cz + sin1 * rBack];
      p3 = [cx + cos0 * rBack, cy + halfLen, cz + sin0 * rBack];
    } else {
      p0 = [cx - halfLen, cy + cos0 * rFront, cz + sin0 * rFront];
      p1 = [cx - halfLen, cy + cos1 * rFront, cz + sin1 * rFront];
      p2 = [cx + halfLen, cy + cos1 * rBack, cz + sin1 * rBack];
      p3 = [cx + halfLen, cy + cos0 * rBack, cz + sin0 * rBack];
    }

    const b = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  // Front & Back Caps
  if (rFront > 0.001) {
    const cIdx = positions.length / 3;
    const capCenter = axis === 'z' ? [cx, cy, cz - halfLen] : (axis === 'y' ? [cx, cy - halfLen, cz] : [cx - halfLen, cy, cz]);
    positions.push(...capCenter);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const b0 = positions.length / 3;
      let p0, p1;
      if (axis === 'z') {
        p0 = [cx + Math.cos(a0) * rFront, cy + Math.sin(a0) * rFront, cz - halfLen];
        p1 = [cx + Math.cos(a1) * rFront, cy + Math.sin(a1) * rFront, cz - halfLen];
      } else if (axis === 'y') {
        p0 = [cx + Math.cos(a0) * rFront, cy - halfLen, cz + Math.sin(a0) * rFront];
        p1 = [cx + Math.cos(a1) * rFront, cy - halfLen, cz + Math.sin(a1) * rFront];
      } else {
        p0 = [cx - halfLen, cy + Math.cos(a0) * rFront, cz + Math.sin(a0) * rFront];
        p1 = [cx - halfLen, cy + Math.cos(a1) * rFront, cz + Math.sin(a1) * rFront];
      }
      positions.push(...p0, ...p1);
      indices.push(cIdx, b0, b0 + 1);
    }
  }

  if (rBack > 0.001) {
    const cIdx = positions.length / 3;
    const capCenter = axis === 'z' ? [cx, cy, cz + halfLen] : (axis === 'y' ? [cx, cy + halfLen, cz] : [cx + halfLen, cy, cz]);
    positions.push(...capCenter);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const b0 = positions.length / 3;
      let p0, p1;
      if (axis === 'z') {
        p0 = [cx + Math.cos(a0) * rBack, cy + Math.sin(a0) * rBack, cz + halfLen];
        p1 = [cx + Math.cos(a1) * rBack, cy + Math.sin(a1) * rBack, cz + halfLen];
      } else if (axis === 'y') {
        p0 = [cx + Math.cos(a0) * rBack, cy + halfLen, cz + Math.sin(a0) * rBack];
        p1 = [cx + Math.cos(a1) * rBack, cy + halfLen, cz + Math.sin(a1) * rBack];
      } else {
        p0 = [cx + halfLen, cy + Math.cos(a0) * rBack, cz + Math.sin(a0) * rBack];
        p1 = [cx + halfLen, cy + Math.cos(a1) * rBack, cz + Math.sin(a1) * rBack];
      }
      positions.push(...p0, ...p1);
      indices.push(cIdx, b0 + 1, b0);
    }
  }

  return toFlatShadedGeometry({ positions, indices });
}

export function createLoftFuselage(profiles, segments = 12) {
  const positions = [];
  const indices = [];

  for (let s = 0; s < profiles.length - 1; s++) {
    const p0 = profiles[s];
    const p1 = profiles[s + 1];

    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;

      const v0 = [Math.cos(a0) * p0.rx, (p0.cy || 0) + Math.sin(a0) * p0.ry, p0.z];
      const v1 = [Math.cos(a1) * p0.rx, (p0.cy || 0) + Math.sin(a1) * p0.ry, p0.z];
      const v2 = [Math.cos(a1) * p1.rx, (p1.cy || 0) + Math.sin(a1) * p1.ry, p1.z];
      const v3 = [Math.cos(a0) * p1.rx, (p1.cy || 0) + Math.sin(a0) * p1.ry, p1.z];

      const b = positions.length / 3;
      positions.push(...v0, ...v1, ...v2, ...v3);
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }

  return toFlatShadedGeometry({ positions, indices });
}

export function createSweptWing({
  rootX, rootY, rootZ,
  span, rootChord, tipChord,
  sweepBack, dihedralY, thickness,
  isLeft = true
}) {
  const dir = isLeft ? -1 : 1;
  const tipX = rootX + dir * span;
  const tipY = rootY + dihedralY;
  const tipZ = rootZ + sweepBack;

  const rH = thickness / 2;
  const tH = (thickness * (tipChord / rootChord)) / 2;

  // 8-vertex airfoil bounding prism
  const v = [
    // Root: Nose, Top, Trailing, Bottom
    [rootX, rootY, rootZ],
    [rootX, rootY + rH, rootZ + rootChord * 0.35],
    [rootX, rootY, rootZ + rootChord],
    [rootX, rootY - rH, rootZ + rootChord * 0.35],
    // Tip: Nose, Top, Trailing, Bottom
    [tipX, tipY, tipZ],
    [tipX, tipY + tH, tipZ + tipChord * 0.35],
    [tipX, tipY, tipZ + tipChord],
    [tipX, tipY - tH, tipZ + tipChord * 0.35]
  ];

  const positions = [];
  const indices = [];

  function addQuad(p0, p1, p2, p3) {
    const b = positions.length / 3;
    positions.push(...v[p0], ...v[p1], ...v[p2], ...v[p3]);
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  if (isLeft) {
    addQuad(0, 4, 5, 1); // Upper leading
    addQuad(1, 5, 6, 2); // Upper trailing
    addQuad(2, 6, 7, 3); // Lower trailing
    addQuad(3, 7, 4, 0); // Lower leading
    addQuad(4, 7, 6, 5); // Tip cap
  } else {
    addQuad(4, 0, 1, 5);
    addQuad(5, 1, 2, 6);
    addQuad(6, 2, 3, 7);
    addQuad(7, 3, 0, 4);
    addQuad(7, 4, 5, 6);
  }

  return toFlatShadedGeometry({ positions, indices });
}

// -------------------------------------------------------------
// 3. Model Generators
// -------------------------------------------------------------

function setupMaterials(b) {
  return {
    fuselageWhite: b.addMaterial('WhiteFuselage', { color: [0.96, 0.97, 0.99, 1.0], metallic: 0.25, roughness: 0.22 }),
    airbusBlue: b.addMaterial('AirbusBlue', { color: [0.01, 0.26, 0.62, 1.0], metallic: 0.38, roughness: 0.28 }),
    airlineRed: b.addMaterial('AirlineRed', { color: [0.88, 0.12, 0.15, 1.0], metallic: 0.30, roughness: 0.28 }),
    goldTrim: b.addMaterial('GoldTrim', { color: [0.88, 0.72, 0.24, 1.0], metallic: 0.75, roughness: 0.22 }),
    wingTitanium: b.addMaterial('WingTitanium', { color: [0.72, 0.75, 0.80, 1.0], metallic: 0.45, roughness: 0.35 }),
    chromeSilver: b.addMaterial('EngineChrome', { color: [0.92, 0.94, 0.96, 1.0], metallic: 0.90, roughness: 0.12 }),
    darkEngine: b.addMaterial('IntakeDark', { color: [0.08, 0.09, 0.11, 1.0], metallic: 0.50, roughness: 0.60 }),
    glassCockpit: b.addMaterial('CockpitGlass', { color: [0.05, 0.12, 0.20, 1.0], metallic: 0.92, roughness: 0.08 }),
    cabinWindows: b.addMaterial('CabinWindows', { color: [0.18, 0.62, 0.95, 1.0], metallic: 0.82, roughness: 0.15 })
  };
}

// =============================================================
// MODEL A: Airbus A380 Super-Jumbo Low-Poly
// =============================================================
export function generateA380LowPoly() {
  const b = new GLBBuilder();
  const m = setupMaterials(b);

  // 1. Double-deck oval fuselage (12 faceted radial segments)
  // Length ~72.7m, Width 7.14m (rx: 3.57), Height 8.41m (ry: 4.2)
  const profiles = [
    { z: -35.5, rx: 0.02, ry: 0.02, cy: -0.4 },
    { z: -34.8, rx: 0.90, ry: 0.85, cy: -0.3 },
    { z: -33.2, rx: 2.10, ry: 2.20, cy: -0.1 },
    { z: -30.5, rx: 3.20, ry: 3.65, cy: 0.2 },
    { z: -25.0, rx: 3.57, ry: 4.20, cy: 0.3 },
    { z: -10.0, rx: 3.57, ry: 4.20, cy: 0.3 },
    { z:   8.0, rx: 3.57, ry: 4.20, cy: 0.3 },
    { z:  22.0, rx: 3.45, ry: 4.05, cy: 0.5 },
    { z:  29.5, rx: 2.65, ry: 3.20, cy: 0.9 },
    { z:  34.5, rx: 1.45, ry: 1.85, cy: 1.4 },
    { z:  37.2, rx: 0.40, ry: 0.60, cy: 1.8 },
    { z:  38.0, rx: 0.02, ry: 0.02, cy: 1.9 }
  ];
  const fuselageGeo = createLoftFuselage(profiles, 12);

  // Radome nose tip
  const radome = createLoftFuselage([
    { z: -35.6, rx: 0.01, ry: 0.01, cy: -0.4 },
    { z: -34.8, rx: 0.92, ry: 0.87, cy: -0.3 },
    { z: -33.5, rx: 1.85, ry: 1.95, cy: -0.15 }
  ], 12);

  // Double-deck cabin windows (Upper Deck & Main Deck)
  const windowParts = [];
  for (let z = -24.0; z <= 24.0; z += 1.6) {
    if (Math.abs(z + 18.0) < 1.0 || Math.abs(z + 3.0) < 1.0 || Math.abs(z - 11.0) < 1.0) continue;
    // Main deck windows (Y ~ 0.55)
    windowParts.push(createBox(0.12, 0.42, 0.38, -3.58, 0.55, z));
    windowParts.push(createBox(0.12, 0.42, 0.38, 3.58, 0.55, z));
    // Upper deck windows (Y ~ 2.65)
    windowParts.push(createBox(0.12, 0.38, 0.35, -3.15, 2.65, z));
    windowParts.push(createBox(0.12, 0.38, 0.35, 3.15, 2.65, z));
  }
  const windowsGeo = mergeGeometries(windowParts);

  // Airbus curved cockpit windshield (situated lower between main and upper deck)
  const cockpitPanes = [
    transformGeo(createBox(1.35, 0.72, 0.16), { rx: -0.55, ry: 0.22, tx: -0.75, ty: 0.95, tz: -30.8 }),
    transformGeo(createBox(1.35, 0.72, 0.16), { rx: -0.55, ry: -0.22, tx: 0.75, ty: 0.95, tz: -30.8 }),
    transformGeo(createBox(1.25, 0.65, 0.16), { rx: -0.38, ry: 0.65, tx: -1.85, ty: 0.90, tz: -30.1 }),
    transformGeo(createBox(1.25, 0.65, 0.16), { rx: -0.38, ry: -0.65, tx: 1.85, ty: 0.90, tz: -30.1 }),
    transformGeo(createBox(1.05, 0.58, 0.16), { rx: -0.20, ry: 1.05, tx: -2.65, ty: 0.85, tz: -29.2 }),
    transformGeo(createBox(1.05, 0.58, 0.16), { rx: -0.20, ry: -1.05, tx: 2.65, ty: 0.85, tz: -29.2 })
  ];
  const cockpitGeo = mergeGeometries(cockpitPanes);

  // 2. Giant A380 Swept Wings (Wingspan 79.8m, Root Chord 16.5m, Tip Chord 3.8m)
  const leftInboard = createSweptWing({
    rootX: -3.4, rootY: -0.8, rootZ: -3.5,
    span: 15.5, rootChord: 16.5, tipChord: 8.8,
    sweepBack: 5.5, dihedralY: 1.2, thickness: 1.35,
    isLeft: true
  });
  const leftOutboard = createSweptWing({
    rootX: -18.9, rootY: 0.4, rootZ: 2.0,
    span: 20.8, rootChord: 8.8, tipChord: 3.4,
    sweepBack: 9.2, dihedralY: 2.4, thickness: 0.75,
    isLeft: true
  });
  const rightInboard = createSweptWing({
    rootX: 3.4, rootY: -0.8, rootZ: -3.5,
    span: 15.5, rootChord: 16.5, tipChord: 8.8,
    sweepBack: 5.5, dihedralY: 1.2, thickness: 1.35,
    isLeft: false
  });
  const rightOutboard = createSweptWing({
    rootX: 18.9, rootY: 0.4, rootZ: 2.0,
    span: 20.8, rootChord: 8.8, tipChord: 3.4,
    sweepBack: 9.2, dihedralY: 2.4, thickness: 0.75,
    isLeft: false
  });

  // A380 Arrowhead Wingtip Fences (vertical fins pointing both up and slightly down)
  const leftWingtipFence = mergeGeometries([
    createBox(0.14, 2.2, 1.8, -39.8, 3.7, 11.8), // Upper fence
    createBox(0.14, 1.1, 1.4, -39.8, 2.2, 11.8)  // Lower fence
  ]);
  const rightWingtipFence = mergeGeometries([
    createBox(0.14, 2.2, 1.8, 39.8, 3.7, 11.8),
    createBox(0.14, 1.1, 1.4, 39.8, 2.2, 11.8)
  ]);

  // Flap track canoe fairings under wings
  const flapFairings = [];
  const fairingLocs = [
    { x: 9.5, y: -0.9, z: 9.8, len: 4.2 },
    { x: 16.5, y: -0.3, z: 11.2, len: 3.6 },
    { x: 24.5, y: 0.5, z: 12.8, len: 3.0 },
    { x: 32.0, y: 1.4, z: 14.0, len: 2.4 }
  ];
  for (const f of fairingLocs) {
    for (const side of [-1, 1]) {
      flapFairings.push(createCylinder(0.25, 0.06, f.len, 8, side * f.x, f.y, f.z, 'z'));
    }
  }

  const wingsGeo = mergeGeometries([
    leftInboard, leftOutboard, rightInboard, rightOutboard,
    ...flapFairings
  ]);
  const wingtipFencesGeo = mergeGeometries([leftWingtipFence, rightWingtipFence]);

  // 3. Four Massive Trent 900 Turbofan Engines (Inner: x=±14.5m, Outer: x=±26.5m)
  function buildA380Engine(cx, cy, cz) {
    const cowl = [];
    const chrome = [];
    const dark = [];
    const pylon = [];

    // Outer Nacelle (diameter 3.4m, length 5.8m, 12-sided faceted)
    cowl.push(createCylinder(1.65, 1.75, 2.2, 12, cx, cy, cz - 1.4, 'z'));
    cowl.push(createCylinder(1.75, 1.60, 3.2, 12, cx, cy, cz + 1.3, 'z'));

    // Chrome intake ring & exhaust cone
    chrome.push(createCylinder(1.52, 1.65, 0.4, 12, cx, cy, cz - 2.5, 'z'));
    chrome.push(createCylinder(0.04, 0.45, 0.9, 8, cx, cy, cz - 1.8, 'z')); // Spinner
    chrome.push(createCylinder(0.55, 0.05, 1.4, 8, cx, cy, cz + 3.4, 'z')); // Exhaust

    // Dark interior intake throat
    dark.push(createCylinder(1.48, 1.48, 0.4, 12, cx, cy, cz - 1.5, 'z'));
    dark.push(createCylinder(1.10, 0.85, 0.9, 10, cx, cy, cz + 2.9, 'z'));

    // Pylon mounting to wing
    pylon.push(transformGeo(createBox(0.48, 1.65, 4.8), { rx: 0.12, tx: cx, ty: cy + 1.45, tz: cz + 0.6 }));

    return { cowl, chrome, dark, pylon };
  }

  const engInnerL = buildA380Engine(-14.2, -2.4, 1.5);
  const engOuterL = buildA380Engine(-26.2, -0.9, 6.2);
  const engInnerR = buildA380Engine(14.2, -2.4, 1.5);
  const engOuterR = buildA380Engine(26.2, -0.9, 6.2);

  const allEngineCowl = mergeGeometries([
    ...engInnerL.cowl, ...engOuterL.cowl, ...engInnerR.cowl, ...engOuterR.cowl,
    ...engInnerL.pylon, ...engOuterL.pylon, ...engInnerR.pylon, ...engOuterR.pylon
  ]);
  const allEngineChrome = mergeGeometries([
    ...engInnerL.chrome, ...engOuterL.chrome, ...engInnerR.chrome, ...engOuterR.chrome
  ]);
  const allEngineDark = mergeGeometries([
    ...engInnerL.dark, ...engOuterL.dark, ...engInnerR.dark, ...engOuterR.dark
  ]);

  // 4. Iconic Huge Vertical Stabilizer & Horizontal Tailplanes
  const vertFin = createSweptWing({
    rootX: 0.0, rootY: 4.2, rootZ: 21.0,
    span: 16.5, rootChord: 14.5, tipChord: 4.8,
    sweepBack: 7.8, dihedralY: 0.0, thickness: 0.95,
    isLeft: true
  });
  // Rotate wing geometry to make it vertical (rotX = -PI/2)
  const verticalTailGeo = transformGeo(vertFin, { rz: -Math.PI / 2, tx: 0, ty: 4.5, tz: 21.0 });

  const horizTailL = createSweptWing({
    rootX: -1.8, rootY: 2.2, rootZ: 28.5,
    span: 12.8, rootChord: 8.5, tipChord: 3.2,
    sweepBack: 5.2, dihedralY: 1.5, thickness: 0.55,
    isLeft: true
  });
  const horizTailR = createSweptWing({
    rootX: 1.8, rootY: 2.2, rootZ: 28.5,
    span: 12.8, rootChord: 8.5, tipChord: 3.2,
    sweepBack: 5.2, dihedralY: 1.5, thickness: 0.55,
    isLeft: false
  });
  const horizTailGeo = mergeGeometries([horizTailL, horizTailR]);

  // Consolidate into 4 clean draw calls:
  const mesh0 = b.addMesh('A380_Body_Mesh', [
    { positions: fuselageGeo.positions, indices: fuselageGeo.indices, normals: fuselageGeo.normals, materialIndex: m.fuselageWhite },
    { positions: radome.positions, indices: radome.indices, normals: radome.normals, materialIndex: m.darkEngine },
    { positions: verticalTailGeo.positions, indices: verticalTailGeo.indices, normals: verticalTailGeo.normals, materialIndex: m.airbusBlue },
    { positions: wingtipFencesGeo.positions, indices: wingtipFencesGeo.indices, normals: wingtipFencesGeo.normals, materialIndex: m.airbusBlue },
    { positions: cockpitGeo.positions, indices: cockpitGeo.indices, normals: cockpitGeo.normals, materialIndex: m.glassCockpit },
    { positions: windowsGeo.positions, indices: windowsGeo.indices, normals: windowsGeo.normals, materialIndex: m.cabinWindows }
  ]);

  const mesh1 = b.addMesh('A380_Wings_Mesh', [
    { positions: wingsGeo.positions, indices: wingsGeo.indices, normals: wingsGeo.normals, materialIndex: m.wingTitanium },
    { positions: horizTailGeo.positions, indices: horizTailGeo.indices, normals: horizTailGeo.normals, materialIndex: m.wingTitanium }
  ]);

  const mesh2 = b.addMesh('A380_Engines_Mesh', [
    { positions: allEngineCowl.positions, indices: allEngineCowl.indices, normals: allEngineCowl.normals, materialIndex: m.fuselageWhite },
    { positions: allEngineChrome.positions, indices: allEngineChrome.indices, normals: allEngineChrome.normals, materialIndex: m.chromeSilver },
    { positions: allEngineDark.positions, indices: allEngineDark.indices, normals: allEngineDark.normals, materialIndex: m.darkEngine }
  ]);

  b.addNode({ name: 'A380_Body', meshIndex: mesh0 });
  b.addNode({ name: 'A380_Wings', meshIndex: mesh1 });
  b.addNode({ name: 'A380_Engines', meshIndex: mesh2 });

  return b.buildGLBBuffer([0, 1, 2]);
}

// =============================================================
// MODEL B: McDonnell Douglas DC-10 Chunky Retro Low-Poly
// =============================================================
export function generateDC10LowPoly() {
  const b = new GLBBuilder();
  const m = setupMaterials(b);

  // Decagonal (10-sided) faceted fuselage
  const profiles = [
    { z: -27.2, rx: 0.02, ry: 0.02, cy: -0.15 },
    { z: -26.5, rx: 0.65, ry: 0.65, cy: -0.12 },
    { z: -24.8, rx: 1.85, ry: 1.85, cy: 0.02 },
    { z: -21.0, rx: 2.85, ry: 2.85, cy: 0.15 },
    { z: -10.0, rx: 3.02, ry: 3.02, cy: 0.15 },
    { z:   4.0, rx: 3.02, ry: 3.02, cy: 0.15 },
    { z:  14.0, rx: 2.95, ry: 2.95, cy: 0.20 },
    { z:  21.0, rx: 2.25, ry: 2.30, cy: 0.40 },
    { z:  26.0, rx: 1.15, ry: 1.30, cy: 0.70 },
    { z:  28.8, rx: 0.25, ry: 0.30, cy: 0.88 },
    { z:  29.2, rx: 0.02, ry: 0.02, cy: 0.90 }
  ];
  const fuselageGeo = createLoftFuselage(profiles, 10);

  // Red & Gold retro airline cheatline
  const stripeBoxes = [];
  for (const side of [-1, 1]) {
    stripeBoxes.push(createBox(0.12, 0.42, 34.0, side * 3.01, 0.35, -2.5));
    stripeBoxes.push(createBox(0.10, 0.16, 34.0, side * 3.02, 0.05, -2.5));
  }
  const redLiveryGeo = stripeBoxes[0];
  const goldLiveryGeo = stripeBoxes[1];

  // Windows & Cockpit
  const windowParts = [];
  for (let z = -18.0; z <= 14.0; z += 1.4) {
    if (Math.abs(z + 14.5) < 0.8 || Math.abs(z + 4.0) < 0.8 || Math.abs(z - 6.0) < 0.8) continue;
    windowParts.push(createBox(0.12, 0.38, 0.32, -3.02, 0.85, z));
    windowParts.push(createBox(0.12, 0.38, 0.32, 3.02, 0.85, z));
  }
  const windowsGeo = mergeGeometries(windowParts);

  const cockpitGeo = mergeGeometries([
    transformGeo(createBox(1.25, 0.65, 0.16), { rx: -0.58, ry: 0.24, tx: -0.65, ty: 1.55, tz: -22.5 }),
    transformGeo(createBox(1.25, 0.65, 0.16), { rx: -0.58, ry: -0.24, tx: 0.65, ty: 1.55, tz: -22.5 }),
    transformGeo(createBox(1.10, 0.58, 0.16), { rx: -0.42, ry: 0.72, tx: -1.60, ty: 1.48, tz: -21.8 }),
    transformGeo(createBox(1.10, 0.58, 0.16), { rx: -0.42, ry: -0.72, tx: 1.60, ty: 1.48, tz: -21.8 })
  ]);

  // Swept Wings (Span 50.4m)
  const leftWing = createSweptWing({
    rootX: -2.8, rootY: -0.55, rootZ: -2.0,
    span: 22.4, rootChord: 10.5, tipChord: 2.8,
    sweepBack: 8.8, dihedralY: 1.95, thickness: 0.72,
    isLeft: true
  });
  const rightWing = createSweptWing({
    rootX: 2.8, rootY: -0.55, rootZ: -2.0,
    span: 22.4, rootChord: 10.5, tipChord: 2.8,
    sweepBack: 8.8, dihedralY: 1.95, thickness: 0.72,
    isLeft: false
  });
  const wingsGeo = mergeGeometries([leftWing, rightWing]);

  // Trijet Engines (Underwing #1 & #3, Tail #2 straight-through)
  function buildDC10Engine(cx, cy, cz, isTail = false) {
    const cowl = [];
    const chrome = [];
    const dark = [];
    const pylon = [];

    cowl.push(createCylinder(1.35, 1.42, 1.8, 10, cx, cy, cz - 0.8, 'z'));
    cowl.push(createCylinder(1.42, 1.32, 2.2, 10, cx, cy, cz + 1.2, 'z'));

    chrome.push(createCylinder(1.25, 1.36, 0.35, 10, cx, cy, cz - 1.8, 'z'));
    chrome.push(createCylinder(0.04, 0.38, 0.75, 8, cx, cy, cz - 1.3, 'z')); // Spinner
    chrome.push(createCylinder(0.42, 0.05, 1.1, 8, cx, cy, cz + 2.8, 'z')); // Exhaust

    dark.push(createCylinder(1.20, 1.20, 0.3, 10, cx, cy, cz - 1.1, 'z'));

    if (!isTail) {
      pylon.push(transformGeo(createBox(0.42, 1.45, 3.8), { rx: 0.14, tx: cx, ty: cy + 1.25, tz: cz + 0.55 }));
    }
    return { cowl, chrome, dark, pylon };
  }

  const eng1 = buildDC10Engine(-8.5, -2.0, -0.4, false);
  const eng3 = buildDC10Engine(8.5, -2.0, -0.4, false);
  const eng2 = buildDC10Engine(0.0, 4.65, 17.8, true);

  const tailNacelle = createCylinder(1.46, 1.40, 4.8, 10, 0, 4.65, 18.0, 'z');

  const allCowl = mergeGeometries([...eng1.cowl, ...eng3.cowl, ...eng2.cowl, tailNacelle, ...eng1.pylon, ...eng3.pylon]);
  const allChrome = mergeGeometries([...eng1.chrome, ...eng3.chrome, ...eng2.chrome]);
  const allDark = mergeGeometries([...eng1.dark, ...eng3.dark, ...eng2.dark]);

  // Vertical Tailfin with Red Livery & Horizontal Stabilizers
  const vertFin = createSweptWing({
    rootX: 0.0, rootY: 4.8, rootZ: 14.5,
    span: 9.8, rootChord: 9.5, tipChord: 3.2,
    sweepBack: 5.5, dihedralY: 0.0, thickness: 0.58,
    isLeft: true
  });
  const verticalTailGeo = transformGeo(vertFin, { rz: -Math.PI / 2, tx: 0, ty: 5.0, tz: 14.5 });

  const horizTailL = createSweptWing({
    rootX: -1.2, rootY: 1.8, rootZ: 21.0,
    span: 9.5, rootChord: 6.2, tipChord: 2.2,
    sweepBack: 4.2, dihedralY: 1.2, thickness: 0.45,
    isLeft: true
  });
  const horizTailR = createSweptWing({
    rootX: 1.2, rootY: 1.8, rootZ: 21.0,
    span: 9.5, rootChord: 6.2, tipChord: 2.2,
    sweepBack: 4.2, dihedralY: 1.2, thickness: 0.45,
    isLeft: false
  });
  const horizTailGeo = mergeGeometries([horizTailL, horizTailR]);

  const mesh0 = b.addMesh('DC10_Body_Mesh', [
    { positions: fuselageGeo.positions, indices: fuselageGeo.indices, normals: fuselageGeo.normals, materialIndex: m.fuselageWhite },
    { positions: redLiveryGeo.positions, indices: redLiveryGeo.indices, normals: redLiveryGeo.normals, materialIndex: m.airlineRed },
    { positions: goldLiveryGeo.positions, indices: goldLiveryGeo.indices, normals: goldLiveryGeo.normals, materialIndex: m.goldTrim },
    { positions: verticalTailGeo.positions, indices: verticalTailGeo.indices, normals: verticalTailGeo.normals, materialIndex: m.airlineRed },
    { positions: cockpitGeo.positions, indices: cockpitGeo.indices, normals: cockpitGeo.normals, materialIndex: m.glassCockpit },
    { positions: windowsGeo.positions, indices: windowsGeo.indices, normals: windowsGeo.normals, materialIndex: m.cabinWindows }
  ]);

  const mesh1 = b.addMesh('DC10_Wings_Mesh', [
    { positions: wingsGeo.positions, indices: wingsGeo.indices, normals: wingsGeo.normals, materialIndex: m.wingTitanium },
    { positions: horizTailGeo.positions, indices: horizTailGeo.indices, normals: horizTailGeo.normals, materialIndex: m.wingTitanium }
  ]);

  const mesh2 = b.addMesh('DC10_Engines_Mesh', [
    { positions: allCowl.positions, indices: allCowl.indices, normals: allCowl.normals, materialIndex: m.fuselageWhite },
    { positions: allChrome.positions, indices: allChrome.indices, normals: allChrome.normals, materialIndex: m.chromeSilver },
    { positions: allDark.positions, indices: allDark.indices, normals: allDark.normals, materialIndex: m.darkEngine }
  ]);

  b.addNode({ name: 'DC10_Body', meshIndex: mesh0 });
  b.addNode({ name: 'DC10_Wings', meshIndex: mesh1 });
  b.addNode({ name: 'DC10_Engines', meshIndex: mesh2 });

  return b.buildGLBBuffer([0, 1, 2]);
}

// =============================================================
// MODEL C: DC-10 Faceted (High-Fidelity Polygon Facets)
// =============================================================
export function generateDC10Faceted() {
  const b = new GLBBuilder();
  const m = setupMaterials(b);

  // 14-sided loft with distinct belly fairing & nose radome
  const profiles = [
    { z: -27.2, rx: 0.01, ry: 0.01, cy: -0.15 },
    { z: -26.5, rx: 0.55, ry: 0.52, cy: -0.12 },
    { z: -25.2, rx: 1.45, ry: 1.42, cy: 0.0 },
    { z: -23.0, rx: 2.35, ry: 2.38, cy: 0.10 },
    { z: -19.5, rx: 2.95, ry: 3.00, cy: 0.15 },
    { z: -10.0, rx: 3.02, ry: 3.04, cy: 0.15 },
    { z:   4.0, rx: 3.02, ry: 3.04, cy: 0.15 },
    { z:  12.0, rx: 3.00, ry: 3.02, cy: 0.16 },
    { z:  18.0, rx: 2.65, ry: 2.72, cy: 0.28 },
    { z:  22.5, rx: 1.95, ry: 2.05, cy: 0.45 },
    { z:  26.0, rx: 1.15, ry: 1.30, cy: 0.68 },
    { z:  28.2, rx: 0.45, ry: 0.55, cy: 0.84 },
    { z:  29.2, rx: 0.01, ry: 0.01, cy: 0.90 }
  ];
  const fuselageGeo = createLoftFuselage(profiles, 14);

  const radome = createLoftFuselage([
    { z: -27.25, rx: 0.01, ry: 0.01, cy: -0.15 },
    { z: -26.5, rx: 0.56, ry: 0.53, cy: -0.12 },
    { z: -25.4, rx: 1.35, ry: 1.32, cy: -0.02 }
  ], 14);

  // Belly fairing & satcom dome
  const bellyFairing = createLoftFuselage([
    { z: -6.5, rx: 0.4, ry: 0.2, cy: -2.3 },
    { z: -2.0, rx: 2.3, ry: 0.75, cy: -2.35 },
    { z:  3.0, rx: 2.5, ry: 0.85, cy: -2.38 },
    { z:  8.5, rx: 0.4, ry: 0.2, cy: -2.3 }
  ], 12);

  // Red/Gold cheatlines
  const stripeBoxes = [];
  for (const side of [-1, 1]) {
    stripeBoxes.push(createBox(0.10, 0.36, 34.0, side * 3.01, 0.35, -2.5));
    stripeBoxes.push(createBox(0.08, 0.14, 34.0, side * 3.02, 0.08, -2.5));
  }
  const redLiveryGeo = stripeBoxes[0];
  const goldLiveryGeo = stripeBoxes[1];

  // Wrap cockpit panes
  const cockpitPanes = [
    transformGeo(createBox(1.15, 0.56, 0.14), { rx: -0.58, ry: 0.24, tx: -0.62, ty: 1.52, tz: -22.75 }),
    transformGeo(createBox(1.15, 0.56, 0.14), { rx: -0.58, ry: -0.24, tx: 0.62, ty: 1.52, tz: -22.75 }),
    transformGeo(createBox(1.05, 0.52, 0.14), { rx: -0.42, ry: 0.72, tx: -1.55, ty: 1.46, tz: -22.15 }),
    transformGeo(createBox(1.05, 0.52, 0.14), { rx: -0.42, ry: -0.72, tx: 1.55, ty: 1.46, tz: -22.15 }),
    transformGeo(createBox(0.95, 0.48, 0.14), { rx: -0.25, ry: 1.18, tx: -2.18, ty: 1.42, tz: -21.35 }),
    transformGeo(createBox(0.95, 0.48, 0.14), { rx: -0.25, ry: -1.18, tx: 2.18, ty: 1.42, tz: -21.35 })
  ];
  const cockpitGeo = mergeGeometries(cockpitPanes);

  // Cabin passenger windows
  const windowParts = [];
  for (let z = -18.5; z <= 13.5; z += 1.2) {
    if (Math.abs(z + 15.3) < 0.7 || Math.abs(z + 4.8) < 0.7 || Math.abs(z - 5.7) < 0.7) continue;
    windowParts.push(createBox(0.10, 0.34, 0.28, -3.01, 0.85, z));
    windowParts.push(createBox(0.10, 0.34, 0.28, 3.01, 0.85, z));
  }
  const windowsGeo = mergeGeometries(windowParts);

  // Swept Wings (inboard + outboard)
  const leftInboard = createSweptWing({
    rootX: -2.6, rootY: -0.55, rootZ: -2.2,
    span: 8.4, rootChord: 10.8, tipChord: 6.4,
    sweepBack: 3.1, dihedralY: 0.75, thickness: 0.78,
    isLeft: true
  });
  const leftOutboard = createSweptWing({
    rootX: -11.0, rootY: 0.20, rootZ: 0.9,
    span: 14.8, rootChord: 6.4, tipChord: 2.3,
    sweepBack: 6.1, dihedralY: 1.55, thickness: 0.48,
    isLeft: true
  });
  const rightInboard = createSweptWing({
    rootX: 2.6, rootY: -0.55, rootZ: -2.2,
    span: 8.4, rootChord: 10.8, tipChord: 6.4,
    sweepBack: 3.1, dihedralY: 0.75, thickness: 0.78,
    isLeft: false
  });
  const rightOutboard = createSweptWing({
    rootX: 11.0, rootY: 0.20, rootZ: 0.9,
    span: 14.8, rootChord: 6.4, tipChord: 2.3,
    sweepBack: 6.1, dihedralY: 1.55, thickness: 0.48,
    isLeft: false
  });

  const flapCanoes = [];
  const specs = [{ x: 5.5, y: -0.62, z: 6.4 }, { x: 10.0, y: -0.25, z: 6.8 }, { x: 15.5, y: 0.30, z: 7.6 }];
  for (const s of specs) {
    for (const side of [-1, 1]) {
      flapCanoes.push(createCylinder(0.18, 0.05, 2.2, 10, side * s.x, s.y, s.z, 'z'));
    }
  }

  const wingsGeo = mergeGeometries([leftInboard, leftOutboard, rightInboard, rightOutboard, ...flapCanoes]);

  // Engines
  function buildEng(cx, cy, cz, scale = 1.0, isTail = false) {
    const cowl = [];
    const chrome = [];
    const dark = [];
    const pylon = [];

    cowl.push(createCylinder(1.36 * scale, 1.46 * scale, 1.35 * scale, 14, cx, cy, cz - 1.35 * scale, 'z'));
    cowl.push(createCylinder(1.46 * scale, 1.38 * scale, 2.35 * scale, 14, cx, cy, cz + 0.50 * scale, 'z'));

    chrome.push(createCylinder(1.28 * scale, 1.38 * scale, 0.38 * scale, 14, cx, cy, cz - 2.12 * scale, 'z'));
    chrome.push(createCylinder(0.04, 0.38 * scale, 0.78 * scale, 10, cx, cy, cz - 1.55 * scale, 'z'));
    chrome.push(createCylinder(0.45 * scale, 0.05, 1.05 * scale, 10, cx, cy, cz + 3.15 * scale, 'z'));

    dark.push(createCylinder(1.22 * scale, 1.22 * scale, 0.30 * scale, 12, cx, cy, cz - 1.30 * scale, 'z'));

    if (!isTail) {
      pylon.push(transformGeo(createBox(0.42 * scale, 1.45 * scale, 3.8 * scale), { rx: 0.14, tx: cx, ty: cy + 1.25 * scale, tz: cz + 0.55 * scale }));
    }
    return { cowl, chrome, dark, pylon };
  }

  const e1 = buildEng(-8.5, -2.05, -0.4, 1.0, false);
  const e3 = buildEng(8.5, -2.05, -0.4, 1.0, false);
  const e2 = buildEng(0, 4.65, 17.8, 1.06, true);

  const tailNacelle = createCylinder(1.48, 1.42, 4.4, 14, 0, 4.65, 18.0, 'z');
  const tailStripe = createCylinder(1.50, 1.49, 0.65, 14, 0, 4.65, 16.5, 'z');

  const allCowl = mergeGeometries([...e1.cowl, ...e3.cowl, ...e2.cowl, tailNacelle, ...e1.pylon, ...e3.pylon]);
  const allChrome = mergeGeometries([...e1.chrome, ...e3.chrome, ...e2.chrome]);
  const allDark = mergeGeometries([...e1.dark, ...e3.dark, ...e2.dark]);

  // Vertical Tail & Horizontal Tail
  const vertFin = createSweptWing({
    rootX: 0.0, rootY: 4.8, rootZ: 14.5,
    span: 10.5, rootChord: 10.2, tipChord: 3.5,
    sweepBack: 5.8, dihedralY: 0.0, thickness: 0.62,
    isLeft: true
  });
  const verticalTailGeo = transformGeo(vertFin, { rz: -Math.PI / 2, tx: 0, ty: 5.0, tz: 14.5 });

  const horizTailL = createSweptWing({
    rootX: -1.2, rootY: 1.8, rootZ: 21.0,
    span: 10.2, rootChord: 6.8, tipChord: 2.4,
    sweepBack: 4.5, dihedralY: 1.2, thickness: 0.48,
    isLeft: true
  });
  const horizTailR = createSweptWing({
    rootX: 1.2, rootY: 1.8, rootZ: 21.0,
    span: 10.2, rootChord: 6.8, tipChord: 2.4,
    sweepBack: 4.5, dihedralY: 1.2, thickness: 0.48,
    isLeft: false
  });
  const horizTailGeo = mergeGeometries([horizTailL, horizTailR]);

  const mesh0 = b.addMesh('DC10_Faceted_Body_Mesh', [
    { positions: fuselageGeo.positions, indices: fuselageGeo.indices, normals: fuselageGeo.normals, materialIndex: m.fuselageWhite },
    { positions: bellyFairing.positions, indices: bellyFairing.indices, normals: bellyFairing.normals, materialIndex: m.fuselageWhite },
    { positions: radome.positions, indices: radome.indices, normals: radome.normals, materialIndex: m.darkEngine },
    { positions: redLiveryGeo.positions, indices: redLiveryGeo.indices, normals: redLiveryGeo.normals, materialIndex: m.airlineRed },
    { positions: goldLiveryGeo.positions, indices: goldLiveryGeo.indices, normals: goldLiveryGeo.normals, materialIndex: m.goldTrim },
    { positions: verticalTailGeo.positions, indices: verticalTailGeo.indices, normals: verticalTailGeo.normals, materialIndex: m.airlineRed },
    { positions: tailStripe.positions, indices: tailStripe.indices, normals: tailStripe.normals, materialIndex: m.airlineRed },
    { positions: cockpitGeo.positions, indices: cockpitGeo.indices, normals: cockpitGeo.normals, materialIndex: m.glassCockpit },
    { positions: windowsGeo.positions, indices: windowsGeo.indices, normals: windowsGeo.normals, materialIndex: m.cabinWindows }
  ]);

  const mesh1 = b.addMesh('DC10_Faceted_Wings_Mesh', [
    { positions: wingsGeo.positions, indices: wingsGeo.indices, normals: wingsGeo.normals, materialIndex: m.wingTitanium },
    { positions: horizTailGeo.positions, indices: horizTailGeo.indices, normals: horizTailGeo.normals, materialIndex: m.wingTitanium }
  ]);

  const mesh2 = b.addMesh('DC10_Faceted_Engines_Mesh', [
    { positions: allCowl.positions, indices: allCowl.indices, normals: allCowl.normals, materialIndex: m.fuselageWhite },
    { positions: allChrome.positions, indices: allChrome.indices, normals: allChrome.normals, materialIndex: m.chromeSilver },
    { positions: allDark.positions, indices: allDark.indices, normals: allDark.normals, materialIndex: m.darkEngine }
  ]);

  b.addNode({ name: 'DC10_Faceted_Body', meshIndex: mesh0 });
  b.addNode({ name: 'DC10_Faceted_Wings', meshIndex: mesh1 });
  b.addNode({ name: 'DC10_Faceted_Engines', meshIndex: mesh2 });

  return b.buildGLBBuffer([0, 1, 2]);
}

// -------------------------------------------------------------
// 4. Main Build Runner
// -------------------------------------------------------------
export function buildAllLowPolyModels(rootDir = resolve(__dirname, '..')) {
  console.log('🚀 Generating Stylized Low-Poly / Faceted Models for Gallery...');

  const models = [
    { name: 'a380_lowpoly.glb', buffer: generateA380LowPoly(), label: 'Airbus A380 Super-Jumbo Low-Poly' },
    { name: 'dc10_lowpoly.glb', buffer: generateDC10LowPoly(), label: 'McDonnell Douglas DC-10 Chunky Retro Low-Poly' },
    { name: 'dc10_faceted.glb', buffer: generateDC10Faceted(), label: 'McDonnell Douglas DC-10 Faceted Gem Low-Poly' }
  ];

  const targetDirs = [
    join(rootDir, 'web', 'models'),
    join(rootDir, 'web', 'assets', 'models'),
    join(rootDir, 'flutter_app', 'assets', 'web', 'models'),
    join(rootDir, 'flutter_app', 'assets', 'web', 'assets', 'models')
  ];

  for (const dir of targetDirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  for (const m of models) {
    for (const dir of targetDirs) {
      const outPath = join(dir, m.name);
      writeFileSync(outPath, m.buffer);
    }
    const sizeKb = (m.buffer.length / 1024).toFixed(1);
    console.log(`  ✨ Built ${m.name.padEnd(20)} (${sizeKb} KB) - ${m.label}`);
  }

  console.log('🎉 All low-poly gallery models successfully built!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAllLowPolyModels();
}
