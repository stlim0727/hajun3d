# ADR: streamed geospatial tiles for Haeundae / Korea / world

Status: **opt-in runtime layer on a single renderer, anchored at Gimhae for whole-map streaming; open terrain sources still need projection work**.

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

`web/index.html` previously loaded Three.js r128 from a CDN. It now loads a
single local bundle (`web/js/three_core_bundle.js`, mirrored into Flutter assets)
that provides modern Three.js r186, GLTFLoader/GLTFExporter and
`3d-tiles-renderer` to the classic scripts. This removes the CDN dependency and
the earlier dual-renderer warning.

- Build: `npm run build:geo-tiles` (esbuild IIFE, `window.THREE` +
  `window.HajunGeoTiles`).
- `core.js` enables tiles only with `?geoTiles=1&ionToken=<token>`; the tile
  group is added to the game's own scene and updated once per frame, so terrain
  and aircraft share depth.
- Tiles are anchored at Haeundae LCT (`35.1603056, 129.169`) and offset to the
  simulator's local `(-180, 0, -28700)`.
- Ion/Google credit is displayed when ion content is used.

Verified in headless Chrome: one canvas, Three r186, 171 tiles loaded, 0 tile
errors, 0 exceptions, 0 warnings — with and without the tile layer. GLB aircraft
loading still works (`a320`, 12 plane-group children, `TAKEOFF_RUN`).

In-game entry point: **🌊 해운대 상공 비행 (Flying over Haeundae)** in the startup menu
and the mobile scenario menu. `startHaeundaeFlight()` places the aircraft 3 km
south of LCT at 1,200 m, heading north at cruise speed, and enables tiles when a
token is available from `window.GEO_ION_TOKEN` or `localStorage['hajun3d.ionToken']`.
With tiles active, the GLB terrain group is hidden so streamed terrain is not
overlapped by the procedural sea/land; Haeundae landmark GLBs stay visible.

Remaining limitation: the simulator's local layout is not a true geodetic ENU
projection, so only the Haeundae anchor is aligned; whole-Korea alignment needs
a georeferencing pass on the simulator itself.

## Data sources and licensing

- Google 3D Tiles via ion: good outside Korea, no Korean building meshes;
  ion logo + Google logo required; no offline caching on Community plan.
- Korean close-range buildings: VWorld / NGII or OSM footprints + heights.
- Global open terrain: AWS Terrarium tiles are reachable, but their projection scheme does not work with the current ENU reorientation; not shipped.


## Whole-map georeference — Gimhae anchor

The simulator's original layout used a compressed local corridor. It is now
anchored at **Gimhae International Airport (RKPK/PUS), runway 18R/36L 36L
threshold** (`35.165199, 128.938995`, heading `353.9°`). The departure runway is
resized to its real 3,200 m length.

`geo_config.js` carries the anchor, the ion token, and `geoLocalDelta()`, which
maps real lat/lon landmarks into the game's local frame (`+X` right, `-Z`
forward along the runway heading). Haeundae and Incheon landmark groups and
their collision boxes are relocated to their real geodetic offsets. When tiles
are active, the procedural terrain/island/mountain/tree groups are hidden so
streamed terrain covers the whole map without overlap.

Known limit: other procedural scenery along the old corridor is not yet
georeferenced; only Gimhae, Haeundae and Incheon are placed at real coordinates.

Phase 0 frame migration: `web/js/geodesy.js` provides exact WGS84↔ECEF↔ENU and
game-frame transforms, and `geo_config.js` now uses them for `geoLocalDelta()` /
`geoLocalToLatLon()`. `terrain_provider.js` exposes
`createExactFrameTerrariumProvider()`, which converts sim coordinates into the
vendored flat frame before delegating to `flightsim-core`; `core.js` uses it so
tile lookup and flat zones stay aligned with the exact landmark frame. The
vendored bundle itself is untouched.

`web/js/floating_origin.js` adds a camera-rebased double frame: simulation
positions stay JS numbers, `toCameraEnu()` removes the camera ECEF origin, and
`toRenderFloats()` is the only float32 staging step. `core.js` rebases it each
frame and `problem_report.js` records the current origin. Render rebasing is
now coordinated: `scene.position` is translated by `-renderOrigin`, the camera
is offset by the same vector, and the tile layer receives render-relative
copies of `simAnchor`/`focusAnchors` so `HajunGeoTiles.update()` LOD tests stay
in the same frame. Camera modes derive offsets from world `planeGroup.position`
and quaternion instead of the translated `matrixWorld`; the HUD target arrow
subtracts the render origin before `worldToLocal()`.


## Selectable spawn-place picker — retargeted tiles and physics

The start menu and mobile drawer expose **📍 장소 선택 비행 (Select spawn place)**.
It offers the real-airport presets from `airport_indicators.js` plus the Haeundae
landmark. `startAtPlace()` converts the chosen WGS84 point into the current
Gimhae-anchored local frame with `geoLocalDelta()`, spawns airborne above the
preset elevation, then calls `retargetGeo(anchor, { simAnchor })`. That disposes
the old 3D Tiles layer and terrain provider, re-anchors `HajunGeoTiles.create()`
at the selected lat/lon with the aircraft position as `simAnchor`, updates the
active `GEO_ANCHOR`, and creates a frame-aligned provider with no legacy flat
zones. The removed `isGeoPlaceFlyover` escape means terrain colliders now come
from the provider; only the older `isJejuFlyover` exception remains.

Legacy Gimhae/Incheon GLB scenery keeps its original world coordinates; the
70 km far clip keeps it out of view at distant presets. Without an ion token
the picker still falls back to the procedural/sea-floor surface.

## Metric route model

`web/js/route_model.js` derives progress, remaining distance and bearing from
great-circle values in `AirportIndicators`. The legacy RKPK→RKSI arcade corridor
still maps compressed `z` onto the great circle and keeps its mesh endpoints at
`z=-45000`; geo-tile flights use the active exact `GEO_ANCHOR` instead. HUD
distance/bearing, from-destination and landing phase thresholds now read this
model, so raw `z` is only a fallback when the module is unavailable.

## Terrain tile engine

`web/js/tile_engine.js` sits between `terrain_provider.js` and the Terrarium
HTTP source. It bounds RGBA cache bytes (32 MiB default), deduplicates
in-flight tile requests, caps concurrent decodes at four, and orders queued
tiles by distance to the camera tile. `web/tile_decode_worker.js` performs
PNG→RGBA decode off the main thread; if Workers are unavailable or fail, the
browser loader falls back to the original main-thread decode. Both files are
mirrored into the Flutter WebView assets. The vendored `flightsim-core`
provider keeps its own small tile cache and is unchanged.




## Airfield cleanup and flat buildings

With tiles active, the GLB airfield ground island and the merged
terminal/buildings nodes are hidden. Only the runway overlay (marked to the
real 3,200 m Gimhae length), the dedicated control tower and the PAPI/beacon
lights remain; collision boxes for terminal/hangar are removed.

Buildings that appear only as **flat shapes in streamed imagery** are treated as
background: no 3D proxy and no collision. This avoids double geometry over
imagery and keeps the 60 FPS budget. Only named GLB landmarks (LCT, Marine City,
Gwangandaegyo) get 3D geometry and obstacle boxes. If real building geometry is
needed later, use VWorld/NGII 3D building tiles for Korea or OSM footprints with
heights and ODbL attribution, and add them as LOD-gated tiles rather than
per-building meshes.
