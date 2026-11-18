---
name: glb-mesh-decimate
description: Simplify, decimate, and optimize high-polygon 3D GLTF/GLB models into lightweight, stylized, or performance-optimized models while preserving authentic real-world contours, CAD curvatures, and UV textures. Use whenever asked to decimate, simplify, optimize, convert high-poly GLB to low-poly, or reduce draw calls/polygon count in 3D WebGL or mobile applications.
---

# 3D GLTF/GLB Mesh Decimation & Optimization

This skill provides an automated, production-grade pipeline to take **any high-detail 3D model (.glb / .gltf)** as input and decimate its polygon count and draw calls into a lightweight, high-performance low-poly model while strictly preserving authentic real-world contours, aerodynamics, and texture mappings.

## Core Capabilities

1. **Authentic Contour Preservation (Quadric Error Metric)**:
   - Does NOT create models from scratch with primitive approximations.
   - Operates directly on the input high-polygon CAD/scan/PBR mesh, collapsing edges in order of least visual geometric deviation.
   - Preserves fuselage tapering, airfoil camber, engine pylon alignments, and cockpit windshield curves.

2. **Stylized Low-Poly / Faceted Shading**:
   - Offers `--faceted` mode which sets sharp normal crease angles (0°), creating a distinct polygonal "origami / crystalline" facet reflection.
   - Alternatively offers `--smooth` mode (default) to keep smooth surface normals.

3. **Draw Call & Texture Optimization**:
   - Merges identical material primitives across node hierarchies (`-mm`), cutting draw calls by 50% to 90%.
   - Produces clean, non-quantized standard glTF 2.0 binary output compatible with all Three.js, Babylon.js, PlayCanvas, and mobile WebViews without requiring custom decompression WASM workers.

---

## Command-Line Usage

The global CLI tool `simplify-glb` is available in PATH:

```bash
# Basic decimation (e.g. reduce to 2.5% of original polygon count)
simplify-glb -i input_model.glb -o output_lowpoly.glb -r 0.025

# Stylized faceted low-poly (sharp polygon facet shading)
simplify-glb -i input_model.glb -o output_faceted.glb -r 0.02 --faceted

# Mild optimization for VR/mobile (keep 20% polygons, smooth normals)
simplify-glb -i heavy_scenery.glb -o scenery_mobile.glb -r 0.20 --smooth
```

### Parameter Reference

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `-i`, `--input` | `<path>` | Path to input `.glb` or `.gltf` file | *Required* |
| `-o`, `--output` | `<path>` | Path for output simplified `.glb` file | *Required* |
| `-r`, `--ratio` | `<float>` | Target triangle ratio (0.005 to 1.0) | `0.025` (2.5%) |
| `--faceted` | None | Apply sharp 0° crease angle for faceted low-poly styling | Off |
| `--smooth` | None | Retain smooth interpolated normals | Default |
| `--no-merge` | None | Prevent material merging if individual nodes must be animated independently | Off |

---

## Programmatic Node.js API

You can also import and execute the decimation pipeline inside build scripts or CI workflows:

```javascript
import { simplifyGLB, getGLBStats } from './scripts/simplify_glb.mjs';

// Inspect model stats before running
const statsBefore = getGLBStats('models/heavy_airplane.glb');
console.log('Triangles:', statsBefore.triangles);

// Run decimation
const result = simplifyGLB({
  inputPath: 'models/heavy_airplane.glb',
  outputPath: 'models/airplane_lowpoly.glb',
  ratio: 0.03, // 3% of original triangles
  mergeMeshes: true,
  faceted: false
});

console.log(`Reduced from ${result.before.triangles} to ${result.after.triangles} triangles`);
```

---

## Recommended Simplification Ratios

- **Mobile / WebView Flight Simulator (Primary Player Craft)**: `0.02 ~ 0.035` (e.g., 150k tris → 3k~5k tris). Achieves 60 FPS on mobile while preserving sharp silhouette.
- **AI Traffic / Background Vehicles**: `0.005 ~ 0.01` (e.g., 150k tris → 800~1,500 tris). Perfect for parked or distant aircraft.
- **Detailed Cockpit / Close-up Inspection Models**: `0.08 ~ 0.15` (e.g., 150k tris → 15k~22k tris). Retains fine cockpit switches and landing gear struts.
