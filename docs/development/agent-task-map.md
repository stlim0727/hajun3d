# Hajun Plane 3D Task Map

Use this table to start a bounded investigation; `PROJECT_CONTEXT.md` provides broad
system context, while the modular subsystem files define actual runtime behavior.
**Never read the entire project at once; read only the target subsystem module.**

| Task / Domain | Implementation to read first | Verification & Tests |
| :--- | :--- | :--- |
| **1. Game loop & Three.js Core** | `web/js/core.js`; `web/game.js`; `web/index.html` | `npm run check`; browser render inspection |
| **2. Aircraft Specs & Physics Config** | `web/js/config.js` | `tests/aircraftSpecs.test.js`; `npm test` |
| **3. Aerodynamics, Engines & Gear Physics** | `web/js/physics.js` | `npm run check`; flight test (takeoff, stall, touchdown) |
| **4. Web Audio Engine & EGPWS Sound** | `web/js/audio.js` | `npm run check`; audio playback in browser |
| **5. Lighting, Sky, PAPI & Environment** | `web/js/environment.js` | `npm run check`; day/night toggle check (`N` key) |
| **6. Airports, 36L Runway & GSE Vehicles** | `web/js/airports.js` | `npm run check`; gate docking & taxi check |
| **7. Procedural Aircraft Builder & Liveries** | `web/js/aircraft_builder.js` | `npm run check`; model switch in browser |
| **8. Binary GLB Loader & Pipeline** | `web/js/glb_pipeline.js`; `web/glb_bundle.js` | `npm run check`; zero-CORS local load verification |
| **9. Contrails, Smoke & Crash Effects** | `web/js/effects.js` | `npm run check`; emergency crash / smoke visual check |
| **10. Controls: Keyboard, Mobile Joystick & HOTAS** | `web/js/input.js` | `npm run check`; mobile touch & stick calibration |
| **11. In-flight Emergencies & Heroic Landing** | `web/js/emergency.js` | `npm run check`; trigger emergency scenarios |
| **12. Passenger AI Speech & Cockpit Radio** | `web/js/speech.js`; `scripts/build-gemini-departure-radio.mjs` | `npm run audio:check`; mic / STT response check |
| **13. Glassmorphism HUD & PFD Instruments** | `web/js/ui.js`; `web/style.css`; `web/index.html` | `npm run check`; responsive HUD UI verification |
| **14. Flutter Mobile WebView App** | `flutter_app/`; `flutter_app/assets/web/` | `flutter analyze`; mobile webview test |
| **15. CI / CD & Tooling Scripts** | `.github/workflows/ci.yml`; `scripts/check-*.mjs`; `scripts/agent-workflow.mjs` | `npm run check`; `npm test` |
| **16. PR Self-Feedback** | `.agents/skills/hajun-pr-feedback/`; `.github/workflows/pr-feedback.yml`; `scripts/pr-feedback.mjs` | `tests/prFeedback.test.js`; `npm test` |
| **17. Departure Radio Audio Synthesis** | `scripts/build-gemini-departure-radio.mjs`; `.github/workflows/generate-departure-audio.yml` | `npm run audio:check` |
