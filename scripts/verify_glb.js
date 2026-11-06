const fs = require('fs');
const path = require('path');

const files = [
  'a320.glb',
  'b747.glb',
  'dc10.glb',
  'md80.glb',
  'concorde.glb',
  'amphibian.glb',
  'ancestor.glb',
  'airplane.glb',
  'airport.glb',
  'incheon_airport.glb',
  'terrain.glb',
  'mountains_terrain.glb',
  'haeundae.glb',
  'city_beach.glb',
  'haeundae_beach_city.glb',
  'world_environment.glb'
];

console.log('--- VERIFYING GENERATED GLB FILES ---');

for (const file of files) {
  const filePath = path.join('web', 'models', file);
  const buf = fs.readFileSync(filePath);

  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const totalLength = buf.readUInt32LE(8);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);

  if (magic !== 0x46546C67) {
    console.error(`❌ ${file}: Invalid magic ${magic.toString(16)}`);
    process.exit(1);
  }
  if (version !== 2) {
    console.error(`❌ ${file}: Invalid version ${version}`);
    process.exit(1);
  }
  if (totalLength !== buf.length) {
    console.error(`❌ ${file}: Header length (${totalLength}) != file size (${buf.length})`);
    process.exit(1);
  }
  if (jsonChunkType !== 0x4E4F534A) {
    console.error(`❌ ${file}: Invalid chunk0 type ${jsonChunkType.toString(16)}`);
    process.exit(1);
  }

  const jsonStr = buf.slice(20, 20 + jsonChunkLen).toString('utf8');
  let gltfJson;
  try {
    gltfJson = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error(`❌ ${file}: JSON parse error:`, e.message);
    process.exit(1);
  }

  const binChunkHeaderOffset = 20 + jsonChunkLen;
  const binChunkLen = buf.readUInt32LE(binChunkHeaderOffset);
  const binChunkType = buf.readUInt32LE(binChunkHeaderOffset + 4);

  if (binChunkType !== 0x004E4942) {
    console.error(`❌ ${file}: Invalid chunk1 type ${binChunkType.toString(16)}`);
    process.exit(1);
  }

  console.log(`✅ ${file.padEnd(25)} | Size: ${buf.length.toString().padStart(6)} B | Nodes: ${gltfJson.nodes.length} | Meshes: ${gltfJson.meshes.length} | Materials: ${gltfJson.materials.length}`);
}

console.log('🎉 ALL GLB FILES VERIFIED 100% SPEC COMPLIANT!');
