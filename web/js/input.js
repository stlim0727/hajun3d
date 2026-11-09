/**
 * Sky Jet Explorer 3D - Keyboard, Touch/Virtual Joystick, HOTAS 1 & Airbus TCA Sidestick Controls
 * Subsystem: input (11 methods)
 */

(function() {
  'use strict';

  const degrees = (radians) => (radians * 180) / Math.PI;
  const angleDelta = (angle, zero) => ((angle - zero + 540) % 360) - 180;

  /**
   * Gravity projected into screen axes avoids beta/gamma jumps near landscape (Flight3d standard).
   */
  function screenTilt(beta, gamma, angle) {
    const b = (beta * Math.PI) / 180;
    const g = (gamma * Math.PI) / 180;
    const a = (angle * Math.PI) / 180;
    const x = Math.cos(b) * Math.sin(g);
    const y = Math.sin(b);
    const z = Math.cos(b) * Math.cos(g);
    // DeviceOrientation's +gamma is -gravity.x; screen +90° puts device
    // +x at screen top and device +y at screen left. Preserve that handedness.
    const right = x * Math.cos(a) + y * Math.sin(a);
    const up = y * Math.cos(a) - x * Math.sin(a);
    return {
      pitch: degrees(Math.atan2(up, z)),
      roll: degrees(Math.atan2(right, Math.hypot(up, z))),
    };
  }

  function readGyroScreen(win = (typeof window !== 'undefined' ? window : globalThis)) {
    const orientation = win?.screen?.orientation;
    const rawAngle = orientation?.angle ?? win?.orientation;
    const angle = Number.isFinite(rawAngle) ? ((rawAngle % 360) + 360) % 360 : 0;
    const type = orientation?.type?.startsWith('landscape')
      ? 'landscape'
      : orientation?.type?.startsWith('portrait')
      ? 'portrait'
      : ((win?.innerWidth || 0) > (win?.innerHeight || 0) ? 'landscape' : 'portrait');
    return { angle, type };
  }

  function isGyroSupportedDevice(win = (typeof window !== 'undefined' ? window : globalThis), nav = (typeof navigator !== 'undefined' ? navigator : globalThis.navigator)) {
    if (typeof win === 'undefined' || !win || !win.DeviceOrientationEvent) return false;
    if (win.isSecureContext === false) return false;
    const ua = nav?.userAgent || '';
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/i.test(ua) && (nav?.maxTouchPoints || 0) > 1);
    const isMobileClient = Boolean(nav?.userAgentData?.mobile);
    const hasTouch = Boolean(('ontouchstart' in win) || ((nav?.maxTouchPoints ?? 0) > 0));
    return (isMobileUA || isMobileClient) && hasTouch;
  }

  // ----------------------------------------------------------------
  // 3rd-order non-linear response curve with 6% radial deadzone
  // shapeTouchStick(pitch, roll): 0.35 * travel + 0.65 * travel^3
  // Eliminates twitchiness while preserving full authority (Boeing 737 feel).
  // ----------------------------------------------------------------
  function shapeTouchStick(pitch, roll) {
    const magnitude = Math.hypot(pitch, roll);
    const deadzone = 0.06;
    if (magnitude <= deadzone) return [0, 0];
    const travel = (Math.min(1, magnitude) - deadzone) / (1 - deadzone);
    const response = 0.35 * travel + 0.65 * Math.pow(travel, 3);
    return [(pitch / magnitude) * response, (roll / magnitude) * response];
  }

  function triggerTouchHaptic(duration = 10) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(duration);
      } catch (_) {}
    }
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.degrees = degrees;
    globalThis.angleDelta = angleDelta;
    globalThis.screenTilt = screenTilt;
    globalThis.readGyroScreen = readGyroScreen;
    globalThis.isGyroSupportedDevice = isGyroSupportedDevice;
    globalThis.shapeTouchStick = shapeTouchStick;
    globalThis.triggerTouchHaptic = triggerTouchHaptic;
  }
  if (typeof window !== 'undefined') {
    window.degrees = degrees;
    window.angleDelta = angleDelta;
    window.screenTilt = screenTilt;
    window.readGyroScreen = readGyroScreen;
    window.isGyroSupportedDevice = isGyroSupportedDevice;
    window.shapeTouchStick = shapeTouchStick;
    window.triggerTouchHaptic = triggerTouchHaptic;
  }

  Object.assign(AirplaneGame.prototype, {
  degrees,
  angleDelta,
  screenTilt,
  readGyroScreen,
  isGyroSupportedDevice,
  shapeTouchStick,
  triggerTouchHaptic,

  setTouchStick(pitch, roll) {
    this.stickNormPitch = Math.max(-1.0, Math.min(1.0, pitch));
    this.stickNormRoll = Math.max(-1.0, Math.min(1.0, roll));
    this.isStickActive = Math.hypot(pitch, roll) > 0.02;
    this.updateTouchAndTiltOutput();
  },

  updateTouchAndTiltOutput() {
    let rawPitch = 0.0;
    let rawRoll = 0.0;

    // 자이로 틸트 성분 (737 감도: 피치 ±25°, 롤 ±30°)
    if (this.gyroActive && this.gyroCalibration) {
      rawPitch += this.gyroNormPitch || 0.0;
      rawRoll += this.gyroNormRoll || 0.0;
    }

    // 터치 가상 스틱 성분
    if (this.isStickActive) {
      rawPitch += this.stickNormPitch || 0.0;
      rawRoll += this.stickNormRoll || 0.0;
    }

    // 합성 벡터의 절대 크기가 1.0을 초과하지 않도록 정규화
    const magnitude = Math.hypot(rawPitch, rawRoll);
    if (magnitude > 1.0) {
      rawPitch /= magnitude;
      rawRoll /= magnitude;
    }

    // 737 수준의 3차 비선형 감도 곡선 및 6% 데드존 적용
    const [shapedPitch, shapedRoll] = shapeTouchStick(rawPitch, rawRoll);
    if (!this.joystickData) {
      this.joystickData = { x: 0, y: 0, active: false, rawX: 0, rawY: 0 };
    }
    this.joystickData.active = Math.hypot(rawPitch, rawRoll) > 0.02;
    this.joystickData.x = shapedRoll;
    this.joystickData.y = shapedPitch;
    this.joystickData.rawX = rawRoll;
    this.joystickData.rawY = rawPitch;
    if (this.joystickData.active) {
      this.isTouchStickReleasing = false;
    }

    this.syncStickVisuals(shapedPitch, shapedRoll);
  },

  syncStickVisuals(pitch, roll) {
    const telemEl = document.getElementById('touch-stick-telemetry');
    if (telemEl) {
      const pDeg = Math.round(pitch * 25);
      const rDeg = Math.round(roll * 30);
      telemEl.textContent = `P: ${pDeg > 0 ? '+' : ''}${pDeg}° | R: ${rDeg > 0 ? '+' : ''}${rDeg}°`;
    }

    const joystickStick = document.getElementById('joystick-stick');
    if (!joystickStick) return;

    if (this.isStickActive) {
      joystickStick.style.transition = 'none';
      joystickStick.style.transform = `translate(${this.stickCurrentX || 0}px, ${this.stickCurrentY || 0}px)`;
    } else if (this.gyroActive && this.gyroCalibration) {
      joystickStick.style.transition = 'transform 0.08s ease-out';
      const mag = Math.max(1.0, Math.hypot(this.gyroNormRoll, this.gyroNormPitch));
      const radius = this.stickRadius || 50;
      const gx = ((this.gyroNormRoll || 0) / mag) * radius;
      const gy = ((this.gyroNormPitch || 0) / mag) * radius;
      joystickStick.style.transform = `translate(${gx}px, ${gy}px)`;
    } else if (this.isTouchStickReleasing) {
      // 스프링 복귀 애니메이션 유지
    } else {
      joystickStick.style.transform = 'translate(0px, 0px)';
    }
  },

  initGyroControls() {
    this._boundHandleOrientation = this.handleDeviceOrientation.bind(this);
    this._boundScreenOrientationChange = () => this.recenterGyro();

    // Flight3d 표준: 모바일/터치/태블릿 환경에서 틸트 기본 활성화
    let storedPref = null;
    try {
      if (typeof localStorage !== 'undefined') {
        storedPref = localStorage.getItem('hajun3d_gyro_enabled');
      }
    } catch (_) {}

    const isSupported = isGyroSupportedDevice();
    const shouldEnable = (storedPref !== null) ? (storedPref === 'true') : isSupported;

    this.gyroEnabled = shouldEnable;
    this.gyroActive = false;
    this.gyroCalibration = null;
    this.gyroNormPitch = 0.0;
    this.gyroNormRoll = 0.0;
    this.gyroScreen = readGyroScreen(typeof window !== 'undefined' ? window : globalThis);

    if (this.gyroEnabled) {
      this.enableGyro(false);
    }

    // iOS 13+ 제스처 잠금 해제: 첫 터치 시 requestPermission 호출
    if (typeof window !== 'undefined') {
      const requestOnGesture = async () => {
        if (this.gyroEnabled && !this.gyroActive && typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
          await this.enableGyro(true);
        }
      };
      window.addEventListener('pointerdown', requestOnGesture, { once: true, passive: true });
      window.addEventListener('touchstart', requestOnGesture, { once: true, passive: true });
    }

    this.syncGyroUI();
  },

  handleDeviceOrientation(e) {
    if (!this.gyroActive || !this.gyroEnabled) return;
    if (!Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return;

    const win = typeof window !== 'undefined' ? window : globalThis;
    const screen = readGyroScreen(win);
    if (screen.angle !== this.gyroScreen.angle || screen.type !== this.gyroScreen.type) {
      this.gyroScreen = screen;
      this.recenterGyro();
    }

    const tilt = screenTilt(e.beta, e.gamma, screen.angle);
    if (!this.gyroCalibration) {
      this.gyroCalibration = tilt;
    }

    // Flight3d 보잉 737 표준 틸트 감도:
    // - 피치: ±25° 기울임 -> ±1.0 (737 조종간 엘리베이터 풀 트래블)
    // - 롤: ±30° 기울임 -> ±1.0 (737 조종간 에일러론 뱅크 풀 트래블)
    const dPitch = angleDelta(tilt.pitch, this.gyroCalibration.pitch);
    const dRoll = angleDelta(tilt.roll, this.gyroCalibration.roll);

    this.gyroNormPitch = Math.max(-1.0, Math.min(1.0, dPitch / 25.0));
    this.gyroNormRoll = Math.max(-1.0, Math.min(1.0, dRoll / 30.0));

    this.updateTouchAndTiltOutput();
  },

  async enableGyro(userGesture = false) {
    if (typeof window === 'undefined') return false;
    const orientation = window.DeviceOrientationEvent;
    if (!orientation || window.isSecureContext === false) {
      return false;
    }
    if (typeof orientation.requestPermission === 'function') {
      if (!userGesture) return false;
      try {
        const response = await orientation.requestPermission();
        if (response !== 'granted') return false;
      } catch (_) {
        return false;
      }
    }

    this.gyroEnabled = true;
    this.gyroActive = true;
    this.gyroCalibration = null;
    this.gyroScreen = readGyroScreen(window);

    window.addEventListener('deviceorientation', this._boundHandleOrientation, { passive: true });
    window.screen?.orientation?.addEventListener?.('change', this._boundScreenOrientationChange);
    window.addEventListener('orientationchange', this._boundScreenOrientationChange);

    this.syncGyroUI();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hajun3d_gyro_enabled', 'true');
      }
    } catch (_) {}
    return true;
  },

  disableGyro() {
    this.gyroEnabled = false;
    this.gyroActive = false;
    this.gyroCalibration = null;
    this.gyroNormPitch = 0.0;
    this.gyroNormRoll = 0.0;

    if (typeof window !== 'undefined') {
      if (this._boundHandleOrientation) {
        window.removeEventListener('deviceorientation', this._boundHandleOrientation);
      }
      if (this._boundScreenOrientationChange) {
        window.screen?.orientation?.removeEventListener?.('change', this._boundScreenOrientationChange);
        window.removeEventListener('orientationchange', this._boundScreenOrientationChange);
      }
    }

    this.syncGyroUI();
    this.updateTouchAndTiltOutput();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hajun3d_gyro_enabled', 'false');
      }
    } catch (_) {}
  },

  recenterGyro() {
    this.gyroCalibration = null;
    this.gyroNormPitch = 0.0;
    this.gyroNormRoll = 0.0;
    this.gyroScreen = readGyroScreen(typeof window !== 'undefined' ? window : globalThis);
    this.updateTouchAndTiltOutput();
  },

  async toggleGyroTilt(userGesture = true) {
    if (this.gyroActive) {
      this.disableGyro();
      if (typeof this.showPopup === 'function') {
        this.showPopup('기기 기울기(틸트) 조종 비활성화');
      }
    } else {
      const success = await this.enableGyro(userGesture);
      if (success) {
        this.recenterGyro();
        if (typeof this.showPopup === 'function') {
          this.showPopup('📱 기기 기울기(틸트) 조종 활성화 (737 감도 / 영점 보정 완료)');
        }
      } else {
        if (typeof this.showPopup === 'function') {
          this.showPopup('이 기기에서는 자이로/기울기 센서를 지원하지 않습니다');
        }
      }
    }
  },

  syncGyroUI() {
    const gyroBtn = document.getElementById('btn-touch-gyro');
    const gyroLabel = document.getElementById('touch-gyro-label');
    if (gyroBtn) {
      gyroBtn.classList.toggle('active', this.gyroActive);
      gyroBtn.classList.toggle('gyro-active', this.gyroActive);
      gyroBtn.setAttribute('aria-pressed', String(this.gyroActive));
    }
    if (gyroLabel) {
      gyroLabel.textContent = this.gyroActive ? '틸트 ON' : '틸트 OFF';
    }
    const mobileGyroStatus = document.getElementById('mobile-gyro-status');
    if (mobileGyroStatus) {
      mobileGyroStatus.textContent = this.gyroActive ? 'ON (737 감도)' : 'OFF';
    }
  },

  setTouchThrottle(val) {
    const clamped = Math.max(0.0, Math.min(1.0, val));
    this.throttle = clamped;
    this.syncTouchThrottleUI(clamped);
  },

  syncTouchThrottleUI(clamped) {
    const pct = Math.round(clamped * 100);
    const throttleReadout = document.getElementById('touch-thr-val');
    if (throttleReadout) {
      let label = `${pct}%`;
      if (pct >= 98) label = 'TOGA 100%';
      else if (pct >= 68 && pct <= 72) label = 'CLB 70%';
      else if (pct >= 38 && pct <= 42) label = 'APP 40%';
      else if (pct <= 2) label = 'IDLE 0%';
      throttleReadout.textContent = label;
    }
    const throttleFill = document.getElementById('touch-throttle-fill');
    if (throttleFill) {
      throttleFill.style.height = `${pct}%`;
    }
    const throttleThumb = document.getElementById('touch-throttle-thumb');
    if (throttleThumb) {
      throttleThumb.style.top = `${(1.0 - clamped) * 100}%`;
    }
    if (this.boostVal && this.boostBar) {
      const digit = Math.round(clamped * 10);
      this.boostVal.textContent = `${pct}% [키 ${digit}]`;
      this.boostBar.style.width = `${pct}%`;
    }
  },

  setTouchRudder(val) {
    this.touchRudder = Math.max(-1.0, Math.min(1.0, val));
    if (Math.abs(this.touchRudder) > 0.02) {
      this.isTouchRudderReleasing = false;
    }
  },

  setTouchBrakes(val) {
    this.keys.brake = val > 0.1;
  },
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
          if (typeof this.syncTouchThrottleUI === 'function') this.syncTouchThrottleUI(this.throttle);
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

    // ----------------------------------------------------------------
    // 모바일 터치 비행 조종 시스템 (Virtual Stick, Throttle Quadrant, Rudder & Brakes)
    // - 3차 비선형 응답 곡선(3rd-order non-linear response) 및 6% 레이디얼 데드존
    // - Pointer Capture(pointerdown, pointermove, pointerup, pointercancel)로 화면 이탈 완벽 방어
    // - 연속 드래그 스로틀 쿼드런트 및 마그네틱 디텐트 스냅 (IDLE 0%, 40%, 70%, 100% TOGA) + 햅틱
    // - 탄성 스프링 복귀(Elastic Spring Return) 러더 슬라이더 및 노즈휠 스티어링 연동
    // ----------------------------------------------------------------
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    const telemEl = document.getElementById('touch-stick-telemetry');
    let stickPointerId = null;
    let stickCenterX = 0;
    let stickCenterY = 0;
    let stickRadius = 50;

    const updateStickGeometry = () => {
      if (!joystickZone) return;
      const rect = joystickZone.getBoundingClientRect();
      stickCenterX = rect.left + rect.width * 0.5;
      stickCenterY = rect.top + rect.height * 0.5;
      stickRadius = Math.max(32, Math.min(rect.width, rect.height) * 0.42);
    };

    const updateStickPosition = (clientX, clientY) => {
      let dx = clientX - stickCenterX;
      let dy = clientY - stickCenterY;
      const dist = Math.hypot(dx, dy);

      if (dist > stickRadius) {
        dx = (dx / dist) * stickRadius;
        dy = (dy / dist) * stickRadius;
      }

      this.stickCurrentX = dx;
      this.stickCurrentY = dy;
      this.stickRadius = stickRadius;

      // 항공 조종간 표준:
      // 아래로 당김 (dy > 0) -> 기수 상승 (Pitch Up > 0)
      // 위로 밂 (dy < 0) -> 기수 하강 (Pitch Down < 0)
      // 우측 (dx > 0) -> 우측 롤 (Roll Right > 0)
      // 좌측 (dx < 0) -> 좌측 롤 (Roll Left < 0)
      const rawPitch = dy / stickRadius;
      const rawRoll = dx / stickRadius;

      this.stickNormPitch = rawPitch;
      this.stickNormRoll = rawRoll;
      this.isStickActive = true;
      this.updateTouchAndTiltOutput();
    };

    if (joystickZone) {
      joystickZone.addEventListener('pointerdown', (e) => {
        if (this.isDestroyed || stickPointerId !== null) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        stickPointerId = e.pointerId;
        this.isTouchStickReleasing = false;
        try {
          joystickZone.setPointerCapture(e.pointerId);
        } catch (_) {}
        updateStickGeometry();
        updateStickPosition(e.clientX, e.clientY);
        triggerTouchHaptic(10);
      });

      joystickZone.addEventListener('pointermove', (e) => {
        if (stickPointerId === null || e.pointerId !== stickPointerId) return;
        e.preventDefault();
        updateStickPosition(e.clientX, e.clientY);
      });

      const onStickPointerEnd = (e) => {
        if (stickPointerId === null || e.pointerId !== stickPointerId) return;
        try {
          if (joystickZone.hasPointerCapture(e.pointerId)) {
            joystickZone.releasePointerCapture(e.pointerId);
          }
        } catch (_) {}
        stickPointerId = null;
        this.isStickActive = false;
        this.stickNormPitch = 0.0;
        this.stickNormRoll = 0.0;
        this.stickCurrentX = 0;
        this.stickCurrentY = 0;

        if (!this.gyroActive) {
          this.isTouchStickReleasing = true;
          if (joystickStick) {
            joystickStick.style.transition = 'transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            joystickStick.style.transform = 'translate(0px, 0px)';
          }
        }
        this.updateTouchAndTiltOutput();
        triggerTouchHaptic(8);
      };

      joystickZone.addEventListener('pointerup', onStickPointerEnd);
      joystickZone.addEventListener('pointercancel', onStickPointerEnd);
      joystickZone.addEventListener('lostpointercapture', onStickPointerEnd);
    }

    // ----------------------------------------------------------------
    // 수직 스로틀 쿼드런트 (Vertical Throttle Quadrant & Presets)
    // ----------------------------------------------------------------
    const throttleTrack = document.getElementById('touch-throttle-track');
    let throttlePointerId = null;
    this.isTouchThrottleActive = false;
    let lastHapticDetent = null;

    if (throttleTrack) {
      const updateThrottleFromPointer = (clientY) => {
        const rect = throttleTrack.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const clampedY = Math.max(0, Math.min(rect.height, relativeY));
        let normalized = 1.0 - (clampedY / rect.height);

        // Realistic detent magnetic snap (IDLE 0%, APP 40%, CLB 70%, TOGA 100%)
        const detents = [
          { val: 0.0, range: 0.04 },
          { val: 0.40, range: 0.035 },
          { val: 0.70, range: 0.035 },
          { val: 1.0, range: 0.04 }
        ];
        let matchedDetent = null;
        for (const d of detents) {
          if (Math.abs(normalized - d.val) <= d.range) {
            normalized = d.val;
            matchedDetent = d.val;
            break;
          }
        }
        if (matchedDetent !== null && matchedDetent !== lastHapticDetent) {
          lastHapticDetent = matchedDetent;
          triggerTouchHaptic(14);
        } else if (matchedDetent === null) {
          lastHapticDetent = null;
        }

        this.setTouchThrottle(normalized);
      };

      throttleTrack.addEventListener('pointerdown', (e) => {
        if (this.isDestroyed || throttlePointerId !== null) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        throttlePointerId = e.pointerId;
        this.isTouchThrottleActive = true;
        try {
          throttleTrack.setPointerCapture(e.pointerId);
        } catch (_) {}
        updateThrottleFromPointer(e.clientY);
        triggerTouchHaptic(10);
      });

      throttleTrack.addEventListener('pointermove', (e) => {
        if (throttlePointerId === null || e.pointerId !== throttlePointerId) return;
        e.preventDefault();
        updateThrottleFromPointer(e.clientY);
      });

      const onThrottlePointerEnd = (e) => {
        if (throttlePointerId === null || e.pointerId !== throttlePointerId) return;
        try {
          if (throttleTrack.hasPointerCapture(e.pointerId)) {
            throttleTrack.releasePointerCapture(e.pointerId);
          }
        } catch (_) {}
        throttlePointerId = null;
        this.isTouchThrottleActive = false;
        lastHapticDetent = null;
      };

      throttleTrack.addEventListener('pointerup', onThrottlePointerEnd);
      throttleTrack.addEventListener('pointercancel', onThrottlePointerEnd);
      throttleTrack.addEventListener('lostpointercapture', onThrottlePointerEnd);
    }

    // 퀵 디텐트 프리셋 버튼 (IDLE, 40%, 70%, 100% TOGA)
    const presetButtons = document.querySelectorAll('.btn-touch-preset');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const thr = parseFloat(btn.getAttribute('data-thr') || '0');
        this.setTouchThrottle(thr);
        triggerTouchHaptic(15);
        this.showPopup(`엔진 출력: ${Math.round(thr * 100)}% (디텐트 프리셋)`);
      });
    });

    // ----------------------------------------------------------------
    // 방향타(Rudder) & 노즈휠 스티어링 슬라이더 (Spring Center)
    // ----------------------------------------------------------------
    const rudderTrack = document.getElementById('touch-rudder-track');
    const rudderThumb = document.getElementById('touch-rudder-thumb');
    const rudderReadout = document.getElementById('touch-rudder-val');
    let rudderPointerId = null;

    if (rudderTrack) {
      const updateRudderFromPointer = (clientX) => {
        const rect = rudderTrack.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.5;
        const maxDeflection = Math.max(16, (rect.width * 0.5) - 16);
        let dx = clientX - centerX;
        dx = Math.max(-maxDeflection, Math.min(maxDeflection, dx));

        if (rudderThumb) {
          rudderThumb.style.transition = 'none';
          rudderThumb.style.transform = `translateX(${dx}px)`;
        }

        const normRudder = dx / maxDeflection;
        this.setTouchRudder(normRudder);

        if (rudderReadout) {
          const deg = Math.round(normRudder * 30);
          rudderReadout.textContent = `${deg > 0 ? '+' : ''}${deg}°`;
        }
      };

      rudderTrack.addEventListener('pointerdown', (e) => {
        if (this.isDestroyed || rudderPointerId !== null) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        rudderPointerId = e.pointerId;
        this.isTouchRudderReleasing = false;
        try {
          rudderTrack.setPointerCapture(e.pointerId);
        } catch (_) {}
        updateRudderFromPointer(e.clientX);
        triggerTouchHaptic(10);
      });

      rudderTrack.addEventListener('pointermove', (e) => {
        if (rudderPointerId === null || e.pointerId !== rudderPointerId) return;
        e.preventDefault();
        updateRudderFromPointer(e.clientX);
      });

      const onRudderPointerEnd = (e) => {
        if (rudderPointerId === null || e.pointerId !== rudderPointerId) return;
        try {
          if (rudderTrack.hasPointerCapture(e.pointerId)) {
            rudderTrack.releasePointerCapture(e.pointerId);
          }
        } catch (_) {}
        rudderPointerId = null;
        this.isTouchRudderReleasing = true;
        if (rudderThumb) {
          rudderThumb.style.transition = 'transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
          rudderThumb.style.transform = 'translateX(0px)';
        }
        if (rudderReadout) rudderReadout.textContent = '0°';
        triggerTouchHaptic(8);
      };

      rudderTrack.addEventListener('pointerup', onRudderPointerEnd);
      rudderTrack.addEventListener('pointercancel', onRudderPointerEnd);
      rudderTrack.addEventListener('lostpointercapture', onRudderPointerEnd);
    }

    // ----------------------------------------------------------------
    // 유압 휠 브레이크 (Hydraulic Wheel Brakes - Hold to Brake)
    // ----------------------------------------------------------------
    const touchBrakeBtn = document.getElementById('touch-btn-brake');
    if (touchBrakeBtn) {
      const startBraking = (e) => {
        e.preventDefault();
        touchBrakeBtn.classList.add('active');
        this.setTouchBrakes(1.0);
        triggerTouchHaptic(20);
      };
      const stopBraking = (e) => {
        e.preventDefault();
        touchBrakeBtn.classList.remove('active');
        this.setTouchBrakes(0.0);
        triggerTouchHaptic(10);
      };

      touchBrakeBtn.addEventListener('pointerdown', startBraking);
      touchBrakeBtn.addEventListener('pointerup', stopBraking);
      touchBrakeBtn.addEventListener('pointercancel', stopBraking);
      touchBrakeBtn.addEventListener('pointerleave', stopBraking);
    }

    // 모바일 가속/감속 레거시 버튼 (하위 호환성)
    const btnBoost = document.getElementById('btn-boost');
    const btnBrake = document.getElementById('btn-brake');

    if (btnBoost) {
      btnBoost.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.throttle = Math.min(1.0, this.throttle + 0.2);
        this.setTouchThrottle(this.throttle);
      });
    }

    if (btnBrake) {
      btnBrake.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.throttle = Math.max(0.0, this.throttle - 0.2);
        this.setTouchThrottle(this.throttle);
        this.keys.brake = true;
      });

      btnBrake.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.keys.brake = false;
      });
      btnBrake.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        this.keys.brake = false;
      });
    }

    // ----------------------------------------------------------------
    // 기기 기울기(틸트 / 자이로 센서) 모드 초기화 (Flight3d 737 표준)
    // ----------------------------------------------------------------
    const gyroBtn = document.getElementById('btn-touch-gyro');
    if (gyroBtn) {
      gyroBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleGyroTilt(true);
      });
    }

    try {
      this.initGyroControls();
    } catch (err) {
      console.warn('initGyroControls error:', err);
    }
  },

  updateJoystick(touchX, touchY, rect, stickEl) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = Math.max(20, (Math.min(rect.width, rect.height) - 50) * 0.5);

    let dx = touchX - centerX;
    let dy = touchY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    this.stickCurrentX = dx;
    this.stickCurrentY = dy;
    this.stickRadius = maxRadius;

    if (stickEl) {
      stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    const rawPitch = dy / maxRadius;
    const rawRoll = dx / maxRadius;
    this.stickNormPitch = rawPitch;
    this.stickNormRoll = rawRoll;
    this.isStickActive = Math.hypot(rawPitch, rawRoll) > 0.02;
    this.updateTouchAndTiltOutput();
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

