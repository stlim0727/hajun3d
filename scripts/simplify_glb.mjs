// Automated GLB Mesh Decimation & Simplification Pipeline for Hajun Plane 3D
// Takes any high-detail GLB (100k+ polygons) as input and simplifies it to a stylized
// lightweight low-poly model while preserving authentic real-world contours and silhouettes.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

function getGLBStats(filePath) {
  const buf = readFileSync(filePath);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.subarray(20, 20 + jsonChunkLen).toString('utf8');
  const gltf = JSON.parse(jsonStr);

  let triangles = 0;
  let vertices = 0;
  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      if (prim.indices !== undefined) {
        triangles += gltf.accessors[prim.indices].count / 3;
      }
      if (prim.attributes && prim.attributes.POSITION !== undefined) {
        vertices += gltf.accessors[prim.attributes.POSITION].count;
      }
    }
  }

  return {
    fileSizeKB: (buf.length / 1024).toFixed(1),
    meshes: (gltf.meshes || []).length,
    primitives: (gltf.meshes || []).reduce((acc, m) => acc + (m.primitives?.length || 0), 0),
    materials: (gltf.materials || []).length,
    triangles: Math.round(triangles),
    vertices
  };
}

export function simplifyGLB({ inputPath, outputPath, ratio = 0.025, mergeMeshes = true }) {
  const inResolved = resolve(inputPath);
  const outResolved = resolve(outputPath);

  if (!existsSync(inResolved)) {
    throw new Error(`Input file not found: ${inResolved}`);
  }

  const before = getGLBStats(inResolved);
  console.log(`📦 Input Model: ${basename(inResolved)}`);
  console.log(`   • Size: ${before.fileSizeKB} KB | Tris: ${before.triangles.toLocaleString()} | Verts: ${before.vertices.toLocaleString()} | Prims: ${before.primitives}`);

  // Execute gltfpack mesh simplification
  const flags = [
    `-i "${inResolved}"`,
    `-o "${outResolved}"`,
    `-si ${ratio}`,
    '-sa',   // Aggressively reach target ratio for stylized low-poly
    '-noq',  // Standard non-quantized glTF binary for 100% Three.js compatibility
    mergeMeshes ? '-mm' : '', // Merge primitives sharing same material
    '-gn 0'  // Sharp crease angle for faceted shading on simplified facets
  ].filter(Boolean).join(' ');

  console.log(`⚙️ Running Meshoptimizer QEM simplification (target ratio: ${(ratio * 100).toFixed(1)}%)...`);
  execSync(`npx -y gltfpack ${flags}`, { stdio: 'inherit' });

  const after = getGLBStats(outResolved);
  const triReduction = ((1 - after.triangles / before.triangles) * 100).toFixed(1);
  const sizeReduction = ((1 - after.fileSizeKB / before.fileSizeKB) * 100).toFixed(1);

  console.log(`✨ Simplified Output: ${basename(outResolved)}`);
  console.log(`   • Size: ${after.fileSizeKB} KB (-${sizeReduction}%)`);
  console.log(`   • Tris: ${after.triangles.toLocaleString()} (-${triReduction}%)`);
  console.log(`   • Verts: ${after.vertices.toLocaleString()}`);
  console.log(`   • Draw Calls / Prims: ${after.primitives} (was ${before.primitives})`);

  return { before, after };
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length >= 2 || process.argv[1].endsWith('simplify_glb.mjs')) {
  let input = 'web/models/dc10.glb';
  let output = 'web/models/dc10_decimated.glb';
  let ratio = 0.025;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') input = args[++i];
    else if (args[i] === '--output' || args[i] === '-o') output = args[++i];
    else if (args[i] === '--ratio' || args[i] === '-r') ratio = parseFloat(args[++i]);
  }

  simplifyGLB({ inputPath: input, outputPath: output, ratio });
}
