import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import {
  CesiumIonAuthPlugin,
  ReorientationPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
} from '3d-tiles-renderer/plugins';

const D2R = Math.PI / 180;

/**
 * Creates an opt-in terrain imagery layer beneath the game renderer.
 * Returns null when no tile source is configured, so the offline/default
 * path is completely untouched.
 */
export function create(options = {}) {
  const {
    ionToken = '',
    assetId = '2275207',
    lat,
    lon,
    height = 0,
    simAnchor = { x: -180, y: 0, z: -28700 },
    container,
    width,
    height: viewportHeight,
  } = options;

  if (!container || !ionToken) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'geo-tiles-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
  });
  container.insertBefore(canvas, container.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, viewportHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec8e3);
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(-4000, 8000, 3000);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(60, width / viewportHeight, 1.2, 70000);
  const tiles = new TilesRenderer();

  tiles.registerPlugin(new CesiumIonAuthPlugin({ apiToken: ionToken, assetId, autoRefreshToken: true }));
  tiles.registerPlugin(new ReorientationPlugin({ lat: lat * D2R, lon: lon * D2R, height }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new TilesFadePlugin());

  // Reorientation centres the anchor at (0,0,0); move it to the simulator's
  // local position for that landmark (Haeundae LCT by default).
  tiles.addEventListener('load-root-tileset', () => {
    tiles.group.position.x += simAnchor.x;
    tiles.group.position.y += simAnchor.y;
    tiles.group.position.z += simAnchor.z;
    tiles.group.updateMatrixWorld();
  });

  scene.add(tiles.group);
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  const stats = { tiles: 0, errors: 0, source: 'ion' };
  tiles.addEventListener('load-model', () => { stats.tiles += 1; });
  tiles.addEventListener('load-error', () => { stats.errors += 1; });

  {
    const credit = document.createElement('div');
    credit.style.cssText = 'position:absolute;right:10px;bottom:8px;z-index:1;display:flex;gap:8px;align-items:center;opacity:.85;pointer-events:none';
    credit.innerHTML =
      '<a href="https://cesium.com" target="_blank"><img src="https://assets.ion.cesium.com/ion-credit.png" alt="Cesium ion" style="height:20px;background:#fff;border-radius:3px"></a>' +
      '<img src="https://assets.ion.cesium.com/google-credit.png" alt="Google" style="height:20px;background:#fff;border-radius:3px">';
    container.appendChild(credit);
  }

  function render(simCamera) {
    camera.position.copy(simCamera.position);
    camera.quaternion.copy(simCamera.quaternion);
    camera.fov = simCamera.fov;
    camera.aspect = simCamera.aspect;
    camera.near = simCamera.near;
    camera.far = simCamera.far;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    tiles.update();
    renderer.render(scene, camera);
  }

  function resize(w, h) {
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    tiles.setResolutionFromRenderer(camera, renderer);
  }

  function dispose() {
    tiles.dispose();
    renderer.dispose();
    canvas.remove();
  }

  function debug() {
    return {
      position: tiles.group.position.toArray(),
      quaternion: tiles.group.quaternion.toArray(),
      root: Boolean(tiles.root),
      tiles: stats.tiles
    };
  }

  return { render, resize, dispose, stats, canvas, debug };
}
