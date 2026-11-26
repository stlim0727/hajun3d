import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiSource = fs.readFileSync(path.resolve(__dirname, '../web/js/ui.js'), 'utf8');

function createHarness({ retargetResult = true } = {}) {
  const retargetCalls = [];
  const airborneCalls = [];
  const popups = [];
  const defaultAnchor = { lat: 35.165199279785156, lon: 128.93899536132812, headingDeg: 353.9, height: 33.25 };

  function AirplaneGame() {}
  const win = {
    GEO_ION_TOKEN: retargetResult ? 'test-ion-token' : '',
    DEFAULT_GEO_ANCHOR: { ...defaultAnchor },
    GEO_ANCHOR: { ...defaultAnchor },
    GEO_SIM_ANCHOR: { x: 160, z: 0 },
    AirportIndicators: {
      byIcao: {
        RKSI: { icao: 'RKSI', name: '인천국제공항', lat: 37.469, lon: 126.451, elevationM: 7 }
      }
    },
    Geodesy: {
      wgs84ToGame(lat, lon, anchor) {
        if (Math.abs(anchor.lat - defaultAnchor.lat) < 0.01) {
          return { x: -191327, z: -278113 };
        }
        return { x: 0, z: 0 };
      }
    }
  };

  const sandbox = {
    window: win,
    document: { getElementById() { return null; } },
    localStorage: { getItem() { return ''; } },
    AirplaneGame,
    console,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Date
  };
  vm.runInNewContext(uiSource, sandbox);

  const game = new AirplaneGame();
  Object.assign(game, {
    overlay: { classList: { add() {} } },
    selectedDestinationIcao: 'RKSI',
    defaultGeoAnchor: { ...defaultAnchor },
    geoAnchor: { ...defaultAnchor },
    geoIonToken: retargetResult ? 'test-ion-token' : '',
    geoLayer: retargetResult ? { active: true } : null,
    getSelectedPlace() { return null; },
    retargetGeo(anchor, options) {
      retargetCalls.push({ anchor, options });
      if (!retargetResult) return false;
      Object.assign(this.geoAnchor, anchor);
      Object.assign(win.GEO_ANCHOR, anchor);
      return true;
    },
    startAirbornePhase(phase, label, options) {
      airborneCalls.push({ phase, label, options });
    },
    showPopup(msg) {
      popups.push(msg);
    }
  });

  return { game, retargetCalls, airborneCalls, popups, defaultAnchor };
}

test('startApproachPhase re-anchors 3D tiles to destination airport to avoid Earth-curvature drop', () => {
  const { game, retargetCalls, airborneCalls, defaultAnchor } = createHarness({ retargetResult: true });

  game.startApproachPhase();
  assert.equal(retargetCalls.length, 1);
  assert.equal(retargetCalls[0].anchor.lat, 37.469);
  assert.equal(retargetCalls[0].anchor.lon, 126.451);
  assert.equal(retargetCalls[0].anchor.height, 7);
  assert.deepEqual({ ...retargetCalls[0].options.simAnchor }, { x: -191327, y: 0, z: -278113 });
  assert.equal(airborneCalls.length, 1);
  assert.equal(airborneCalls[0].phase, 'FINAL_APPROACH');
  assert.deepEqual({ ...airborneCalls[0].options }, {
    x: -191327,
    y: 457,
    z: -273113,
    gearDown: true,
    flapIndex: 3
  });

  // Calling startApproachPhase a second time keeps the anchor away from legacy Gimhae (0, 0).
  game.startApproachPhase();
  assert.equal(retargetCalls.length, 2);
  assert.deepEqual({ ...retargetCalls[1].options.simAnchor }, { x: -191327, y: 0, z: -278113 });

  // Switching back to cruise restores the default Gimhae geo anchor.
  game.startCruisePhase();
  assert.equal(retargetCalls.length, 3);
  assert.equal(retargetCalls[2].anchor.lat, defaultAnchor.lat);
  assert.equal(retargetCalls[2].anchor.lon, defaultAnchor.lon);
});

test('startApproachPhase falls back to compressed RKSI corridor when 3D tiles are unavailable', () => {
  const { game, airborneCalls } = createHarness({ retargetResult: false });

  game.startApproachPhase();
  assert.equal(airborneCalls.length, 1);
  assert.deepEqual({ ...airborneCalls[0].options }, {
    x: 160,
    y: 457,
    z: -40000,
    gearDown: true,
    flapIndex: 3
  });
});
