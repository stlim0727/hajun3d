/**
 * Sky Jet Explorer 3D - 3D Newtonian Aerodynamics, Spool Dynamics, Flaps, Spoilers, Reverse Thrust & Landing Gear
 * Subsystem: physics (13 methods)
 */

(function() {
  'use strict';

  // ----------------------------------------------------------------
  // International Standard Atmosphere (ISA) Model (Flight3d 표준)
  // - 고도별 온도, 기압, 공기 밀도(rho), 음속(speedOfSound), 밀도비 계산
  // ----------------------------------------------------------------
  const Atmosphere = {
    R: 287.05,          // J/(kg·K)
    GAMMA: 1.4,
    G0: 9.80665,        // m/s^2
    T0: 288.15,         // 해수면 표준 온도 (15°C)
    P0: 101325.0,       // 해수면 표준 기압 (Pa)
    RHO0: 1.225,        // 해수면 표준 밀도 (kg/m^3)
    LAPSE_RATE: 0.0065, // 대류권 기온 감률 (K/m)
    TROPOPAUSE_ALT: 11000.0, // 대류권계면 고도 (m)

    getConditions(altitudeMeters) {
      const h = Math.max(-500, Math.min(altitudeMeters, 25000));
      let temperature, pressure;

      if (h <= this.TROPOPAUSE_ALT) {
        // 대류권 (Troposphere)
        temperature = this.T0 - this.LAPSE_RATE * h;
        pressure = this.P0 * Math.pow(temperature / this.T0, this.G0 / (this.LAPSE_RATE * this.R));
      } else {
        // 성층권 하부 (Lower Stratosphere)
        const tTropo = this.T0 - this.LAPSE_RATE * this.TROPOPAUSE_ALT;
        const pTropo = this.P0 * Math.pow(tTropo / this.T0, this.G0 / (this.LAPSE_RATE * this.R));
        temperature = tTropo;
        const dh = h - this.TROPOPAUSE_ALT;
        pressure = pTropo * Math.exp((-this.G0 * dh) / (this.R * tTropo));
      }

      const density = pressure / (this.R * temperature);
      const speedOfSound = Math.sqrt(this.GAMMA * this.R * temperature);
      const densityRatio = density / this.RHO0;

      return { temperature, pressure, density, speedOfSound, densityRatio };
    },

    tasToIas(tas, densityRatio) {
      return tas * Math.sqrt(Math.max(0.001, densityRatio));
    },

    iasToTas(ias, densityRatio) {
      return ias / Math.sqrt(Math.max(0.001, densityRatio));
    },

    msToKnots(ms) {
      return ms * 1.94384;
    },

    knotsToMs(knots) {
      return knots / 1.94384;
    }
  };

  if (typeof globalThis !== 'undefined') globalThis.Atmosphere = Atmosphere;
  if (typeof window !== 'undefined') window.Atmosphere = Atmosphere;

  Object.assign(AirplaneGame.prototype, {
  Atmosphere,
  // ----------------------------------------------------------------
  // 랜딩 기어 시퀀서 (도어 개방 ➔ 기어 전개/수납 ➔ 도어 폐쇄 3단계 물리)
  // ----------------------------------------------------------------
  toggleLandingGear() {
    if (typeof triggerTouchHaptic === 'function') triggerTouchHaptic(18);
    if (this.isGearCollapsed) {
      this.showPopup('❌ 랜딩 기어가 파손되어 작동하지 않습니다!');
      return;
    }

    // 전개/수납 애니메이션 진행 중일 때 연타 방지
    if (this.gearPhase === 'EXTENDING' || this.gearPhase === 'RETRACTING') {
      this.showPopup('⏳ 랜딩 기어가 이미 작동 중입니다.');
      return;
    }

    // 지상 안전 인터록 (Weight-on-Wheels / Squat Switch): 활주 중 기어 접힘 방지
    if (this.isOnGround && this.gearExtended) {
      this.showPopup('⚠️ 지상 접지 상태에서는 안전 락(Squat Switch)으로 인해 기어를 접을 수 없습니다!');
      this.playCautionChime();
      return;
    }

    if (this.gearExtended) {
      this.startGearRetraction();
    } else {
      this.startGearExtension();
    }
  },

  startGearRetraction() {
    this.gearPhase = 'RETRACTING';
    this.gearPhaseTimer = 0.0;
    this.gearExtended = false;
    this.updateGearUI('수납 중...', 'gear-transit');
    this.showPopup('✈️ 랜딩 기어 수납 시퀀스 시작 (도어 개방 ➔ 기어 수납 ➔ 도어 폐쇄)');
    this.playHydraulicSound();
  },

  startGearExtension() {
    this.gearPhase = 'EXTENDING';
    this.gearPhaseTimer = 0.0;
    // 전개 시작 즉시 기어 스트럿 메쉬 표시
    this.landingGears.forEach(g => {
      if (g.userData && g.userData.strutPivot) {
        g.userData.strutPivot.visible = true;
      }
    });
    this.updateGearUI('전개 중...', 'gear-transit');
    this.showPopup('🛞 랜딩 기어 전개 시퀀스 시작 (도어 개방 ➔ 기어 전개 ➔ 도어 폐쇄)');
    this.playHydraulicSound();
  },

  updateLandingGearAnimation(dt) {
    if (this.gearPhase === 'DOWN' || this.gearPhase === 'UP' || this.gearPhase === 'COLLAPSED') {
      return;
    }

    this.gearPhaseTimer += dt;
    const progress = Math.min(1.0, this.gearPhaseTimer / this.gearPhaseDuration);
    const isExtending = (this.gearPhase === 'EXTENDING');

    // 3단계 시퀀스 타이밍 (총 2.4초)
    // 단계 1: 0.0s ~ 0.7s (도어 개방, 0.7초)
    // 단계 2: 0.7s ~ 1.7s (기어 스윙 회전, 1.0초)
    // 단계 3: 1.7s ~ 2.4s (도어 폐쇄 및 락, 0.7초)
    let doorAngle = 0.0;
    let strutAngle = 0.0;
    let bogieTilt = 0.0;

    const maxDoorAngle = 1.48; // 약 85도 개방
    const retractedStrutAngle = -Math.PI / 2; // -90도 수납

    const smoothStep = (t) => {
      const clamped = Math.max(0, Math.min(1, t));
      return clamped * clamped * (3 - 2 * clamped);
    };

    if (isExtending) {
      // [전개] 도어 열림 ➔ 기어 하강 ➔ 도어 닫힘
      if (this.gearPhaseTimer < 0.7) {
        const p = smoothStep(this.gearPhaseTimer / 0.7);
        doorAngle = maxDoorAngle * p;
        strutAngle = retractedStrutAngle;
        bogieTilt = -0.22;
      } else if (this.gearPhaseTimer < 1.7) {
        const p = smoothStep((this.gearPhaseTimer - 0.7) / 1.0);
        doorAngle = maxDoorAngle;
        strutAngle = retractedStrutAngle * (1 - p);
        bogieTilt = -0.22 * (1 - p);
      } else {
        const p = smoothStep((this.gearPhaseTimer - 1.7) / 0.7);
        doorAngle = maxDoorAngle * (1 - p);
        strutAngle = 0;
        bogieTilt = 0;
      }

      this.landingGears.forEach(g => {
        if (g.userData && g.userData.strutPivot) g.userData.strutPivot.visible = true;
      });

    } else {
      // [수납] 도어 열림 ➔ 기어 상승 ➔ 도어 닫힘
      if (this.gearPhaseTimer < 0.7) {
        const p = smoothStep(this.gearPhaseTimer / 0.7);
        doorAngle = maxDoorAngle * p;
        strutAngle = 0;
        bogieTilt = -0.22 * p;
      } else if (this.gearPhaseTimer < 1.7) {
        const p = smoothStep((this.gearPhaseTimer - 0.7) / 1.0);
        doorAngle = maxDoorAngle;
        strutAngle = retractedStrutAngle * p;
        bogieTilt = -0.22;
      } else {
        const p = smoothStep((this.gearPhaseTimer - 1.7) / 0.7);
        doorAngle = maxDoorAngle * (1 - p);
        strutAngle = retractedStrutAngle;
        bogieTilt = 0;
      }
    }

    // 각 기어 조립체의 도어 및 스트럿 각도 실시간 반영
    this.landingGears.forEach(gear => {
      const u = gear.userData;
      if (!u) return;

      if (u.doorL) u.doorL.rotation.z = -doorAngle;
      if (u.doorR) u.doorR.rotation.z = doorAngle;

      if (u.strutPivot) {
        u.strutPivot.rotation.x = strutAngle;
      }

      if (u.bogieBeam) {
        u.bogieBeam.rotation.x = bogieTilt;
      }
    });

    // 시퀀스 완료 처리
    if (progress >= 1.0) {
      if (isExtending) {
        this.gearPhase = 'DOWN';
        this.gearExtended = true;
        this.landingGears.forEach(gear => {
          const u = gear.userData;
          if (u) {
            if (u.doorL) u.doorL.rotation.z = 0;
            if (u.doorR) u.doorR.rotation.z = 0;
            if (u.strutPivot) {
              u.strutPivot.rotation.x = 0;
              u.strutPivot.visible = true;
            }
            if (u.bogieBeam) u.bogieBeam.rotation.x = 0;
          }
        });
        this.updateGearUI('DOWN', 'gear-down');
        this.playGearLockSound();
        this.showPopup('✅ 랜딩 기어 전개 완료 및 다운 락 (Gear Down & Locked)');
      } else {
        this.gearPhase = 'UP';
        this.gearExtended = false;
        this.landingGears.forEach(gear => {
          const u = gear.userData;
          if (u) {
            if (u.doorL) u.doorL.rotation.z = 0;
            if (u.doorR) u.doorR.rotation.z = 0;
            if (u.strutPivot) {
              u.strutPivot.rotation.x = retractedStrutAngle;
              u.strutPivot.visible = false;
            }
            if (u.bogieBeam) u.bogieBeam.rotation.x = 0;
          }
        });
        this.updateGearUI('UP', 'gear-up');
        this.playGearLockSound();
        this.showPopup('✅ 랜딩 기어 수납 완료 및 업 락 (Gear Up & Locked)');
      }
    }
  },

  // 가동 조종면 실시간 애니메이션 (에일러론, 엘리베이터, 러더, 노즈 휠 - HOTAS 1 에어버스 연동)
  updateControlSurfaces(dt) {
    let rollInput = 0;
    if (this.keys.left) rollInput -= 1;
    if (this.keys.right) rollInput += 1;
    if (this.joystickData && this.joystickData.active) {
      rollInput += this.joystickData.x;
    }
    if (this.hotasState && this.hotasState.connected && Math.abs(this.hotasState.roll) > 0.07) {
      rollInput = this.hotasState.roll;
    }

    let pitchInput = 0;
    if (this.keys.up) pitchInput -= 1;   // 하강
    if (this.keys.down) pitchInput += 1; // 상승
    if (this.joystickData && this.joystickData.active) {
      pitchInput += this.joystickData.y;
    }
    if (this.hotasState && this.hotasState.connected && Math.abs(this.hotasState.pitch) > 0.06) {
      pitchInput = this.hotasState.pitch;
    }

    // 1. 에일러론: 좌/우가 반대로 꺾임
    const targetAileron = rollInput * 0.42; // rad
    if (this.controlSurfaces.leftAileron) {
      this.controlSurfaces.leftAileron.rotation.x = THREE.MathUtils.lerp(
        this.controlSurfaces.leftAileron.rotation.x,
        -targetAileron,
        0.18
      );
    }
    if (this.controlSurfaces.rightAileron) {
      this.controlSurfaces.rightAileron.rotation.x = THREE.MathUtils.lerp(
        this.controlSurfaces.rightAileron.rotation.x,
        targetAileron,
        0.18
      );
    }

    // 2. 엘리베이터: 기수 상승 시 후연이 위로 꺾임 (-X 회전)
    const targetElevator = -pitchInput * 0.45;
    if (this.controlSurfaces.leftElevator) {
      this.controlSurfaces.leftElevator.rotation.x = THREE.MathUtils.lerp(
        this.controlSurfaces.leftElevator.rotation.x,
        targetElevator,
        0.18
      );
    }

    // 3. 러더 & 노즈 휠: 방향 조향 (러더 입력 + 에일러론 협조)
    if (this.isTouchRudderReleasing) {
      this.touchRudder *= 0.82;
      if (Math.abs(this.touchRudder) < 0.01) {
        this.touchRudder = 0.0;
        this.isTouchRudderReleasing = false;
      }
    }
    let rudderInput = 0;
    if (Math.abs(this.touchRudder || 0) > 0.01) {
      rudderInput = this.touchRudder;
    }
    if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.12) {
      rudderInput = this.hotasState.yaw;
    }

    let targetRudder = 0;
    if (Math.abs(rudderInput) > 0.01) {
      targetRudder = -rudderInput * 0.55;
    } else if (Math.abs(rollInput) > 0.06) {
      targetRudder = -rollInput * 0.35;
    }

    if (this.controlSurfaces.rudder) {
      this.controlSurfaces.rudder.rotation.y = THREE.MathUtils.lerp(
        this.controlSurfaces.rudder.rotation.y,
        targetRudder,
        0.22
      );
    }
    if (this.controlSurfaces.noseWheelGroup && this.isOnGround) {
      let steerWheel = 0;
      if (Math.abs(this.touchRudder || 0) > 0.01) {
        steerWheel = -this.touchRudder * 0.55;
      } else if (Math.abs(rollInput) > 0.06) {
        steerWheel = -rollInput * 0.42;
      }
      if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.12) {
        steerWheel = -this.hotasState.yaw * 0.55;
      }
      this.controlSurfaces.noseWheelGroup.rotation.y = THREE.MathUtils.lerp(
        this.controlSurfaces.noseWheelGroup.rotation.y,
        steerWheel,
        0.24
      );
    }
  },

  // ----------------------------------------------------------------
  // 플랩, 스포일러, 역추진 제어 및 UI / 사운드
  // ----------------------------------------------------------------
  toggleFlaps() {
    if (typeof triggerTouchHaptic === 'function') triggerTouchHaptic(14);
    this.flapIndex = (this.flapIndex + 1) % this.flaps.length;
    const flapName = this.flaps[this.flapIndex];
    this.playFlapSound();
    this.updateFlapsUI();
    const specs = this.getAircraftSpecs(this.currentPlaneType);
    const stallMult = [1.0, 0.88, 0.78, 0.68][this.flapIndex];
    const vStall = Math.round(specs.vStallCleanKmh * stallMult);
    this.showPopup(`🪽 플랩 설정: FLAPS ${flapName} (실속 속도 V_stall: ${vStall} km/h)`);
  },

  toggleSpoilers() {
    if (typeof triggerTouchHaptic === 'function') triggerTouchHaptic(14);
    this.spoilerExtended = !this.spoilerExtended;
    this.playSpoilerSound();
    this.updateSpoilerUI();
    this.showPopup(this.spoilerExtended 
      ? '🛑 스피드브레이크 전개 (SPOILER EXT - 항력 급증 & 급강하 제동)' 
      : '🟢 스피드브레이크 수납 (SPOILER RET)');
  },

  toggleReverseThrust() {
    if (!this.isOnGround) {
      this.showPopup('⚠️ 역추진 장치(REV)는 안전을 위해 지상 접지 상태에서만 작동합니다!');
      return;
    }
    this.reverseThrustActive = !this.reverseThrustActive;
    this.playReverseThrustSound(this.reverseThrustActive);
    this.updateReverserUI();
    this.showPopup(this.reverseThrustActive 
      ? '⚡ 엔진 역추진 작동 (REVERSE THRUST ENGAGED - 강력한 제트 감속 제동!)' 
      : '⚪ 엔진 역추진 해제 (REVERSE THRUST OFF)');
  },

  updateFlightPhysics(dt) {
    dt = Math.min(0.04, Math.max(0.001, dt));
    const cruiseRate = this.cruiseMultiplier || 1;
    const effectiveDt = dt * cruiseRate;

    // 조종사 스로틀 레버 입력 처리
    if (this.keys.fastForward) {
      this.throttle = Math.min(1.0, this.throttle + 0.02);
    }
    if (this.keys.brake) {
      this.throttle = Math.max(0.0, this.throttle - 0.03);
    }

    const specs = this.getAircraftSpecs(this.currentPlaneType);

    // --------------------------------------------------------------
    // 0. 터보팬 엔진 N1% 스풀업/스풀다운 관성 동역학 (Turbofan Spool Lag)
    // --------------------------------------------------------------
    let targetN1 = 20.0 + this.throttle * 80.0; // Idle 20% ~ Max TOGA 100%
    if (this.isEngineOff) targetN1 = 0.0;
    if (this.currentEmergency === 'bird_strike') targetN1 = 0.0; // 전 엔진 꺼짐 (글라이더 활공)
    if (this.currentEmergency === 'engine_fire') targetN1 = Math.min(targetN1, 52.0); // 1발 화재 추력 50% 제한

    if (this.n1 < targetN1) {
      this.n1 = Math.min(targetN1, this.n1 + 22.0 * effectiveDt); // Idle ➔ TOGA 약 3.6초 소요
    } else if (this.n1 > targetN1) {
      this.n1 = Math.max(targetN1, this.n1 - 18.0 * effectiveDt);
    }

    const n1Frac = Math.max(0, this.n1 / 100.0);
    const altM = Math.max(0, (this.planeGroup.position.y - this.groundY) * 10);
    const atmos = Atmosphere.getConditions(altM);
    const rho = atmos.density;
    const densityRatio = atmos.densityRatio;
    const speedOfSound = atmos.speedOfSound;

    // 고도 상승에 따른 공기 희박으로 인한 제트 엔진 추력 감쇄 (밀도비에 정밀 연동)
    const thrustMagnitude = specs.maxThrust * Math.pow(n1Frac, 2.1) * densityRatio;

    // 플랩 전개각 부드러운 서보 전개 (Flight3d 표준)
    if (this.currentFlapAngle === undefined) this.currentFlapAngle = 0.0;
    const targetFlapAngle = [0, 15, 25, 40][this.flapIndex] || 0.0;
    this.currentFlapAngle += (targetFlapAngle - this.currentFlapAngle) * Math.min(1.0, effectiveDt * 1.5);
    const flapFraction = this.currentFlapAngle / 40.0;
    const flapCL = (specs.clFlapBoostMax || 0.95) * flapFraction;
    const flapCD = 0.0012 * this.currentFlapAngle + 0.000045 * (this.currentFlapAngle * this.currentFlapAngle);
    const flapAlphaStall = THREE.MathUtils.degToRad(2.0 * flapFraction);
    const spoilerCL = this.spoilerExtended ? -0.38 : 0.0;
    const spoilerCD = this.spoilerExtended ? 0.075 : 0.0;
    const gearCD = this.gearExtended ? 0.024 : 0.0;

    const currentKmh = this.speed * 280;

    // --------------------------------------------------------------
    // 1. 지상(Ground) 활주 & 이륙 물리 (Ground Operations & Takeoff Roll)
    // --------------------------------------------------------------
    if (this.isOnGround) {
      if (this.isWaterLanding) {
        // ★ 바다 비상착수 상태 (Miracle on the Ocean / Hudson)
        this.speed = Math.max(0, this.speed - 0.28 * dt);
        this.waterBobPhase += dt * 3.2;
        this.planeGroup.position.y = 0.8 + Math.sin(this.waterBobPhase) * 0.35;

        const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(this.waterBobPhase * 0.6) * 0.035);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(this.waterBobPhase * 0.4) * 0.02);
        this.planeGroup.quaternion.copy(qYaw).multiply(qPitch).multiply(qRoll);

        if (this.speed > 0.04) {
          this.createWaterSpray(this.planeGroup.position);
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(qYaw);
        const waterMove = this.speed * 115.0 * dt;
        this.planeGroup.position.addScaledVector(forward, waterMove);

        if (this.speed < 0.02 && !this.waterSuccessShown) {
          this.waterSuccessShown = true;
          this.flightPhase = 'TOUCHDOWN';
          this.phaseDisplay.textContent = '해상 비상착수 안전 부유 중';
          this.showPopup('🌊 [비상착수 성공] 모든 승객이 구명보트로 안전하게 대피했습니다! (허드슨강의 기적)');
          this.score += 2000;
          setTimeout(() => {
            document.getElementById('modal-title').textContent = '🌊 MIRACLE DITCHING SUCCESS!';
            document.getElementById('modal-desc').innerHTML = `
              <span style="color:#0284c7; font-weight:800; font-size:16px;">🌊 성공적인 해상 비상착수 (Water Ditching)</span><br>
              완벽한 강하율과 기수 각도로 수면에 부드럽게 안착했습니다.<br>
              285명의 승객 전원이 구명정으로 안전하게 구조되었습니다!
            `;
            this.startBtn.textContent = '게이트에서 다시 시작 🔄';
            this.takeoffDirectBtn.textContent = '활주로에서 즉시 이륙하기 🛫';
            this.overlay.classList.remove('hidden');
          }, 2400);
        }
      } else {
        // 일반 지상 주행 (활주로 & 유도로) 및 수륙양용기 수상 활주
        const isAmphibianOnWater = (this.currentPlaneType === 'amphibian') && !this.isOverAirport(this.planeGroup.position.x, this.planeGroup.position.z);
        const currentTargetY = isAmphibianOnWater ? 0.8 : this.groundY;

        // 지상 구름 저항 & 브레이크 & 역추진 알짜 힘 계산
        const vGround = Math.max(0, this.groundSpeed || 0);
        const qDynGround = 0.5 * rho * vGround * vGround;
        const totalGroundCD = specs.cd0 + flapCD + gearCD + spoilerCD;
        const fAeroDrag = qDynGround * specs.wingArea * totalGroundCD;

        // 양력 계산 (지면 효과로 타이어 하중 경감)
        const cLGround = specs.cl0 + flapCL;
        const fAeroLift = Math.min(specs.mass * 9.81 * 0.95, qDynGround * specs.wingArea * cLGround * 1.15);
        const normalForce = Math.max(0, specs.mass * 9.81 - fAeroLift);

        const fRollingFriction = normalForce * 0.018; // 타이어 구름 마찰

        // 풋 브레이크 및 착륙 역추진
        let fBrake = 0.0;
        if (this.keys.brake || this.isBellySliding) {
          fBrake = normalForce * 0.42; // 메인 휠 디스크 카본 브레이크
          // 40km/h 이상에서 브레이크 시 역추진 자동 전개 보조
          if (vGround > 12.0 && this.throttle <= 0.25 && !this.reverseThrustActive) {
            this.reverseThrustActive = true;
            this.updateReverserUI();
            this.playReverseThrustSound(true);
          }
        }

        // 역추진 작동 시 전진 추력 반전
        let fThrustEffective = thrustMagnitude;
        if (this.reverseThrustActive) {
          fThrustEffective = -thrustMagnitude * 0.58;
        }

        // 이륙 시 스로틀 50% 이상 올리면 역추진 자동 해제
        if (this.throttle > 0.45 && this.reverseThrustActive) {
          this.reverseThrustActive = false;
          this.updateReverserUI();
          this.playReverseThrustSound(false);
        }

        const fNetGround = fThrustEffective - fAeroDrag - fRollingFriction - fBrake;
        const aGround = fNetGround / specs.mass;
        this.groundSpeed = Math.max(0, vGround + aGround * effectiveDt);
        this.speed = this.groundSpeed / 77.777;

        // A/D 키, 터치 러더 및 HOTAS 사이드스틱 노즈 휠 스티어링
        let steerInput = 0;
        if (this.keys.left) steerInput -= 1;
        if (this.keys.right) steerInput += 1;
        if (Math.abs(this.touchRudder || 0) > 0.01) {
          steerInput += this.touchRudder;
        } else if (this.joystickData && (this.joystickData.active || this.isTouchStickReleasing)) {
          steerInput += (this.smoothedTouchStick ? this.smoothedTouchStick.x : this.joystickData.x);
        }
        if (this.hotasState && this.hotasState.connected) {
          if (Math.abs(this.hotasState.roll) > 0.08) {
            steerInput += this.hotasState.roll;
          }
          if (this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.12) {
            steerInput += this.hotasState.yaw;
          }
        }
        steerInput = THREE.MathUtils.clamp(steerInput, -1.0, 1.0);

        if (Math.abs(steerInput) > 0.05) {
          // 속도가 빠를수록 조향각을 자동으로 줄여 전복 방지 (고속 틸러 감쇠)
          const steerAuthority = Math.min(1.0, 18.0 / Math.max(4.0, this.groundSpeed));
          this.yaw -= steerInput * 0.028 * steerAuthority;
        } else if (this.flightPhase === 'TAKEOFF_RUN') {
          // 이륙 활주 시 중립이면 활주로 중앙선(0.0) 직선 방향으로 완벽 유지 (우측 쏠림 100% 차단)
          this.yaw = THREE.MathUtils.lerp(this.yaw, 0.0, 0.22);
          if (Math.abs(this.yaw) < 0.001) this.yaw = 0.0;
        }
        this.yaw = THREE.MathUtils.euclideanModulo(this.yaw + Math.PI, Math.PI * 2) - Math.PI;

        const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        if (isAmphibianOnWater) {
          this.waterBobPhase += dt * (this.groundSpeed > 5.0 ? 5.5 : 2.5);
          this.planeGroup.position.y = 0.8 + Math.sin(this.waterBobPhase) * 0.12;

          const waveRoll = Math.sin(this.waterBobPhase * 0.6) * 0.02;
          const wavePitch = Math.sin(this.waterBobPhase * 0.4) * 0.012;
          const turnBank = -steerInput * Math.min(0.035, this.speed * 0.025);

          const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), waveRoll + turnBank);
          const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), wavePitch);
          this.planeGroup.quaternion.copy(qYaw).multiply(qPitch).multiply(qRoll);

          if (this.speed > 0.04) {
            this.createWaterSpray(this.planeGroup.position);
          }
        } else {
          this.planeGroup.quaternion.copy(qYaw);
          this.planeGroup.position.y = currentTargetY;
        }

        // 지상 위치 이동 (물리 속도 기반)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(qYaw);
        this.planeGroup.position.addScaledVector(forward, this.groundSpeed * 1.4786 * effectiveDt);
        this.velocity.copy(forward).multiplyScalar(this.groundSpeed);

        // 게이트 접근 판정
        const distDestGate = Math.hypot(this.planeGroup.position.x - (-235), this.planeGroup.position.z - (-45450));
        const distDestGate2 = Math.hypot(this.planeGroup.position.x - (-155), this.planeGroup.position.z - (-45000));
        const distStartGate = Math.hypot(this.planeGroup.position.x - (-155), this.planeGroup.position.z - 0);
        const nearGate = (distDestGate <= 85.0) || (distDestGate2 <= 85.0) || (distStartGate <= 85.0);

        if (nearGate && this.speed < 0.35 && this.flightPhase !== 'DEPLANING' && this.flightPhase !== 'MISSION_COMPLETE' && this.flightPhase !== 'TAKEOFF_RUN') {
          this.showGateActionPrompt(true);
        } else if (!nearGate || this.speed >= 0.38) {
          this.showGateActionPrompt(false);
        }

        this.checkFlightMovementReactions(dt);

        // ★ 실제 여객기 이륙 로테이션 (Takeoff Rotation Vr & Liftoff)
        const pullUpInput = this.keys.down || (this.joystickData && this.joystickData.active && this.joystickData.y > 0.3) || (this.hotasState && this.hotasState.connected && this.hotasState.pitch > 0.22);
        const stallMult = [1.0, 0.88, 0.78, 0.68][this.flapIndex] || 1.0;
        const effectiveVr = isAmphibianOnWater ? 145 : (specs.vRotateKmh * stallMult);

        if (currentKmh >= effectiveVr && pullUpInput && !this.isGearCollapsed) {
          this.isOnGround = false;
          this.flightPhase = 'CLIMB_CRUISE';
          this.phaseDisplay.textContent = isAmphibianOnWater ? '해상 이수(Water Takeoff)' : '상승 및 순항 비행';
          this.showPopup(isAmphibianOnWater 
            ? '🌊🛫 Water Takeoff! 수륙양용기가 바다에서 힘차게 이수했습니다!' 
            : `🛫 Rotate! ${specs.name}이(가) 힘차게 이륙했습니다. G 키를 눌러 기어를 접으세요!`);
          this.score += 500;
          this.triggerPassengerReaction('takeoff');

          // 이륙 순간 활주로 헤딩 유지
          this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
          this.planeGroup.rotateX(0.08); // 기수 들림

          const initialVz = -this.groundSpeed;
          const initialVy = Math.max(2.2, this.groundSpeed * 0.08);
          this.velocity.set(0, initialVy, initialVz).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw));
          this.planeGroup.position.y += 1.6;
        }
      }

    } else {
      // --------------------------------------------------------------
      // 2. 공중 비행(In-Flight) 항공역학 & 뉴턴 3차원 벡터 물리
      // --------------------------------------------------------------
      const q = this.planeGroup.quaternion;
      const bFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      const bUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      const bRight = new THREE.Vector3(1, 0, 0).applyQuaternion(q);

      // 대기 상대 속도 벡터 (Wind-Relative Velocity)
      let vAir = this.velocity.clone();
      let airSpeed = vAir.length();
      if (airSpeed < 0.5) {
        vAir.copy(bFwd).multiplyScalar(0.5);
        airSpeed = 0.5;
      }
      const vNorm = vAir.clone().normalize();

      // 기체 좌표계 분해: u(전방), v(우측), w(하향)
      const u = vAir.dot(bFwd);
      const v = vAir.dot(bRight);
      const w = -vAir.dot(bUp);

      // 진정 받음각(Angle of Attack, alpha) 및 미끄러짐각(Sideslip, beta)
      if (airSpeed > 1.5) {
        this.aoa = Math.atan2(w, Math.max(0.5, u));
        this.sideslip = Math.asin(THREE.MathUtils.clamp(v / airSpeed, -1.0, 1.0));
      } else {
        this.aoa = 0;
        this.sideslip = 0;
      }
      this.alpha = this.aoa;
      this.beta = this.sideslip;

      // 진속도(TAS), 지시속도(IAS), 마하수(Mach), 동압(qDyn) 계산 (ISA 대기 모델)
      const tas = airSpeed;
      const ias = Atmosphere.tasToIas(tas, densityRatio);
      const mach = tas / speedOfSound;
      const iasKnots = Atmosphere.msToKnots(ias);
      const qDyn = 0.5 * rho * tas * tas;
      this.tas = tas;
      this.ias = ias;
      this.mach = mach;
      this.qDyn = qDyn;

      // 지면 효과 (Ground Effect Cushion - 착륙 플레어 쿠션)
      // phi_ground = (16h/b)^2 / (1 + (16h/b)^2)
      const radioAlt = Math.max(0.2, (this.planeGroup.position.y - this.groundY) * 10);
      const hOverB = radioAlt / specs.wingSpan;
      let phiGround = 1.0;
      let igeLiftMult = 1.0;
      if (hOverB < 1.2) {
        const h_b = Math.max(0.08, hOverB);
        const h16 = 16.0 * h_b;
        const h16Sq = h16 * h16;
        phiGround = h16Sq / (1.0 + h16Sq);
        // 지면 반 날개폭 이내 진입 시 양력 쿠션 효과
        if (h_b < 0.5) {
          igeLiftMult = 1.0 + 0.12 * (0.5 - h_b);
        }
      }
      this.phiGround = phiGround;
      this.groundEffectFactor = phiGround;

      // 공기역학 양력선 & 연속 실속 박리/재부착 히스테리시스 모델 (Flight3d 표준)
      const alphaCrit = specs.stallAlphaClean + flapAlphaStall;
      const absAlpha = Math.abs(this.aoa);
      if (this.separation === undefined) this.separation = 0.0;

      const separationWeight = THREE.MathUtils.clamp((tas - 2.0) / 13.0, 0.0, 1.0);
      const separationTarget = THREE.MathUtils.clamp(
        (absAlpha - alphaCrit) / THREE.MathUtils.degToRad(12.0), 0.0, 1.0
      ) * separationWeight;

      // 실속 박리 onset은 급격, 재부착(reattachment)은 시상수 ~0.5초 지수 감쇄 (후류 히스테리시스)
      const reattachMix = 1.0 - Math.exp(-effectiveDt / 0.5);
      this.separation = Math.max(separationTarget, this.separation * (1.0 - reattachMix));
      this.stallSeverity = this.separation;
      this.isStalling = (tas > 15.0) && (this.separation > 0.1);

      // 연속 양력 모델: 선형 피크 클램프와 평판 십자류 모델의 가중 결합
      const cl0 = specs.cl0 + flapCL;
      const clCapped = cl0 + specs.clAlpha * Math.sign(this.aoa) * Math.min(absAlpha, alphaCrit);
      const clFlatPlate = 2.0 * Math.sin(this.aoa) * Math.cos(this.aoa);
      const brk = 1.0 - Math.exp(-this.separation / 0.01);
      const W = Math.pow(this.separation, 1.3);
      let cL = ((1.0 - W) * (1.0 - 0.28 * brk) * clCapped + W * clFlatPlate + spoilerCL) * igeLiftMult;
      cL = THREE.MathUtils.clamp(cL, -0.6, 2.8);
      this.cl = cL;

      // 실속 버핏팅 및 조종석 진동
      const qBuffetScale = Math.min(1.0, qDyn / 500.0);
      this.buffetVibration = Math.min(1.0, this.separation * 1.5) * qBuffetScale;
      if (this.separation > 0.05) {
        const buffetX = (Math.random() - 0.5) * 0.06 * this.buffetVibration;
        const buffetZ = (Math.random() - 0.5) * 0.08 * this.buffetVibration;
        this.planeGroup.rotateX(buffetX);
        this.planeGroup.rotateZ(buffetZ);
        this.screenShake = Math.max(this.screenShake, 0.48 * this.buffetVibration);

        // 공기역학적 기수 급강하 모멘트 (Nose Drop)
        this.planeGroup.rotateX(-0.028 * this.separation * (1.0 + 0.9 * this.separation));
        if (this.isStalling) {
          this.playStickShakerSound();
        }
      }

      // 공기역학 항력 (Parasite + Flaps + Gear + Spoilers + Transonic Wave + Induced + Stall Drag)
      let cdParasitic = specs.cd0 + flapCD + gearCD + spoilerCD;
      const transonicMachBuffet = specs.transonicMachBuffet || 0.78;
      if (mach > transonicMachBuffet) {
        cdParasitic += Math.pow(mach - transonicMachBuffet, 3.5) * 8.0;
      }
      const cDi = ((cL * cL) / (Math.PI * specs.aspectRatio * specs.oswaldEff)) * phiGround;
      const cDStall = this.separation * 1.8 * Math.pow(Math.sin(this.aoa), 2);
      const totalCD = cdParasitic + cDi + cDStall;
      this.cd = totalCD;

      // 3차원 공기역학 벡터 힘 산출
      // 1) 양력: 비행 경로 벡터에 수직인 기체 대칭 평면 상방
      let liftDir = bUp.clone().projectOnPlane(vNorm).normalize();
      if (liftDir.lengthSq() < 0.001) liftDir.copy(bUp);
      const liftForce = liftDir.multiplyScalar(qDyn * specs.wingArea * cL);

      // 2) 항력: 비행 경로 정반대 방향
      const dragForce = vNorm.clone().multiplyScalar(-qDyn * specs.wingArea * totalCD);

      // 3) 공기역학 횡력 (Sideforce): 미끄러짐각 beta 및 러더 편향에 의한 측면 힘
      let inFlightRudder = 0;
      if (Math.abs(this.touchRudder || 0) > 0.02) {
        inFlightRudder = this.touchRudder;
      }
      if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.12) {
        inFlightRudder = this.hotasState.yaw;
      }
      const cY = -0.75 * this.sideslip + 0.18 * inFlightRudder;
      const sideForce = bRight.clone().multiplyScalar(qDyn * specs.wingArea * cY);

      // 4) 추력: 엔진 추진축 방향
      const thrustForce = bFwd.clone().multiplyScalar(thrustMagnitude);

      // 5) 중력: 지구 중심 방향 (-Y)
      const gravityForce = new THREE.Vector3(0, -specs.mass * 9.81, 0);

      // 6) 알짜 힘 합성 & 뉴턴 가속도 a = F / m
      const netForce = new THREE.Vector3().add(liftForce).add(dragForce).add(sideForce).add(thrustForce).add(gravityForce);
      const accel = netForce.divideScalar(specs.mass);
      this.acceleration.copy(accel);

      // 속도 적분: V = V + a * dt
      this.velocity.addScaledVector(accel, effectiveDt);

      // ------------------------------------------------------------
      // FBW 6-DoF 비행 제어 법칙 & 연속 공기역학 감쇠 (Normal Law & Aero Damping)
      // ------------------------------------------------------------
      let pitchInput = 0;
      let rollInput = 0;
      if (this.keys.up) pitchInput -= 1;   // ↑: 기수 하강 (Pitch Down)
      if (this.keys.down) pitchInput += 1; // ↓: 기수 상승 (Pitch Up)
      if (this.keys.left) rollInput -= 1;  // A: 좌측 롤
      if (this.keys.right) rollInput += 1; // D: 우측 롤

      if (!this.smoothedTouchStick) {
        this.smoothedTouchStick = { x: 0, y: 0 };
      }

      if (this.joystickData && this.joystickData.active) {
        const smoothRate = Math.min(1.0, effectiveDt * 20.0);
        this.smoothedTouchStick.x = THREE.MathUtils.lerp(this.smoothedTouchStick.x, this.joystickData.x, smoothRate);
        this.smoothedTouchStick.y = THREE.MathUtils.lerp(this.smoothedTouchStick.y, this.joystickData.y, smoothRate);
        pitchInput += this.smoothedTouchStick.y;
        rollInput += this.smoothedTouchStick.x;
      } else if (this.isTouchStickReleasing) {
        this.joystickData.x *= 0.82;
        this.joystickData.y *= 0.82;
        this.smoothedTouchStick.x = THREE.MathUtils.lerp(this.smoothedTouchStick.x, this.joystickData.x, 0.28);
        this.smoothedTouchStick.y = THREE.MathUtils.lerp(this.smoothedTouchStick.y, this.joystickData.y, 0.28);
        if (Math.hypot(this.joystickData.x, this.joystickData.y) < 0.008) {
          this.joystickData.x = 0;
          this.joystickData.y = 0;
          this.smoothedTouchStick.x = 0;
          this.smoothedTouchStick.y = 0;
          this.joystickData.active = false;
          this.isTouchStickReleasing = false;
        } else {
          pitchInput += this.smoothedTouchStick.y;
          rollInput += this.smoothedTouchStick.x;
        }
      }

      if (this.hotasState && this.hotasState.connected) {
        if (Math.abs(this.hotasState.pitch) > 0.06) pitchInput = this.hotasState.pitch;
        if (Math.abs(this.hotasState.roll) > 0.07) rollInput = this.hotasState.roll;
      }
      const isRollActive = Math.abs(rollInput) > 0.06;

      if (!this.angularVelocity) {
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
      }

      const qDynRatio = THREE.MathUtils.clamp(qDyn / 2500.0, 0.25, 1.5);
      const pitchDamping = (specs.pitchDamping || 1.8) * qDynRatio;
      const rollDamping = (specs.rollDamping || 2.2) * qDynRatio;
      const yawDamping = (specs.yawDamping || 2.0) * qDynRatio;

      // 동압 연동 조종간 반력 (Boeing 737 q-feel: 140kt ~ 360kt 영역 점진적 강성화)
      const qFeelStiffness = Math.max(0.40, 1.0 - Math.max(0, (iasKnots - 140) / 220.0) * 0.55);
      this.qFeelStiffness = qFeelStiffness;
      const elevatorEffectiveness = Math.max(0.15, 1.0 - 0.80 * (this.separation || 0.0));

      // 1) 피치 제어: 동압 연동 조종면 효율 및 에어버스 플레어 법칙
      let targetPitchRate = pitchInput * 0.018 * (specs.pitchAuthority || 0.55) * qFeelStiffness;
      if (pitchInput > 0) {
        targetPitchRate *= elevatorEffectiveness; // 실속 후류 시 엘리베이터 권한 감소
      }
      // 선회 시 수직 양력 손실을 보상하는 FBW 피치 보정 (최대 33도 선회까지 자동 고도 유지)
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
      const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
      if (Math.abs(bankTilt) > 0.05 && !this.isOnGround) {
        targetPitchRate += Math.min(0.0028, Math.abs(bankTilt) * 0.0024);
      }
      // 착륙 플레어 법칙 (Flare Law): 지상 15m 미만에서 기수 숙임 모멘트를 주어 파일럿의 부드러운 당김 유도
      if (radioAlt < 15.0 && !this.isOnGround) {
        targetPitchRate -= 0.0035;
      }
      this.angularVelocity.x = THREE.MathUtils.lerp(
        this.angularVelocity.x,
        targetPitchRate,
        Math.min(1.0, effectiveDt * (6.0 + pitchDamping))
      );

      // 2) 롤 제어 & 뱅크각 유지 (Bank Angle Hold & Spiral Stability under Normal Law)
      const maxBankTilt = 0.82; // ~55도 최대 뱅크각
      const fbwBankLimit = 0.545; // ~33도 에어버스 FBW 중립 유지 한계각 (Bank Angle Hold Limit)

      let targetRollRate = 0;
      if (isRollActive) {
        if ((rollInput > 0 && bankTilt > -maxBankTilt) || (rollInput < 0 && bankTilt < maxBankTilt)) {
          targetRollRate = -rollInput * 0.024 * (specs.rollAuthority || 0.70) * qFeelStiffness;
        }
      } else {
        // 중립(Neutral) 시 FBW 비행 제어 법칙:
        // - 뱅크각 33도 이하 (|bankTilt| <= 0.545): 뱅크각 완벽 유지 (Bank Angle Hold, targetRollRate = 0)
        // - 미세 수평 영역 (|bankTilt| < 0.035, 약 2도 미만): 수평 직진 자동 복원 (Wings Level Hold)
        // - 뱅크각 33도 초과 (|bankTilt| > 0.545): 안전 한계 33도로 부드럽게 복귀하는 양의 나선 안정성 (Spiral Stability)
        if (Math.abs(bankTilt) > fbwBankLimit) {
          const targetTilt = Math.sign(bankTilt) * fbwBankLimit;
          targetRollRate = -(bankTilt - targetTilt) * 0.05;
        } else if (Math.abs(bankTilt) < 0.035) {
          targetRollRate = -bankTilt * 0.025;
        } else {
          // Bank Angle Hold: 선회 각도 유지 (롤 복귀율 0)
          targetRollRate = 0.0;
        }
      }
      this.angularVelocity.z = THREE.MathUtils.lerp(
        this.angularVelocity.z,
        targetRollRate,
        Math.min(1.0, effectiveDt * (7.0 + rollDamping))
      );

      // 3) 협조 선회 및 러더 요 응답 (Coordinated Turn & Rudder Yaw Response with Aero Damping)
      // 뱅크 각도가 형성되면 양력의 수평 성분에 의해 선회율(Turn Rate)이 자연스럽게 발생
      let turnRate = bankTilt * 0.020;
      if (isRollActive) {
        turnRate -= rollInput * 0.008; // 에일러론 역요 보정
      }
      // 러더 편향에 따른 요 모멘트 반응
      if (Math.abs(inFlightRudder) > 0.02) {
        turnRate += -inFlightRudder * 0.022 * (specs.yawAuthority || 0.45);
      }
      this.angularVelocity.y = THREE.MathUtils.lerp(
        this.angularVelocity.y,
        turnRate,
        Math.min(1.0, effectiveDt * (6.0 + yawDamping))
      );

      // 모바일 고주사율 디스플레이(90Hz/120Hz ProMotion) 프레임 타임 스케일 정규화
      const frameRateScale = Math.min(2.0, Math.max(0.4, effectiveDt * 60.0));
      this.planeGroup.rotateX(this.angularVelocity.x * frameRateScale);
      this.planeGroup.rotateZ(this.angularVelocity.z * frameRateScale);
      if (Math.abs(this.angularVelocity.y) > 0.00002) {
        this.planeGroup.rotateY(this.angularVelocity.y * frameRateScale);
      }

      // ------------------------------------------------------------
      // 3D 위치 적분 및 속도 단위 동기화
      // ------------------------------------------------------------
      this.planeGroup.position.addScaledVector(this.velocity, 1.4786 * effectiveDt);
      this.speed = this.velocity.length() / 77.777;
      this.verticalSpeed = this.velocity.y;

      this.checkGPWS(dt);
      this.checkFlightMovementReactions(dt);

      // ------------------------------------------------------------
      // 3. 지면 / 수면 접지 및 착륙 판정 (Realistic Touchdown Mechanics)
      // ------------------------------------------------------------
      const overAirport = this.isOverAirport(this.planeGroup.position.x, this.planeGroup.position.z);
      const effectiveGroundY = overAirport ? this.groundY : 0.8;

      if (this.planeGroup.position.y <= effectiveGroundY + 0.35 && this.velocity.y < -0.3) {
        const sinkRate = -this.velocity.y; // 초당 수직 하강 속도 (m/s)
        const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.planeGroup.quaternion);
        const isUpsideDown = worldUp.y < -0.2;

        if (!overAirport) {
          if (this.currentPlaneType === 'amphibian') {
            if (sinkRate > 14.0 || (isUpsideDown && currentKmh > 120)) {
              this.triggerWaterCrash(this.isStalling ? '실속으로 인한 수면 격돌 추락' : '수면 고속 격돌 추락');
              return;
            }
            this.isOnGround = true;
            this.isWaterLanding = false;
            this.planeGroup.position.y = 0.8;
            this.groundSpeed = Math.max(0, -this.velocity.z);
            const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
            this.yaw = Math.atan2(-fwd.x, -fwd.z);
            this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            this.clearGPWS();
            this.playTouchdownScreech();
            this.flightPhase = 'WATER_TAXI';
            this.phaseDisplay.textContent = '해상 수상 활주 (Water Taxi)';
            this.showPopup('🌊 수면 착수 성공! 물 위를 달리며 스로틀을 올려 다시 이수(이륙)할 수 있습니다!');
            this.score += 800;
            this.checkEmergencyLandingSuccess('amphibian_water');
            return;
          }

          if (sinkRate > 10.0 || (isUpsideDown && currentKmh > 100) || currentKmh > 360) {
            this.triggerWaterCrash(this.isStalling ? '실속으로 인한 바다 격돌 추락' : '바다 고속 격돌 추락');
            return;
          }

          // 완만한 해상 비상착수 (Miracle Ditching)
          this.isWaterLanding = true;
          this.isOnGround = true;
          this.waterBobPhase = 0.0;
          this.planeGroup.position.y = 0.8;
          this.groundSpeed = Math.max(0, -this.velocity.z);
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
          this.yaw = Math.atan2(-fwd.x, -fwd.z);
          this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
          this.clearGPWS();
          this.playTouchdownScreech();
          this.showPopup('🌊 바다 비상착수! 엔진 역추진으로 수면 활주 중입니다.');
          this.checkEmergencyLandingSuccess('water_ditching');
          return;
        }

        // 육지 공항 활주로 접지
        if (sinkRate > 15.0 || (isUpsideDown && currentKmh > 130)) {
          this.triggerExplosion(this.isStalling ? '실속으로 인한 지면 격돌 추락' : '지면 고속 격돌 추락');
          return;
        }

        // 거친 착륙 / 기어 미전개 동체착륙
        if (sinkRate > 6.8 || !this.gearExtended) {
          if (!this.gearExtended) {
            this.showPopup('⚠️ 랜딩 기어 없이 착륙하여 동체로 활주합니다!');
          } else {
            this.collapseLandingGears();
          }

          this.isOnGround = true;
          this.planeGroup.position.y = this.groundY;
          this.groundSpeed = Math.max(0, -this.velocity.z);
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
          this.yaw = Math.atan2(-fwd.x, -fwd.z);
          this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
          this.clearGPWS();
          this.checkEmergencyLandingSuccess('belly_landing');

          if (sinkRate > 12.0 || currentKmh > 330) {
            this.triggerExplosion('과도한 착륙 충격으로 인한 기체 파손 폭발');
            return;
          }
        } else {
          // 정상 착륙 (Soft Touchdown & Butter Landing)
          this.isOnGround = true;
          this.planeGroup.position.y = this.groundY;
          this.groundSpeed = Math.max(0, -this.velocity.z);
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
          this.yaw = Math.atan2(-fwd.x, -fwd.z);
          this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
          this.clearGPWS();
          this.playTouchdownScreech();
          this.triggerPassengerReaction('touchdown');

          // 지상 스포일러(Ground Spoilers) 자동 전개로 잔여 양력 소멸 및 타이어 접지력 확보
          this.spoilerExtended = true;
          this.updateSpoilerUI();

          if (sinkRate <= 1.8) {
            this.showPopup('🧈 [BUTTER LANDING] 환상적인 소프트 터치다운! 승객들이 기립 박수를 보냅니다!');
            this.score += 2000;
          } else {
            this.showPopup('🛬 정상 부드러운 착륙 성공! 스포일러가 자동 전개되었습니다. S 키 또는 R 키로 역추진 제동하세요.');
            this.score += 1000;
          }

          this.checkEmergencyLandingSuccess('runway_landing');

          if (this.planeGroup.position.z < -30000) {
            this.flightPhase = 'TAXI_IN';
            this.phaseDisplay.textContent = '대륙 육지 공항 착륙 성공 (게이트 1번으로 주행)';
            this.showPopup('🛬 그랜드 콘티넨탈 육지 공항 안전 착륙! 황색 유도선을 따라 1번 게이트 탑승교로 이동하세요.');
            this.score += 1500;
          }
        }
      }
    }

    // --------------------------------------------------------------
    // 카메라 추적, 동적 속도 FOV & 원근 속도감 연출
    // --------------------------------------------------------------
    const speedRatio = Math.min(1.0, Math.max(0, (currentKmh - 120) / 720)); // 0.0 ~ 1.0

    // 1. 동적 속도 FOV (변경 시에만 프로젝션 매트릭스 갱신하여 렌더링 끊김 방지)
    const baseFov = this.cameraMode === '3rd' ? 60 : 64;
    const fovBoost = this.cameraMode === '3rd' ? 18 : 22;
    const targetFov = baseFov + speedRatio * fovBoost;
    if (Math.abs(this.camera.fov - targetFov) > 0.06) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.08);
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraMode === '3rd') {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      // 고속 비행 시 카메라 거리가 뒤로 살짝 늘어나며 역동적 공간감 형성
      const camDistZ = 42.0 + speedRatio * 7.5;
      const camHeight = 9.5 + speedRatio * 1.5;
      const camOffset = new THREE.Vector3(0, camHeight, camDistZ).applyQuaternion(this.planeGroup.quaternion);
      const targetCamPos = this.planeGroup.position.clone().add(camOffset);
      this.camera.position.lerp(targetCamPos, 0.13);

      const lookTarget = this.planeGroup.position.clone().add(forward.clone().multiplyScalar(40));
      this.camera.lookAt(lookTarget);
    } else {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const cockpitOffset = new THREE.Vector3(0, 2.05, -14.2).applyQuaternion(this.planeGroup.quaternion);
      this.camera.position.copy(this.planeGroup.position).add(cockpitOffset);

      const lookTarget = this.planeGroup.position.clone().add(forward.clone().multiplyScalar(100));
      this.camera.lookAt(lookTarget);
    }

    // 2. 고속 공기역학 풍압 미세 떨림 (Aerodynamic Micro-shiver at 580~850 km/h)
    if (currentKmh > 580) {
      const speedTurbulence = ((currentKmh - 580) / 320) * (this.cameraMode === '1st' ? 0.08 : 0.05);
      this.camera.position.x += (Math.random() - 0.5) * speedTurbulence;
      this.camera.position.y += (Math.random() - 0.5) * speedTurbulence;
    }

    // 제트 엔진 및 풍절음 오디오 실시간 부드러운 보간
    if (this.audioCtx && this.soundEnabled && typeof this.updateAudio === 'function') {
      this.updateAudio(dt);
    }
  },

  // ----------------------------------------------------------------
  // EGPWS / GPWS 지형 및 강하율 접근 경보 시스템
  // ----------------------------------------------------------------
  checkGPWS(dt) {
    if (!this.isPlaying || this.isDestroyed || this.isOnGround) {
      this.clearGPWS();
      return;
    }

    const radioAlt = Math.max(0, (this.planeGroup.position.y - this.groundY) * 10); // 미터 단위 대지 고도
    const sinkRate = -this.verticalSpeed * 10; // m/s 수직 하강 속도

    // 1. 실속 (STALL) 경보: 최우선 경보
    if (this.isStalling) {
      this.triggerGPWS('STALL', 'STALL! STALL!', 'AIRSPEED CRITICAL - PUSH NOSE DOWN & MAX POWER', 'stall-warn');
      this.speakGPWS('STALL, STALL');
      return;
    }

    // 2. 지면 충돌 예상 시간 (Time to Impact) 계산 (10초 전 정밀 PULL UP 경보)
    if (sinkRate > 0.8) {
      const timeToImpact = radioAlt / sinkRate; // 초(s) 단위 충돌까지 남은 시간
      const isNormalTouchdown = this.gearExtended && radioAlt < 22 && sinkRate < 3.8;

      // ★ 충돌 10초 전 긴급 기수 인양 경보 (PULL UP!)
      if (timeToImpact <= 10.0 && !isNormalTouchdown) {
        const sec = Math.max(0.1, timeToImpact).toFixed(1);
        this.triggerGPWS('PULL_UP', 'PULL UP! PULL UP!', `지면 충돌 ${sec}초 전 - 즉시 기수 상승! (TERRAIN PULL UP)`, 'danger');
        this.playGPWSWhoopSiren();
        this.speakGPWS('PULL UP');
        return;
      }
    }

    // 3. 바퀴 미전개 착륙 경보 (TOO LOW, GEAR!): 고도 140m 이하에서 하강 중인데 랜딩 기어가 접혀있음
    if (radioAlt < 140 && sinkRate > 0.5 && !this.gearExtended) {
      this.triggerGPWS('GEAR', 'TOO LOW, GEAR!', 'LOWER LANDING GEAR [단축키 G]', 'gear-warn');
      this.speakGPWS('TOO LOW, GEAR');
      this.playCautionChime();
      return;
    }

    // 4. 주의 단계 강하율 경보 (SINK RATE!): 충돌 18초 전 또는 급격한 강하율
    if (sinkRate > 5.5) {
      const timeToImpact = radioAlt / sinkRate;
      const isNormalTouchdown = this.gearExtended && radioAlt < 22 && sinkRate < 3.8;
      if (timeToImpact <= 18.0 && !isNormalTouchdown) {
        const sec = Math.max(0.1, timeToImpact).toFixed(1);
        this.triggerGPWS('SINK_RATE', 'SINK RATE!', `강하율 과다 (지면 충돌 ${sec}초 전)`, 'caution');
        this.speakGPWS('SINK RATE');
        this.playCautionChime();
        return;
      }
    }

    // 위험 조건이 없으면 경보 해제
    this.clearGPWS();
  },

  triggerGPWS(type, text, subtext, level = 'danger') {
    this.gpwsState = type;
    if (this.gpwsBanner) {
      this.gpwsBanner.className = `gpws-banner ${level}`;
      if (this.gpwsText) this.gpwsText.textContent = text;
      if (this.gpwsSubtext) this.gpwsSubtext.textContent = subtext;
      if (this.gpwsIcon) {
        this.gpwsIcon.textContent = type === 'STALL' ? '⚠️' : (type === 'GEAR' ? '🛞' : '🚨');
      }
    }
  },

  clearGPWS() {
    this.gpwsState = null;
    if (this.gpwsBanner) {
      this.gpwsBanner.className = 'gpws-banner hidden';
    }
    // 음성 및 사이렌 즉시 해제 & 침묵
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.lastSpokenPhrase = null;
    this.stopGPWSSiren();
  },

  // ----------------------------------------------------------------
  // 비행기 움직임(기동, 상승, 하강, 급선회, 고속, 저고도 등) 실시간 승객 반응 시스템
  // ----------------------------------------------------------------
  checkFlightMovementReactions(dt) {
    if (!this.isPlaying || this.isDestroyed || this.flightPhase === 'DEPLANING' || this.flightPhase === 'MISSION_COMPLETE') {
      return;
    }

    const now = Date.now();
    // 마이크 기장 방송 후 최소 2.5초, 이전 움직임 반응 후 최소 4.2초 쿨다운
    if (now - (this.lastAITriggerTime || 0) < 2500) return;
    if (now - (this.lastMovementReactionTime || 0) < 4200) return;

    const currentKmh = this.speed * 280;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
    const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
    const radioAlt = Math.max(0, (this.planeGroup.position.y - this.groundY) * 10); // 미터 단위 고도

    let motionType = null;

    // ★ 1순위: 비상 상황(Emergency) 진행 중 승객 지속 반응
    if (this.currentEmergency) {
      if (this.currentEmergency === 'windshear') {
        motionType = 'WINDSHEAR_PANIC';
      } else if (this.currentEmergency === 'engine_fire') {
        motionType = 'ENGINE_FIRE';
      } else if (this.currentEmergency === 'bird_strike') {
        motionType = 'BIRD_STRIKE';
      } else if (this.currentEmergency === 'gear_failure' && !this.isOnGround && radioAlt < 350) {
        motionType = 'GEAR_FAILURE';
      }
    }

    if (!motionType) {
      if (this.isOnGround) {
        // 지상 상황
        if (this.keys.brake && this.speed > 0.45) {
          motionType = 'HARD_BRAKING';
        } else if (this.speed > 0.8 && this.flightPhase === 'TAKEOFF_RUN') {
          motionType = 'TAKEOFF_ACCEL';
        }
      } else {
        // 공중 비행 상황
        // ★ 1순위: 실속 (STALL) - 양력 상실, 속도 급감 및 수직 곤두박질
        if (this.isStalling) {
          motionType = 'STALL_PANIC';
        } else if (this.screenShake > 0.14) {
          motionType = 'TURBULENCE_SHAKE';
        } else if (forward.y > 0.38 || this.verticalSpeed > 1.8) {
          // 급상승 (기수 각도 > +22도)
          motionType = 'STEEP_CLIMB';
        } else if (forward.y < -0.32 || this.verticalSpeed < -1.8) {
          // 급강하 (기수 각도 < -18도)
          motionType = 'STEEP_DIVE';
        } else if (Math.abs(bankTilt) > 0.52) {
          // 깊은 뱅크각 급선회 (30도 이상 경사)
          motionType = bankTilt > 0 ? 'HARD_BANK_LEFT' : 'HARD_BANK_RIGHT';
        } else if (radioAlt < 22 && currentKmh > 240 && !this.gearExtended) {
          // 바다/지면 초저고도 곡예 비행
          motionType = 'SEA_SKIMMING';
        } else if (currentKmh > 680 || (this.throttle >= 0.95 && currentKmh > 550)) {
          // 초고속 전출력 질주
          motionType = 'SUPER_SPEED';
        } else if (this.keys.brake && currentKmh > 400) {
          // 공중 급감속 / 스피드 브레이크
          motionType = 'AIR_BRAKE';
        } else if (radioAlt > 1200 && Math.abs(forward.y) < 0.08 && Math.abs(bankTilt) < 0.08 && Math.random() < 0.003) {
          // 평온하고 부드러운 순항
          motionType = 'SMOOTH_CRUISE';
        }
      }
    }

    // 비상 상황이나 실속, 난기류는 지속되는 동안 주기적으로 대사 표출
    const isEmergencyOrTurbulence = ['WINDSHEAR_PANIC', 'TURBULENCE_SHAKE', 'ENGINE_FIRE', 'BIRD_STRIKE', 'GEAR_FAILURE', 'STALL_PANIC'].includes(motionType);

    if (motionType && (motionType !== this.lastMotionType || isEmergencyOrTurbulence)) {
      this.lastMotionType = motionType;
      this.lastMovementReactionTime = now;
      this.triggerMovementPassengerReaction(motionType, currentKmh, radioAlt);
    }
  }

  });
})();

