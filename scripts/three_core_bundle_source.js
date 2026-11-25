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
    worldAnchor = options.simAnchorBase || simAnchor,
    simAnchorRender = options.simAnchorRender || simAnchor,
    nearAnchorMaxDepth = 0,
    focusAnchors = [],
    focusAnchorsRender = options.focusAnchorsRender || focusAnchors,
    errorTarget: configuredErrorTarget,
    scene,
    camera,
    renderer,
    container,
  } = options;

  if (!ionToken || !scene || !camera || !renderer) return null;
  if (![lat, lon, height].every(Number.isFinite)) return null;

  let activeErrorTarget = Number.isFinite(configuredErrorTarget) ? configuredErrorTarget : 16;

  const tiles = new TilesRenderer();
  tiles.registerPlugin(new CesiumIonAuthPlugin({ apiToken: ionToken, assetId, autoRefreshToken: true }));
  tiles.registerPlugin(new ReorientationPlugin({ lat: lat * D2R, lon: lon * D2R, height, azimuth: azimuth * D2R }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new TilesFadePlugin());
  // Standard errorTarget for balanced texture crispness and mobile bandwidth.
  tiles.errorTarget = activeErrorTarget;

  // Position root tileset in scene simulation space.
  tiles.addEventListener('load-root-tileset', () => {
    tiles.group.position.x += worldAnchor.x;
    tiles.group.position.y += worldAnchor.y;
    tiles.group.position.z += worldAnchor.z;
    tiles.group.updateMatrixWorld();
  });

  // Neutral backing plane and ocean: Google 3D Tiles has coverage gaps, missing LODs,
  // and steep skirts over Korea. A large backing plane and water prevent sky voids
  // from showing under the runway or through missing tile boundaries.
  const fallbackGround = new THREE.Mesh(
    new THREE.PlaneGeometry(1200000, 1200000),
    new THREE.MeshStandardMaterial({
      color: 0x526046,
      roughness: 0.95,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: 4,
      polygonOffsetUnits: 4,
    })
  );
  fallbackGround.name = 'GeoFallbackGround';
  fallbackGround.rotation.x = -Math.PI / 2;
  fallbackGround.position.set(worldAnchor.x, -2.0, worldAnchor.z);
  fallbackGround.receiveShadow = true;
  scene.add(fallbackGround);

  const fallbackWater = new THREE.Mesh(
    new THREE.PlaneGeometry(1200000, 1200000),
    new THREE.MeshStandardMaterial({
      color: 0x1d4e6d,
      roughness: 0.15,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 6,
      polygonOffsetUnits: 6,
    })
  );
  fallbackWater.name = 'GeoFallbackWater';
  fallbackWater.rotation.x = -Math.PI / 2;
  fallbackWater.position.set(worldAnchor.x, -3.5, worldAnchor.z);
  scene.add(fallbackWater);

  scene.add(tiles.group);
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  const maxAnisotropy = renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function'
    ? Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1)
    : 4;
  const stats = { tiles: 0, errors: 0, source: 'ion' };
  tiles.addEventListener('load-model', (event) => {
    stats.tiles += 1;
    const modelScene = event && (event.scene || (event.tile && event.tile.cached && event.tile.cached.scene));
    if (modelScene && typeof modelScene.traverse === 'function') {
      modelScene.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (mat && mat.map && mat.map.anisotropy !== maxAnisotropy) {
              mat.map.anisotropy = maxAnisotropy;
              mat.map.needsUpdate = true;
            }
          });
        }
      });
    }
  });
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
    // Keep active errorTarget applied across plugin resets.
    tiles.errorTarget = activeErrorTarget;

    // Both camera.position and simAnchorRender/focusAnchorsRender are in render-space.
    // Fall back to scene-offset compensation if explicit render anchors are omitted.
    const activeAnchor = simAnchorRender || (scene && scene.position ? {
      x: worldAnchor.x + scene.position.x,
      y: worldAnchor.y + scene.position.y,
      z: worldAnchor.z + scene.position.z,
    } : worldAnchor);
    const activeFocus = focusAnchorsRender && focusAnchorsRender.length > 0
      ? focusAnchorsRender
      : (scene && scene.position ? focusAnchors.map(a => ({
          ...a,
          x: a.x + scene.position.x,
          y: (a.y ?? 0) + scene.position.y,
          z: a.z + scene.position.z,
        })) : focusAnchors);

    // Keep the available parent tiles around Gimhae during ground operations.
    const nearAnchor = camera.position.y < activeAnchor.y + 600 &&
      Math.hypot(camera.position.x - activeAnchor.x, camera.position.z - activeAnchor.z) < 6000;
    let targetMaxDepth = 0;
    if (nearAnchor) {
      targetMaxDepth = nearAnchorMaxDepth;
    } else if (activeFocus.length > 0) {
      const matched = activeFocus.find((anchor) => {
        const y = anchor.y ?? 0;
        return camera.position.y < (anchor.maxAltitude ?? y + 600) &&
          Math.hypot(camera.position.x - anchor.x, camera.position.z - anchor.z) < (anchor.radius ?? 6000);
      });
      if (matched) {
        targetMaxDepth = matched.maxDepth !== undefined ? matched.maxDepth : (options.maxDepth || 19);
      }
    }
    tiles.maxDepth = targetMaxDepth;
    if (scene && typeof scene.updateMatrixWorld === 'function') scene.updateMatrixWorld();
    if (camera && typeof camera.updateMatrixWorld === 'function') camera.updateMatrixWorld();
    tiles.setResolutionFromRenderer(camera, renderer);
    tiles.update();
  }

  function dispose() {
    tiles.dispose();
    scene.remove(tiles.group);
    if (fallbackGround) {
      scene.remove(fallbackGround);
      fallbackGround.geometry.dispose();
      fallbackGround.material.dispose();
    }
    if (fallbackWater) {
      scene.remove(fallbackWater);
      fallbackWater.geometry.dispose();
      fallbackWater.material.dispose();
    }
  }

  function debug() {
    const trStats = tiles.stats ? {
      inFrustum: tiles.stats.inFrustum,
      active: tiles.stats.active,
      visible: tiles.stats.visible,
      loaded: tiles.stats.loaded,
      downloading: tiles.stats.downloading,
      failed: tiles.stats.failed,
      inCache: tiles.stats.inCache,
    } : null;
    const camInfoPos = tiles.cameraInfo && tiles.cameraInfo[0] && tiles.cameraInfo[0].position
      ? tiles.cameraInfo[0].position.toArray()
      : null;
    return {
      position: tiles.group.position.toArray(),
      quaternion: tiles.group.quaternion.toArray(),
      root: Boolean(tiles.root),
      tiles: stats.tiles,
      maxDepth: tiles.maxDepth,
      errorTarget: tiles.errorTarget,
      tilesStats: trStats,
      cameraInfoPos: camInfoPos,
    };
  }

  function setErrorTarget(val) {
    if (Number.isFinite(val) && val > 0) {
      activeErrorTarget = val;
      tiles.errorTarget = val;
    }
  }

  function getErrorTarget() {
    return activeErrorTarget;
  }

  return { update, dispose, stats, debug, setErrorTarget, getErrorTarget };
}
