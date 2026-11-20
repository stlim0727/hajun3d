# ADR: streamed geospatial tiles for Haeundae / Korea / world

Status: **opt-in runtime layer integrated; open terrain sources still need projection work**.

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

`web/index.html` still uses classic scripts with a global Three.js r128, while
`3d-tiles-renderer` requires modern ESM Three.js. Rather than migrating the whole
game renderer, the streamed tiles render in a second, transparent-backed WebGL
layer underneath the game canvas:

- `scripts/geo_tiles_overlay_source.js` → bundled to `web/js/geo_tiles_bundle.js`
  via `npm run build:geo-tiles` (also mirrored into `flutter_app/assets/web/js/`).
- `core.js` enables it only with `?geoTiles=1&ionToken=<token>`. Default and
  `file://` WebView playback are unchanged (one canvas, no network).
- Camera pose is copied from the game camera each frame; the tileset is anchored
  at Haeundae LCT (`35.1603056, 129.169`) and offset to the simulator's local
  position `(-180, 0, -28700)`.
- The ion/Google credit overlay is displayed when ion content is used.

Verified in headless Chrome: 171 tiles loaded, 0 tile errors, 0 page exceptions,
2 canvases. Default path: 1 canvas, no geo layer. Known limitation: two Three.js
instances produce a console warning, and terrain cannot depth-occlude the game
aircraft because the contexts are separate.

## Data sources and licensing

- Google 3D Tiles via ion: good outside Korea, no Korean building meshes;
  ion logo + Google logo required; no offline caching on Community plan.
- Korean close-range buildings: VWorld / NGII or OSM footprints + heights.
- Global open terrain: AWS Terrarium tiles are reachable, but their projection scheme does not work with the current ENU reorientation; not shipped.
