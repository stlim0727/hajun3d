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

  setTakeoffPhaseLabel(text) {
    if (!this.takeoffPhaseLabel && this.takeoffDirectBtn) {
      this.takeoffPhaseLabel = this.takeoffDirectBtn.querySelector('.phase-label');
    }
    if (this.takeoffPhaseLabel) this.takeoffPhaseLabel.textContent = text;
  },

  switchAircraft(type, options) {
    if (!type) return;
    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      a320_detailed: 'A320-200 실물 고정밀',
      a320_simplified: 'A320-200 경량 최적화',
      a350: 'A350-900 XWB',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: 'CL-215 수륙양용기',
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

    // 로비 선택은 상태만 갱신하고, GLB 로드는 비행 시작 시 buildAircraft에서 수행
    if (!(options && options.deferLoad)) this.loadGLBPreset(type);

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

    // 자세계(인공수평의), 헤딩, VSI, 실속 뱃지, GPWS 배너 바인딩
    this.attitudeHorizon = document.getElementById('attitude-horizon');
    this.headingVal = document.getElementById('heading-val');
    this.headingCardinal = document.getElementById('heading-cardinal');
    this.hudTopHeading = document.getElementById('hud-top-heading');
    this.destinationSelect = document.getElementById('destination-select');
    this.selectedDestinationIcao = this.selectedDestinationIcao || 'RKSI';
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
    this.takeoffPhaseLabel = this.takeoffDirectBtn && this.takeoffDirectBtn.querySelector('.phase-label');
    this.gearBtn = document.getElementById('gear-btn');
    this.camToggleBtn = document.getElementById('cam-toggle-btn');
    this.camModeText = document.getElementById('cam-mode-text');
    this.soundBtn = document.getElementById('sound-btn');
    this.planeToggleBtn = document.getElementById('plane-toggle-btn');
    this.targetArrow = document.querySelector('.target-indicator .arrow');
    this.targetDist = document.getElementById('target-dist');
    this.airportIndicatorRows = [];
    const airportRows = document.getElementById('airport-indicator-rows');
    if (airportRows && window.AirportIndicators) {
      for (const airport of window.AirportIndicators.airports) {
        const row = document.createElement('div');
        row.className = 'airport-indicator-row';
        row.title = `${airport.name} · ${airport.runways.join(' / ')} · TWR ${airport.towerMHz} MHz · ELV ${airport.elevationM} m`;
        const code = document.createElement('span');
        code.className = 'apt-code';
        code.textContent = airport.icao;
        const name = document.createElement('span');
        name.textContent = `${airport.iata} ${airport.short}`;
        const dist = document.createElement('span');
        dist.className = 'apt-dist';
        const brg = document.createElement('span');
        brg.className = 'apt-brg';
        row.append(code, name, dist, brg);
        row.addEventListener('click', () => {
          this.setDestinationAirport(airport.icao);
        });
        airportRows.appendChild(row);
        this.airportIndicatorRows.push({ icao: airport.icao, airport, row, dist, brg });
      }
    }
    if (this.destinationSelect && this.selectedDestinationIcao) {
      this.destinationSelect.value = this.selectedDestinationIcao;
    }
    this.emergencyPanel = document.getElementById('emergency-panel');
    this.timeToggleBtn = document.getElementById('time-toggle-btn');
    this.timeModeText = document.getElementById('time-mode-text');
    this.cruiseSpeedBtn = document.getElementById('cruise-speed-btn');
    this.cruiseSpeedText = document.getElementById('cruise-speed-text');
    this.micToggleBtn = document.getElementById('mic-toggle-btn');
    this.engineShutdownBtn = document.getElementById('engine-shutdown-btn');
    this.gateEngineShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (this.getActiveAirlineSkin) {
      const activeSkin = this.getActiveAirlineSkin();
      document.querySelectorAll('.skin-choice-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset && btn.dataset.skin === activeSkin.id);
      });
    }
    this.placePickerPanel = document.getElementById('place-picker-panel');
    this.placeSelect = document.getElementById('place-select');
    this.placeCoords = document.getElementById('place-coords');
    if (this.placeSelect) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '기본 공항 선택 (Gimhae)';
      placeholder.selected = true;
      this.placeSelect.appendChild(placeholder);
      for (const preset of this.getPlacePresets()) {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        option.dataset.lat = String(preset.lat);
        option.dataset.lon = String(preset.lon);
        option.dataset.elev = String(preset.elevationM || 0);
        this.placeSelect.appendChild(option);
      }
      this.placeSelect.addEventListener('change', () => this.updateSelectedPlaceReadout());
      this.updateSelectedPlaceReadout();
    }
    this.updateSpeedEffectUI();
  },

  // ----------------------------------------------------------------
  // 장거리 340km 항로 배속 순항 토글 시스템 (Fast Cruise 1x/2x/4x)
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
    const nav = typeof window !== 'undefined' ? window.AirportIndicators : null;
    const routeKm = nav ? Math.round(nav.routeDistanceKm) : 340;
    this.showPopup(this.cruiseMultiplier > 1
      ? `🚀 [${this.cruiseMultiplier}x 배속 순항 활성화] ${routeKm}km 대륙 횡단 항로를 ${this.cruiseMultiplier}배 빠른 속도로 순항합니다!`
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
      if (this.scene.background) this.scene.background.setHex(isNight ? 0x050a18 : 0x7ec8e3);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(isNight ? 0x060d1f : 0xa3d5ed);
        this.scene.fog.density = isNight ? 0.000032 : 0.000028;
      }
    }

    // 2. 태양광 & 달빛 조명 조절 (주간 쨍한 직사광 + 난반사 억제)
    if (this.sunLight) {
      this.sunLight.intensity = isNight ? 0.05 : 2.15;
    }
    if (this.moonLight) {
      this.moonLight.intensity = isNight ? 0.45 : 0.0;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(isNight ? 0x1e293b : 0xffffff);
      this.ambientLight.intensity = isNight ? 0.35 : 0.28;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(isNight ? 0x1e3a8a : 0xdff2fd);
      this.hemiLight.groundColor.setHex(isNight ? 0x020617 : 0x1e293b);
      this.hemiLight.intensity = isNight ? 0.30 : 0.38;
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
    toggleNightGroup(this.jejuAirportGroup);

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

  // 모드 1: 활주로 즉시 이륙 (Direct Runway Takeoff - 김해 3200m 활주로 중앙 정렬)
  startDirectTakeoff() {
    this.overlay.classList.add('hidden');
    // If a place is selected from the place selector, start airborne at that place
    if (this.placeSelect && this.placeSelect.selectedOptions && this.placeSelect.selectedOptions.length > 0) {
      const option = this.placeSelect.selectedOptions[0];
      const lat = Number(option.dataset.lat);
      const lon = Number(option.dataset.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        this.startAtPlace({
          id: option.value,
          name: option.textContent || option.value,
          lat,
          lon,
          elevationM: Number(option.dataset.elev) || 0
        });
        return;
      }
    }
    if (this.defaultGeoAnchor && (this.geoAnchor.lat !== this.defaultGeoAnchor.lat || this.geoAnchor.lon !== this.defaultGeoAnchor.lon)) {
      if (typeof this.retargetGeo === 'function' && (this.geoLayer || this.geoIonToken)) {
        this.retargetGeo(this.defaultGeoAnchor, {
          simAnchor: { x: 160, y: 0, z: 1600 },
          flatZones: [
            { minX: -900, maxX: 900, minZ: -2600, maxZ: 2600, height: 0, blendMargin: 500 },
            { minX: -2400, maxX: 2200, minZ: -49500, maxZ: -40500, height: 0, blendMargin: 1400 }
          ]
        });
      } else {
        Object.assign(this.geoAnchor, this.defaultGeoAnchor);
        if (window.GEO_ANCHOR) Object.assign(window.GEO_ANCHOR, this.defaultGeoAnchor);
        if (window.GEO_SIM_ANCHOR) {
          window.GEO_SIM_ANCHOR.x = 160;
          window.GEO_SIM_ANCHOR.z = 0;
        }
      }
    }
    this.isJejuFlyover = false;
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    if (typeof this.resetPartialDamageState === 'function') {
      this.resetPartialDamageState();
    }
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    if (typeof this.resetTailstrikeState === 'function') this.resetTailstrikeState();
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

    const isFromDest = (typeof window !== 'undefined' && window.RouteModel && this.planeGroup)
      ? window.RouteModel.isFromDestination(this.selectedDestinationIcao || 'RKSI', this.planeGroup.position.x, this.planeGroup.position.z, !this.geoLayer)
      : ((this.planeGroup && this.planeGroup.position.z < -25000) || (this.flightPhase === 'MISSION_COMPLETE'));
    this.flightPhase = 'TAKEOFF_RUN';
    this.phaseDisplay.textContent = isFromDest ? '대륙 활주로 이륙 활주' : '활주로 이륙 활주 (Takeoff)';

    this.buildAircraft(this.currentPlaneType);
    const startZ = isFromDest ? -43600 : 1400;
    this.planeGroup.position.set(160, this.groundY, startZ);
    this.yaw = 0.0;
    this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.planeGroup.visible = true;

    // 즉시 TOGA 100% 이륙 출력으로 올려 최대 가속 및 플랩 1(이륙 플랩) 설정
    this.throttle = 1.0;
    this.n1 = 92.0;
    if (typeof this.syncTouchThrottleUI === 'function') this.syncTouchThrottleUI(1.0);
    this.targetN1 = 100.0;
    this.flapIndex = 1; // 이륙 기본 플랩 1 (Takeoff Flaps 1)
    this.spoilerExtended = false;
    this.reverseThrustActive = false;
    this.groundSpeed = 0.0; // 정지 상태(0 km/h)에서 이륙 활주 시작
    this.velocity.set(0, 0, 0);
    this.speed = 0.0;
    if (typeof this.resetFlight3dPhysics === 'function') this.resetFlight3dPhysics();
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.showPopup(isFromDest
      ? '🛫 대륙 3,800m 메가 활주로 정렬! (플랩 1 전개 완료) 속도 200km/h 도달 시 ↓ 아래 화살표를 당겨 이륙하세요!'
      : '🛫 3,800m 초대형 활주로 정렬! (플랩 1 전개 완료) 속도 200km/h 도달 시 ↓ 아래 화살표를 당겨 이륙하세요!');
    this.startJetSound();
  },
  // Lobby phase action: runway takeoff (legacy name kept for URL hooks).
  startTakeoffPhase() {
    this.startDirectTakeoff();
  },

  // 모드 2: 게이트 탑승 & 유도로 주행 (Full Gate Departure - 1번 게이트 정지선)
  startGateDeparture() {
    this.overlay.classList.add('hidden');
    // If a place is selected from the place selector, start airborne at that place
    if (this.placeSelect && this.placeSelect.selectedOptions && this.placeSelect.selectedOptions.length > 0) {
      const option = this.placeSelect.selectedOptions[0];
      const lat = Number(option.dataset.lat);
      const lon = Number(option.dataset.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        this.startAtPlace({
          id: option.value,
          name: option.textContent || option.value,
          lat,
          lon,
          elevationM: Number(option.dataset.elev) || 0
        });
        return;
      }
    }
    if (this.defaultGeoAnchor && (this.geoAnchor.lat !== this.defaultGeoAnchor.lat || this.geoAnchor.lon !== this.defaultGeoAnchor.lon)) {
      if (typeof this.retargetGeo === 'function' && (this.geoLayer || this.geoIonToken)) {
        this.retargetGeo(this.defaultGeoAnchor, {
          simAnchor: { x: 160, y: 0, z: 1600 },
          flatZones: [
            { minX: -900, maxX: 900, minZ: -2600, maxZ: 2600, height: 0, blendMargin: 500 },
            { minX: -2400, maxX: 2200, minZ: -49500, maxZ: -40500, height: 0, blendMargin: 1400 }
          ]
        });
      } else {
        Object.assign(this.geoAnchor, this.defaultGeoAnchor);
        if (window.GEO_ANCHOR) Object.assign(window.GEO_ANCHOR, this.defaultGeoAnchor);
        if (window.GEO_SIM_ANCHOR) {
          window.GEO_SIM_ANCHOR.x = 160;
          window.GEO_SIM_ANCHOR.z = 0;
        }
      }
    }
    this.isJejuFlyover = false;
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    if (typeof this.resetPartialDamageState === 'function') {
      this.resetPartialDamageState();
    }
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    if (typeof this.resetTailstrikeState === 'function') this.resetTailstrikeState();
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

    const isFromDest = (typeof window !== 'undefined' && window.RouteModel && this.planeGroup)
      ? window.RouteModel.isFromDestination(this.selectedDestinationIcao || 'RKSI', this.planeGroup.position.x, this.planeGroup.position.z, !this.geoLayer)
      : ((this.planeGroup && this.planeGroup.position.z < -25000) || (this.flightPhase === 'MISSION_COMPLETE'));
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
    if (typeof this.resetFlight3dPhysics === 'function') this.resetFlight3dPhysics();
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.showPopup(isFromDest 
      ? '📢 새 승객 285명 탑승 완료! 다음 비행 임무를 시작합니다. 0~9 키로 출력을 올려 이동하세요.' 
      : '📢 승객 285명 탑승 완료! 0~9 키로 출력을 올려 유도로(황색선)로 이동하세요.');
    this.startJetSound();
  },
  // 로비 페이즈 시작: 상공 순항 (Selected destination or place)
  startCruisePhase() {
    const place = typeof this.getSelectedPlace === 'function' ? this.getSelectedPlace() : null;
    if (place) {
      this.startAtPlace(place);
      return;
    }
    this.overlay.classList.add('hidden');
    this.startAirbornePhase('CLIMB_CRUISE', '상공 순항 비행 (Cruise)');
    const dest = (window.AirportIndicators && window.AirportIndicators.byIcao && window.AirportIndicators.byIcao[this.selectedDestinationIcao])
      || (window.AirportIndicators && window.AirportIndicators.destination);
    this.showPopup(dest
      ? `✈️ ${dest.name} 방향 순항 비행 시작! 목적지까지 항법 유도선을 따르세요.`
      : '✈️ 상공 순항 비행 시작! 항법 유도선을 따라 목적지로 향하세요.');
  },

  // 로비 페이즈 시작: 착륙 접근 (Selected destination or place, 5 km final)
  startApproachPhase() {
    this.overlay.classList.add('hidden');
    const place = typeof this.getSelectedPlace === 'function' ? this.getSelectedPlace() : null;
    const nav = typeof window !== 'undefined' ? window.AirportIndicators : null;
    const icao = this.selectedDestinationIcao || 'RKSI';
    const airport = (nav && nav.byIcao && nav.byIcao[icao]) || (nav && nav.destination);
    const targetLat = place ? place.lat : (airport ? airport.lat : 37.4690);
    const targetLon = place ? place.lon : (airport ? airport.lon : 126.4510);
    const target = (typeof window !== 'undefined' && typeof window.geoLocalDelta === 'function')
      ? window.geoLocalDelta({ lat: targetLat, lon: targetLon, old: { x: 0, z: 0 } }).local
      : { x: 160, z: -45000 };
    this.startAirbornePhase('FINAL_APPROACH', '착륙 접근 (Final Approach)', {
      x: target.x,
      y: 450 + (place ? (Number(place.elevationM) || 0) : ((airport && airport.elevationM) || 0)),
      z: target.z + 5000,
      gearDown: true,
      flapIndex: 3
    });
    this.showPopup(place
      ? `🛬 ${place.name} 착륙 접근 시작! 기어·플랩 FULL 전개, 활주로 정렬 후 접지하세요.`
      : `🛬 ${airport ? airport.name : '목적지'} 착륙 접근 시작! 기어·플랩 FULL 전개, 활주로 정렬 후 접지하세요.`);
  },

  // Shared reset for airborne lobby starts (cruise / final approach).
  startAirbornePhase(phase, label, options) {
    const opts = options || {};
    this.isJejuFlyover = false;
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    if (typeof this.resetPartialDamageState === 'function') this.resetPartialDamageState();
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    if (typeof this.resetTailstrikeState === 'function') this.resetTailstrikeState();
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');
    this.hullIntegrity = 100;
    this.passengers = 285;
    this.gearExtended = opts.gearDown === true;
    this.gearPhase = this.gearExtended ? 'DOWN' : 'UP';
    this.gearPhaseTimer = 0.0;
    if (typeof this.updateGearUI === 'function') this.updateGearUI(this.gearPhase, this.gearPhase === 'DOWN' ? 'gear-down' : 'gear-up');
    this.flapIndex = opts.flapIndex || 0;
    this.spoilerExtended = false;
    this.reverseThrustActive = false;
    this.buildAircraft(this.currentPlaneType);
    const spawn = (typeof window !== 'undefined' && window.GEO_SIM_ANCHOR) || { x: 160, z: 0 };
    this.setupAirborneCruiseState(
      Number.isFinite(opts.x) ? opts.x : spawn.x,
      Number.isFinite(opts.y) ? opts.y : 1100,
      Number.isFinite(opts.z) ? opts.z : -15000
    );
    if (opts.gearDown) this.velocity.set(0, -12, -85);
    this.flightPhase = phase;
    this.phaseDisplay.textContent = label;
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();
    if (this.cameraState) this.cameraState.chaseTargetInitialized = false;
    if (typeof this.resetFlight3dPhysics === 'function') this.resetFlight3dPhysics();
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.startJetSound();
  },

  setupAirborneCruiseState(posX, posY, posZ) {
    const type = (this.currentPlaneType || 'a320').toLowerCase();
    const isSmallProp = (type === 'ancestor' || type === 'c172');
    const isAmphibian = (type === 'amphibian' || type === 'cl215');
    const cruiseSpeedMs = isSmallProp ? 55 : (isAmphibian ? 75 : 118);
    const cruisePitchRad = isSmallProp ? 0.05 : (isAmphibian ? 0.09 : 0.078);
    const cruiseTrimDeg = isSmallProp ? 2.0 : (isAmphibian ? 6.0 : 4.0);
    const cruiseThrottle = isSmallProp ? 0.70 : (isAmphibian ? 0.65 : 0.58);
    const cruiseN1 = isSmallProp ? 75.0 : (isAmphibian ? 72.0 : 70.0);

    this.throttle = cruiseThrottle;
    this.n1 = cruiseN1;
    this.targetN1 = cruiseN1;
    if (typeof this.syncTouchThrottleUI === 'function') this.syncTouchThrottleUI(cruiseThrottle);

    this.planeGroup.position.set(posX, posY, posZ);
    this.yaw = 0;
    this.pitch = cruisePitchRad;
    this.roll = 0;
    this.pitchTrim = cruiseTrimDeg;

    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    this.planeGroup.quaternion.copy(qYaw).multiply(qPitch);
    this.planeGroup.visible = true;

    this.velocity.set(0, 0, -cruiseSpeedMs);
    this.speed = cruiseSpeedMs / 77.777;
    this.groundSpeed = cruiseSpeedMs;
    this.verticalSpeed = 0;
    this.isOnGround = false;
  },

  // 시나리오: 해운대 상공 비행 (Haeundae overhead flight)
  startHaeundaeFlight() {
    this.overlay.classList.add('hidden');
    this.isJejuFlyover = false;
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    if (typeof this.resetPartialDamageState === 'function') this.resetPartialDamageState();
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    if (typeof this.resetTailstrikeState === 'function') this.resetTailstrikeState();
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;

    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');

    this.hullIntegrity = 100;
    this.passengers = 285;
    this.gearExtended = false;
    this.gearPhase = 'UP';
    this.gearPhaseTimer = 0.0;
    if (typeof this.updateGearUI === 'function') this.updateGearUI('UP', 'gear-up');
    this.flapIndex = 0;
    this.spoilerExtended = false;
    this.reverseThrustActive = false;

    this.buildAircraft(this.currentPlaneType);
    // Haeundae LCT in the Gimhae-anchored frame; start 800 m south over the sea.
    const haeundae = window.geoLocalDelta
      ? window.geoLocalDelta(window.GEO_POINTS.haeundae).local
      : { x: -180, z: -28700 };
    this.setupAirborneCruiseState(haeundae.x, 1100, haeundae.z + 800);
    this.flightPhase = 'CLIMB_CRUISE';
    this.phaseDisplay.textContent = '해운대 상공 비행 (Haeundae)';
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();
    if (this.cameraState) this.cameraState.chaseTargetInitialized = false;
    if (typeof this.resetFlight3dPhysics === 'function') this.resetFlight3dPhysics();
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();

    let token = '';
    if (typeof window !== 'undefined') {
      token = window.GEO_ION_TOKEN || '';
      try { token = token || localStorage.getItem('hajun3d.ionToken') || ''; } catch (_) { /* storage disabled */ }
    }
    const tilesOn = typeof this.enableGeoTiles === 'function' && this.enableGeoTiles(token);
    this.showPopup(tilesOn
      ? '🌊 해운대 상공 비행 시작! 실제 스트리밍 지형이 표시됩니다. (Flying over Haeundae)'
      : '🌊 해운대 상공 비행 시작! 이 빌드에는 지형 토큰이 없어 기존 절차적 경관이 표시됩니다. (Flying over Haeundae)');
    this.startJetSound();
  },

  // 시나리오: 제주공항 상공 비행 (Flying over Jeju Airport)
  startJejuFlyover() {
    this.overlay.classList.add('hidden');
    this.showGateActionPrompt(false);
    this.isJejuFlyover = true;
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    if (typeof this.resetPartialDamageState === 'function') this.resetPartialDamageState();
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    if (typeof this.resetTailstrikeState === 'function') this.resetTailstrikeState();
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;

    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');

    this.hullIntegrity = 100;
    this.passengers = 285;
    this.gearExtended = false;
    this.gearPhase = 'UP';
    this.gearPhaseTimer = 0.0;
    if (typeof this.updateGearUI === 'function') this.updateGearUI('UP', 'gear-up');
    this.flapIndex = 0;
    this.spoilerExtended = false;
    this.reverseThrustActive = false;

    this.buildAircraft(this.currentPlaneType);
    const jeju = this.getJejuLocalPosition();
    this.setupAirborneCruiseState(jeju.x, 1100, jeju.z + 4200);
    this.flightPhase = 'CLIMB_CRUISE';
    this.phaseDisplay.textContent = '제주공항 상공 비행 (Jeju Flyover)';
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();
    if (this.cameraState) this.cameraState.chaseTargetInitialized = false;
    if (typeof this.resetFlight3dPhysics === 'function') this.resetFlight3dPhysics();
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();

    let token = '';
    if (typeof window !== 'undefined') {
      token = window.GEO_ION_TOKEN || '';
      try { token = token || localStorage.getItem('hajun3d.ionToken') || ''; } catch (_) { /* storage disabled */ }
    }
    const tilesOn = typeof this.enableGeoTiles === 'function' && this.enableGeoTiles(token);
    if (this.jejuAirportGroup) this.jejuAirportGroup.visible = true;
    const streamReady = () => Boolean(this.geoLayer && this.geoLayer.stats && this.geoLayer.stats.tiles > 0);
    if (tilesOn || this.geoLayer) {
      const syncFallbackVisibility = () => {
        if (!this.isJejuFlyover || !this.jejuAirportGroup) return;
        if (streamReady()) {
          this.jejuAirportGroup.visible = false;
        } else {
          setTimeout(syncFallbackVisibility, 1000);
        }
      };
      syncFallbackVisibility();
    }
    this.showPopup('🏝️ 제주공항 상공 비행 시작! 제주도 경관과 3,000m 활주로를 조망하세요. (Flying over Jeju Airport)');
    this.startJetSound();
  },

  getPlacePresets() {
    const presets = [];
    const nav = typeof window !== 'undefined' ? window.AirportIndicators : null;
    if (nav && Array.isArray(nav.airports)) {
      for (const airport of nav.airports) {
        presets.push({
          id: airport.icao,
          name: `${airport.iata} ${airport.short} (${airport.icao})`,
          lat: airport.lat,
          lon: airport.lon,
          elevationM: airport.elevationM || 0
        });
      }
    }
    const haeundae = (typeof window !== 'undefined' && window.GEO_POINTS) ? window.GEO_POINTS.haeundae : null;
    if (haeundae) {
      presets.push({
        id: 'HAEUNDAE',
        name: '해운대 LCT (Haeundae)',
        lat: haeundae.lat,
        lon: haeundae.lon,
        elevationM: 0
      });
    }
    return presets;
  },

  updateSelectedPlaceReadout() {
    if (!this.placeSelect || !this.placeCoords) return;
    const option = this.placeSelect.selectedOptions && this.placeSelect.selectedOptions[0];
    if (!option) return;
    const lat = Number(option.dataset.lat);
    const lon = Number(option.dataset.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      this.placeCoords.textContent = '—';
      return;
    }
    this.placeCoords.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  },

  getSelectedPlace() {
    const option = this.placeSelect && this.placeSelect.selectedOptions && this.placeSelect.selectedOptions[0];
    if (!option) return null;
    const lat = Number(option.dataset.lat);
    const lon = Number(option.dataset.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      id: option.value,
      name: option.textContent || option.value,
      lat,
      lon,
      elevationM: Number(option.dataset.elev) || 0
    };
  },

  startAtPlace(place) {
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return;
    if (this.placePickerPanel) this.placePickerPanel.classList.add('hidden');
    if (this.overlay) this.overlay.classList.add('hidden');
    this.showGateActionPrompt(false);
    this.isJejuFlyover = false;
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    if (typeof this.resetPartialDamageState === 'function') this.resetPartialDamageState();
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    if (typeof this.resetTailstrikeState === 'function') this.resetTailstrikeState();
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');
    this.hullIntegrity = 100;
    this.passengers = 285;
    this.gearExtended = false;
    this.gearPhase = 'UP';
    this.gearPhaseTimer = 0.0;
    if (typeof this.updateGearUI === 'function') this.updateGearUI('UP', 'gear-up');
    this.flapIndex = 0;
    this.spoilerExtended = false;
    this.reverseThrustActive = false;

    this.buildAircraft(this.currentPlaneType);
    const local = (typeof window !== 'undefined' && typeof window.geoLocalDelta === 'function')
      ? window.geoLocalDelta({ lat: place.lat, lon: place.lon, old: { x: 0, z: 0 } }).local
      : { x: 0, z: 0 };
    this.setupAirborneCruiseState(local.x, 1100 + (Number(place.elevationM) || 0), local.z);
    this.flightPhase = 'CLIMB_CRUISE';
    this.phaseDisplay.textContent = `${place.name} 상공 비행 (Selected Place)`;
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();
    if (this.cameraState) this.cameraState.chaseTargetInitialized = false;
    if (typeof this.resetFlight3dPhysics === 'function') this.resetFlight3dPhysics();
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();

    let token = typeof window !== 'undefined' ? (window.GEO_ION_TOKEN || '') : '';
    try { token = token || localStorage.getItem('hajun3d.ionToken') || ''; } catch (_) { /* storage disabled */ }
    const tilesOn = typeof this.retargetGeo === 'function'
      && this.retargetGeo(
        { lat: place.lat, lon: place.lon, height: Number(place.elevationM) || 0 },
        { ionToken: token, simAnchor: { x: local.x, y: 0, z: local.z } }
      );
    const tilesActive = Boolean(this.geoLayer) || Boolean(tilesOn);
    this.showPopup(tilesActive
      ? `📍 ${place.name} 상공 비행 시작! (${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°) · 선택 지점 기준 타일 프레임`
      : `📍 ${place.name} 상공 비행 시작! (${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°) · 타일 프레임 사용 불가`);
    this.startJetSound();
  },

  getCameraModeDefs() {
    return [
      { id: '3rd', icon: '🎥', short: '3인칭', label: '3인칭 후방 시점 (Chase)' },
      { id: '1st', icon: '🧑‍✈️', short: '1인칭', label: '1인칭 조종석 시점 (Cockpit)' },
      { id: 'wing', icon: '🪽', short: '날개', label: '승객 창가 날개 시점 (Wing)' },
      { id: 'drone', icon: '🛸', short: '드론', label: '드론 360° 오빗 시점 (Drone)' },
      { id: 'flyby', icon: '🎬', short: '플라이바이', label: '시네마틱 플라이바이 (Flyby)' },
      { id: 'tower', icon: '🗼', short: '관제탑', label: '공항 관제탑 시점 (Tower)' },
      { id: 'gear', icon: '🛞', short: '랜딩기어', label: '동체 하부 랜딩기어 시점 (Gear)' },
      { id: 'hud', icon: '🎯', short: 'HUD', label: '순수 HUD 전방 시점 (HUD)' }
    ];
  },

  setCameraMode(mode) {
    const defs = this.getCameraModeDefs();
    const def = defs.find((d) => d.id === mode) || defs[0];
    this.cameraMode = def.id;

    if (this.planeGroup) {
      const hideAirframeForInteriorView = (def.id === '1st' || def.id === 'hud');
      this.planeGroup.visible = !this.isDestroyed && !hideAirframeForInteriorView;
    }

    const cs = typeof this.ensureCameraState === 'function' ? this.ensureCameraState() : this.cameraState;
    if (cs) {
      cs.flybySet = false;
      cs.flybyRegime = null;
      cs.droneInitialized = false;
      cs.chaseTargetInitialized = false;
      if (def.id === '3rd') cs.chasePos.set(0, 0, 0);
    }

    if (this.camModeText) {
      this.camModeText.textContent = def.short;
    }
    this.updateCameraModeUI();
    this.showPopup(`${def.icon} ${def.label}`);
  },

  updateCameraModeUI() {
    document.querySelectorAll('[data-cam-mode]').forEach((btn) => {
      if (btn.dataset.camMode === this.cameraMode) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  },

  toggleCameraMenu(forceClose = false) {
    const menu = document.getElementById('cam-mode-menu');
    if (!menu) return;
    if (forceClose) {
      menu.classList.add('hidden');
      return;
    }
    this.toggleEffectMenu(true);
    menu.classList.toggle('hidden');
    this.updateCameraModeUI();
  },

  toggleEffectMenu(forceClose = false) {
    const menu = document.getElementById('effect-settings-menu');
    if (!menu) return;
    if (forceClose) {
      menu.classList.add('hidden');
      return;
    }
    const camMenu = document.getElementById('cam-mode-menu');
    if (camMenu) camMenu.classList.add('hidden');
    menu.classList.toggle('hidden');
    this.updateSpeedEffectUI();
  },

  updateSpeedEffectUI() {
    const intensity = typeof this.speedEffectIntensity === 'number'
      ? Math.min(1.0, Math.max(0.0, this.speedEffectIntensity))
      : 0.35;
    const pct = Math.round(intensity * 100);
    const labelText = pct === 0 ? '속도감 OFF' : `속도감 ${pct}%`;

    const btnText = document.getElementById('effect-intensity-text');
    if (btnText) btnText.textContent = labelText;

    const valPc = document.getElementById('effect-slider-val-pc');
    if (valPc) valPc.textContent = pct === 0 ? 'OFF (0%)' : `${pct}%`;

    const valMob = document.getElementById('effect-slider-val-mobile');
    if (valMob) valMob.textContent = pct === 0 ? 'OFF (0%)' : `${pct}%`;

    const sliderPc = document.getElementById('effect-intensity-slider-pc');
    if (sliderPc && Number(sliderPc.value) !== pct) sliderPc.value = String(pct);

    const sliderMob = document.getElementById('effect-intensity-slider-mobile');
    if (sliderMob && Number(sliderMob.value) !== pct) sliderMob.value = String(pct);

    document.querySelectorAll('[data-effect-preset]').forEach((btn) => {
      if (Number(btn.dataset.effectPreset) === pct) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  },

  toggleCamera() {
    const defs = this.getCameraModeDefs();
    const curIdx = defs.findIndex((d) => d.id === this.cameraMode);
    const nextDef = defs[(curIdx + 1) % defs.length];
    this.setCameraMode(nextDef.id);
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

    const onWater = Boolean(this._flight3dCore?.telemetry?.onWater) || (this.isOnGround && Boolean(this._isOverWaterSurface));
    const kmh = Math.round(this.speed * 280);
    const knots = Math.round(kmh / 1.852);
    this.speedVal.textContent = onWater
      ? `${kmh} km/h (${knots} kt) [수상 활주]`
      : (this.isOnGround ? `${kmh} km/h (${knots} kt) [지상 주행]` : `${kmh} km/h (${knots} kt) [비행 IAS]`);
    const speedPercent = Math.min(100, Math.round((kmh / 800) * 100));
    this.speedBar.style.width = `${speedPercent}%`;

    const altRefY = this._isOverWaterSurface ? Math.min(this.groundY || 6.84, -0.3) : (this.groundY || 6.84);
    const altitude = Math.max(0, Math.round(this.planeGroup.position.y - altRefY));
    const altFt = Math.round(altitude * 3.28084);
    this.altVal.textContent = onWater
      ? `0 m (0 ft) [수면]`
      : (this.isOnGround ? `0 m (0 ft) [지상]` : `${altitude} m (${altFt} ft) [QNH]`);
    const altPercent = Math.min(100, Math.round((altitude / 2500) * 100));
    this.altBar.style.width = `${altPercent}%`;

    // 2. 수직 승강계 (VSI) 갱신
    if (this.vsiVal) {
      const vsi = this.verticalSpeed.toFixed(1);
      const vsiFpm = Math.round(this.verticalSpeed * 196.85);
      this.vsiVal.textContent = (this.verticalSpeed >= 0 ? '+' : '') + vsi + ' m/s (' + (vsiFpm >= 0 ? '+' : '') + vsiFpm + ' fpm)';
      if (this.verticalSpeed < -8) {
        this.vsiVal.style.color = '#ef4444'; // 위험 강하
      } else if (this.verticalSpeed < -5) {
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

    const damagedLabels = [];
    if (this.partDamage) {
      if (this.partDamage.engineL !== 'normal' || this.partDamage.engineR !== 'normal') damagedLabels.push('엔진');
      if (this.partDamage.wingL !== 'normal' || this.partDamage.wingR !== 'normal') damagedLabels.push('날개');
      if (this.partDamage.tail !== 'normal') damagedLabels.push('꼬리');
    }
    if (!this.isGearCollapsed && this.gearDamageState && Object.values(this.gearDamageState).some(s => s !== 'normal')) {
      damagedLabels.push('기어');
    }
    const hullStatus = this.isGearCollapsed
      ? '(기어 파손)'
      : (damagedLabels.length > 0 ? `(${damagedLabels.join('/')} 손상)` : (this.isNoseDented ? '(기수 찌그러짐)' : '(정상)'));
    this.hullVal.textContent = `${this.hullIntegrity}% ${hullStatus}`;
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

    // 현재 항공기 진방위(True Heading) 갱신 (PFD 계기판 및 상단 타겟 바)
    if (this.headingVal || this.headingCardinal || this.hudTopHeading) {
      const hdg = this.getAircraftHeadingDeg();
      const cardinal = this.getCardinalDirection(hdg);
      const hdgStr = String(hdg).padStart(3, '0');
      if (this.headingVal) this.headingVal.textContent = `${hdgStr}°`;
      if (this.headingCardinal) this.headingCardinal.textContent = cardinal;
      if (this.hudTopHeading) this.hudTopHeading.textContent = `HDG ${hdgStr}° ${cardinal}`;
    }

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    this.timeDisplay.textContent = `${m}:${s}`;

    const nav = window.AirportIndicators;
    const zProgress = Math.min(1.0, Math.max(0, -this.planeGroup.position.z / 45000));
    const destIcao = this.selectedDestinationIcao || 'RKSI';
    const compressed = !this.geoLayer;
    const progress = (typeof window !== 'undefined' && window.RouteModel)
      ? window.RouteModel.progress(destIcao, this.planeGroup.position.x, this.planeGroup.position.z, compressed)
      : zProgress;
    const navState = this.getDestinationNavigationState(progress, compressed);
    const targetPos = navState.targetPos;
    this.targetDist.textContent = navState.targetLabel;

    if (nav && this.airportIndicatorRows && this.airportIndicatorRows.length) {
      const position = navState.position;
      const activeIcao = navState.activeIcao;
      for (const entry of this.airportIndicatorRows) {
        const indicator = nav.indicatorFrom(position, entry.airport);
        const dist = indicator.distanceKm;
        entry.dist.textContent = `${dist < 10 ? dist.toFixed(1) : dist.toFixed(0)}km`;
        entry.brg.textContent = `${String(Math.round(indicator.bearingDeg)).padStart(3, '0')}°`;
        entry.row.classList.toggle('active', indicator.icao === activeIcao);
      }
    }
    const localVec = targetPos.clone();
    if (this.renderOrigin) localVec.sub(this.renderOrigin);
    this.planeGroup.worldToLocal(localVec);
    const angle = Math.atan2(localVec.x, -localVec.z);
    this.targetArrow.style.transform = `rotate(${angle}rad)`;
  },

  getAircraftHeadingDeg() {
    const anchorHeading = (this.geoAnchor && Number.isFinite(this.geoAnchor.headingDeg))
      ? this.geoAnchor.headingDeg
      : (typeof window !== 'undefined' && window.GEO_ANCHOR && Number.isFinite(window.GEO_ANCHOR.headingDeg)
          ? window.GEO_ANCHOR.headingDeg
          : 353.9);
    let relDeg = 0;
    if (this.planeGroup && this.planeGroup.quaternion) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      if (Math.hypot(fwd.x, fwd.z) > 1e-4) {
        relDeg = Math.atan2(fwd.x, -fwd.z) * (180 / Math.PI);
      }
    } else if (Number.isFinite(this.yaw)) {
      relDeg = -this.yaw * (180 / Math.PI);
    }
    const normalized = ((anchorHeading + relDeg) % 360 + 360) % 360;
    const rounded = Math.round(normalized) % 360;
    return rounded === 0 ? 360 : rounded;
  },

  getCardinalDirection(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return dirs[idx];
  },

  setDestinationAirport(icao) {
    const nav = typeof window !== 'undefined' ? window.AirportIndicators : null;
    const key = (icao || 'RKSI').toUpperCase();
    const airport = (nav && nav.byIcao && nav.byIcao[key]) ? nav.byIcao[key] : (nav ? nav.destination : null);
    this.selectedDestinationIcao = airport ? airport.icao : 'RKSI';

    if (this.destinationSelect && this.destinationSelect.value !== this.selectedDestinationIcao) {
      this.destinationSelect.value = this.selectedDestinationIcao;
    }

    if (this.airportIndicatorRows && this.airportIndicatorRows.length) {
      for (const entry of this.airportIndicatorRows) {
        entry.row.classList.toggle('active', entry.icao === this.selectedDestinationIcao);
      }
    }

    if (airport && typeof this.showPopup === 'function') {
      const pos = this.planeGroup ? this.planeGroup.position : { x: 160, z: 0 };
      const anchorBase = this.geoSimAnchorBase || (typeof window !== 'undefined' && window.GEO_SIM_ANCHOR) || { x: 160, z: 0 };
      const curLatLon = (typeof window !== 'undefined' && typeof window.geoLocalToLatLon === 'function')
        ? window.geoLocalToLatLon(pos.x - anchorBase.x, pos.z - (anchorBase.z || 0))
        : (nav ? nav.origin : { lat: 35.165, lon: 128.939 });
      const ind = nav ? nav.indicatorFrom(curLatLon, airport) : null;
      const info = ind ? ` (${ind.distanceKm.toFixed(0)}km · BRG ${String(Math.round(ind.bearingDeg)).padStart(3, '0')}°)` : '';
      this.showPopup(`🎯 목적지 설정: ${airport.name} [${airport.iata}]${info}`);
    }
    return this.selectedDestinationIcao;
  },

  getDestinationNavigationState(zProgress, compressed = !this.geoLayer) {
    const nav = typeof window !== 'undefined' ? window.AirportIndicators : null;
    const destIcao = this.selectedDestinationIcao || 'RKSI';
    const destAirport = (nav && nav.byIcao && nav.byIcao[destIcao]) || (nav ? nav.destination : null);
    const groundY = this.groundY || 6.84;
    const pos = this.planeGroup ? this.planeGroup.position : new THREE.Vector3(160, groundY, 0);

    let targetPos = new THREE.Vector3(160, groundY, 0);
    let targetLabel = '활주로 36L';
    const isDefaultIncheon = destIcao === 'RKSI';

    // Compressed arcade flights map z onto the great circle; geo-tile flights
    // use the active exact geodetic anchor.
    const anchorBase = this.geoSimAnchorBase || (typeof window !== 'undefined' && window.GEO_SIM_ANCHOR) || { x: 160, z: 0 };
    const position = (typeof window !== 'undefined' && window.RouteModel)
      ? window.RouteModel.currentLatLon(pos.x, pos.z, compressed, destIcao)
      : (isDefaultIncheon || typeof window === 'undefined' || typeof window.geoLocalToLatLon !== 'function')
        ? (nav ? nav.positionAlongRoute(zProgress) : { lat: 35.165, lon: 128.939 })
        : window.geoLocalToLatLon(pos.x - anchorBase.x, pos.z - (anchorBase.z || 0));

    if (this.isJejuFlyover) {
      const jeju = this.getJejuLocalPosition();
      targetPos = new THREE.Vector3(jeju.x, groundY, jeju.z);
      targetLabel = `제주국제공항 (${Math.round(pos.distanceTo(targetPos))}m)`;
    } else if (this.flightPhase === 'TAXI_OUT') {
      targetPos = new THREE.Vector3(160, groundY, 800);
      targetLabel = '이륙 활주로 36L (150m)';
    } else if (isDefaultIncheon && (this.flightPhase === 'TAXI_IN' || this.flightPhase === 'DEPLANING' || this.flightPhase === 'MISSION_COMPLETE')) {
      const gate = (typeof window !== 'undefined' && window.RouteModel)
        ? window.RouteModel.gateSim(destIcao, compressed) : { x: -330, z: -45000 };
      targetPos = new THREE.Vector3(gate.x, groundY, gate.z);
      const gateDistM = Math.round(pos.distanceTo(targetPos) * 2);
      targetLabel = `인천공항 T1 탑승교 1번 게이트 (${gateDistM}m)`;
    } else if (isDefaultIncheon) {
      const destSim = (typeof window !== 'undefined' && window.RouteModel)
        ? window.RouteModel.destinationSim(destIcao, compressed) : { x: 160, z: -45000 };
      targetPos = new THREE.Vector3(destSim.x, groundY, destSim.z);
      const routeKm = nav ? nav.routeDistanceKm : 339.5;
      const remValue = (typeof window !== 'undefined' && window.RouteModel)
        ? window.RouteModel.remainingKm(destIcao, pos.x, pos.z, compressed)
        : routeKm * (1.0 - zProgress);
      const remKm = Math.max(0, remValue).toFixed(1);
      if (zProgress > 0.96) {
        const remM = Math.round(Math.max(0, remValue) * 1000);
        targetLabel = `인천국제공항 16R 착륙 활주로 (${remM}m)`;
      } else {
        const speedTag = (this.cruiseMultiplier > 1) ? ` [${this.cruiseMultiplier}x 배속순항]` : '';
        targetLabel = `인천국제공항 16R (${remKm}km)${speedTag}`;
      }
    } else if (destIcao === 'RKPK') {
      targetPos = new THREE.Vector3(160, groundY, 0);
      const distM = Math.round(Math.hypot(pos.x - 160, pos.z));
      const distText = distM >= 1000 ? `${(distM / 1000).toFixed(1)}km` : `${distM}m`;
      const brg = nav ? String(Math.round(nav.bearingDeg(position, destAirport))).padStart(3, '0') : '174';
      targetLabel = `김해국제공항 36L (${distText} · BRG ${brg}°)`;
    } else if (destAirport) {
      let destSim = { x: 160, z: -45000 };
      if (typeof window !== 'undefined' && window.RouteModel) {
        destSim = window.RouteModel.destinationSim(destIcao, compressed);
      } else if (typeof window !== 'undefined' && typeof window.geoLocalDelta === 'function') {
        const local = window.geoLocalDelta({ lat: destAirport.lat, lon: destAirport.lon, old: { x: 0, z: 0 } }).local;
        destSim = { x: local.x + 160, z: local.z };
      }
      targetPos = new THREE.Vector3(destSim.x, groundY, destSim.z);
      const ind = nav ? nav.indicatorFrom(position, destAirport) : { distanceKm: 0, bearingDeg: 0 };
      const distText = ind.distanceKm < 1
        ? `${Math.round(ind.distanceKm * 1000)}m`
        : `${ind.distanceKm.toFixed(1)}km`;
      const brg = String(Math.round(ind.bearingDeg)).padStart(3, '0');
      const speedTag = (this.cruiseMultiplier > 1) ? ` [${this.cruiseMultiplier}x]` : '';
      targetLabel = `${destAirport.name} (${destAirport.iata} · ${distText} · BRG ${brg}°)${speedTag}`;
    }

    const activeIcao = (this.flightPhase === 'TAXI_OUT') ? 'RKPK' : destIcao;
    return { targetPos, targetLabel, activeIcao, position };
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
      a320_detailed: 'A320-200 실물 고정밀',
      a320_simplified: 'A320-200 경량 최적화',
      a350: 'A350-900 XWB',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: 'CL-215 수륙양용기',
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
              • <strong>운항 노선:</strong> 김해국제공항 (RKPK/PUS) ➔ 인천국제공항 (RKSI/ICN) [${Math.round(window.AirportIndicators.routeDistanceKm)}km 대륙 횡단 정기편]<br>
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
        if (this.setTakeoffPhaseLabel) this.setTakeoffPhaseLabel('다음 이륙');
        this.overlay.classList.remove('hidden');
      }
    }, 600);
  }

  });
})();

