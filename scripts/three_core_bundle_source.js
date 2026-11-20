import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { TilesRenderer } from '3d-tiles-renderer';
import {
  CesiumIonAuthPlugin,
  ReorientationPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
} from '3d-tiles-renderer/plugins';

const D2R = Math.PI / 180;

// Classic scripts expect `THREE` as a global with loader helpers attached.
window.THREE = { ...THREE, GLTFLoader, GLTFExporter };

/**
 * Attaches a streamed 3D Tiles terrain to the game's existing scene/camera.
 * Returns null unless an ion token is supplied, so the offline path is inert.
 */
export function create(options = {}) {
  const {
    ionToken,
    assetId = '2275207',
    lat,
    lon,
    height = 0,
    azimuth = 0,
    simAnchor = { x: -180, y: 0, z: -28700 },
    scene,
    camera,
    renderer,
    container,
  } = options;

  if (!ionToken || !scene || !camera || !renderer) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const tiles = new TilesRenderer();
  tiles.registerPlugin(new CesiumIonAuthPlugin({ apiToken: ionToken, assetId, autoRefreshToken: true }));
  tiles.registerPlugin(new ReorientationPlugin({ lat: lat * D2R, lon: lon * D2R, height, azimuth: azimuth * D2R }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new TilesFadePlugin());
  // Korea has no photogrammetric high-LOD tiles; request coarser available levels.
  tiles.errorTarget = 128;

  tiles.addEventListener('load-root-tileset', () => {
    tiles.group.position.x += simAnchor.x;
    tiles.group.position.y += simAnchor.y;
    tiles.group.position.z += simAnchor.z;
    tiles.group.updateMatrixWorld();
  });

  // Neutral backing plane: Google does not serve every LOD over Korea, and the
  // gaps would otherwise show the sky background as false water.
  const fallbackGround = new THREE.Mesh(
    new THREE.PlaneGeometry(600000, 600000),
    new THREE.MeshBasicMaterial({ color: 0x6b7a5a, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })
  );
  fallbackGround.name = 'GeoFallbackGround';
  fallbackGround.rotation.x = -Math.PI / 2;
  fallbackGround.position.y = 2;
  fallbackGround.renderOrder = -1;
  scene.add(fallbackGround);

  scene.add(tiles.group);
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  const stats = { tiles: 0, errors: 0, source: 'ion' };
  tiles.addEventListener('load-model', () => { stats.tiles += 1; });
  tiles.addEventListener('load-error', () => { stats.errors += 1; });

  if (container) {
    const credit = document.createElement('div');
    credit.style.cssText = 'position:absolute;right:10px;bottom:8px;z-index:3;display:flex;gap:8px;align-items:center;opacity:.85;pointer-events:none';
    credit.innerHTML =
      '<a href="https://cesium.com" target="_blank"><img src="https://assets.ion.cesium.com/ion-credit.png" alt="Cesium ion" style="height:20px;background:#fff;border-radius:3px"></a>' +
      '<img src="https://assets.ion.cesium.com/google-credit.png" alt="Google" style="height:20px;background:#fff;border-radius:3px">';
    container.appendChild(credit);
  }

  function update() {
    // GoogleCloudAuthPlugin resets this on init; keep Korean LOD requests available.
    tiles.errorTarget = 128;
    tiles.setResolutionFromRenderer(camera, renderer);
    tiles.update();
  }

  function dispose() {
    tiles.dispose();
    scene.remove(tiles.group);
    scene.remove(fallbackGround);
    fallbackGround.geometry.dispose();
    fallbackGround.material.dispose();
  }

  function debug() {
    return {
      position: tiles.group.position.toArray(),
      quaternion: tiles.group.quaternion.toArray(),
      root: Boolean(tiles.root),
      tiles: stats.tiles
    };
  }

  return { update, dispose, stats, debug };
}
