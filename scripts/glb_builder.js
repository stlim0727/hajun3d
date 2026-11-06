// GLB (glTF 2.0 Binary) Builder for Node.js
// Generates standard compliant binary .glb files

class GLBBuilder {
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

  // Add binary buffer data with 4-byte alignment
  appendBuffer(dataBuffer, targetType) {
    // 4-byte alignment
    const pad = (4 - (this.currentOffset % 4)) % 4;
    if (pad > 0) {
      const paddingBuf = Buffer.alloc(pad);
      this.binaryChunks.push(paddingBuf);
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
      bView.target = targetType; // 34962: ARRAY_BUFFER, 34963: ELEMENT_ARRAY_BUFFER
    }
    this.bufferViews.push(bView);
    return bufferViewIndex;
  }

  addMesh(name, primitives) {
    const meshIndex = this.meshes.length;
    const prims = primitives.map(p => {
      // 1. Positions
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
        componentType: 5126, // FLOAT
        count: p.positions.length / 3,
        type: 'VEC3',
        min: posMin,
        max: posMax
      });

      // 2. Normals (if provided, else calculate or dummy)
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

      // 3. Indices
      const idxBuf = (p.positions.length / 3 > 65535) ? new Uint32Array(p.indices) : new Uint16Array(p.indices);
      const idxComponentType = (p.positions.length / 3 > 65535) ? 5125 : 5123;
      const idxView = this.appendBuffer(idxBuf, 34963);
      const idxAccessor = this.accessors.length;
      this.accessors.push({
        bufferView: idxView,
        byteOffset: 0,
        componentType: idxComponentType,
        count: p.indices.length,
        type: 'SCALAR'
      });

      const attributes = {
        POSITION: posAccessor
      };
      if (normAccessor !== null) {
        attributes.NORMAL = normAccessor;
      }

      return {
        attributes: attributes,
        indices: idxAccessor,
        material: p.materialIndex !== undefined ? p.materialIndex : 0,
        mode: 4 // TRIANGLES
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
    if (options.meshIndex !== undefined) {
      node.mesh = options.meshIndex;
    }
    if (options.translation) {
      node.translation = options.translation;
    }
    if (options.rotation) {
      node.rotation = options.rotation; // [x, y, z, w] quaternion
    }
    if (options.scale) {
      node.scale = options.scale;
    }
    if (options.children && options.children.length > 0) {
      node.children = options.children;
    }
    this.nodes.push(node);
    return nodeIndex;
  }

  buildGLBBuffer(rootNodeIndices) {
    const binTotalLength = this.currentOffset;
    // Align BIN chunk to 4-byte boundary
    const binPadding = (4 - (binTotalLength % 4)) % 4;
    const binData = Buffer.concat([
      ...this.binaryChunks,
      Buffer.alloc(binPadding, 0)
    ]);
    const binChunkLength = binData.length;

    const gltfJson = {
      asset: {
        version: "2.0",
        generator: "Hajun Plane 3D - Antigravity GLB Model Generator"
      },
      scene: 0,
      scenes: [
        {
          name: "MainScene",
          nodes: rootNodeIndices || [0]
        }
      ],
      nodes: this.nodes,
      materials: this.materials,
      meshes: this.meshes,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [
        {
          byteLength: binChunkLength
        }
      ]
    };

    let jsonString = JSON.stringify(gltfJson);
    let jsonBuffer = Buffer.from(jsonString, 'utf8');

    // JSON chunk must be padded with spaces (0x20) to 4-byte boundary
    const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
    if (jsonPadding > 0) {
      jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
    }
    const jsonChunkLength = jsonBuffer.length;

    // Total GLB length = 12 (header) + 8 (chunk0 header) + jsonChunkLength + 8 (chunk1 header) + binChunkLength
    const totalLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546C67, 0); // magic "glTF"
    header.writeUInt32LE(2, 4);          // version 2
    header.writeUInt32LE(totalLength, 8);// total file length

    const chunk0Header = Buffer.alloc(8);
    chunk0Header.writeUInt32LE(jsonChunkLength, 0);
    chunk0Header.writeUInt32LE(0x4E4F534A, 4); // "JSON"

    const chunk1Header = Buffer.alloc(8);
    chunk1Header.writeUInt32LE(binChunkLength, 0);
    chunk1Header.writeUInt32LE(0x004E4942, 4); // "BIN\0"

    return Buffer.concat([
      header,
      chunk0Header,
      jsonBuffer,
      chunk1Header,
      binData
    ]);
  }
}

module.exports = GLBBuilder;
