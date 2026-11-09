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

window.switchPlane = function(type) {
  // 1. 모달 버튼 활성화 상태 즉시 업데이트 (UI 즉각 100% 반응)
  document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`select-${type}`);
  if (activeBtn) activeBtn.classList.add('active');

  // 2. 게임 기체 모델 전환
  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      window.airplaneGame.switchAircraft(type);
    }
  } catch (err) {
    console.error('switchPlane error:', err);
  }
};

window.nextPlane = function() {
  if (!debounceAction('nextPlane', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    const aircraftTypes = ['dc10', 'md80', 'a320', 'b747', 'concorde', 'amphibian', 'ancestor'];
    const curIdx = aircraftTypes.indexOf(window.airplaneGame.currentPlaneType);
    const nextIdx = (curIdx + 1) % aircraftTypes.length;
    window.airplaneGame.switchAircraft(aircraftTypes[nextIdx]);
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
      window.airplaneGame.startGateDeparture();
    }
  } catch (err) {
    console.error('startGateDeparture error:', err);
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

window.toggleSound = function() {
  if (!debounceAction('toggleSound', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.soundEnabled = !window.airplaneGame.soundEnabled;
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
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
  }
};

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
    }
  }
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
