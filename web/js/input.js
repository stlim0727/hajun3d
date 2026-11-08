/**
 * Sky Jet Explorer 3D - Keyboard, Touch/Virtual Joystick, HOTAS 1 & Airbus TCA Sidestick Controls
 * Subsystem: input (11 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 9. 키보드 & 터치 이벤트 바인딩
  // ----------------------------------------------------------------
  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      // N 키: 비행 중 또는 대기 중 언제든지 낮/밤 전환
      if (e.code === 'KeyN') {
        this.toggleTimeOfDay();
        return;
      }

      if (!this.isPlaying || this.isDestroyed) return;

      // 숫자 키 0 ~ 9: 스로틀 출력 지정
      if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
        const digit = parseInt(e.key, 10);
        if (!isNaN(digit)) {
          this.throttle = digit * 0.1;
          this.showPopup(`엔진 출력: ${Math.round(this.throttle * 100)}% [키 ${digit}]`);
          return;
        }
      }

      switch (e.code) {
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'KeyW':
          this.keys.fastForward = true;
          break;
        case 'KeyS':
          this.keys.brake = true;
          break;

        case 'ArrowUp':
          this.keys.up = true; // 기수 하강 (Pitch Down)
          break;
        case 'ArrowDown':
          this.keys.down = true; // 기수 상승 (Pitch Up)
          break;
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'ArrowRight':
          this.keys.right = true;
          break;

        case 'ShiftLeft':
        case 'ShiftRight':
        case 'Space':
          this.throttle = 1.0;
          this.showPopup('⚡ 최대 전출력 100% (FULL THROTTLE)');
          break;

        case 'KeyG':
          this.toggleLandingGear();
          break;
        case 'KeyF':
          this.toggleFlaps();
          break;
        case 'KeyB':
          this.toggleSpoilers();
          break;
        case 'KeyR':
          this.toggleReverseThrust();
          break;
        case 'KeyX':
          this.toggleCruiseSpeed();
          break;
        case 'KeyC':
          this.toggleCamera();
          break;
        case 'KeyP':
          window.nextPlane();
          break;
        case 'KeyM':
          this.toggleMicrophone();
          break;
        case 'KeyE':
          if (this.isOnGround && (this.speed < 0.35 || this.flightPhase === 'TAXI_IN' || this.flightPhase === 'DEPLANING')) {
            this.toggleEngineShutdown();
          } else {
            this.toggleEmergencyPanel();
          }
          break;
        case 'Enter':
          this.startDeplaning();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'KeyW':
          this.keys.fastForward = false;
          break;
        case 'KeyS':
          this.keys.brake = false;
          break;
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'ArrowDown':
          this.keys.down = false;
          break;
      }
    });

    // 윈도우 포커스 이탈 시 조작 키 자동 리셋 (키 끼임/지속 쏠림 방지)
    window.addEventListener('blur', () => {
      this.keys.up = false;
      this.keys.down = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.fastForward = false;
      this.keys.brake = false;
    });

    // 마우스 휠 스크롤: 엔진 출력(Throttle) 가감속 (스크롤 업: 가속 ⏫, 스크롤 다운: 감속 ⏬)
    window.addEventListener('wheel', (e) => {
      const hotasModal = document.getElementById('hotas-modal');
      const glbModal = document.getElementById('glb-modal');
      const overlay = document.getElementById('overlay-screen');
      if (
        (hotasModal && !hotasModal.classList.contains('hidden') && hotasModal.style.display !== 'none') ||
        (glbModal && !glbModal.classList.contains('hidden') && glbModal.style.display !== 'none') ||
        (overlay && !overlay.classList.contains('hidden') && overlay.style.display !== 'none')
      ) {
        return;
      }

      if (this.isPlaying && !this.isDestroyed) {
        if (e.deltaY < 0) {
          this.throttle = Math.min(1.0, this.throttle + 0.05);
          this.showPopup(`엔진 출력: ${Math.round(this.throttle * 100)}% (스크롤 가속 ⏫)`);
        } else if (e.deltaY > 0) {
          this.throttle = Math.max(0.0, this.throttle - 0.05);
          this.showPopup(`엔진 출력: ${Math.round(this.throttle * 100)}% (스크롤 감속 ⏬)`);
        }
      }
    }, { passive: true });

    // 모바일 조이스틱
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    let touchId = null;
    let baseRect = null;

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      baseRect = joystickZone.getBoundingClientRect();
      this.joystickData.active = true;
      this.updateJoystick(touch.clientX, touch.clientY, baseRect, joystickStick);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this.joystickData.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          this.updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY, baseRect, joystickStick);
          break;
        }
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          this.joystickData.active = false;
          this.joystickData.x = 0;
          this.joystickData.y = 0;
          joystickStick.style.transform = `translate(0px, 0px)`;
          touchId = null;
          break;
        }
      }
    };
    window.addEventListener('touchend', endJoystick);
    window.addEventListener('touchcancel', endJoystick);

    // 모바일 가속/감속
    const btnBoost = document.getElementById('btn-boost');
    const btnBrake = document.getElementById('btn-brake');

    btnBoost.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.throttle = Math.min(1.0, this.throttle + 0.2);
    }, { passive: false });

    btnBrake.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.throttle = Math.max(0.0, this.throttle - 0.2);
      this.keys.brake = true;
    }, { passive: false });

    btnBrake.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.keys.brake = false;
    }, { passive: false });
  },

  updateJoystick(touchX, touchY, rect, stickEl) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = 45;

    let dx = touchX - centerX;
    let dy = touchY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
    this.joystickData.x = dx / maxRadius;
    this.joystickData.y = dy / maxRadius;
  },

  // ----------------------------------------------------------------
  // HOTAS 1 & Thrustmaster 비행 조이스틱 / 에어버스 사이드스틱 시스템
  // - Thrustmaster T.Flight HOTAS One / HOTAS 4 / HOTAS X 및 Airbus TCA 완벽 지원
  // - 에어버스 A320 플라이 바이 와이어 (Fly-By-Wire) 피치/롤/요 & 아날로그 스로틀 레버 매핑
  // ----------------------------------------------------------------
  initHOTAS() {
    window.addEventListener('gamepadconnected', (e) => {
      this.onGamepadConnected(e.gamepad);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.onGamepadDisconnected(e.gamepad);
    });
  },

  onGamepadConnected(pad) {
    if (!pad) return;
    const name = pad.id || 'HOTAS Flight Stick';
    this.hotasState.connected = true;
    this.hotasState.id = pad.id;
    this.hotasState.rawName = name;

    const hotasBtn = document.getElementById('hotas-btn');
    const hotasStatusText = document.getElementById('hotas-status-text');
    if (hotasBtn) hotasBtn.classList.add('active');
    if (hotasStatusText) hotasStatusText.textContent = 'HOTAS 1';

    const devNameEl = document.getElementById('hotas-device-name');
    const dotEl = document.getElementById('hotas-status-dot');
    if (devNameEl) devNameEl.textContent = `연결됨: ${name.slice(0, 38)}`;
    if (dotEl) dotEl.classList.add('connected');

    this.showPopup(`🎮 [HOTAS 1 연동 완료] ${name.slice(0, 24)} 조이스틱 & 스로틀이 에어버스 A320에 활성화되었습니다!`);
  },

  onGamepadDisconnected(pad) {
    this.hotasState.connected = false;
    this.hotasState.id = '';
    const hotasBtn = document.getElementById('hotas-btn');
    const hotasStatusText = document.getElementById('hotas-status-text');
    if (hotasBtn) hotasBtn.classList.remove('active');
    if (hotasStatusText) hotasStatusText.textContent = 'HOTAS 1';

    const devNameEl = document.getElementById('hotas-device-name');
    const dotEl = document.getElementById('hotas-status-dot');
    if (devNameEl) devNameEl.textContent = 'HOTAS 1 연결 대기 중 (조이스틱을 연결하거나 버튼을 누르세요)';
    if (dotEl) dotEl.classList.remove('connected');

    this.showPopup('🎮 HOTAS 비행 컨트롤러 연결이 해제되었습니다.');
  },

  pollHOTAS(dt) {
    if (typeof navigator.getGamepads !== 'function') return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    let targetPad = null;
    // 1순위: HOTAS, Thrustmaster, T.Flight, Airbus, Joystick 명칭 포함 기기 탐색
    for (let i = 0; i < gamepads.length; i++) {
      const pad = gamepads[i];
      if (pad && pad.connected) {
        const idLower = pad.id.toLowerCase();
        if (idLower.includes('hotas') || idLower.includes('thrustmaster') || idLower.includes('flight') || idLower.includes('tca') || idLower.includes('airbus') || idLower.includes('stick') || idLower.includes('joystick')) {
          targetPad = pad;
          break;
        }
      }
    }
    // 2순위: 일반 게임패드라도 첫 번째 연결된 장치 사용
    if (!targetPad) {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) {
          targetPad = gamepads[i];
          break;
        }
      }
    }

    if (!targetPad) {
      if (this.hotasState.connected) {
        this.onGamepadDisconnected(null);
      }
      return;
    }

    if (!this.hotasState.connected) {
      this.onGamepadConnected(targetPad);
    }

    // -------------------------------------------------------------
    // 축 (Axes) 처리 (HOTAS 1 사이드스틱 방향 & 스로틀 레버 정밀 매핑)
    // -------------------------------------------------------------
    const axes = targetPad.axes || [];
    this.hotasState.rawAxes = axes;
    const applyDeadzoneExpo = (val, center = 0, dz = 0.09) => {
      if (typeof val !== 'number') return 0;
      const offsetVal = val - center;
      if (Math.abs(offsetVal) < dz) return 0;
      const sign = Math.sign(offsetVal);
      const normalized = (Math.abs(offsetVal) - dz) / (1 - dz);
      return sign * Math.pow(Math.max(0, normalized), this.hotasExpo);
    };

    // ★ 1. 사이드스틱 Roll: Axes[0] (정지 시 자동 영점 흡수 + 9% 데드존 -> 롤 쏠림 100% 원천 차단)
    if (axes.length > 0 && typeof axes[0] === 'number') {
      const rawRoll = axes[0];
      const rollDelta = Math.abs(rawRoll - (this.hotasState.prevRawRoll ?? rawRoll));
      this.hotasState.prevRawRoll = rawRoll;
      if (Math.abs(rawRoll) < 0.20 && rollDelta < 0.003) {
        this.hotasState.rollCenter = THREE.MathUtils.lerp(this.hotasState.rollCenter || 0, rawRoll, 0.1);
      }
      this.hotasState.roll = applyDeadzoneExpo(rawRoll, this.hotasState.rollCenter || 0, 0.09);
    }

    // ★ 2. 사이드스틱 Pitch: Axes[1] (정지 시 자동 영점 흡수 + 9% 데드존)
    if (axes.length > 1 && typeof axes[1] === 'number') {
      const rawPitch = axes[1];
      const pitchDelta = Math.abs(rawPitch - (this.hotasState.prevRawPitch ?? rawPitch));
      this.hotasState.prevRawPitch = rawPitch;
      if (Math.abs(rawPitch) < 0.20 && pitchDelta < 0.003) {
        this.hotasState.pitchCenter = THREE.MathUtils.lerp(this.hotasState.pitchCenter || 0, rawPitch, 0.1);
      }
      this.hotasState.pitch = applyDeadzoneExpo(rawPitch, this.hotasState.pitchCenter || 0, 0.09);
    }

    // ★ 3. 스로틀 슬라이더 (스크롤 ➔ 비행기 속도 및 엔진 출력 제어 0~100%)
    // Thrustmaster TCA Sidestick Airbus Edition 하단 스크롤 슬라이더: DirectInput Axes[2] (Z-Axis Slider)
    const thrIdx = this.hotasState.throttleAxisIndex ?? 2;
    if (axes.length > thrIdx && typeof axes[thrIdx] === 'number') {
      const rawVal = axes[thrIdx];
      // TCA 에어버스 스크롤: 밀었을 때 -1.0 (TOGA / 100%), 당겼을 때 +1.0 (IDLE / 0%)
      let thrPercent;
      if (this.hotasState.invertThrottle) {
        thrPercent = THREE.MathUtils.clamp((rawVal + 1.0) / 2.0, 0.0, 1.0);
      } else {
        thrPercent = THREE.MathUtils.clamp((1.0 - rawVal) / 2.0, 0.0, 1.0);
      }

      this.hotasState.hasThrottleAxis = true;
      this.hotasState.throttle = thrPercent;

      // 스크롤 슬라이더가 움직였거나 최초 감지 시 비행기 스로틀 및 HUD 게이지 즉시 반영
      if (this.hotasState.lastThrottleRaw === null || Math.abs(this.hotasState.lastThrottleRaw - rawVal) > 0.003) {
        this.hotasState.lastThrottleRaw = rawVal;
        this.throttle = thrPercent;

        // HUD 게이지 바 즉각 갱신
        if (this.boostVal && this.boostBar) {
          const pct = Math.round(this.throttle * 100);
          const digit = Math.round(this.throttle * 10);
          this.boostVal.textContent = `${pct}% [키 ${digit}]`;
          this.boostBar.style.width = `${pct}%`;
        }
      }
    }

    // ★ 4. 러더 (Rudder): 스틱 손잡이 좌우 비틀기 (Twist Rudder - Axes[3])
    // 16% 견고한 중립 데드존으로 손을 뗐을 때 0.000 완전 중립 보장
    const rudIdx = this.hotasState.rudderAxisIndex ?? 3;
    if (this.hotasState.useTwistRudder && rudIdx >= 0 && axes.length > rudIdx && typeof axes[rudIdx] === 'number') {
      const rawYaw = axes[rudIdx];
      const yawDelta = Math.abs(rawYaw - (this.hotasState.prevRawYaw ?? rawYaw));
      this.hotasState.prevRawYaw = rawYaw;

      // 손잡이가 정지 상태(delta < 0.004)이고 중앙 부근(|rawYaw| < 0.28)이면 영점을 물리 정지점에 자동 일치
      if (Math.abs(rawYaw) < 0.28 && yawDelta < 0.004) {
        this.hotasState.yawCenter = THREE.MathUtils.lerp(this.hotasState.yawCenter || 0, rawYaw, 0.12);
      }

      const offsetYaw = rawYaw - (this.hotasState.yawCenter || 0);
      const rudDeadzone = 0.16; // 16% 견고한 중립 데드존

      if (Math.abs(offsetYaw) <= rudDeadzone) {
        this.hotasState.yaw = 0.0; // 손을 뗐을 때 0.000 완전 중립 보장
      } else {
        const sign = Math.sign(offsetYaw);
        const norm = (Math.abs(offsetYaw) - rudDeadzone) / (1.0 - rudDeadzone);
        const clamped = Math.min(1.0, Math.max(0.0, norm));
        this.hotasState.yaw = sign * Math.pow(clamped, 1.2);
      }
    } else {
      this.hotasState.yaw = 0.0;
    }

    // -------------------------------------------------------------
    // 버튼 (Buttons) 처리
    // -------------------------------------------------------------
    const buttons = targetPad.buttons || [];
    const isPressed = (idx) => buttons[idx] && buttons[idx].pressed;
    const isJustPressed = (idx) => isPressed(idx) && !this.hotasState.prevButtons[idx];

    // Trigger (검지 방아쇠): 역추진 제동 / 바퀴 브레이크
    const isBrakePressed = isPressed(0) || isPressed(5) || (buttons[7] && buttons[7].pressed);
    if (isBrakePressed) {
      this.keys.brake = true;
    } else if (this.hotasState.prevButtons[0] || this.hotasState.prevButtons[5] || this.hotasState.prevButtons[7]) {
      this.keys.brake = false;
    }

    // Button 1 (B / Fire 2): 랜딩 기어 토글 (G)
    if (isJustPressed(1)) {
      this.toggleLandingGear();
    }

    // Button 2 (A / X / Fire 3): 200km 배속 순항 토글 (X)
    if (isJustPressed(2)) {
      this.toggleCruiseSpeed();
    }

    // Button 3 (Y / Fire 4): 카메라 시점 전환 (C)
    if (isJustPressed(3)) {
      this.toggleCamera();
    }

    // Button 4 (LB): 스로틀 미세 감속 (-5%)
    if (isJustPressed(4)) {
      this.throttle = Math.max(0.0, this.throttle - 0.05);
      this.showPopup(`엔진 출력: ${Math.round(this.throttle * 100)}% (LB 감속)`);
    }

    // Button 5 (RB) [브레이크 아닐 때]: 스로틀 미세 가속 (+5%)
    if (isJustPressed(5) && !isBrakePressed) {
      this.throttle = Math.min(1.0, this.throttle + 0.05);
      this.showPopup(`엔진 출력: ${Math.round(this.throttle * 100)}% (RB 가속)`);
    }

    // View / Select (Button 6 or Button 8): 마이크 기장 안내 방송 토글 (M)
    if (isJustPressed(6) || isJustPressed(8)) {
      this.toggleMicrophone();
    }

    // Menu / Start (Button 7 or Button 9): 엔진 시동 / 정지 (E)
    if ((isJustPressed(7) && !isBrakePressed) || isJustPressed(9)) {
      this.toggleEngineShutdown();
    }

    // Button 10 (L3 / Stick Push): 실속 회복 / 피치 트림 리셋
    if (isJustPressed(10)) {
      this.showPopup('✈️ 에어버스 FBW 수평 비행 자동 트림(Auto-Trim) 적용');
    }

    // Button 11 (R3 / Stick Push): 비상 상황 패널 토글
    if (isJustPressed(11)) {
      this.toggleEmergencyPanel();
    }

    // D-Pad POV Hat (Buttons 12, 13, 14, 15): 피치/롤 미세 트림
    if (isJustPressed(12)) {
      this.planeGroup.rotateX(-0.012);
    }
    if (isJustPressed(13)) {
      this.planeGroup.rotateX(0.012);
    }
    if (isJustPressed(14)) {
      this.planeGroup.rotateZ(0.015);
    }
    if (isJustPressed(15)) {
      this.planeGroup.rotateZ(-0.015);
    }

    for (let b = 0; b < buttons.length; b++) {
      this.hotasState.prevButtons[b] = buttons[b].pressed;
    }

    const hotasModal = document.getElementById('hotas-modal');
    if (hotasModal && !hotasModal.classList.contains('hidden') && hotasModal.style.display !== 'none') {
      this.updateHOTASModalUI();
    }
  },

  toggleHOTASAxisMode() {
    const modes = ['tca_airbus', 'tca_airbus_swap', 'tca_airbus_locked_rudder'];
    const currentIdx = modes.indexOf(this.hotasState.mode || 'tca_airbus');
    const nextMode = modes[(currentIdx + 1) % modes.length];
    this.hotasState.mode = nextMode;
    this.hotasState.lastThrottleRaw = null;

    if (nextMode === 'tca_airbus') {
      this.hotasState.throttleAxisIndex = 2; // 스크롤: 축 2
      this.hotasState.rudderAxisIndex = 3;   // 손잡이 비틀기 러더: 축 3
      this.hotasState.useTwistRudder = true;
    } else if (nextMode === 'tca_airbus_swap') {
      this.hotasState.throttleAxisIndex = 3; // 스크롤: 축 3
      this.hotasState.rudderAxisIndex = 2;   // 비틀기 러더: 축 2
      this.hotasState.useTwistRudder = true;
    } else if (nextMode === 'tca_airbus_locked_rudder') {
      this.hotasState.throttleAxisIndex = 2; // 스크롤: 축 2
      this.hotasState.rudderAxisIndex = -1;  // 러더: 중립 고정
      this.hotasState.useTwistRudder = false;
      this.hotasState.yaw = 0;
    }

    const titles = {
      tca_airbus: '✈️ 에어버스 TCA (스크롤: 축 2 / 손잡이 비틀기 러더: 축 3) [기본]',
      tca_airbus_swap: '🔄 축 맞바꿈 (스크롤: 축 3 / 비틀기 러더: 축 2)',
      tca_airbus_locked_rudder: '🛡️ 러더 중립 고정 (스크롤: 축 2 / 러더: 0% 고정)'
    };

    const title = titles[nextMode] || nextMode;
    this.showPopup(`🔄 [축 매핑] ${title}`);
    this.updateHOTASModalUI();
  },

  calibrateHOTAS() {
    if (this.hotasState.rawAxes && this.hotasState.rawAxes.length > 0) {
      const a = this.hotasState.rawAxes;
      if (typeof a[0] === 'number') this.hotasState.rollCenter = a[0];
      if (typeof a[1] === 'number') this.hotasState.pitchCenter = a[1];
      const rudIdx = this.hotasState.rudderAxisIndex ?? 3;
      if (a.length > rudIdx && typeof a[rudIdx] === 'number') {
        this.hotasState.yawCenter = a[rudIdx];
      }
    }
    this.hotasState.roll = 0;
    this.hotasState.pitch = 0;
    this.hotasState.yaw = 0;
    this.showPopup('🎯 [영점 보정 완료] 현재 손잡이/스틱 정지 위치를 0.0% 완전 중립 기준으로 정렬했습니다!');
    this.updateHOTASModalUI();
  },

  toggleTwistRudder() {
    this.hotasState.useTwistRudder = !this.hotasState.useTwistRudder;
    this.hotasState.yaw = 0;
    if (this.hotasState.useTwistRudder) {
      this.hotasState.rudderAxisIndex = 3;
    }
    const desc = this.hotasState.useTwistRudder 
      ? '스틱 손잡이 좌우 비틀기(Twist) 러더 ON (정상 조향)' 
      : '러더 비활성화 (0.0 중립 고정 모드)';
    this.showPopup(`🛡️ [러더 설정] ${desc}`);
    this.updateHOTASModalUI();
  },

  toggleHOTASThrottleInvert() {
    this.hotasState.invertThrottle = !this.hotasState.invertThrottle;
    this.hotasState.lastThrottleRaw = null;
    const desc = this.hotasState.invertThrottle 
      ? '당기면 100%, 밀면 0% (반전 모드)' 
      : '밀면 100%, 당기면 0% (정방향 기본)';
    this.showPopup(`↕️ [스로틀 방향] ${desc}`);
    this.updateHOTASModalUI();
  },

  updateHOTASModalUI() {
    const roll = this.hotasState.roll || 0;
    const pitch = this.hotasState.pitch || 0;
    const yaw = this.hotasState.yaw || 0;
    const thr = this.hotasState.hasThrottleAxis ? this.hotasState.throttle : this.throttle;

    const badge = document.getElementById('hotas-mode-badge');
    if (badge) {
      const mode = this.hotasState.mode || 'tca_airbus';
      const titles = {
        tca_airbus: '✈️ 에어버스 TCA (스크롤: 축 2 / 손잡이 비틀기 러더: 축 3) [기본]',
        tca_airbus_swap: '🔄 축 맞바꿈 (스크롤: 축 3 / 비틀기 러더: 축 2)',
        tca_airbus_locked_rudder: '🛡️ 러더 중립 고정 (스크롤: 축 2 / 러더: 0% 고정)'
      };
      badge.textContent = titles[mode] || mode;
    }

    const rEl = document.getElementById('axis-val-roll');
    const pEl = document.getElementById('axis-val-pitch');
    const yEl = document.getElementById('axis-val-yaw');
    const tEl = document.getElementById('axis-val-throttle');

    if (rEl) rEl.textContent = `${Math.round(roll * 100)}%`;
    if (pEl) pEl.textContent = `${Math.round(pitch * 100)}%`;
    if (yEl) {
      if (this.hotasState.useTwistRudder) {
        const signStr = yaw > 0 ? '+' : '';
        yEl.textContent = `${signStr}${Math.round(yaw * 100)}%`;
        yEl.style.color = Math.abs(yaw) > 0.05 ? '#38bdf8' : '#e2e8f0';
      } else {
        yEl.textContent = '0% (중립고정)';
        yEl.style.color = '#94a3b8';
      }
    }
    if (tEl) tEl.textContent = `${Math.round(thr * 100)}%`;

    const rBar = document.getElementById('axis-fill-roll');
    const pBar = document.getElementById('axis-fill-pitch');
    const yBar = document.getElementById('axis-fill-yaw');
    const tBar = document.getElementById('axis-fill-throttle');

    if (rBar) {
      rBar.style.width = `${Math.abs(roll) * 50}%`;
      rBar.style.left = roll >= 0 ? '50%' : `${50 - Math.abs(roll) * 50}%`;
    }
    if (pBar) {
      pBar.style.width = `${Math.abs(pitch) * 50}%`;
      pBar.style.left = pitch >= 0 ? '50%' : `${50 - Math.abs(pitch) * 50}%`;
    }
    if (yBar) {
      if (this.hotasState.useTwistRudder) {
        yBar.style.width = `${Math.abs(yaw) * 50}%`;
        yBar.style.left = yaw >= 0 ? '50%' : `${50 - Math.abs(yaw) * 50}%`;
      } else {
        yBar.style.width = '0%';
        yBar.style.left = '50%';
      }
    }
    if (tBar) {
      tBar.style.width = `${Math.round(thr * 100)}%`;
    }

    // 축 인덱스 라벨 갱신
    const thrLabel = document.getElementById('axis-label-throttle');
    if (thrLabel) {
      const idx = this.hotasState.throttleAxisIndex ?? 2;
      const inv = this.hotasState.invertThrottle ? ' [반전]' : '';
      thrLabel.textContent = `THROTTLE (스크롤 ➔ 엔진 출력 • 축 ${idx}${inv})`;
    }
    const rudLabel = document.getElementById('axis-label-rudder');
    if (rudLabel) {
      if (this.hotasState.useTwistRudder) {
        const idx = this.hotasState.rudderAxisIndex ?? 3;
        rudLabel.textContent = `RUDDER (스틱 손잡이 좌우 비틀기 • 축 ${idx} 연동)`;
      } else {
        rudLabel.textContent = 'RUDDER (방향타 • 0% 중립 고정 보호 중)';
      }
    }

    // 실시간 모든 축 Raw 디버그 표시
    const debugEl = document.getElementById('hotas-raw-axes-debug');
    if (debugEl && this.hotasState.rawAxes && this.hotasState.rawAxes.length > 0) {
      const axesStrs = Array.from(this.hotasState.rawAxes).map((v, i) => {
        const valStr = (typeof v === 'number') ? v.toFixed(2) : '0.00';
        const isThr = (i === (this.hotasState.throttleAxisIndex ?? 2));
        const isRud = this.hotasState.useTwistRudder && (i === (this.hotasState.rudderAxisIndex ?? 3));
        const tag = isThr ? ' [★스크롤]' : (isRud ? ' [★손잡이비틀기]' : (i === 0 ? ' [롤]' : (i === 1 ? ' [피치]' : '')));
        const color = isThr ? '#38bdf8' : (isRud ? '#f59e0b' : '#94a3b8');
        return `<span style="color:${color}; margin-right:8px;">축${i}${tag}: <strong>${valStr}</strong></span>`;
      });
      debugEl.innerHTML = axesStrs.join(' ');
    }
  }

  });
})();

