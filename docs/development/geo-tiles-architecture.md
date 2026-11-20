# ADR: streamed geospatial tiles for Haeundae / Korea / world

Status: **accepted direction, not yet integrated into the game runtime**.

## Decision

Keep Three.js as the rendering engine. Add [`3d-tiles-renderer`](https://github.com/NASA-AMMOS/3DTilesRendererJS)
(Apache-2.0) as a **data/streaming layer**, anchored to the existing local metric
frame with `ReorientationPlugin`. Do **not** swap the renderer to CesiumJS.

Use a hybrid content strategy:

- **Close range / Haeundae landmarks**: keep the generated `haeundae.glb` and
  obstacle boxes. Google's dataset has no 3D buildings over South Korea.
- **High altitude / whole Korea / world**: stream terrain + imagery tiles.

## Evidence

Captures are in `screenshots/geo-tiles-eval/`. Same renderer, same Cesium ion
asset (`2275207`, Google Photorealistic 3D Tiles), same camera presets.

| Capture | Result |
| :--- | :--- |
| [Haeundae close](../../screenshots/geo-tiles-eval/haeundae_close_3dtiles.png) | Flat: beach/breakwater render, LCT and Marine City towers absent. |
| [Haeundae high](../../screenshots/geo-tiles-eval/haeundae_high_3dtiles.png) | Good: coastline, beach, terrain relief, city texture. |
| [Tokyo control](../../screenshots/geo-tiles-eval/tokyo_control_3dtiles.png) | Full photogrammetric buildings — pipeline works. |
| [Seoul control](../../screenshots/geo-tiles-eval/seoul_control_3dtiles.png) | Flat imagery — Korea-wide coverage gap, not a code defect. |

`ReorientationPlugin` anchor used for Haeundae: `35.1603056, 129.169`
(LCT Landmark Tower). 323–367 tiles loaded per capture; zero console/page errors.

## Why not CesiumJS as the renderer

- ECEF globe coordinates conflict with the simulator's local metric frame,
  `+Y` up / `-Z` forward, near `1.2 m` / far `70,000 m` Early-Z setup.
- Three.js/Cesium depth synchronisation is a known hard integration problem.
- Cesium ion Community content is personal/non-commercial only, requires a
  prominent ion logo, and forbids long-term caching — incompatible with the
  offline `web/glb_bundle.js` WebView path.

## Integration boundary

`web/index.html` loads classic scripts and a global Three.js **r128**;
`3d-tiles-renderer` requires modern Three.js as an ES module. Therefore the
runtime integration is a scoped migration, not a drop-in patch:

1. Move the app to a modern ESM Three.js build (preserving the `file://` offline
   bundle and zero-CORS WebView constraint).
2. Introduce a geodetic anchor and ENU frame; keep physics in local metres.
3. Add `TilesRenderer` with `ReorientationPlugin`, terrain plugin, fade and
   compression plugins; keep generated GLB landmarks for close range.
4. Sample tile heights into `Environment.getTerrainColliderHit()` so visuals and
   collision agree; prefetch along the flight path and bound the LRU cache.

Until step 1 is done, the working reference implementation lives in
`~/fff/tiles-demo/` (outside the repository) and is documented above.

## Data sources and licensing

- Google 3D Tiles via ion: good outside Korea, no Korean building meshes;
  ion logo + Google logo required; no offline caching on Community plan.
- Korean close-range buildings: VWorld / NGII or OSM footprints + heights.
- Global open terrain: AWS Terrarium tiles, no API key, suitable for high-alt LOD.
