/**
 * Sky Jet Explorer 3D - Global Action Dispatcher & Bootstrap Controller
 * Handles DOM buttons, keyboard debouncing, and game lifecycle initialization.
 */

// 전역 헬퍼 함수 및 디바운스 보호 시스템 (모든 버튼 광클 및 이중 발화 100% 원천 차단)
const _actionDebounceTimers = {};
function debounceAction(actionKey, delayMs = 180) {
  const now = Date.now();
  if (_actionDebounceTimers[actionKey] && (now - _actionDebounceTimers[actionKey] < delayMs)) {
    return false; // 광클 또는 중복 발화 무시
  }
  _actionDebounceTimers[actionKey] = now;
  return true;
}

window.syncLobbySelectors = function(type) {
  const planeSelect = document.getElementById('plane-select');
  if (planeSelect && type && planeSelect.value !== type) planeSelect.value = type;
  const skinSelect = document.getElementById('skin-select');
  const skin = window.airplaneGame && typeof window.airplaneGame.getActiveAirlineSkin === 'function'
    ? window.airplaneGame.getActiveAirlineSkin() : null;
  if (skinSelect && skin && skinSelect.value !== skin.id) skinSelect.value = skin.id;
};

window.switchPlane = function(type) {
  if (!type) return;
  // 로비에서는 상태만 변경하고, GLB 로드는 비행 시작 시 buildAircraft에서 수행
  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      window.airplaneGame.switchAircraft(type, { deferLoad: true });
      window.syncLobbySelectors(type);
    }
  } catch (err) {
    console.error('switchPlane error:', err);
  }
};


window.setAirlineSkin = function(id) {
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.setAirlineSkin === 'function') {
    window.airplaneGame.setAirlineSkin(id);
  }
  window.syncLobbySelectors();
};


window.nextPlane = function() {
  if (!debounceAction('nextPlane', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    const aircraftTypes = ['dc10', 'md80', 'a320', 'a350', 'b747', 'concorde', 'amphibian', 'ancestor'];
    const curIdx = aircraftTypes.indexOf(window.airplaneGame.currentPlaneType);
    const nextIdx = (curIdx + 1) % aircraftTypes.length;
    window.airplaneGame.switchAircraft(aircraftTypes[nextIdx]);
    window.syncLobbySelectors(aircraftTypes[nextIdx]);
  }
};

window.startDirectTakeoff = function() {
  // 모달 즉시 닫기
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      if (window.airplaneGame.gyroEnabled && !window.airplaneGame.gyroActive && typeof window.airplaneGame.enableGyro === 'function') {
        window.airplaneGame.enableGyro(true);
      }
      window.airplaneGame.startDirectTakeoff();
    }
  } catch (err) {
    console.error('startDirectTakeoff error:', err);
  }
};

window.startGateDeparture = function() {
  // 모달 즉시 닫기
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      if (window.airplaneGame.gyroEnabled && !window.airplaneGame.gyroActive && typeof window.airplaneGame.enableGyro === 'function') {
        window.airplaneGame.enableGyro(true);
      }
      window.airplaneGame.startGateDeparture();
    }
  } catch (err) {
    console.error('startGateDeparture error:', err);
  }
};


window.startHaeundaeFlight = function() {
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      if (window.airplaneGame.gyroEnabled && !window.airplaneGame.gyroActive && typeof window.airplaneGame.enableGyro === 'function') {
        window.airplaneGame.enableGyro(true);
      }
      window.airplaneGame.startHaeundaeFlight();
    }
  } catch (err) {
    console.error('startHaeundaeFlight error:', err);
  }
};

window.startJejuFlyover = function() {
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      if (window.airplaneGame.gyroEnabled && !window.airplaneGame.gyroActive && typeof window.airplaneGame.enableGyro === 'function') {
        window.airplaneGame.enableGyro(true);
      }
      window.airplaneGame.startJejuFlyover();
    }
  } catch (err) {
    console.error('startJejuFlyover error:', err);
  }
};

window.openPlacePicker = function() {
  if (!window.airplaneGame) initGame();
  const panel = document.getElementById('place-picker-panel');
  if (panel) panel.classList.remove('hidden');
};

window.closePlacePicker = function() {
  const panel = document.getElementById('place-picker-panel');
  if (panel) panel.classList.add('hidden');
};

window.startAtSelectedPlace = function() {
  const panel = document.getElementById('place-picker-panel');
  if (panel) panel.classList.add('hidden');
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame && typeof window.airplaneGame.startAtPlace === 'function') {
      if (window.airplaneGame.gyroEnabled && !window.airplaneGame.gyroActive && typeof window.airplaneGame.enableGyro === 'function') {
        window.airplaneGame.enableGyro(true);
      }
      window.airplaneGame.startAtPlace(
        typeof window.airplaneGame.getSelectedPlace === 'function' ? window.airplaneGame.getSelectedPlace() : null
      );
    }
  } catch (err) {
    console.error('startAtSelectedPlace error:', err);
  }
};

