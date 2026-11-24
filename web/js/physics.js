/**
 * Sky Jet Explorer 3D - 3D Newtonian Aerodynamics, Spool Dynamics, Flaps, Spoilers, Reverse Thrust & Landing Gear
 * Subsystem: physics (13 methods)
 */

(function() {
  'use strict';

  // ----------------------------------------------------------------
  // International Standard Atmosphere (ISA) Model (offloaded to flightsim-core)
  // - 고도별 온도, 기압, 공기 밀도(rho), 음속(speedOfSound), 밀도비 계산
  // ----------------------------------------------------------------
  const f3dCore = (typeof globalThis !== 'undefined' ? (globalThis.FlightSimCore || globalThis.Flight3dPhysics) : null) ||
                  (typeof window !== 'undefined' ? (window.FlightSimCore || window.Flight3dPhysics) : null);
  const Atmosphere = f3dCore?.Atmosphere || {
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
        temperature = this.T0 - this.LAPSE_RATE * h;
        pressure = this.P0 * Math.pow(temperature / this.T0, this.G0 / (this.LAPSE_RATE * this.R));
      } else {
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
    },

    metersToFeet(m) {
      return m * 3.28084;
    },

    feetToMeters(ft) {
      return ft / 3.28084;
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

    const actualProgress = isExtending ? progress : (1.0 - progress);
    if (this.glbMovingPartsController) {
      this.glbMovingPartsController.updateGear(actualProgress, isExtending, this.gearPhase);
    } else {
      if (this.glbMixer && this.glbGearAction) {
        const dur = this.glbGearDuration || 1.0;
        // dc10.glb 애니메이션: t=0 수납(UP), t=dur 전개(DOWN)
        this.glbGearAction.time = isExtending ? progress * dur : (1.0 - progress) * dur;
        this.glbMixer.update(0);
      }

      if (this.glbMovingParts && this.glbMovingParts.landingGear) {
        const gearNode = this.glbMovingParts.landingGear;
        const gearFactor = isExtending ? progress : (1.0 - progress);
        const basePosY = gearNode.userData.basePosY || 0;
        gearNode.visible = gearFactor > 0.15;
        gearNode.scale.y = 1.0;
        gearNode.position.y = basePosY + (1.0 - gearFactor) * 1.8;
      }

      if (this.glbGearNodes && this.glbGearNodes.length > 0) {
        const isVis = isExtending ? (progress > 0.25) : (progress < 0.75);
        this.glbGearNodes.forEach(n => { n.visible = isVis; });
      }

      if (this.glbGearMaterials && this.glbGearMaterials.length > 0) {
        const isVis = isExtending ? (progress > 0.25) : (progress < 0.75);
        this.glbGearMaterials.forEach(m => { m.visible = isVis; });
      }
    }

    // 시퀀스 완료 처리
    if (progress >= 1.0) {
      if (isExtending) {
        this.gearPhase = 'DOWN';
        this.gearExtended = true;
        if (this.glbMovingPartsController) {
          this.glbMovingPartsController.setGearProgress(1.0, 'DOWN');
        }
        if (this.glbGearNodes) {
          this.glbGearNodes.forEach(n => { n.visible = true; });
        }
        if (this.glbGearMaterials) {
          this.glbGearMaterials.forEach(m => { m.visible = true; });
        }
        if (this.glbMixer && this.glbGearAction) {
          this.glbGearAction.time = this.glbGearDuration || 1.0;
          this.glbMixer.update(0);
        }
        if (this.glbMovingParts && this.glbMovingParts.landingGear) {
          const gearNode = this.glbMovingParts.landingGear;
          gearNode.visible = true;
          gearNode.scale.y = 1.0;
          gearNode.position.y = gearNode.userData.basePosY || 0;
        }
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
        if (this.glbMovingPartsController) {
          this.glbMovingPartsController.setGearProgress(0.0, 'UP');
        }
        if (this.glbGearNodes) {
          this.glbGearNodes.forEach(n => { n.visible = false; });
        }
        if (this.glbGearMaterials) {
          this.glbGearMaterials.forEach(m => { m.visible = false; });
        }
        if (this.glbMixer && this.glbGearAction) {
          this.glbGearAction.time = 0;
          this.glbMixer.update(0);
        }
        if (this.glbMovingParts && this.glbMovingParts.landingGear) {
          const gearNode = this.glbMovingParts.landingGear;
          gearNode.visible = false;
          gearNode.scale.y = 0.01;
          gearNode.position.y = (gearNode.userData.basePosY || 0) + 1.35;
        }
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

    // 2. 엘리베이터: 기수 상승 시 후연이 위로 꺾임 (음의 각도 = 후연 상승)
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
      targetRudder = rudderInput * 0.55;
    } else if (Math.abs(rollInput) > 0.06) {
      targetRudder = rollInput * 0.35;
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

    // 4. GLB 통합 무빙 파츠 컨트롤러 (셰이더 디포메이션, 러더/플랩, 터보팬 블레이드)
    if (this.glbMovingPartsController) {
      const flapAngles = [0, 0.16, 0.34, 0.56];
      const targetFlap = flapAngles[this.flapIndex || 0] || 0;
      const rpmRatio = this.engineRunning !== false ? (0.18 + (this.throttle || 0) * 0.82) : (this.speedKmh > 25 ? 0.12 : 0);
      this.glbMovingPartsController.updateFlightControls(dt, {
        targetAileron,
        targetElevator,
        targetRudder,
        targetFlap,
        rpmRatio
      });
    } else {
      if (this.glbShaderUniforms) {
        this.glbShaderUniforms.uAileronL.value = THREE.MathUtils.lerp(
          this.glbShaderUniforms.uAileronL.value,
          -targetAileron,
          0.20
        );
        this.glbShaderUniforms.uAileronR.value = THREE.MathUtils.lerp(
          this.glbShaderUniforms.uAileronR.value,
          targetAileron,
          0.20
        );
        this.glbShaderUniforms.uElevator.value = THREE.MathUtils.lerp(
          this.glbShaderUniforms.uElevator.value,
          targetElevator,
          0.20
        );
        this.glbShaderUniforms.uRudder.value = THREE.MathUtils.lerp(
          this.glbShaderUniforms.uRudder.value,
          targetRudder,
          0.22
        );
        const flapAngles = [0, 0.16, 0.34, 0.56];
        const targetFlap = flapAngles[this.flapIndex || 0] || 0;
        this.glbShaderUniforms.uFlap.value = THREE.MathUtils.lerp(
          this.glbShaderUniforms.uFlap.value,
          targetFlap,
          0.15
        );
      }

      if (this.glbMovingParts) {
        if (this.glbMovingParts.rudder) {
          const baseY = this.glbMovingParts.rudder.userData.baseRotY || 0;
          this.glbMovingParts.rudder.rotation.y = THREE.MathUtils.lerp(
            this.glbMovingParts.rudder.rotation.y,
            baseY + targetRudder,
            0.22
          );
        }
        if (this.glbMovingParts.flaps && this.glbMovingParts.flaps.length > 0) {
          const flapAngles = [0, 0.16, 0.34, 0.56];
          const targetFlap = flapAngles[this.flapIndex || 0] || 0;
          for (let i = 0; i < this.glbMovingParts.flaps.length; i++) {
            const flap = this.glbMovingParts.flaps[i];
            const baseX = flap.userData.baseRotX || 0;
            flap.rotation.x = THREE.MathUtils.lerp(flap.rotation.x, baseX + targetFlap, 0.12);
          }
        }
        if (this.glbMovingParts.fans && this.glbMovingParts.fans.length > 0) {
          const rpmRatio = this.engineRunning !== false ? (0.18 + (this.throttle || 0) * 0.82) : (this.speedKmh > 25 ? 0.12 : 0);
          const fanDelta = rpmRatio * 30.0 * (dt || 0.016);
          for (let i = 0; i < this.glbMovingParts.fans.length; i++) {
            this.glbMovingParts.fans[i].rotation.z += fanDelta;
          }
        }
      }
    }
  },

  // ----------------------------------------------------------------
  // 플랩, 스포일러, 역추진 제어 및 UI / 사운드
  // ----------------------------------------------------------------
  toggleFlaps() {
    if (typeof triggerTouchHaptic === 'function') triggerTouchHaptic(14);
    const iasKnots = this._flight3dCore?.telemetry?.iasKnots ?? (((this.speed || 0) * 280) / 1.852);
    const flapLimits = this._flight3dConfig?.configurationLimits?.flap;
    const currentIdx = this.flapIndex || 0;

    if (!this.isOnGround && Array.isArray(flapLimits) && flapLimits.length > 1) {
      if (currentIdx === 0 && flapLimits[1] > 0 && iasKnots > flapLimits[1]) {
        if (typeof this.playCautionChime === 'function') this.playCautionChime();
        this.showPopup(`⚠️ 현재 속도(${Math.round(iasKnots)} kt)가 플랩 제한 속도(${flapLimits[1]} kt)보다 빨라 플랩 전개 잠금(FLRS) 상태입니다!`);
        return;
      }
      if (currentIdx > 0) {
        const nextIdx = (currentIdx + 1) % this.flaps.length;
        if (nextIdx > 0 && flapLimits[nextIdx] > 0 && iasKnots > flapLimits[nextIdx] - 5) {
          this.flapIndex = 0;
        } else {
          this.flapIndex = nextIdx;
        }
      } else {
        this.flapIndex = (currentIdx + 1) % this.flaps.length;
      }
    } else {
      this.flapIndex = (currentIdx + 1) % this.flaps.length;
    }

    if (this.flapIndex === 0 && this._flight3dCore?.aero) {
      this._flight3dCore.aero.resetFlapDamage?.();
      this._flight3dCore.aero.setFlapPosition?.(0);
    }

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

  // ----------------------------------------------------------------
  // stlim0727/flight3d 120 Hz Headless 6-DOF Physics Core Bridge
  // ----------------------------------------------------------------
  initFlight3dPhysics() {
    const f3d = globalThis.Flight3dPhysics;
    if (!f3d || !f3d.FlightPhysicsCore) return null;

    const config = typeof this.getFlight3dConfig === 'function'
      ? this.getFlight3dConfig(this.currentPlaneType)
      : f3d.BOEING_737_800;

    const groundOffset = config?.landingGear?.cgGroundHeightM ?? 3.5;
    const pos = this.planeGroup ? this.planeGroup.position : new THREE.Vector3(0, this.groundY || 6.84, 0);
    const quat = this.planeGroup ? this.planeGroup.quaternion : new THREE.Quaternion();

    const simPos = new THREE.Vector3(
      pos.x,
      groundOffset + (pos.y - (this.groundY || 6.84)),
      pos.z
    );
    const simVel = this.velocity ? this.velocity.clone() : new THREE.Vector3();

    const core = new f3d.FlightPhysicsCore({
      config,
      position: simPos,
      quaternion: quat.clone(),
      linearVelocity: simVel,
      angularVelocity: new THREE.Vector3(0, 0, 0),
    });

    core.aero.flapsIndex = Math.max(0, Math.min(core.aero.flapAngles.length - 1, this.flapIndex || 0));
    core.aero.currentFlapAngle = core.aero.flapAngles[core.aero.flapsIndex] || 0;
    core.aero.spoilers = this.spoilerExtended ? 1.0 : 0.0;
    core.aero.pitchTrim = this.pitchTrim || 0;
    core.gear.gearState = this.gearExtended ? 1.0 : 0.0;
    core.gear.targetGearState = this.gearExtended ? 1.0 : 0.0;
    core.engines.setThrottle(this.throttle || 0);
    core.engines.reverserActive = Boolean(this.reverseThrustActive);
    if (Array.isArray(core.engines.n1) && Number.isFinite(this.n1)) {
      core.engines.n1.fill(this.n1);
    }

    this._flight3dCore = core;
    this._flight3dConfig = config;
    this._flight3dPlaneType = this.currentPlaneType;
    this._flight3dGroundOffset = groundOffset;
    this._flight3dLastGearState = core.gear.gearState;

    const WarningsClass = f3d.FlightWarningsCore || globalThis.FlightSimCore?.FlightWarningsCore;
    if (WarningsClass) {
      this._flightWarningsCore = new WarningsClass(config);
    }
    this._flapOverspeedTimer = 0;

    return core;
  },

  resetFlight3dPhysics() {
    this._flight3dCore = null;
    this._terrainSurfaceQueries = null;
    this._terrainSurfaceSeaSimY = null;
    this._terrainEnvironment = null;
    this._flightWarningsCore?.reset();
    return this.initFlight3dPhysics();
  },

  collectFlight3dInputs(dt) {
    if (this.keys.fastForward) {
      this.throttle = Math.min(1.0, (this.throttle || 0) + 0.6 * dt);
    }
    if (this.keys.brake) {
      this.throttle = Math.max(0.0, (this.throttle || 0) - 0.8 * dt);
    }

    let elevator = 0;
    let aileron = 0;
    if (this.keys.up) elevator -= 1;
    if (this.keys.down) elevator += 1;
    if (this.keys.left) aileron -= 1;
    if (this.keys.right) aileron += 1;

    if (!this.smoothedTouchStick) {
      this.smoothedTouchStick = { x: 0, y: 0 };
    }
    if (this.joystickData && this.joystickData.active) {
      const smoothRate = Math.min(1.0, dt * 20.0);
      this.smoothedTouchStick.x = THREE.MathUtils.lerp(this.smoothedTouchStick.x, this.joystickData.x, smoothRate);
      this.smoothedTouchStick.y = THREE.MathUtils.lerp(this.smoothedTouchStick.y, this.joystickData.y, smoothRate);
      elevator += this.smoothedTouchStick.y;
      aileron += this.smoothedTouchStick.x;
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
        elevator += this.smoothedTouchStick.y;
        aileron += this.smoothedTouchStick.x;
      }
    }

    if (this.hotasState && this.hotasState.connected) {
      if (Math.abs(this.hotasState.pitch) > 0.06) elevator = this.hotasState.pitch;
      if (Math.abs(this.hotasState.roll) > 0.07) aileron = this.hotasState.roll;
    }

    let rudder = 0;
    if (Math.abs(this.touchRudder || 0) > 0.02) {
      rudder = this.touchRudder;
    }
    if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.12) {
      rudder = this.hotasState.yaw;
    }
    if (this.isOnGround) {
      if (this.keys.left) rudder = Math.max(-1, rudder - 0.85);
      if (this.keys.right) rudder = Math.min(1, rudder + 0.85);
      // HOTAS 스틱 / 모바일 터치 조이스틱 좌우 입력도 지상 노즈휠 조향(Tiller)에 연동
      if (Math.abs(rudder) < 0.05 && Math.abs(aileron) > 0.05) {
        rudder = THREE.MathUtils.clamp(aileron * 0.9, -1, 1);
      }
    }

    const brakes = (this.keys.brake || this.isBellySliding) ? 1.0 : 0.0;
    const gearHandleDown = !this.isGearCollapsed && Boolean(this.gearExtended);
    const activeThrottle = THREE.MathUtils.clamp(this.isEngineOff ? 0 : (this.throttle || 0), 0, 1);

    if (this.tailFinDetached) {
      // JAL 123 전 유압 상실: 요크 상하(승강타) 불능 → 엔진 출력(스로틀)으로 피치/고도 조종, 좌우 롤은 요크 유지
      if (!this.isOnGround) rudder = 0;
      elevator = THREE.MathUtils.clamp((activeThrottle - 0.55) * 1.45, -0.75, 0.75);
      aileron *= 0.78;
    }

    return {
      elevator: THREE.MathUtils.clamp(elevator, -1, 1),
      aileron: THREE.MathUtils.clamp(aileron, -1, 1),
      rudder: THREE.MathUtils.clamp(rudder, -1, 1),
      throttle: activeThrottle,
      brakes,
      pitchTrim: this.pitchTrim || 0,
      flapsIndex: this.flapIndex || 0,
      spoilers: this.spoilerExtended ? 1.0 : 0.0,
      gearHandleDown,
      reverserActive: Boolean(this.reverseThrustActive) && Boolean(this.isOnGround),
    };
  },

  ensureTerrainSurfaceQueries(seaSimY) {
    const TP = globalThis.TerrainProvider;
    const hasTP = Boolean(TP?.createGroundSurfaceQueries);
    if (this._terrainSurfaceQueries && this._terrainSurfaceSeaSimY === seaSimY && this._terrainSurfaceHasTP === hasTP) {
      return this._terrainSurfaceQueries;
    }
    this._terrainSurfaceSeaSimY = seaSimY;
    this._terrainSurfaceHasTP = hasTP;
    this._terrainEnvironment = null;
    const fallbackHeight = (sx, sz) => {
      const overAirport = typeof this.isOverAirport === 'function' ? this.isOverAirport(sx, sz) : true;
      return overAirport ? 0.0 : this._terrainSurfaceSeaSimY - 45.0;
    };
    if (hasTP) {
      this._terrainSurfaceQueries = TP.createGroundSurfaceQueries({
        getProvider: () => this.terrainProvider,
        getFallbackHeight: fallbackHeight,
        getFallbackNormal: () => null,
        minHeight: seaSimY - 45.0,
        waterFloorHeight: seaSimY - 45.0,
        Vector3: globalThis.THREE?.Vector3 || (typeof THREE !== 'undefined' ? THREE.Vector3 : null),
      });
    } else {
      this._terrainSurfaceQueries = {
        getGroundHeight: fallbackHeight,
        getGroundNormal: () => null,
        isWater: () => null,
      };
    }
    return this._terrainSurfaceQueries;
  },

  buildFlight3dEnvironment() {
    const seaWorldY = -1.5;
    const groundOffset = this._flight3dGroundOffset ?? 3.5;
    const seaSimY = seaWorldY - (this.groundY || 6.84) + groundOffset;
    const surface = this.ensureTerrainSurfaceQueries(seaSimY);
    if (this._terrainEnvironment) return this._terrainEnvironment;

    const isOverAirportFn = (sx, sz) => (typeof this.isOverAirport === 'function' ? this.isOverAirport(sx, sz) : true);
    this._terrainEnvironment = {
      getGroundHeight: surface.getGroundHeight,
      getGroundNormal: surface.getGroundNormal,
      isOnRunway: (sx, sz) => isOverAirportFn(sx, sz),
      isRunwaySafetyArea: (sx, sz) => isOverAirportFn(sx, sz),
      getWaterLevel: (sx, sz) => {
        const overWater = surface.isWater(sx, sz);
        if (overWater === true) return this._terrainSurfaceSeaSimY;
        if (overWater === false) return -100.0;
        return isOverAirportFn(sx, sz) ? -100.0 : this._terrainSurfaceSeaSimY;
      },
      getWindWorld: (pos, timeSeconds, out) => {
        if (this.currentEmergency === 'windshear') {
          const t = (Number.isFinite(timeSeconds) ? timeSeconds : 0) * 1.5;
          // 마이크로버스트 윈드시어 3D 공기역학:
          // 중심부 강한 하강기류 (-14 m/s) 및 위치/시간에 따른 돌풍 전선(Gust Front)과 횡풍 전단
          const downdraft = -14.0 + Math.sin(t * 1.3) * 3.5;
          const crosswind = Math.sin(t) * 15.0;
          const headwind = Math.cos(t * 0.85) * 10.0;
          out.set(crosswind, downdraft, headwind);
        } else {
          out.set(0, 0, 0);
        }
        return out;
      },
    };
    return this._terrainEnvironment;
  },

  handleFlight3dEvents(events, result) {
    if (!events || !events.length) return;
    for (const ev of events) {
      if (ev.type === 'liftoff') {
        if (this.isJejuFlyover) continue; // 공중에서 시작하는 상공 비행은 이륙 콜아웃 없음
        this.isOnGround = false;
        this.flightPhase = 'CLIMB_CRUISE';
        if (this.phaseDisplay) this.phaseDisplay.textContent = '상승 및 순항 비행';
        this.score += 500;
        if (typeof this.triggerPassengerReaction === 'function') this.triggerPassengerReaction('takeoff');
        this.showPopup(`🛫 Rotate! ${this._flight3dConfig?.name || '항공기'} 이륙! G 키를 눌러 기어를 접으세요.`);
      } else if (ev.type === 'touchdown') {
        this.clearGPWS();
        if (typeof this.playTouchdownScreech === 'function') this.playTouchdownScreech();
        if (typeof this.triggerPassengerReaction === 'function') this.triggerPassengerReaction('touchdown');
        if (!this.spoilerExtended) {
          this.spoilerExtended = true;
          if (typeof this.updateSpoilerUI === 'function') this.updateSpoilerUI();
        }

        const f3d = globalThis.FlightSimCore || globalThis.Flight3dPhysics;
        const sinkRateFpm = (ev.sinkRate || 0) * 196.85;
        const contactG = result?.telemetry?.gForce ?? (ev.sinkRate ? 1.0 + (ev.sinkRate / 4.0) : 1.0);
        const planeId = (this.currentPlaneType || 'b738').toUpperCase();
        const landingRating = f3d?.classifyLanding
          ? f3d.classifyLanding(planeId, contactG, sinkRateFpm)
          : { rating: (ev.sinkRate || 0) <= 1.8 ? 'butter' : 'normal', isHard: false, isCrash: false };

        if (landingRating.rating === 'butter') {
          this.showPopup('🧈 [BUTTER LANDING] 환상적인 소프트 터치다운! 승객들이 기립 박수를 보냅니다!');
          this.score += 2000;
        } else if (landingRating.rating === 'normal' || landingRating.rating === 'smooth' || landingRating.rating === 'soft') {
          this.showPopup('🛬 정상 착륙 성공! 스포일러가 자동 전개되었습니다. S 또는 R 키로 역추진 제동하세요.');
          this.score += 1000;
        } else if (landingRating.rating === 'firm') {
          this.showPopup('⚠️ 다소 강한 접지 (FIRM TOUCHDOWN)! 안전하게 감속하십시오.');
          this.score += 500;
        } else if (landingRating.rating === 'severeHard') {
          this.showPopup('🚨 하드 랜딩 경고 (HARD LANDING)! 기체 및 랜딩 기어 점검이 필요합니다.');
          this.score += 200;
        } else if (landingRating.rating === 'crash') {
          const isCatastrophic = (ev.sinkRate || 0) > 4.5 || contactG >= 3.2
            || (this.gearPhase === 'UP' && this.currentEmergency !== 'gear_failure' && (ev.sinkRate || 0) > 2.8)
            || this.pitch < -0.15 || Math.abs(this.roll) > 0.55;
          if (isCatastrophic && typeof this.triggerExplosion === 'function') {
            this.triggerExplosion((ev.sinkRate || 0) > 4.5 ? '과도한 강하율 지면 격돌 추락' : '지면 과충격 파쇄 추락');
            return;
          }
          this.showPopup('💥 과도한 충격 접지 (CRASH LANDING)!');
        }

        if (typeof this.checkEmergencyLandingSuccess === 'function') {
          this.checkEmergencyLandingSuccess('runway_landing');
        }
        const destIcao = this.selectedDestinationIcao || 'RKSI';
        const atDestination = (typeof window !== 'undefined' && window.RouteModel && this.planeGroup)
          ? window.RouteModel.isDestinationLanding(destIcao, this.planeGroup.position.x, this.planeGroup.position.z, !this.geoLayer)
          : Boolean(this.planeGroup && this.planeGroup.position.z < -30000);
        if (atDestination) {
          this.flightPhase = 'TAXI_IN';
          if (this.phaseDisplay) this.phaseDisplay.textContent = '대륙 육지 공항 착륙 성공 (게이트 1번으로 주행)';
          this.score += 1500;
        }
      } else if (ev.type === 'gearDamage') {
        if (typeof this.applyGearDamageEvent === 'function') {
          this.applyGearDamageEvent(ev.id, ev.state);
        } else if (ev.state === 'collapsed' && !this.isGearCollapsed && typeof this.collapseLandingGears === 'function') {
          this.collapseLandingGears();
        }
      } else if (ev.type === 'bodyDamage') {
        if (ev.id === 'tail' && (this.flightPhase === 'TAKEOFF_RUN' || this.isOnGround) && typeof this.recordTakeoffTailstrike === 'function') {
          this.recordTakeoffTailstrike();
        } else if (typeof this.applyBodyDamageEvent === 'function') {
          this.applyBodyDamageEvent(ev.id, ev.state);
        }
        if (ev.id === 'nose') {
          const currentKmh = (this.speed || 0) * 280;
          if (currentKmh > 55 || Math.abs(this.verticalSpeed || 0) > 3.0 || this.pitch < -0.15) {
            if (typeof this.triggerExplosion === 'function') {
              this.triggerExplosion('기수 지면 급강하 격돌 추락');
              return;
            }
          }
        }
        if (ev.id === 'wingL' || ev.id === 'wingR') {
          const currentKmh = (this.speed || 0) * 280;
          if (currentKmh > 100 && Math.abs(this.roll) > 0.45) {
            if (typeof this.triggerExplosion === 'function') {
              this.triggerExplosion('주익 지면 접촉 전복 추락');
              return;
            }
          }
        }
        if (ev.id === 'belly') this.isBellySliding = true;
        if (typeof this.checkEmergencyLandingSuccess === 'function') {
          this.checkEmergencyLandingSuccess('belly_landing');
        }
      } else if (ev.type === 'bodyContact') {
        if (ev.id === 'nose') {
          const currentKmh = (this.speed || 0) * 280;
          if (currentKmh > 70 || Math.abs(this.verticalSpeed || 0) > 4.0 || this.pitch < -0.20) {
            if (typeof this.triggerExplosion === 'function') {
              this.triggerExplosion('기수 지면 급강하 격돌 추락');
              return;
            }
          }
        }
        if (ev.id === 'tail' && (this.flightPhase === 'TAKEOFF_RUN' || this.isOnGround) && typeof this.recordTakeoffTailstrike === 'function') {
          this.recordTakeoffTailstrike();
        }
        if (typeof this.applyBodyContactSparks === 'function') {
          this.applyBodyContactSparks(ev.id, ev.speed);
        }
        if (ev.id === 'belly' || this.isGearCollapsed) {
          this.isBellySliding = true;
        }
        if (typeof this.checkEmergencyLandingSuccess === 'function') {
          this.checkEmergencyLandingSuccess('belly_landing');
        }
      } else if (ev.type === 'waterCrash') {
        if (typeof this.clearGPWS === 'function') this.clearGPWS();
        const maxSink = ev.isAmphibious ? 5.5 : 4.5;
        const maxSpeed = ev.isAmphibious ? 85 : 115;
        const maxRoll = ev.isAmphibious ? 18 : 16;
        const cause = (ev.sinkRate || 0) > maxSink
          ? '해상 과속 강하 격돌 추락'
          : (ev.speedMs || 0) > maxSpeed
            ? '해상 고속 격돌 추락'
            : Math.abs(ev.rollDeg || 0) > maxRoll
              ? '해상 주익 접촉 전복 추락'
              : '해상 기수 급강하 격돌 추락';
        if (typeof this.triggerWaterCrash === 'function') {
          this.triggerWaterCrash(cause);
        }
      } else if (ev.type === 'amphibianWaterTouchdown') {
        if (typeof this.clearGPWS === 'function') this.clearGPWS();
        if (typeof this.triggerWaterTouchdownSplash === 'function') this.triggerWaterTouchdownSplash(ev.sinkRate || 2.0);
        if (typeof this.playWaterSplashSound === 'function') this.playWaterSplashSound(this.groundSpeed || 35, ev.sinkRate || 2.0);
        this.flightPhase = 'TOUCHDOWN';
        if (this.phaseDisplay) this.phaseDisplay.textContent = '수상 착수 완료 (수상 활주 / 이수 가능)';
        this.showPopup('🌊 [수륙양용기 착수] 안정적인 수상 착수! 스로틀을 올리면 수면에서 다시 이륙할 수 있습니다.');
        this.score += 1500;
        if (typeof this.checkEmergencyLandingSuccess === 'function') {
          this.checkEmergencyLandingSuccess('amphibian_water');
        }
      } else if (ev.type === 'waterDitching') {
        if (typeof this.triggerWaterTouchdownSplash === 'function') this.triggerWaterTouchdownSplash(ev.sinkRate || 2.0);
        if (typeof this.playWaterSplashSound === 'function') this.playWaterSplashSound(this.groundSpeed || 35, ev.sinkRate || 2.0);
        this.isWaterLanding = true;
        this.flightPhase = 'TOUCHDOWN';
        if (this.phaseDisplay) this.phaseDisplay.textContent = '해상 비상착수 안전 부유 중';
        this.showPopup('🌊 [비상착수 성공] 수면 비상착수 완료! (허드슨강의 기적)');
        this.score += 2000;
        if (typeof this.checkEmergencyLandingSuccess === 'function') {
          this.checkEmergencyLandingSuccess('water_landing');
        }
      } else if (ev.type === 'landingStopped' && this.isWaterLanding && !this.waterSuccessShown) {
        this.waterSuccessShown = true;
        setTimeout(() => {
          this.showLobbyResult({
            title: '🌊 MIRACLE DITCHING SUCCESS!',
            html: `
              <span style="color:#0284c7; font-weight:800; font-size:16px;">🌊 성공적인 해상 비상착수 (Water Ditching)</span><br>
              완벽한 강하율과 기수 각도로 수면에 부드럽게 안착했습니다.<br>
              285명의 승객 전원이 구명정으로 안전하게 구조되었습니다!
            `,
            primaryLabel: '게이트에서 다시 시작 🔄',
            phaseLabel: '다시 이륙'
          });
        }, 1800);
      }
    }
  },

  updateFlightPhysics(dt) {
    dt = Math.min(0.05, Math.max(0.001, dt));
    const cruiseRate = this.cruiseMultiplier || 1;
    const effectiveDt = dt * cruiseRate;

    if (!this._flight3dCore || this._flight3dPlaneType !== this.currentPlaneType) {
      this.initFlight3dPhysics();
    }
    const core = this._flight3dCore;
    if (!core) return;

    if (this.isEngineOff || this.currentEmergency === 'bird_strike') {
      if (Array.isArray(core.engines.failed)) core.engines.failed.fill(true);
    } else if (this.currentEmergency === 'engine_fire') {
      if (Array.isArray(core.engines.failed)) {
        core.engines.failed[0] = true;
        for (let i = 1; i < core.engines.failed.length; i++) core.engines.failed[i] = false;
      }
      if (Array.isArray(core.engines.contactDamage)) {
        core.engines.contactDamage[0] = Math.max(core.engines.contactDamage[0] || 0, 0.75);
      }
    } else {
      if (Array.isArray(core.engines.failed)) core.engines.failed.fill(false);
    }

    const inputs = this.collectFlight3dInputs(effectiveDt);
    const environment = this.buildFlight3dEnvironment();
    const result = core.step(effectiveDt, inputs, environment);

    if (this.tailFinDetached && !this.isOnGround && !this.isDestroyed && core.angularVelocity) {
      // JAL 123 방식: 수직꼬리날개 완전 이탈 시 더치롤(좌우 요·롤 진동) + 푸고이드(상하 피치 흔들림)
      const t = this.emergencyTimer || 0;
      const speedFactor = Math.min(1.0, Math.hypot(result.linearVelocity.x, result.linearVelocity.z) / 140);
      core.angularVelocity.x += Math.sin(t * 0.65) * 0.055 * speedFactor * effectiveDt;
      core.angularVelocity.y += Math.sin(t * 1.45) * 0.22 * speedFactor * effectiveDt;
      core.angularVelocity.z += Math.cos(t * 1.45 + 0.6) * 0.14 * speedFactor * effectiveDt;
    }

    // 착륙 후 활주로 지상 방향 전환(노즈휠 틸러 조향) 보조 — 착륙 직후 감속/택싱 중에도 안정적 선회 보장
    const curGroundSpd = Math.hypot(result.linearVelocity.x, result.linearVelocity.z);
    if (this.isOnGround && !this.isDestroyed && !this.isBellySliding && curGroundSpd > 0.35 && Math.abs(inputs.rudder) > 0.04 && core.angularVelocity) {
      const lowSpdRamp = Math.min(1.0, curGroundSpd / 8.0);
      const highSpdDamp = Math.max(0.25, 1.0 - curGroundSpd / 80.0);
      const targetYawRate = -inputs.rudder * 0.52 * lowSpdRamp * highSpdDamp;
      core.angularVelocity.y += (targetYawRate - core.angularVelocity.y) * Math.min(1.0, effectiveDt * 4.5);
    }

    const groundOffset = this._flight3dGroundOffset ?? 3.5;
    if (this.planeGroup) {
      this.planeGroup.position.set(
        result.position.x,
        (this.groundY || 6.84) + (result.position.y - groundOffset),
        result.position.z
      );
      this.planeGroup.quaternion.copy(result.quaternion);
    }

    const tel = result.telemetry || {};
    if (this.velocity) this.velocity.copy(result.linearVelocity);
    if (!this.angularVelocity) this.angularVelocity = new THREE.Vector3();
    this.angularVelocity.copy(result.angularVelocity);

    this.groundSpeed = Math.hypot(result.linearVelocity.x, result.linearVelocity.z);
    const iasMs = (tel.iasKnots || 0) / 1.94384;
    this.speed = iasMs / 77.777;
    this.verticalSpeed = result.linearVelocity.y;
    this.n1 = tel.engine1?.n1 ?? (20.0 + (this.throttle || 0) * 80.0);
    this.aoa = core.aero.alpha;
    this.alpha = core.aero.alpha;
    this.beta = core.aero.beta;
    this.sideslip = core.aero.beta;
    this.tas = core.aero.tas;
    this.ias = core.aero.ias;
    this.mach = tel.mach || 0;
    this.qDyn = core.aero.qDyn;
    this.currentG = tel.gForce ?? 1.0;
    this.isStalling = Boolean(tel.isStalled);
    this.stallSeverity = tel.stallSeverity || 0;
    this.buffetVibration = tel.buffetVibration || 0;
    this.currentFlapAngle = tel.flapDegree ?? 0;
    this.isOnGround = Boolean(tel.wow || core.gear.onGround || tel.onWater);

    if (core.aero) {
      core.aero.leftFlapDamage = Math.min(core.aero.leftFlapDamage || 0, 0.5);
      core.aero.rightFlapDamage = Math.min(core.aero.rightFlapDamage || 0, 0.5);
    }
    if ((this.flapIndex || 0) === 0) {
      core.aero?.resetFlapDamage?.();
      if (tel.configurationOverspeed?.flap) {
        tel.configurationOverspeed.flap = false;
      }
      this._flapOverspeedTimer = 0;
    } else if (!this.isOnGround && (this.flapIndex || 0) > 0) {
      const retractFlapsViaFlrs = (message) => {
        this.flapIndex = 0;
        core.aero?.setFlapPosition?.(0);
        if (core.aero) core.aero.currentFlapAngle = 0;
        core.aero?.resetFlapDamage?.();
        tel.configurationOverspeed.flap = false;
        this._flapOverspeedTimer = 0;
        this.currentFlapAngle = 0;
        this.updateFlapsUI?.();
        this.showPopup?.(message);
      };

      if (this.flapIndex === 1 && tel.configurationOverspeed?.flap) {
        retractFlapsViaFlrs('🪽 [FLRS 자동 수납] 상승 가속에 따라 이륙 플랩(FLAPS 1)이 자동 수납되었습니다.');
      } else if (this.flapIndex >= 2 && tel.configurationOverspeed?.flap) {
        const limitKt = this._flight3dConfig?.configurationLimits?.flap?.[this.flapIndex] || 180;
        this._flapOverspeedTimer = (this._flapOverspeedTimer || 0) + dt;
        if ((tel.iasKnots || 0) <= limitKt + 8 || this._flapOverspeedTimer < 0.6) {
          tel.configurationOverspeed.flap = false;
        } else if (this._flapOverspeedTimer >= 2.2) {
          retractFlapsViaFlrs('🪽 [FLRS 자동 보호] 플랩 한계 속도 초과로 플랩이 자동 수납되었습니다.');
        }
      } else {
        this._flapOverspeedTimer = 0;
      }
    } else {
      this._flapOverspeedTimer = 0;
    }

    const euler = this._f3dEuler || (this._f3dEuler = new THREE.Euler(0, 0, 0, 'YXZ'));
    euler.setFromQuaternion(result.quaternion, 'YXZ');
    this.pitch = euler.x;
    this.yaw = euler.y;
    this.roll = euler.z;

    if (this.buffetVibration > 0.05) {
      this.screenShake = Math.max(this.screenShake || 0, 0.45 * this.buffetVibration);
      if (this.isStalling && typeof this.playStickShakerSound === 'function') {
        this.playStickShakerSound();
      }
    }

    this.handleFlight3dEvents(result.events, result);

    // 이륙 활주 과도 기수 들림 테일스트라이크 감지 & 고고도 격벽 파열 체크
    if (!this.isDestroyed) {
      if (this.isOnGround && this.groundSpeed > 35 && this.pitch > 0.20 && typeof this.recordTakeoffTailstrike === 'function') {
        this.recordTakeoffTailstrike();
      }
      if (this.hasTakeoffTailstrike && !this.tailFinDetached && typeof this.checkTailstrikeAltitudeFailure === 'function') {
        this.checkTailstrikeAltitudeFailure();
      }
      if (this.isOnGround && this.isPlaying) {
        const currentKmh = (this.speed || 0) * 280;
        const isExtremeAttitude = (this.pitch < -0.45 || Math.abs(this.roll) > 1.35);
        if (isExtremeAttitude && (currentKmh > 35 || Math.abs(this.verticalSpeed || 0) > 2.0)) {
          if (typeof this.triggerExplosion === 'function') {
            this.triggerExplosion('기체 전복 지면 격돌 추락');
            return;
          }
        }
      }
    }

    if (this.isOnGround && this.planeGroup) {
      const destIcao = this.selectedDestinationIcao || 'RKSI';
      const route = typeof window !== 'undefined' ? window.RouteModel : null;
      const compressed = !this.geoLayer;
      const destGate = route ? route.gateSim(destIcao, compressed) : { x: -235, z: -45450 };
      const destRunway = route ? route.destinationSim(destIcao, compressed) : { x: -155, z: -45000 };
      const distDestGate = Math.hypot(this.planeGroup.position.x - destGate.x, this.planeGroup.position.z - destGate.z);
      const distDestGate2 = Math.hypot(this.planeGroup.position.x - destRunway.x, this.planeGroup.position.z - destRunway.z);
      const distStartGate = Math.hypot(this.planeGroup.position.x - (-155), this.planeGroup.position.z - 0);
      const nearGate = (distDestGate <= 85.0) || (distDestGate2 <= 85.0) || (distStartGate <= 85.0);
      if (nearGate && this.speed < 0.35 && this.flightPhase !== 'DEPLANING' && this.flightPhase !== 'MISSION_COMPLETE' && this.flightPhase !== 'TAKEOFF_RUN') {
        if (typeof this.showGateActionPrompt === 'function') this.showGateActionPrompt(true);
      } else if (!nearGate || this.speed >= 0.38) {
        if (typeof this.showGateActionPrompt === 'function') this.showGateActionPrompt(false);
      }
    }

    this.checkFlightMovementReactions(dt);
    this.checkGPWS(dt);

    const currentKmh = this.speed * 280;
    this.updateCameraFromPhysics(currentKmh, dt);

    if (this.audioCtx && this.soundEnabled && typeof this.updateAudio === 'function') {
      this.updateAudio(dt);
    }
  },

  ensureCameraState() {
    if (!this.cameraState) {
      this.cameraState = {
        chaseYaw: 0,
        chasePitch: 0,
        chasePos: new THREE.Vector3(),
        chaseTarget: new THREE.Vector3(),
        chaseTargetInitialized: false,
        lookYaw: 0,
        lookPitch: -0.06,
        headGForceOffset: 0,
        touchJoltOffset: 0,
        wasOnGround: true,
        wingLookYaw: 0,
        wingLookPitch: 0,
        gearLookYaw: 0,
        gearLookPitch: 0,
        droneOrbitAngle: 1.8,
        droneOrbitSpeed: 0.28,
        dronePitch: 0.28,
        dronePos: new THREE.Vector3(),
        droneInitialized: false,
        flybyPos: new THREE.Vector3(),
        flybySet: false,
        flybyRegime: null,
        isDraggingLook: false,
        dragPointerId: null,
        dragLastX: 0,
        dragLastY: 0
      };
    }
    return this.cameraState;
  },

  getCockpitCameraOffset(planeType, mode = '1st') {
    const type = (planeType || this.currentPlaneType || 'a320').toLowerCase();
    const offsets = {
      a320:            [0, 2.15, -16.0],
      a320_detailed:   [0, 2.15, -16.0],
      a320_simplified: [0, 2.15, -16.0],
      a350:            [0, 3.85, -29.4],
      b747:            [0, 4.80, -30.3],
      dc10:            [0, 3.60, -24.2],
      md80:            [0, 2.00, -19.7],
      concorde:        [0, 2.20, -22.3],
      amphibian:       [0, 1.45, -7.4],
      ancestor:        [0, 0.90, -2.8]
    };
    const base = offsets[type] || offsets.a320;
    const zShift = mode === 'hud' ? -1.5 : 0;
    return new THREE.Vector3(base[0], base[1], base[2] + zShift);
  },

  updateCameraFromPhysics(currentKmh, dt) {
    if (!this.camera || !this.planeGroup) return;
    const hideAirframeForInteriorView = (this.cameraMode === '1st' || this.cameraMode === 'hud');
    this.planeGroup.visible = !this.isDestroyed && !hideAirframeForInteriorView;
    if (this.renderOriginApplied) this.renderOriginApplied.set(0, 0, 0);
    const cs = this.ensureCameraState();
    const safeDt = Math.max(0, Math.min(0.1, dt || 0.016));
    const planePos = this.planeGroup.position;
    const planeQuat = this.planeGroup.quaternion;
    this.planeGroup.updateMatrixWorld();
    // Camera offsets use the simulation's world position; planeGroup.matrixWorld
    // carries the render-frame origin translation and is not used here.
    const localToWorld = (local) => local.clone().applyQuaternion(planeQuat).add(planePos);

    // Carry translation immediately so damped exterior cameras don't lag behind
    if (cs.chaseTargetInitialized) {
      const delta = planePos.clone().sub(cs.chaseTarget);
      if (cs.droneInitialized) cs.dronePos.add(delta);
      if (cs.flybySet && cs.flybyRegime === 'parked') cs.flybyPos.add(delta);
      cs.chasePos.add(delta);
    }
    cs.chaseTarget.copy(planePos);
    cs.chaseTargetInitialized = true;

    // Smooth Touchdown Jolt
    cs.touchJoltOffset *= Math.max(0.0, 1.0 - safeDt * 6.0);
    if (this.isOnGround && !cs.wasOnGround) {
      const sinkRate = Math.abs(this.verticalSpeed || 0);
      const severity = Math.min(1.2, Math.max(0.35, sinkRate / 3.5));
      cs.touchJoltOffset = -0.055 * severity;
    }
    cs.wasOnGround = Boolean(this.isOnGround);

    const takeoffRatio = Math.min(1.0, Math.max(0, (currentKmh - 45) / 270));
    const highSpeedRatio = Math.min(1.0, Math.max(0, (currentKmh - 315) / 525));
    const speedRatio = takeoffRatio * 0.62 + highSpeedRatio * 0.38;
    let targetFov = 60 + speedRatio * 18;
    if (this.cameraMode === '1st' || this.cameraMode === 'hud') {
      targetFov = 64 + speedRatio * 20;
    } else if (this.cameraMode === 'wing') {
      targetFov = 58 + speedRatio * 10;
    } else if (this.cameraMode === 'tower') {
      const towerPos = planePos.z < -22500
        ? new THREE.Vector3(-395, 110, -45850)
        : new THREE.Vector3(-360, 144, -488);
      const dist = towerPos.distanceTo(planePos);
      // Telephoto zoom as aircraft moves away from tower
      targetFov = THREE.MathUtils.clamp(60 - (dist - 300) * 0.025, 24, 60);
    } else if (this.cameraMode === 'flyby') {
      targetFov = 54 + speedRatio * 10;
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.06) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.08);
      this.camera.updateProjectionMatrix();
    }

    const isAncestor = this.currentPlaneType === 'ancestor';
    const groundFloor = 3.5;

    switch (this.cameraMode) {
      case '1st': {
        // 1인칭 조종석 시점 (G-Force Head Dynamics + Stall Buffet + Look-Around)
        const gForce = this.isOnGround ? 1.0 : (this.currentG || 1.0);
        const targetGOffset = THREE.MathUtils.clamp(-(gForce - 1.0) * 0.015, -0.025, 0.025);
        cs.headGForceOffset += (targetGOffset - cs.headGForceOffset) * Math.min(1.0, safeDt * 4.0);

        let buffetX = 0;
        let buffetY = 0;
        if (this.isStalling && !this.isOnGround) {
          const t = performance.now() * 0.03;
          const severity = this.buffetVibration || 0.5;
          buffetX = (Math.sin(t * 1.7) + Math.cos(t * 3.1)) * 0.015 * severity;
          buffetY = (Math.cos(t * 2.3) + Math.sin(t * 4.2)) * 0.015 * severity;
        }

        const eyeLocal = this.getCockpitCameraOffset(this.currentPlaneType, '1st');
        eyeLocal.y += cs.headGForceOffset + buffetY + cs.touchJoltOffset;
        eyeLocal.x += buffetX;

        const eyeWorld = localToWorld(eyeLocal);
        this.camera.position.copy(eyeWorld);

        const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
        this.camera.up.copy(upWorld);

        const forwardLocal = new THREE.Vector3(0, 0, -100);
        forwardLocal.applyAxisAngle(new THREE.Vector3(1, 0, 0), cs.lookPitch);
        forwardLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), cs.lookYaw);
        const forwardWorld = forwardLocal.applyQuaternion(planeQuat);
        this.camera.lookAt(eyeWorld.clone().add(forwardWorld));
        break;
      }

      case 'wing': {
        // 승객 창가 날개 시점 (Overlooking Left Wing & Engine)
        const winLocal = isAncestor
          ? new THREE.Vector3(-1.2, 0.7, 1.0)
          : new THREE.Vector3(-2.1, 1.35, 3.5);
        const eyeWorld = localToWorld(winLocal);
        this.camera.position.copy(eyeWorld);

        const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
        this.camera.up.copy(upWorld);

        const lookLocal = new THREE.Vector3(-16.0, -0.8, -3.5);
        lookLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), cs.wingLookYaw);
        lookLocal.applyAxisAngle(new THREE.Vector3(1, 0, 0), cs.wingLookPitch);
        const lookWorld = eyeWorld.clone().add(lookLocal.applyQuaternion(planeQuat));
        this.camera.lookAt(lookWorld);
        break;
      }

      case 'drone': {
        // 드론 360° 오빗 시점 (Continuous Circular Orbit)
        if (!cs.isDraggingLook) {
          cs.droneOrbitAngle += cs.droneOrbitSpeed * safeDt;
        }
        const droneDist = isAncestor ? 20.0 : 38.0;
        const droneHeight = (isAncestor ? 6.0 : 12.0) * Math.sin(cs.dronePitch * 1.8 + 0.5);
        const hoverBob = Math.sin(cs.droneOrbitAngle * 2.2) * 0.55;
        const targetX = planePos.x + Math.sin(cs.droneOrbitAngle) * droneDist;
        const targetZ = planePos.z + Math.cos(cs.droneOrbitAngle) * droneDist;
        const targetY = Math.max(groundFloor, planePos.y + droneHeight + hoverBob);
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);

        if (!cs.droneInitialized) {
          cs.dronePos.copy(targetPos);
          cs.droneInitialized = true;
        } else {
          cs.dronePos.lerp(targetPos, 1 - Math.exp(-safeDt * 8.5));
        }
        this.camera.position.copy(cs.dronePos);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(planePos.clone().add(new THREE.Vector3(0, 1.5, 0)));
        break;
      }

      case 'flyby': {
        // 시네마틱 플라이바이 시점 (Parked / Rollout / Airborne)
        const onGround = Boolean(this.isOnGround);
        const groundSpd = this.groundSpeed || 0;
        let currentRegime = 'airborne';
        if (onGround) {
          if (cs.flybyRegime === 'rollout') {
            currentRegime = groundSpd < 9.0 ? 'parked' : 'rollout';
          } else {
            currentRegime = groundSpd >= 12.0 ? 'rollout' : 'parked';
          }
        }
        if (cs.flybyRegime !== currentRegime) {
          cs.flybyRegime = currentRegime;
          cs.flybySet = false;
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat);
        forward.y = 0;
        if (forward.lengthSq() > 0.0001) forward.normalize();
        else forward.set(0, 0, -1);
        const right = new THREE.Vector3(-forward.z, 0, forward.x);

        if (currentRegime === 'parked') {
          const targetPos = new THREE.Vector3(
            planePos.x + forward.x * 45.0 + right.x * 11.0,
            Math.max(groundFloor + 1.5, planePos.y - 0.5),
            planePos.z + forward.z * 45.0 + right.z * 11.0
          );
          if (!cs.flybySet || cs.flybyPos.distanceTo(targetPos) > 75.0) {
            cs.flybyPos.copy(targetPos);
            cs.flybySet = true;
          } else {
            cs.flybyPos.lerp(targetPos, 1 - Math.exp(-safeDt * 6.0));
          }
        } else if (currentRegime === 'rollout') {
          if (!cs.flybySet) {
            cs.flybyPos.set(
              planePos.x + forward.x * 120.0 + right.x * 22.0,
              groundFloor + 1.5,
              planePos.z + forward.z * 120.0 + right.z * 22.0
            );
            cs.flybySet = true;
          }
          const toPlane = planePos.clone().sub(cs.flybyPos);
          if (cs.flybyPos.distanceTo(planePos) > 180 && forward.dot(toPlane) > 0) {
            cs.flybySet = false;
          }
        } else {
          if (!cs.flybySet) {
            cs.flybyPos.set(
              planePos.x + forward.x * 220.0 + right.x * 28.0,
              Math.max(groundFloor + 2.5, planePos.y - 8.0),
              planePos.z + forward.z * 220.0 + right.z * 28.0
            );
            cs.flybySet = true;
          }
          if (cs.flybyPos.distanceTo(planePos) > 450) {
            cs.flybySet = false;
          }
        }

        cs.flybyPos.y = Math.max(groundFloor, cs.flybyPos.y);
        this.camera.position.copy(cs.flybyPos);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(planePos.clone().add(new THREE.Vector3(0, 1.2, 0)));
        break;
      }

      case 'tower': {
        // 공항 관제탑 시점 (Departure ATC Tower vs Incheon ATC Tower)
        const towerPos = planePos.z < -22500
          ? new THREE.Vector3(-395, 110, -45850)
          : new THREE.Vector3(-360, 144, -488);
        this.camera.position.copy(towerPos);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(planePos);
        break;
      }

      case 'gear': {
        // 동체 하부 랜딩기어 시점 (Belly Cam)
        const eyeLocal = isAncestor
          ? new THREE.Vector3(1.2, -0.9, 2.5)
          : new THREE.Vector3(2.6, -2.5, 7.5);
        const eyeWorld = localToWorld(eyeLocal);
        const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
        if (Math.abs(cs.touchJoltOffset) > 0.0005) {
          eyeWorld.addScaledVector(upWorld, cs.touchJoltOffset * 1.6);
        }
        eyeWorld.y = Math.max(2.6, eyeWorld.y);
        this.camera.position.copy(eyeWorld);
        this.camera.up.copy(upWorld);

        const targetLocal = isAncestor
          ? new THREE.Vector3(-0.2, -0.6, -1.0)
          : new THREE.Vector3(-0.4, -2.0, -3.0);
        targetLocal.x += cs.gearLookYaw * 3.0;
        targetLocal.y += cs.gearLookPitch * 3.0;
        const targetWorld = localToWorld(targetLocal);
        this.camera.lookAt(targetWorld);
        break;
      }

      case 'hud': {
        // 순수 HUD 전방 시점 (Fixed Boresight)
        const hudLocal = this.getCockpitCameraOffset(this.currentPlaneType, 'hud');
        this.camera.position.copy(localToWorld(hudLocal));
        this.camera.quaternion.copy(planeQuat);
        this.camera.up.set(0, 1, 0).applyQuaternion(planeQuat);
        break;
      }

      case '3rd':
      default: {
        // 3인칭 후방 추격 시점 (360° Orbit + 이륙 활주 저고도 원근감 + Speed Lag + Ground Clamp)
        const onGroundFactor = this.isOnGround
          ? 1.0
          : Math.max(0.0, 1.0 - Math.max(0, planePos.y - (this.groundY || 6.84)) / 18.0);
        const baseCamDist = isAncestor ? 18.0 : (42.0 - onGroundFactor * 7.5);
        const baseCamHeight = isAncestor ? 4.5 : (9.5 - onGroundFactor * 2.8);
        const camDistZ = baseCamDist + speedRatio * 9.5;
        const camHeight = baseCamHeight + speedRatio * 1.8;
        const clampedPitch = THREE.MathUtils.clamp(cs.chasePitch, -1.1, 1.0);

        const behindLocal = new THREE.Vector3(0, camHeight, camDistZ);
        behindLocal.applyAxisAngle(new THREE.Vector3(1, 0, 0), clampedPitch);
        behindLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), cs.chaseYaw);

        const targetCamPos = localToWorld(behindLocal);
        targetCamPos.y = Math.max(groundFloor, targetCamPos.y);

        if (cs.chasePos.lengthSq() < 0.001) {
          cs.chasePos.copy(targetCamPos);
        } else {
          cs.chasePos.lerp(targetCamPos, 1 - Math.exp(-safeDt * 6.5));
        }
        cs.chasePos.y = Math.max(groundFloor, cs.chasePos.y);
        this.camera.position.copy(cs.chasePos);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat);
        const lookTarget = (Math.abs(cs.chaseYaw) > 0.05 || Math.abs(cs.chasePitch) > 0.05)
          ? planePos.clone().add(new THREE.Vector3(0, 1.5, 0))
          : planePos.clone().add(forward.multiplyScalar(40));
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(lookTarget);
        break;
      }
    }

    // 활주로 이착륙 활주 노면 진동 & 포장 이음새 통과 충격 (Ground-Roll Pavement Vibration)
    if (this.isOnGround && currentKmh > 25 && (this.cameraMode === '3rd' || this.cameraMode === '1st' || this.cameraMode === 'wing' || this.cameraMode === 'gear')) {
      const rollFactor = Math.min(1.0, (currentKmh - 25) / 260);
      const seamPulse = Math.pow(Math.abs(Math.sin((planePos.z || 0) * (Math.PI / 10.0))), 6);
      const amp = this.cameraMode === '1st' ? 0.045 : (this.cameraMode === 'gear' ? 0.065 : 0.032);
      const seamAmp = this.cameraMode === '1st' ? 0.032 : (this.cameraMode === 'gear' ? 0.048 : 0.024);
      this.camera.position.x += (Math.random() - 0.5) * rollFactor * amp;
      this.camera.position.y += (Math.random() - 0.5) * rollFactor * amp + seamPulse * rollFactor * seamAmp;
      this.camera.position.y = Math.max(2.6, this.camera.position.y);
    }

    if (currentKmh > 580 && (this.cameraMode === '3rd' || this.cameraMode === '1st' || this.cameraMode === 'wing' || this.cameraMode === 'gear')) {
      const speedTurbulence = ((currentKmh - 580) / 320) * (this.cameraMode === '1st' ? 0.08 : 0.05);
      this.camera.position.x += (Math.random() - 0.5) * speedTurbulence;
      this.camera.position.y += (Math.random() - 0.5) * speedTurbulence;
    }

    // 저고도 지면/수면 근접 지면효과 미세 기류 진동 (Ground/Water Skim Buffeting)
    if (!this.isOnGround && currentKmh > 120 && (this.cameraMode === '3rd' || this.cameraMode === '1st' || this.cameraMode === 'wing' || this.cameraMode === 'gear')) {
      const clearance = typeof this._surfaceClearance === 'number'
        ? this._surfaceClearance
        : Math.max(0, planePos.y - (this.groundY || 6.84));
      if (clearance < 25) {
        const prox = 1.0 - clearance / 25;
        const speedFactor = Math.min(1.0, currentKmh / 350);
        const skimJitter = prox * speedFactor * (this.cameraMode === '1st' ? 0.07 : 0.045);
        this.camera.position.x += (Math.random() - 0.5) * skimJitter;
        this.camera.position.y += (Math.random() - 0.5) * skimJitter;
      }
    }
  },

  // ----------------------------------------------------------------
  // EGPWS / GPWS 지형 및 강하율 접근 경보 시스템
  // ----------------------------------------------------------------
  checkGPWS(dt) {
    if (!this.isPlaying || this.isDestroyed || this.isOnGround) {
      this.clearGPWS();
      this._flightWarningsCore?.reset();
      return;
    }

    const pos = this.planeGroup.position;
    let isOverWater = typeof this.isOverAirport === 'function'
      ? !this.isOverAirport(pos.x, pos.z)
      : Boolean(this._isOverWaterSurface);
    const isAmphibian = this.currentPlaneType === 'amphibian';
    const baseGroundY = this.groundY ?? 6.84;
    let surfaceRefY = isOverWater ? Math.min(baseGroundY, -0.3) : baseGroundY;
    const providerReady = Boolean(this.terrainProvider?.isReady?.(pos.x, pos.z));
    if (providerReady) {
      const simH = this.terrainProvider.getHeight(pos.x, pos.z);
      const overSea = Boolean(this.terrainProvider.isWater?.(pos.x, pos.z));
      isOverWater = overSea;
      surfaceRefY = overSea ? Math.min(baseGroundY, -0.3) : (baseGroundY + (Number.isFinite(simH) ? simH : 0));
    }
    const radioAltM = Math.max(0, pos.y - surfaceRefY); // 미터 단위 대지/대수면 고도
    const sinkRateMs = -(this.verticalSpeed || 0); // m/s 수직 하강 속도

    const isNormalRunwayTouchdown = Boolean(this.gearExtended) && radioAltM < 45 && sinkRateMs < 4.2;
    const isNormalWaterTouchdown = isAmphibian && isOverWater && radioAltM < 75 && sinkRateMs < 5.2;
    const isNormalTouchdown = isNormalRunwayTouchdown || isNormalWaterTouchdown;

    // 1순위: FlightSimCore.FlightWarningsCore 연속 항공역학 경보 평가
    if (this._flightWarningsCore) {
      let terrainAheadSeconds = Infinity;
      if (providerReady) {
        const f3d = globalThis.FlightSimCore || globalThis.Flight3dPhysics;
        if (f3d?.terrainConflictSeconds && this.velocity) {
          const gpwsTerrain = this._gpwsTerrainProxy ??= {
            getHeight: (x, z) => {
              const h = this.terrainProvider?.isReady?.(x, z) ? this.terrainProvider.getHeight(x, z) : null;
              return 2.12 + (Number.isFinite(h) ? h : 0);
            }
          };
          terrainAheadSeconds = f3d.terrainConflictSeconds(pos, this.velocity, gpwsTerrain, isNormalRunwayTouchdown);
        }
      }
      const telemetry = {
        onGround: Boolean(this.isOnGround),
        radioAltFt: radioAltM * 3.28084,
        vsiFpm: (this.verticalSpeed || 0) * 196.85,
        altitudeFt: pos.y * 3.28084,
        gearState: this.gearExtended ? 1.0 : 0.0,
        flapDegree: this._flight3dCore?.aero?.currentFlapAngle ?? 0,
        isStallWarning: Boolean(this.isStalling || this._flight3dCore?.aero?.isStallWarning),
        isStalled: Boolean(this.isStalling || this._flight3dCore?.aero?.isStalled),
        rollDeg: ((this.planeGroup.rotation?.z || this.roll || 0) * 180) / Math.PI,
        throttle: this.throttle || 0,
        iasKnots: ((this.speed || 0) * 280) / 1.852,
        configurationOverspeed: this._flight3dCore?.telemetry?.configurationOverspeed,
        configurationDamage: this._flight3dCore?.telemetry?.configurationDamage,
      };
      const result = providerReady
        ? this._flightWarningsCore.update(dt, telemetry, terrainAheadSeconds)
        : this._flightWarningsCore.update(dt, telemetry);
      const activeWarnings = (result?.activeWarnings || []).filter((w) => {
        if (isAmphibian && isOverWater && (w.id === 'gear' || w.id === 'flaps')) {
          return false;
        }
        if (isNormalTouchdown && (w.id === 'pull-up' || w.id === 'terrain' || w.id === 'sink-rate')) {
          return false;
        }
        return true;
      });
      const topWarning = activeWarnings[0];

      if (topWarning) {
        if (topWarning.id === 'stall') {
          this.triggerGPWS('STALL', 'STALL! STALL!', 'AIRSPEED CRITICAL - PUSH NOSE DOWN & MAX POWER', 'stall-warn');
          this.speakGPWS('STALL, STALL');
          return;
        }
        if (topWarning.id === 'pull-up' || topWarning.id === 'terrain') {
          const sec = sinkRateMs > 0.8 ? Math.max(0.1, radioAltM / sinkRateMs).toFixed(1) : '10.0';
          this.triggerGPWS('PULL_UP', 'PULL UP! PULL UP!', `지면 충돌 ${sec}초 전 - 즉시 기수 상승! (TERRAIN PULL UP)`, 'danger');
          this.playGPWSWhoopSiren();
          this.speakGPWS('PULL UP');
          return;
        }
        if (topWarning.id === 'flap-overspeed') {
          this.triggerGPWS('OVERSPEED', 'FLAP OVERSPEED!', '플랩 한계 속도 초과 (Vfe EXCEEDED)! 플랩을 즉시 올리거나 감속하십시오', 'danger');
          this.speakGPWS('FLAP OVERSPEED');
          this.playCautionChime();
          return;
        }
        if (topWarning.id === 'gear-overspeed') {
          this.triggerGPWS('OVERSPEED', 'GEAR OVERSPEED!', '랜딩 기어 한계 속도 초과 (Vle EXCEEDED)! 즉시 감속하십시오', 'danger');
          this.speakGPWS('GEAR OVERSPEED');
          this.playCautionChime();
          return;
        }
      }

      if (sinkRateMs > 0.8) {
        const timeToImpact = radioAltM / sinkRateMs;
        const unsafeSinkThreshold = (isAmphibian && isOverWater) ? 5.2 : 4.2;
        if (timeToImpact <= 10.0 && !isNormalTouchdown && sinkRateMs >= unsafeSinkThreshold) {
          const sec = Math.max(0.1, timeToImpact).toFixed(1);
          this.triggerGPWS('PULL_UP', 'PULL UP! PULL UP!', `지면 충돌 ${sec}초 전 - 즉시 기수 상승! (TERRAIN PULL UP)`, 'danger');
          this.playGPWSWhoopSiren();
          this.speakGPWS('PULL UP');
          return;
        }
      }

      if (topWarning) {
        if (topWarning.id === 'gear') {
          this.triggerGPWS('GEAR', 'TOO LOW, GEAR!', 'LOWER LANDING GEAR [단축키 G]', 'gear-warn');
          this.speakGPWS('TOO LOW, GEAR');
          this.playCautionChime();
          return;
        }
        if (topWarning.id === 'sink-rate') {
          const sec = sinkRateMs > 0.8 ? Math.max(0.1, radioAltM / sinkRateMs).toFixed(1) : '18.0';
          this.triggerGPWS('SINK_RATE', 'SINK RATE!', `강하율 과다 (지면 충돌 ${sec}초 전)`, 'caution');
          this.speakGPWS('SINK RATE');
          this.playCautionChime();
          return;
        }
      }

      this.clearGPWS();
      return;
    }

    // 1. 실속 (STALL) 경보: 최우선 경보
    if (this.isStalling) {
      this.triggerGPWS('STALL', 'STALL! STALL!', 'AIRSPEED CRITICAL - PUSH NOSE DOWN & MAX POWER', 'stall-warn');
      this.speakGPWS('STALL, STALL');
      return;
    }

    // 2. 지면 충돌 예상 시간 (Time to Impact) 계산 (10초 전 정밀 PULL UP 경보)
    if (sinkRateMs > 0.8) {
      const timeToImpact = radioAltM / sinkRateMs; // 초(s) 단위 충돌까지 남은 시간

      // ★ 충돌 10초 전 긴급 기수 인양 경보 (PULL UP!)
      if (timeToImpact <= 10.0 && !isNormalTouchdown) {
        const sec = Math.max(0.1, timeToImpact).toFixed(1);
        this.triggerGPWS('PULL_UP', 'PULL UP! PULL UP!', `지면 충돌 ${sec}초 전 - 즉시 기수 상승! (TERRAIN PULL UP)`, 'danger');
        this.playGPWSWhoopSiren();
        this.speakGPWS('PULL UP');
        return;
      }
    }

    // 3. 바퀴 미전개 착륙 경보 (TOO LOW, GEAR!): 고도 140m 이하에서 하강 중인데 랜딩 기어가 접혀있음 (수상 착수 중인 수륙양용기 제외)
    if (radioAltM < 140 && sinkRateMs > 0.5 && !this.gearExtended && !(isAmphibian && isOverWater)) {
      this.triggerGPWS('GEAR', 'TOO LOW, GEAR!', 'LOWER LANDING GEAR [단축키 G]', 'gear-warn');
      this.speakGPWS('TOO LOW, GEAR');
      this.playCautionChime();
      return;
    }

    // 4. 주의 단계 강하율 경보 (SINK RATE!): 충돌 18초 전 또는 급격한 강하율
    if (sinkRateMs > 5.5) {
      const timeToImpact = radioAltM / sinkRateMs;
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
    if (typeof this.stopGPWSSiren === 'function') this.stopGPWSSiren();
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
    const radioAlt = Math.max(0, this.planeGroup.position.y - this.groundY); // 미터 단위 고도

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
      } else if (this.currentEmergency === 'tail_loss' || this.currentEmergency === 'in_flight_breakup') {
        motionType = 'ENGINE_FIRE';
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
        } else if (forward.y > 0.38 || this.verticalSpeed > 18) {
          // 급상승 (기수 각도 > +22도)
          motionType = 'STEEP_CLIMB';
        } else if (forward.y < -0.32 || this.verticalSpeed < -18) {
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

