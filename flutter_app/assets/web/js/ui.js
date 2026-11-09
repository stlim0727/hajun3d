/**
 * Sky Jet Explorer 3D - PFD Attitude Horizon, Glassmorphism HUD, Gate Modals & Flight Missions
 * Subsystem: ui (21 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  updateGearUI(statusText, stateClass) {
    const gearText = document.getElementById('gear-text');
    const gearBtn = document.getElementById('gear-btn');
    if (gearText) {
      gearText.textContent = `기어 ${statusText}`;
    }
    if (gearBtn) {
      gearBtn.className = `icon-btn glass ${stateClass}`;
    const touchGear = document.getElementById('btn-touch-gear');
    if (touchGear) {
      touchGear.className = `touch-btn mini-action-btn ${stateClass}`;
    }
    const mobGear = document.getElementById('mobile-gear-status');
    if (mobGear) {
      mobGear.textContent = statusText === 'DOWN' ? 'DOWN (전개)' : 'UP (수납)';
    }
    }
  },

  switchAircraft(type) {
    if (!type) return;
    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: '수륙양용 비행기',
      ancestor: '1903 조상 비행기'
    };
    const nameText = names[type] || type.toUpperCase();

    // 모달 버튼 활성화 상태 즉시 업데이트
    document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`select-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    this.currentPlaneType = type;
    this.groundY = (type === 'ancestor') ? 1.65 : 6.84;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.gearPhaseTimer = 0.0;
    this.updateGearUI('DOWN', 'gear-down');

    // ★ 100% 공식 바이너리 GLB 3D 기체 즉시 로드
    this.loadGLBPreset(type);

    const planeNameEl = document.getElementById('plane-name-text');
    if (planeNameEl) planeNameEl.textContent = nameText;
  },

  // ----------------------------------------------------------------
  // 8. UI 초기화 & 시작 모드 바인딩 (활주로 즉시 이륙 vs 게이트 탑승)
  // ----------------------------------------------------------------
  initUI() {
    this.scoreDisplay = document.getElementById('score-display');
    this.phaseDisplay = document.getElementById('flight-phase-display');
    this.paxDisplay = document.getElementById('pax-display');
    this.timeDisplay = document.getElementById('time-display');
    this.speedBar = document.getElementById('speed-bar');
    this.speedVal = document.getElementById('speed-val');
    this.speedTitle = document.getElementById('speed-title');
    this.altBar = document.getElementById('alt-bar');
    this.altVal = document.getElementById('alt-val');
    this.boostBar = document.getElementById('boost-bar');
    this.boostVal = document.getElementById('boost-val');
    this.hullBar = document.getElementById('hull-bar');
    this.hullVal = document.getElementById('hull-val');
    this.popupMsg = document.getElementById('popup-msg');
    this.overlay = document.getElementById('overlay-screen');

    // 플랩, 스포일러, 역추진 버튼 바인딩
    this.flapsBtn = document.getElementById('flaps-btn');
    this.flapsText = document.getElementById('flaps-text');
    this.spoilerBtn = document.getElementById('spoiler-btn');
    this.spoilerText = document.getElementById('spoiler-text');
    this.reverserBtn = document.getElementById('reverser-btn');
    this.reverserText = document.getElementById('reverser-text');

    // 자세계(인공수평의), VSI, 실속 뱃지, GPWS 배너 바인딩
    this.attitudeHorizon = document.getElementById('attitude-horizon');
    this.speedBadge = document.getElementById('speed-status-badge');
    this.vsiVal = document.getElementById('vsi-val');
    this.gpwsBanner = document.getElementById('gpws-banner');
    this.gpwsText = document.getElementById('gpws-text');
    this.gpwsSubtext = document.getElementById('gpws-subtext');
    this.gpwsIcon = document.getElementById('gpws-icon');

    // 승객 하선 액션 컨테이너 및 버튼 바인딩
    this.gateActionContainer = document.getElementById('gate-action-container');
    this.deplaneBtn = document.getElementById('deplane-btn');
    this.deplaneQuickBtn = document.getElementById('deplane-quick-btn');

    this.startBtn = document.getElementById('start-btn');
    this.takeoffDirectBtn = document.getElementById('takeoff-direct-btn');
    this.gearBtn = document.getElementById('gear-btn');
    this.camToggleBtn = document.getElementById('cam-toggle-btn');
    this.camModeText = document.getElementById('cam-mode-text');
    this.soundBtn = document.getElementById('sound-btn');
    this.planeToggleBtn = document.getElementById('plane-toggle-btn');
    this.targetArrow = document.querySelector('.target-indicator .arrow');
    this.targetDist = document.getElementById('target-dist');
    this.emergencyPanel = document.getElementById('emergency-panel');
    this.timeToggleBtn = document.getElementById('time-toggle-btn');
    this.timeModeText = document.getElementById('time-mode-text');
    this.cruiseSpeedBtn = document.getElementById('cruise-speed-btn');
    this.cruiseSpeedText = document.getElementById('cruise-speed-text');
    this.micToggleBtn = document.getElementById('mic-toggle-btn');
    this.engineShutdownBtn = document.getElementById('engine-shutdown-btn');
    this.gateEngineShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
  },

  // ----------------------------------------------------------------
  // 장거리 200km 항로 배속 순항 토글 시스템 (Fast Cruise 1x/2x/4x)
  // ----------------------------------------------------------------
  toggleCruiseSpeed() {
    this.cruiseMultiplier = this.cruiseMultiplier === 1 ? 2 : (this.cruiseMultiplier === 2 ? 4 : 1);
    if (!this.cruiseSpeedText) this.cruiseSpeedText = document.getElementById('cruise-speed-text');
    if (!this.cruiseSpeedBtn) this.cruiseSpeedBtn = document.getElementById('cruise-speed-btn');
    if (this.cruiseSpeedText) {
      this.cruiseSpeedText.textContent = `순항 ${this.cruiseMultiplier}x`;
    }
    if (this.cruiseSpeedBtn) {
      this.cruiseSpeedBtn.className = `icon-btn glass cruise-btn${this.cruiseMultiplier === 2 ? ' fast-2x' : (this.cruiseMultiplier === 4 ? ' fast-4x' : '')}`;
    }
    this.showPopup(this.cruiseMultiplier > 1 
      ? `🚀 [${this.cruiseMultiplier}x 배속 순항 활성화] 200km 대륙 횡단 항로를 ${this.cruiseMultiplier}배 빠른 속도로 순항합니다!`
      : '✈️ [1x 표준 순항 복귀] 일반 속도로 순항합니다.');
  },

  // ----------------------------------------------------------------
  // 낮/밤 시간대 전환 시스템 (Day / Night Switcher)
  // ----------------------------------------------------------------
  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    const isNight = (mode === 'night');

    // 1. 하늘 배경색 및 안개 색상/밀도
    if (this.scene) {
      this.scene.background.setHex(isNight ? 0x050a18 : 0x7ec8e3);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(isNight ? 0x060d1f : 0xa3d5ed);
        this.scene.fog.density = isNight ? 0.000032 : 0.000028;
      }
    }

    // 2. 태양광 & 달빛 조명 조절
    if (this.sunLight) {
      this.sunLight.intensity = isNight ? 0.05 : 1.35;
    }
    if (this.moonLight) {
      this.moonLight.intensity = isNight ? 0.45 : 0.0;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(isNight ? 0x1e293b : 0xffffff);
      this.ambientLight.intensity = isNight ? 0.35 : 0.75;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(isNight ? 0x1e3a8a : 0xdff2fd);
      this.hemiLight.groundColor.setHex(isNight ? 0x020617 : 0x334155);
      this.hemiLight.intensity = isNight ? 0.30 : 0.65;
    }

    // 3. 밤하늘 별무리 (Stars)
    if (this.stars) {
      this.stars.material.opacity = isNight ? 0.95 : 0.0;
    }

    // 4. 바다 재질 야간 색조
    if (this.oceanMaterial) {
      this.oceanMaterial.color.setHex(isNight ? 0x031526 : 0x0284c7);
      this.oceanMaterial.roughness = isNight ? 0.28 : 0.18;
    }

    // 5. 공항 야간 유도등 (Runway & Taxiway Edge Lights)
    const toggleNightGroup = (group) => {
      if (!group) return;
      group.traverse(c => {
        if (c.name === 'airportNightLights') {
          c.visible = isNight;
        }
      });
    };
    toggleNightGroup(this.airportGroup);
    toggleNightGroup(this.destAirportGroup);

    // 6. 비행기 객실 창문 야간 골든 글로우 & 항법등 & 프로시저럴 그래픽 텍스처 업데이트
    if (this.updateFuselageTexture) {
      this.updateFuselageTexture(this.currentPlaneType, isNight);
    }
    if (this.updateWingTexture) {
      this.updateWingTexture(this.currentPlaneType, isNight);
    }
    if (this.cabinWindowMat) {
      if (isNight) {
        this.cabinWindowMat.color.setHex(0xfef08a);
        this.cabinWindowMat.emissive.setHex(0xf59e0b);
        this.cabinWindowMat.emissiveIntensity = 1.35;
      } else {
        this.cabinWindowMat.color.setHex(0x38bdf8);
        this.cabinWindowMat.emissive.setHex(0x0284c7);
        this.cabinWindowMat.emissiveIntensity = 0.4;
      }
    }
    if (this.aircraftNavLights) {
      this.aircraftNavLights.forEach(l => l.visible = isNight);
    }

    // 7. 대륙 고층 아파트 단지 창문 야간 조명 점등
    if (this.cityNightLights) {
      this.cityNightLights.forEach(mat => {
        if (mat.emissive) {
          mat.emissiveIntensity = isNight ? 1.45 : 0.08;
        }
      });
    }

    // 8. UI 버튼 갱신
    if (!this.timeModeText) this.timeModeText = document.getElementById('time-mode-text');
    if (!this.timeToggleBtn) this.timeToggleBtn = document.getElementById('time-toggle-btn');
    if (this.timeModeText) {
      this.timeModeText.textContent = isNight ? '밤' : '낮';
    }
    if (this.timeToggleBtn) {
      this.timeToggleBtn.innerHTML = isNight 
        ? '🌙 <span id="time-mode-text">밤</span>' 
        : '☀️ <span id="time-mode-text">낮</span>';
    }

    this.showPopup(isNight 
      ? '🌙 야간 비행 모드: 밤하늘의 은하수 별빛, 활주로 유도등 및 기체 항법등이 점등되었습니다!' 
      : '☀️ 주간 비행 모드: 맑은 푸른 하늘과 쾌청한 태양광 아래를 비행합니다.');
  },

  toggleTimeOfDay() {
    this.setTimeOfDay(this.timeOfDay === 'day' ? 'night' : 'day');
  },

  // 모드 1: 활주로 즉시 이륙 (Direct Runway Takeoff - 3800m 활주로 중앙 정렬)
  startDirectTakeoff() {
    this.overlay.classList.add('hidden');
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');
    this.hullIntegrity = 100;
    this.passengers = 285;
    this.groundY = (this.currentPlaneType === 'ancestor') ? 1.65 : 6.84;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.gearPhaseTimer = 0.0;
    this.updateGearUI('DOWN', 'gear-down');
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();

    const isFromDest = (this.planeGroup && this.planeGroup.position.z < -25000) || (this.flightPhase === 'MISSION_COMPLETE');
    this.flightPhase = 'TAKEOFF_RUN';
    this.phaseDisplay.textContent = isFromDest ? '대륙 활주로 이륙 활주' : '활주로 이륙 활주 (Takeoff)';

    this.buildAircraft(this.currentPlaneType);
    const startZ = isFromDest ? -43600 : 1400;
    this.planeGroup.position.set(160, this.groundY, startZ);
    this.yaw = 0.0;
    this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.planeGroup.visible = true;

    // 즉시 출력을 85%로 올려 가속 및 플랩 1(이륙 플랩) 설정
    this.throttle = 0.85;
    this.n1 = 85.0;
    if (typeof this.syncTouchThrottleUI === 'function') this.syncTouchThrottleUI(0.85);
    this.targetN1 = 85.0;
    this.flapIndex = 1; // 이륙 기본 플랩 1 (Takeoff Flaps 1)
    this.spoilerExtended = false;
    this.reverseThrustActive = false;
    this.groundSpeed = 50.0; // ~180 km/h 활주 초기 가속 속도
    this.velocity.set(0, 0, -50.0);
    this.speed = this.velocity.length() / 77.777;
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.showPopup(isFromDest 
      ? '🛫 대륙 3,800m 메가 활주로 정렬! (플랩 1 전개 완료) 속도 200km/h 도달 시 ↓ 아래 화살표를 당겨 이륙하세요!' 
      : '🛫 3,800m 초대형 활주로 정렬! (플랩 1 전개 완료) 속도 200km/h 도달 시 ↓ 아래 화살표를 당겨 이륙하세요!');
    this.startJetSound();
  },

  // 모드 2: 게이트 탑승 & 유도로 주행 (Full Gate Departure - 1번 게이트 정지선)
  startGateDeparture() {
    this.overlay.classList.add('hidden');
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');
    this.hullIntegrity = 100;
    this.passengers = 285;
    this.groundY = (this.currentPlaneType === 'ancestor') ? 1.65 : 6.84;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.gearPhaseTimer = 0.0;
    this.updateGearUI('DOWN', 'gear-down');
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();

    const isFromDest = (this.planeGroup && this.planeGroup.position.z < -25000) || (this.flightPhase === 'MISSION_COMPLETE');
    this.flightPhase = 'TAXI_OUT';
    this.phaseDisplay.textContent = isFromDest ? '대륙 공항 유도로 주행' : '유도로 주행 (Taxiway)';

    this.buildAircraft(this.currentPlaneType);
    const startZ = isFromDest ? -45000 : 0;
    this.planeGroup.position.set(-155, this.groundY, startZ);
    this.yaw = Math.PI / 2;
    this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.planeGroup.visible = true;

    this.throttle = 0.2;
    this.n1 = 20.0; // 아이들 20%
    this.targetN1 = 20.0;
    this.flapIndex = 0; // 플랩 UP
    this.spoilerExtended = false;
    this.reverseThrustActive = false;
    this.groundSpeed = 0.0;
    this.velocity.set(0, 0, 0);
    this.speed = 0.0;
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.showPopup(isFromDest 
      ? '📢 새 승객 285명 탑승 완료! 다음 비행 임무를 시작합니다. 0~9 키로 출력을 올려 이동하세요.' 
      : '📢 승객 285명 탑승 완료! 0~9 키로 출력을 올려 유도로(황색선)로 이동하세요.');
    this.startJetSound();
  },

  toggleCamera() {
    this.cameraMode = this.cameraMode === '3rd' ? '1st' : '3rd';
    this.camModeText.textContent = this.cameraMode === '3rd' ? '3인칭' : '1인칭';
    this.showPopup(this.cameraMode === '3rd' ? '3인칭 후방 시점' : '1인칭 조종석 시점');
  },

  showPopup(text) {
    this.popupMsg.textContent = text;
    this.popupMsg.classList.add('show');
    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => {
      this.popupMsg.classList.remove('show');
    }, 1800);
  },

  updateFlapsUI() {
    if (this.flapsText) this.flapsText.textContent = `플랩 ${this.flaps[this.flapIndex]}`;
    if (this.flapsBtn) {
      if (this.flapIndex > 0) this.flapsBtn.classList.add('flaps-active');
      else this.flapsBtn.classList.remove('flaps-active');
    }
  },

  updateSpoilerUI() {
    if (this.spoilerText) this.spoilerText.textContent = this.spoilerExtended ? '스포일러 EXT' : '스포일러 RET';
    if (this.spoilerBtn) {
      if (this.spoilerExtended) this.spoilerBtn.classList.add('spoiler-extended');
      else this.spoilerBtn.classList.remove('spoiler-extended');
    }
  },

  updateReverserUI() {
    if (this.reverserText) this.reverserText.textContent = this.reverseThrustActive ? '역추진 ACTIVE' : '역추진 OFF';
    if (this.reverserBtn) {
      if (this.reverseThrustActive) this.reverserBtn.classList.add('reverser-active');
      else this.reverserBtn.classList.remove('reverser-active');
    }
  },

  // ----------------------------------------------------------------
  // 12. HUD 계기판 수치 갱신 (Layout Reflow 최적화)
  // ----------------------------------------------------------------
  updateHUD() {
    // 1. 자세계 (인공수평의 PFD) 갱신: 매 프레임 즉각 회전
    if (this.attitudeHorizon) {
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
      const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
      const bankAngle = Math.asin(bankTilt); // 우측 롤 시 음수 rad
      const pitchPixels = Math.max(-28, Math.min(28, forwardVec.y * 50));
      this.attitudeHorizon.style.transform = `rotate(${bankAngle}rad) translateY(${pitchPixels}px)`;
    }

    // 2. DOM 텍스트 및 게이지 바: 2프레임에 1회 갱신 (브라우저 Layout Reflow/끊김 제거)
    this.hudFrameCount = (this.hudFrameCount || 0) + 1;
    if (this.hudFrameCount % 2 !== 0) return;

    const specs = this.getAircraftSpecs(this.currentPlaneType);
    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
    const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
    const bankAngle = Math.abs(Math.asin(bankTilt));
    const loadFactorG = 1.0 / Math.max(0.35, Math.cos(bankAngle));
    const flapMult = [1.0, 0.88, 0.78, 0.68][this.flapIndex] || 1.0;
    const dynamicVStall = Math.round(specs.vStallCleanKmh * flapMult * Math.sqrt(loadFactorG) + (this.gearExtended ? 8 : 0));

    if (this.speedTitle) {
      this.speedTitle.textContent = `SPEED (V_stall: ${dynamicVStall} km/h)`;
    }

    const kmh = Math.round(this.speed * 280);
    const knots = Math.round(kmh / 1.852);
    this.speedVal.textContent = this.isOnGround ? `${kmh} km/h (${knots} kt) [지상 주행]` : `${kmh} km/h (${knots} kt) [비행 IAS]`;
    const speedPercent = Math.min(100, Math.round((kmh / 800) * 100));
    this.speedBar.style.width = `${speedPercent}%`;

    const altitude = Math.max(0, Math.round((this.planeGroup.position.y - this.groundY) * 10));
    const altFt = Math.round(altitude * 3.28084);
    this.altVal.textContent = this.isOnGround ? `0 m (0 ft) [지상]` : `${altitude} m (${altFt} ft) [QNH]`;
    const altPercent = Math.min(100, Math.round((altitude / 2500) * 100));
    this.altBar.style.width = `${altPercent}%`;

    // 2. 수직 승강계 (VSI) 갱신
    if (this.vsiVal) {
      const vsi = (this.verticalSpeed * 10).toFixed(1);
      const vsiFpm = Math.round(this.verticalSpeed * 10 * 196.85);
      this.vsiVal.textContent = (this.verticalSpeed >= 0 ? '+' : '') + vsi + ' m/s (' + (vsiFpm >= 0 ? '+' : '') + vsiFpm + ' fpm)';
      if (this.verticalSpeed < -0.8) {
        this.vsiVal.style.color = '#ef4444'; // 위험 강하
      } else if (this.verticalSpeed < -0.5) {
        this.vsiVal.style.color = '#f59e0b'; // 주의 강하
      } else {
        this.vsiVal.style.color = '#38bdf8'; // 정상
      }
    }

    // 3. 속도계 실속(Stall) 상태 뱃지
    if (this.speedBadge) {
      if (this.isStalling) {
        this.speedBadge.textContent = 'STALL!';
        this.speedBadge.className = 'badge-status stall';
      } else if (kmh < dynamicVStall + 15 && !this.isOnGround) {
        this.speedBadge.textContent = 'CAUTION';
        this.speedBadge.className = 'badge-status stall';
      } else {
        this.speedBadge.textContent = 'NORMAL';
        this.speedBadge.className = 'badge-status normal';
      }
    }

        if (!this.isTouchThrottleActive && typeof this.syncTouchThrottleUI === 'function') {
      if (this._lastSyncedThrottle !== this.throttle) {
        this._lastSyncedThrottle = this.throttle;
        this.syncTouchThrottleUI(this.throttle);
      }
    }
    const n1Val = Math.round(this.n1);
    const thrPercent = Math.round(this.throttle * 100);
    const revTag = this.reverseThrustActive ? ' [REV]' : '';
    this.boostVal.textContent = `N1: ${n1Val}% (레버 ${thrPercent}%)${revTag}`;
    this.boostBar.style.width = `${n1Val}%`;

    this.hullVal.textContent = `${this.hullIntegrity}% ${this.isNoseDented ? '(기수 찌그러짐)' : (this.isGearCollapsed ? '(기어 파손)' : '(정상)')}`;
    this.hullBar.style.width = `${this.hullIntegrity}%`;
    if (this.hullIntegrity < 40) {
      this.hullBar.className = 'gauge-bar-fill hull-fill danger';
    } else if (this.hullIntegrity < 75) {
      this.hullBar.className = 'gauge-bar-fill hull-fill warning';
    } else {
      this.hullBar.className = 'gauge-bar-fill hull-fill';
    }

    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.paxDisplay) this.paxDisplay.textContent = `${this.passengers}명`;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    this.timeDisplay.textContent = `${m}:${s}`;

    let targetPos = new THREE.Vector3(160, this.groundY, 0);
    let targetLabel = '활주로 36L';

    if (this.flightPhase === 'TAXI_OUT') {
      targetPos = new THREE.Vector3(160, this.groundY, 800);
      targetLabel = '이륙 활주로 36L (150m)';
    } else if (this.flightPhase === 'CLIMB_CRUISE' || this.flightPhase === 'TAKEOFF_RUN') {
      targetPos = new THREE.Vector3(160, this.groundY, -45000);
      // Z = 0 (출발지) ~ Z = -45,000 (인천공항 메인 활주로 16R) 구간을 200.0km 장거리 항로로 정밀 비례 매핑
      const zProgress = Math.min(1.0, Math.max(0, -this.planeGroup.position.z / 45000));
      const remKm = (200.0 * (1.0 - zProgress)).toFixed(1);

      if (zProgress > 0.96) {
        const distM = Math.round(this.planeGroup.position.distanceTo(targetPos) * 2);
        targetLabel = `인천국제공항 16R 착륙 활주로 (${distM}m)`;
      } else {
        const speedTag = (this.cruiseMultiplier > 1) ? ` [${this.cruiseMultiplier}x 배속순항]` : '';
        targetLabel = `인천국제공항 16R (${remKm}km)${speedTag}`;
      }
    } else if (this.flightPhase === 'TAXI_IN' || this.flightPhase === 'DEPLANING' || this.flightPhase === 'MISSION_COMPLETE') {
      targetPos = new THREE.Vector3(-330, this.groundY, -45000);
      const gateDistM = Math.round(this.planeGroup.position.distanceTo(targetPos) * 2);
      targetLabel = `인천공항 T1 탑승교 1번 게이트 (${gateDistM}m)`;
    }
    this.targetDist.textContent = targetLabel;

    const localVec = targetPos.clone();
    this.planeGroup.worldToLocal(localVec);
    const angle = Math.atan2(localVec.x, -localVec.z);
    this.targetArrow.style.transform = `rotate(${angle}rad)`;
  },

  // ----------------------------------------------------------------
  // 14. 탑승교 도킹, 엔진 정지(Engine Shutdown) 및 승객 하선(Deplaning) 시스템
  // ----------------------------------------------------------------
  showGateActionPrompt(visible) {
    if (this.gateActionContainer) {
      if (visible) {
        this.gateActionContainer.classList.remove('hidden');

        // 도킹 및 엔진 상태 갱신
        const dockBadge = document.getElementById('jetway-dock-status');
        if (dockBadge) {
          if (this.isJetwayDocked) {
            dockBadge.textContent = '도킹 완료 (L1 Door 연결)';
            dockBadge.className = 'status-val dock-complete';
          } else {
            dockBadge.textContent = '스윙 회전 연결 중...';
            dockBadge.className = 'status-val dock-transit';
          }
        }

        const engBadge = document.getElementById('gate-engine-status');
        const engShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
        const deplaneBtn = document.getElementById('deplane-btn');

        if (engBadge) {
          if (this.isEngineOff) {
            engBadge.textContent = '완전 정지 (OFF)';
            engBadge.className = 'status-val engine-off';
            if (engShutdownBtn) engShutdownBtn.classList.add('hidden');
            if (deplaneBtn) deplaneBtn.classList.remove('hidden');
          } else {
            engBadge.textContent = '가동 중 (ON)';
            engBadge.className = 'status-val engine-running';
            if (engShutdownBtn) engShutdownBtn.classList.remove('hidden');
            if (deplaneBtn) deplaneBtn.classList.add('hidden');
          }
        }
      } else {
        this.gateActionContainer.classList.add('hidden');
      }
    }
    if (this.deplaneQuickBtn) {
      if (visible && this.isEngineOff && this.isJetwayDocked) {
        this.deplaneQuickBtn.classList.remove('hidden');
      } else {
        this.deplaneQuickBtn.classList.add('hidden');
      }
    }
  },

  // 엔진 정지 (Shutdown Engines)
  shutdownEngines() {
    this.isEngineOff = true;
    this.throttle = 0;
    this.stopJetSound();
    this.playCautionChime();

    // 상단 HUD 버튼 갱신
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 OFF';
    if (engBtn) {
      engBtn.classList.add('engine-off-btn');
      engBtn.title = '엔진 시동 (단축키 E)';
    }

    // 게이트 상태창 갱신
    const gateEngStatus = document.getElementById('gate-engine-status');
    if (gateEngStatus) {
      gateEngStatus.textContent = '완전 정지 (OFF)';
      gateEngStatus.className = 'status-val engine-off';
    }

    const gateShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (gateShutdownBtn) gateShutdownBtn.classList.add('hidden');

    const deplaneBtn = document.getElementById('deplane-btn');
    if (deplaneBtn) deplaneBtn.classList.remove('hidden');

    const deplaneQuickBtn = document.getElementById('deplane-quick-btn');
    if (deplaneQuickBtn) deplaneQuickBtn.classList.remove('hidden');

    this.showPopup('🔴 엔진 셧다운 완료! 터보팬 회전이 멈추고 제트 전원이 차단되었습니다.');
    this.triggerPassengerReaction('engine_shutdown');

    // 탑승교가 도킹되어 있는 상태라면 1.2초 후 자동으로 승객 하선 시작
    if (this.isJetwayDocked && this.flightPhase !== 'DEPLANING' && this.flightPhase !== 'MISSION_COMPLETE') {
      setTimeout(() => {
        if (this.isEngineOff && this.isJetwayDocked && this.flightPhase !== 'DEPLANING') {
          this.startDeplaning();
        }
      }, 1200);
    }
  },

  // 엔진 재시동
  startEngines() {
    this.isEngineOff = false;
    this.throttle = 0.1;
    if (this.soundEnabled) this.startJetSound();
    this.playCautionChime();

    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) {
      engBtn.classList.remove('engine-off-btn');
      engBtn.title = '엔진 정지 (단축키 E)';
    }

    const gateEngStatus = document.getElementById('gate-engine-status');
    if (gateEngStatus) {
      gateEngStatus.textContent = '가동 중 (ON)';
      gateEngStatus.className = 'status-val engine-running';
    }

    const gateShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (gateShutdownBtn) gateShutdownBtn.classList.remove('hidden');

    this.showPopup('🟢 엔진 시동 완료 (Engine Start)! 스로틀을 올려 택싱 및 이륙할 수 있습니다.');
  },

  toggleEngineShutdown() {
    if (this.isEngineOff) {
      this.startEngines();
    } else {
      this.shutdownEngines();
    }
  },

  startDeplaning() {
    this.showGateActionPrompt(false);
    this.dockAtDestinationGate();
  },

  dockAtDestinationGate() {
    if (this.flightPhase === 'DEPLANING' || this.flightPhase === 'MISSION_COMPLETE') return;

    // 만약 탑승교가 아직 연결 중이면 대기
    if (!this.isJetwayDocked) {
      this.showPopup('⏳ 탑승교가 비행기 도어로 회전 연결 중입니다. 잠시만 기다려주세요!');
      this.showGateActionPrompt(true);
      return;
    }

    // 만약 엔진이 아직 꺼지지 않았으면 대기
    if (!this.isEngineOff) {
      this.showPopup('⚠️ 위험! 엔진이 가동 중입니다. 먼저 엔진을 끄세요 (E 키 또는 빨간 엔진 정지 버튼)!');
      this.showGateActionPrompt(true);
      return;
    }

    this.flightPhase = 'DEPLANING';
    this.showGateActionPrompt(false);
    this.phaseDisplay.textContent = '게이트 1번 도킹 (승객 하기 중)';
    this.speed = 0;
    this.throttle = 0;
    this.stopJetSound();
    this.playCautionChime();
    this.showPopup('🚪 게이트 1번 탑승교 연결 완료! 엔진 정지 확인. 승객 285명이 하선(Deplaning) 중입니다.');
    this.triggerPassengerReaction('deplaning');

    // 승객 하선 애니메이션 카운트다운
    let remainingPax = this.passengers;
    const deplaneInterval = setInterval(() => {
      remainingPax = Math.max(0, remainingPax - 45);
      this.passengers = remainingPax;
      if (this.paxDisplay) this.paxDisplay.textContent = `${this.passengers}명 (하기 중)`;
      if (remainingPax <= 0) {
        clearInterval(deplaneInterval);
        this.completeFlightMission();
      }
    }, 320);
  },

  completeFlightMission() {
    this.flightPhase = 'MISSION_COMPLETE';
    this.phaseDisplay.textContent = '비행 임무 완수 (Mission Complete)';
    this.score += 2000; // 정시 안전 도착 보너스
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.paxDisplay) this.paxDisplay.textContent = '0명 (하선 완료)';
    this.playTouchdownScreech();

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: '수륙양용 비행기',
      ancestor: '1903 조상 비행기'
    };
    const planeName = names[this.currentPlaneType] || '항공기';

    setTimeout(() => {
      const modalTitle = document.getElementById('modal-title');
      const modalDesc = document.getElementById('modal-desc');
      if (modalTitle && modalDesc) {
        modalTitle.textContent = '🏆 FLIGHT MISSION COMPLETED';
        modalDesc.innerHTML = `
          <div style="text-align:left; background:rgba(15,23,42,0.65); padding:14px; border-radius:10px; border:1px solid rgba(56,189,248,0.3); margin-bottom:12px;">
            <div style="font-size:16px; font-weight:800; color:#38bdf8; margin-bottom:8px;">🛫 대륙 횡단 비행 임무 성공!</div>
            <div style="font-size:13px; color:#e2e8f0; line-height:1.7;">
              • <strong>운항 노선:</strong> 하준 해상 국제공항 (RKSI) ➔ 인천국제공항 (Incheon Int'l Airport Hub) [200km 대륙 횡단 정기편]<br>
              • <strong>운항 기종:</strong> ${planeName}<br>
              • <strong>비행 시간:</strong> ${m}분 ${s}초<br>
              • <strong>승객 수송:</strong> <span style="color:#10b981; font-weight:700;">285명 전원 안전 하선 완료 (만족도 100%)</span><br>
              • <strong>최종 운항 점수:</strong> <span style="color:#f59e0b; font-weight:800;">${this.score}점</span> (+2,000점 정시 도착 보너스 포함)
            </div>
          </div>
          <div style="font-size:13px; color:#94a3b8; line-height:1.6;">
            승객들이 탑승교를 통해 모두 터미널로 들어갔습니다.<br>
            새로운 승객 탑승 및 기체 정비를 마치고 <strong>다음 비행 임무</strong>를 시작하세요!
          </div>
        `;
        if (this.startBtn) this.startBtn.textContent = '🛫 다음 비행 임무 준비하기 (새 승객 285명 탑승)';
        if (this.takeoffDirectBtn) this.takeoffDirectBtn.textContent = '대륙 활주로에서 즉시 이륙하기 🛫';
        this.overlay.classList.remove('hidden');
      }
    }, 600);
  }

  });
})();

