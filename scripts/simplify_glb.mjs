#!/usr/bin/env node

/**
 * Universal 3D GLB/glTF Mesh Decimation & Simplification Pipeline
 * Converts high-polygon 3D models into stylized, high-performance low-poly models
 * while strictly preserving authentic real-world contours, CAD curvatures, and UV textures.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

function printHelp() {
  console.log(`
Usage: simplify-glb [options] -i <input.glb> -o <output.glb>

Options:
  -i, --input <file>     Input 3D model (.glb or .gltf) [required]
  -o, --output <file>    Output simplified 3D model (.glb) [required]
  -r, --ratio <number>   Simplification triangle target ratio (0.01 - 1.0, default: 0.025 = 2.5%)
  --faceted              Apply flat-shading / sharp crease angle (0 deg) for stylized low-poly facets
  --smooth               Preserve smooth interpolated vertex normals (default)
  --no-merge             Disable material/primitive merging
  -h, --help             Show this help message

Examples:
  simplify-glb -i dc10.glb -o dc10_lowpoly.glb -r 0.02
  simplify-glb -i airliner.glb -o airliner_faceted.glb -r 0.03 --faceted
`);
}

export function getGLBStats(filePath) {
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

export function simplifyGLB({
  inputPath,
  outputPath,
  ratio = 0.025,
  mergeMeshes = true,
  faceted = false
}) {
  const inResolved = resolve(inputPath);
  const outResolved = resolve(outputPath);

  if (!existsSync(inResolved)) {
    throw new Error(`Input model not found: ${inResolved}`);
  }

  const before = getGLBStats(inResolved);
  console.log(`📦 Input Model: ${basename(inResolved)}`);
  console.log(`   • Size: ${before.fileSizeKB} KB | Triangles: ${before.triangles.toLocaleString()} | Vertices: ${before.vertices.toLocaleString()} | Draw Calls: ${before.primitives}`);

  // Construct gltfpack options
  const flags = [
    `-i "${inResolved}"`,
    `-o "${outResolved}"`,
    `-si ${ratio}`,
    '-sa',   // Aggressive reach to target ratio for low-poly styling
    '-noq',  // Standard non-quantized glTF binary for 100% Three.js compatibility
    mergeMeshes ? '-mm' : '', // Merge primitives sharing same material
    faceted ? '-gn 0' : ''    // Crease angle 0 for faceted flat shading
  ].filter(Boolean).join(' ');

  console.log(`⚙️ Running Meshoptimizer QEM decimation (target ratio: ${(ratio * 100).toFixed(1)}%)...`);
  execSync(`npx -y gltfpack ${flags}`, { stdio: 'inherit' });

  const after = getGLBStats(outResolved);
  const triReduction = ((1 - after.triangles / before.triangles) * 100).toFixed(1);
  const sizeReduction = ((1 - after.fileSizeKB / before.fileSizeKB) * 100).toFixed(1);

  console.log(`✨ Simplified Output: ${basename(outResolved)}`);
  console.log(`   • Size: ${after.fileSizeKB} KB (-${sizeReduction}%)`);
  console.log(`   • Triangles: ${after.triangles.toLocaleString()} (-${triReduction}%)`);
  console.log(`   • Vertices: ${after.vertices.toLocaleString()}`);
  console.log(`   • Draw Calls / Primitives: ${after.primitives} (was ${before.primitives})`);

  return { before, after };
}

// CLI runner
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.length > 0) {
  let input = null;
  let output = null;
  let ratio = 0.025;
  let merge = true;
  let faceted = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-i' || a === '--input') input = args[++i];
    else if (a === '-o' || a === '--output') output = args[++i];
    else if (a === '-r' || a === '--ratio') ratio = parseFloat(args[++i]);
    else if (a === '--no-merge') merge = false;
    else if (a === '--faceted') faceted = true;
    else if (a === '--smooth') faceted = false;
  }

  if (!input || !output) {
    console.error('Error: Both --input (-i) and --output (-o) are required.');
    printHelp();
    process.exit(1);
  }

  simplifyGLB({ inputPath: input, outputPath: output, ratio, mergeMeshes: merge, faceted });
}
