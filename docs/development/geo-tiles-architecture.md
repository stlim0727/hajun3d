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

Phase 0 foundation: `web/js/geodesy.js` provides exact WGS84↔ECEF↔ENU and
game-frame transforms with round-trip tests. `geo_config.js` still uses the
legacy flat-Earth approximation for `geoLocalDelta()` on purpose: the vendored
`flightsim-core` terrain provider uses the same approximation, so changing only
the landmark helper would move Incheon by ~4.8 km relative to provider terrain.
Migrate the helper, provider anchor frame and tile datum together.

## Selectable spawn-place picker — interim scope and next step

The start menu and mobile drawer now expose **📍 장소 선택 비행 (Select spawn place)**.
It offers the real-airport presets from `airport_indicators.js` plus the Haeundae
landmark, converts the chosen WGS84 point into the **existing Gimhae-anchored**
local frame with `geoLocalDelta()`, and spawns airborne at ~900 m above the preset elevation. No tile or
terrain-provider re-anchoring happens: the 3D Tiles layer and terrain datum stay
fixed at Gimhae, so distant presets have reduced positional accuracy and may fall
back to the procedural/sea-floor surface when tiles are unavailable.

**Next step (deferred):** true arbitrary-place spawning requires a runtime
`retargetGeo(anchor)` — dispose/recreate `HajunGeoTiles.create()` around the
selected lat/lon, recreate the terrain provider with spawn-relative flat zones,
generalize `geoLocalDelta()`/`geoLocalToLatLon()` to the active anchor, replace
the `isGeoPlaceFlyover` collision escape with full provider-backed ground
queries, and hide legacy Gimhae/Incheon GLB scenery outside the old corridor.
Until then this picker is a preset-only stopgap.


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