window.downloadProblemReport = function() {
  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame && typeof window.airplaneGame.downloadProblemReport === 'function') {
      window.airplaneGame.downloadProblemReport();
    }
  } catch (err) {
    console.error('Problem report error:', err);
  }
};

window.toggleEmergencyPanel = function() {
  if (!debounceAction('toggleEmergencyPanel', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleEmergencyPanel();
  } else {
    const p = document.getElementById('emergency-panel');
    if (p) p.classList.toggle('hidden');
  }
};

window.triggerEmergency = function(type) {
  if (!debounceAction('triggerEmergency', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.triggerEmergency(type);
  }
};

window.startDeplaning = function() {
  if (!debounceAction('startDeplaning', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.startDeplaning();
  }
};

window.toggleTimeOfDay = function() {
  if (!debounceAction('toggleTimeOfDay', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleTimeOfDay();
  }
};

window.toggleLandingGear = function() {
  if (!debounceAction('toggleLandingGear', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleLandingGear();
  }
};

window.toggleFlaps = function() {
  if (!debounceAction('toggleFlaps', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleFlaps();
  }
};

window.toggleSpoilers = function() {
  if (!debounceAction('toggleSpoilers', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleSpoilers();
  }
};

window.toggleReverseThrust = function() {
  if (!debounceAction('toggleReverseThrust', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleReverseThrust();
  }
};

window.toggleCruiseSpeed = function() {
  if (!debounceAction('toggleCruiseSpeed', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleCruiseSpeed();
  }
};

window.toggleMicrophone = function() {
  if (!debounceAction('toggleMicrophone', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleMicrophone();
  }
};

window.toggleCamera = function() {
  if (!debounceAction('toggleCamera', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleCamera();
  }
};

window.setCameraMode = function(mode) {
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.setCameraMode(mode);
    window.airplaneGame.toggleCameraMenu(true);
  }
};

window.setDestinationAirport = function(icao) {
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.setDestinationAirport === 'function') {
    window.airplaneGame.setDestinationAirport(icao);
  }
};

window.toggleCameraMenu = function() {
  if (!debounceAction('toggleCameraMenu', 140)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleCameraMenu();
  }
};

window.toggleEffectMenu = function() {
  if (!debounceAction('toggleEffectMenu', 140)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.toggleEffectMenu === 'function') {
    window.airplaneGame.toggleEffectMenu();
  }
};

window.setSpeedEffectIntensityPercent = function(percent, announce = false) {
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.setSpeedEffectIntensity === 'function') {
    const val = Math.min(100, Math.max(0, Number(percent) || 0)) / 100;
    window.airplaneGame.setSpeedEffectIntensity(val, { announce: Boolean(announce) });
  }
};

window.resetCameraLook = function() {
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.resetCameraLook === 'function') {
    window.airplaneGame.resetCameraLook();
  }
};

window.toggleGyroTilt = function() {
  if (!debounceAction('toggleGyroTilt', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.toggleGyroTilt === 'function') {
    window.airplaneGame.toggleGyroTilt(true);
  }
};

window.recenterGyro = function() {
  if (!debounceAction('recenterGyro', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame && typeof window.airplaneGame.recenterGyro === 'function') {
    window.airplaneGame.recenterGyro();
  }
};

window.toggleSound = function() {
  if (!debounceAction('toggleSound', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    if (typeof window.airplaneGame.toggleSound === 'function') {
      window.airplaneGame.toggleSound();
    } else {
      window.airplaneGame.soundEnabled = !window.airplaneGame.soundEnabled;
    }
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
      soundBtn.textContent = window.airplaneGame.soundEnabled ? '🔊' : '🔇';
    }
    if (window.airplaneGame.showPopup) {
      window.airplaneGame.showPopup(window.airplaneGame.soundEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF');
    }
  }
};

window.openHelp = function() {
  const help = document.getElementById('help-screen');
  if (help) {
    help.style.display = 'flex';
    help.classList.remove('hidden');
  }
};

window.closeHelp = function() {
  const help = document.getElementById('help-screen');
  if (help) {
    help.classList.add('hidden');
    help.style.display = 'none';
  }
};

window.openLobby = function() {
  window.closeHelp();
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
  }
};

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') window.closeHelp();
});


window.toggleFullscreen = function() {
  if (!debounceAction('toggleFullscreen', 250)) return;
  try {
    const doc = document;
    const activeEl = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
    if (activeEl) {
      const exitFn = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (typeof exitFn === 'function') {
        const result = exitFn.call(doc);
        if (result && typeof result.catch === 'function') result.catch(function() {});
      }
    } else {
      const el = doc.documentElement;
      const requestFn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (typeof requestFn === 'function') {
        const result = requestFn.call(el);
        if (result && typeof result.catch === 'function') result.catch(function() {});
      }
    }
  } catch (err) {
    console.warn('toggleFullscreen error:', err);
  }
};

function syncFullscreenButton() {
  const btn = document.getElementById('fullscreen-btn');
  if (!btn) return;
  const doc = document;
  const isFullscreen = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
  btn.classList.toggle('active', isFullscreen);
  const label = document.getElementById('fullscreen-text');
  if (label) label.textContent = isFullscreen ? '화면 종료' : '전체 화면';
}

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function(evt) {
  document.addEventListener(evt, syncFullscreenButton);
});

window.speakCaptainPreset = function(phrase) {
  if (!debounceAction('speakCaptainPreset', 300)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    const paBanner = document.getElementById('pa-broadcast-banner');
    if (paBanner && paBanner.classList.contains('hidden')) {
      paBanner.classList.remove('hidden');
    }
    window.airplaneGame.playPAChime();
    window.airplaneGame.handleCaptainSpeechAI(phrase);
  }
};

window.toggleEngineShutdown = function() {
  if (!debounceAction('toggleEngineShutdown', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleEngineShutdown();
  }
};

window.shutdownEngines = function() {
  if (!debounceAction('shutdownEngines', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.shutdownEngines();
  }
};

// -------------------------------------------------------------
// GLB 3D Pipeline Global UI Handlers
// -------------------------------------------------------------
window.closeGLBMenu = function() {
  const modal = document.getElementById('glb-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.toggleGLBMenu = function() {
  const modal = document.getElementById('glb-modal');
  if (modal) {
    const isHidden = modal.classList.contains('hidden') || modal.style.display === 'none';
    if (isHidden) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
    } else {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
};

window.openGLBViewer = function(modelId) {
  const query = modelId ? `?model=${encodeURIComponent(modelId)}` : '';
  window.location.href = `glb-viewer.html${query}`;
};

window.triggerGLBFileSelect = function(targetType = 'plane') {
  window.glbSelectTargetType = targetType;
  const input = document.getElementById('glb-file-input');
  if (input) {
    input.click();
  }
};

window.handleGLBFileSelect = function(event) {
  const file = event.target.files && event.target.files[0];
  if (file && window.airplaneGame) {
    window.airplaneGame.loadGLBFile(file, file.name, window.glbSelectTargetType || 'plane');
    window.closeGLBMenu();
    const overlay = document.getElementById('overlay-screen');
    if (overlay) overlay.style.display = 'none';
  }
  event.target.value = '';
};

window.loadGLBPreset = function(type) {
  if (window.airplaneGame) {
    window.airplaneGame.loadGLBPreset(type);
    window.syncLobbySelectors(type);
  }
  window.closeGLBMenu();
};

window.exportCurrentPlaneToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportCurrentPlaneToGLB();
  }
};

window.exportAirportToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportAirportToGLB();
  }
};

window.exportIncheonAirportToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportIncheonAirportToGLB();
  }
};

window.exportTerrainToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportTerrainToGLB();
  }
};

window.exportCityBeachToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportCityBeachToGLB();
  }
};

