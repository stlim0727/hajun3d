const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'web', 'models');
const modelKeys = {
  // Aircraft
  a320: 'a320.glb',
  b747: 'b747.glb',
  dc10: 'dc10.glb',
  md80: 'md80.glb',
  concorde: 'concorde.glb',
  amphibian: 'amphibian.glb',
  ancestor: 'ancestor.glb',
  airplane: 'airplane.glb',
  // Scenery & Environments
  airport: 'airport.glb',
  incheon_airport: 'incheon_airport.glb',
  terrain: 'terrain.glb',
  haeundae: 'haeundae.glb',
  world_environment: 'world_environment.glb'
};

const bundle = {};
for (const [key, filename] of Object.entries(modelKeys)) {
  const filePath = path.join(modelsDir, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    bundle[key] = data.toString('base64');
    console.log(`Packed ${key} (${filename}): ${(data.length / 1024).toFixed(1)} KB -> Base64 ${(bundle[key].length / 1024).toFixed(1)} KB`);
  } else {
    console.warn(`File not found: ${filePath}`);
  }
}

const jsContent = `// Precompiled Pure Binary GLB 3D Model Assets for Hajun Plane 3D
// Auto-generated for 100% instant zero-latency loading and zero CORS issues on file:// & WebView.
window.GLB_BUNDLE = ${JSON.stringify(bundle)};
`;

const webOut = path.join(__dirname, '..', 'web', 'glb_bundle.js');
const flutterOut = path.join(__dirname, '..', 'flutter_app', 'assets', 'web', 'glb_bundle.js');

fs.writeFileSync(webOut, jsContent, 'utf8');
fs.writeFileSync(flutterOut, jsContent, 'utf8');

console.log(`Successfully generated:\n- ${webOut}\n- ${flutterOut}`);
