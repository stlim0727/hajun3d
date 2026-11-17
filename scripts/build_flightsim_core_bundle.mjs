#!/usr/bin/env node
// Bundles @stlim0727/flightsim-core into a standalone browser/WebView bundle for Hajun Plane 3D.
import * as esbuild from 'esbuild';
import { writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const threePlugin = {
  name: 'three-global',
  setup(build) {
    build.onResolve({ filter: /^three$/ }, args => ({
      path: args.path,
      namespace: 'three-global',
    }));
    build.onLoad({ filter: /.*/, namespace: 'three-global' }, () => ({
      contents: 'module.exports = globalThis.THREE;',
      loader: 'js',
    }));
  },
};

const entryContent = `
import * as FlightSimCore from '@stlim0727/flightsim-core';

// Expose to both modern FlightSimCore and legacy Flight3dPhysics namespaces
globalThis.Flight3dPhysics = Object.assign(globalThis.Flight3dPhysics || {}, FlightSimCore);
globalThis.FlightSimCore = FlightSimCore;
if (typeof window !== 'undefined') {
  window.Flight3dPhysics = globalThis.Flight3dPhysics;
  window.FlightSimCore = FlightSimCore;
}
`;

const result = await esbuild.build({
  stdin: {
    contents: entryContent,
    resolveDir: rootDir,
    sourcefile: 'flightsim-core-bundle-entry.js',
  },
  bundle: true,
  format: 'iife',
  minify: false,
  plugins: [threePlugin],
  write: false,
});

const bundleJs = result.outputFiles[0].text;
const webOut = join(rootDir, 'web', 'js', 'flightsim_core_bundle.js');
const flutterOut = join(rootDir, 'flutter_app', 'assets', 'web', 'js', 'flightsim_core_bundle.js');

mkdirSync(dirname(webOut), { recursive: true });
mkdirSync(dirname(flutterOut), { recursive: true });

writeFileSync(webOut, bundleJs, 'utf8');
writeFileSync(flutterOut, bundleJs, 'utf8');

const sizeKb = (statSync(webOut).size / 1024).toFixed(1);
console.log(`✔ Bundled @stlim0727/flightsim-core -> ${webOut} (${sizeKb} KB)`);
console.log(`✔ Synced to ${flutterOut}`);