window.exportFullWorldToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportFullWorldToGLB();
  }
};

window.reloadGLBPlane = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.reloadGLBPlane();
  }
};

// -------------------------------------------------------------
// HOTAS 1 & Airbus Sidestick Global UI Handlers
// -------------------------------------------------------------
window.toggleHOTASModal = function() {
  const modal = document.getElementById('hotas-modal');
  if (modal) {
    const isHidden = modal.classList.contains('hidden') || modal.style.display === 'none';
    if (isHidden) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
      if (window.airplaneGame) window.airplaneGame.updateHOTASModalUI();
    } else {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
};

window.closeHOTASModal = function() {
  const modal = document.getElementById('hotas-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.toggleHOTASAxisMode = function() {
  if (window.airplaneGame) {
    window.airplaneGame.toggleHOTASAxisMode();
  }
};

window.toggleHOTASThrottleInvert = function() {
  if (window.airplaneGame) {
    window.airplaneGame.toggleHOTASThrottleInvert();
  }
};

window.calibrateHOTAS = function() {
  if (window.airplaneGame) {
    window.airplaneGame.calibrateHOTAS();
  }
};

window.toggleTwistRudder = function() {
  if (window.airplaneGame) {
    window.airplaneGame.toggleTwistRudder();
  }
};

// 브라우저 및 웹뷰(Flutter) 즉각 로딩 및 버튼 먹통 방지 초기화

window.toggleMobileMenu = function() {
  const m = document.getElementById('mobile-menu-modal');
  if (m) {
    m.classList.toggle('hidden');
    if (!m.classList.contains('hidden') && window.airplaneGame) {
      const planeMap = {
        'a320': 'A320 제트기', 'b747': 'B747-400 점보', 'dc10': 'DC-10 삼발기',
        'md80': 'MD-80 쌍발기', 'concorde': '콩코드 초음속기', 'amphibian': '수륙양용기', 'ancestor': '1903 조상 비행기'
      };
      const curPlane = window.airplaneGame.currentPlaneType || 'a320';
      const pName = document.getElementById('mobile-plane-name');
      if (pName) pName.textContent = planeMap[curPlane] || curPlane.toUpperCase();

      const gStat = document.getElementById('mobile-gear-status');
      if (gStat) gStat.textContent = window.airplaneGame.gearExtended ? 'DOWN (전개)' : 'UP (수납)';

      const fStat = document.getElementById('mobile-flaps-status');
      if (fStat) {
        const flapNames = ['UP (0°)', '1 (15°)', '2 (25°)', 'FULL (40°)'];
        fStat.textContent = flapNames[window.airplaneGame.flapIndex || 0] || 'UP';
      }

      const spStat = document.getElementById('mobile-spoiler-status');
      if (spStat) spStat.textContent = window.airplaneGame.spoilerExtended ? 'EXT (전개)' : 'RET (수납)';

      const revStat = document.getElementById('mobile-reverser-status');
      if (revStat) revStat.textContent = window.airplaneGame.reverseThrustActive ? 'ON (역추진)' : 'OFF';

      const engStat = document.getElementById('mobile-engine-status');
      if (engStat) engStat.textContent = window.airplaneGame.isEngineOff ? 'OFF (정지)' : 'ON (가동)';

      const gyroStat = document.getElementById('mobile-gyro-status');
      if (gyroStat) gyroStat.textContent = window.airplaneGame.gyroActive ? 'ON (737 감도)' : 'OFF';
    }
  }
};

// Deep link from terrainprovider.html: spawn at a WGS84 point and preset the look direction.
const GEO_LOOK_PRESETS = {
  forward: { yaw: 0, pitch: -0.06 },
  right: { yaw: -Math.PI / 2, pitch: -0.06 },
  back: { yaw: Math.PI, pitch: -0.06 },
  left: { yaw: Math.PI / 2, pitch: -0.06 },
  up: { yaw: 0, pitch: 0.85 },
  down: { yaw: 0, pitch: -0.85 }
};

window.startGeoInspectFlight = function (options) {
  const o = options || {};
  const lat = Number(o.lat);
  const lon = Number(o.lon);
  const alt = Number(o.alt);
  if (![lat, lon].every(Number.isFinite)) return false;

  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  if (!window.airplaneGame) initGame();
  const game = window.airplaneGame;
  if (!game || typeof game.startAtPlace !== 'function') return false;

  game.startAtPlace({ id: 'geo-inspect', name: 'Geo inspection', lat, lon, elevationM: 0 });
  if (Number.isFinite(alt) && alt >= 0 && game.planeGroup) {
    game.planeGroup.position.y = alt;
    game.verticalSpeed = 0;
    if (typeof game.resetFlight3dPhysics === 'function') game.resetFlight3dPhysics();
  }

  const look = o.look || 'forward';
  if (look === 'orbit') {
    game.setCameraMode('drone');
  } else {
    game.setCameraMode('1st');
    const preset = GEO_LOOK_PRESETS[look] || GEO_LOOK_PRESETS.forward;
    const cs = typeof game.ensureCameraState === 'function' ? game.ensureCameraState() : game.cameraState;
    if (cs) {
      cs.lookYaw = preset.yaw;
      cs.lookPitch = preset.pitch;
    }
  }
  return true;
};

function initGame() {
  if (!window.airplaneGame) {
    try {
      window.airplaneGame = new AirplaneGame();
    } catch (err) {
      console.error('AirplaneGame init error:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
window.addEventListener('load', initGame);
(function autoStartGeoInspect() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('flyHere') !== '1' || !params.has('geoLat') || !params.has('geoLon')) return;
  const flight = {
    lat: Number(params.get('geoLat')),
    lon: Number(params.get('geoLon')),
    alt: Number(params.get('flyAlt')),
    look: params.get('look') || 'forward'
  };
  requestAnimationFrame(() => window.startGeoInspectFlight(flight));
})();
