/**
 * Sky Jet Explorer 3D - In-Flight Emergency Scenarios, Bird Strikes, Engine Fires & Windshear
 * Subsystem: emergency (7 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 13. 비상 상황 시나리오 시스템 (In-Flight Emergency Scenarios)
  // ----------------------------------------------------------------
  toggleEmergencyPanel() {
    if (!this.emergencyPanel) this.emergencyPanel = document.getElementById('emergency-panel');
    if (this.emergencyPanel) {
      this.emergencyPanel.classList.toggle('hidden');
    }
  },

  triggerEmergency(type) {
    if (type === 'random') {
      const types = ['engine_fire', 'bird_strike', 'windshear', 'gear_failure'];
      type = types[Math.floor(Math.random() * types.length)];
    }

    if (type === 'none' || type === 'clear') {
      this.clearEmergency();
      return;
    }

    this.currentEmergency = type;
    this.emergencyTimer = 0;
    this.emergencyBonusGiven = false;

    // 패널 닫기
    if (this.emergencyPanel) {
      this.emergencyPanel.classList.add('hidden');
    }

    switch (type) {
      case 'engine_fire':
        this.throttle = Math.min(0.5, this.throttle);
        this.triggerGPWS('EMERGENCY', '🔥 ENGINE 1 FIRE!', '비대칭 추력 발생! D 키로 균형 유지 및 비상착륙하십시오', 'danger');
        this.speakGPWS('ENGINE FIRE');
        this.playGPWSWhoopSiren();
        this.showPopup('🚨 1번 엔진 화재 발생! 추력이 저하되고 기체가 좌측으로 쏠립니다!');
        this.triggerPassengerReaction('emergency_engine_fire');
        break;

      case 'bird_strike':
        this.createBirdStrikeEffect();
        this.throttle = 0;
        this.screenShake = 1.2;
        this.playMetalCrunchSound();
        this.triggerGPWS('EMERGENCY', '🦅 DUAL ENGINE FAILURE!', '버드 스트라이크로 전 엔진 정지! 무동력 활공 비상착륙하십시오', 'danger');
        this.speakGPWS('DUAL ENGINE FAILURE');
        this.playGPWSWhoopSiren();
        this.showPopup('🦅 버드 스트라이크! 조류 충돌로 전 엔진이 정지되었습니다. 무동력 활공으로 착륙하세요!');
        this.triggerPassengerReaction('emergency_bird_strike');
        break;

      case 'windshear':
        this.screenShake = 1.6;
        this.triggerGPWS('WINDSHEAR', '🌪️ WINDSHEAR AHEAD!', '급격한 하강 기류! 스페이스바로 최대 출력 및 기수 상승!', 'danger');
        this.speakGPWS('WINDSHEAR, WINDSHEAR');
        this.playGPWSWhoopSiren();
        this.showPopup('🌪️ 마이크로버스트 윈드시어 조우! 강력한 하강 기류에 맞서 출력을 최대로 올리세요!');
        this.triggerPassengerReaction('emergency_windshear');
        break;

      case 'gear_failure':
        this.gearExtended = false;
        this.isGearCollapsed = true;
        this.gearPhase = 'COLLAPSED';
        this.updateGearUI('고장 (FAIL)', 'gear-warn');
        this.landingGears.forEach(g => {
          if (g.userData && g.userData.strutPivot) g.userData.strutPivot.visible = false;
          else g.visible = false;
        });
        this.triggerGPWS('GEAR', '🛞 LANDING GEAR HYDRAULIC FAILURE!', '랜딩 기어 전개 불가! 동체 비상착륙(Belly Landing)을 준비하십시오', 'gear-warn');
        this.speakGPWS('GEAR FAILURE');
        this.playCautionChime();
        this.showPopup('🛞 유압 시스템 고장으로 랜딩 기어가 전개되지 않습니다! 동체 비상 착륙을 시도하세요!');
        this.triggerPassengerReaction('emergency_gear_failure');
        break;

      case 'tail_loss':
        this.triggerTailFinBreakoff();
        break;
    }
  },

  resetTailstrikeState() {
    this.hasTakeoffTailstrike = false;
    this.tailFinDetached = false;
    this.tailBulkheadTriggerAltM = 1600;
    if (Array.isArray(this._detachedTailNodes)) {
      for (const node of this._detachedTailNodes) {
        if (node) node.visible = true;
      }
    }
    this._detachedTailNodes = [];
  },

  recordTakeoffTailstrike() {
    if (this.hasTakeoffTailstrike || this.tailFinDetached || this.isDestroyed) return false;
    this.hasTakeoffTailstrike = true;
    this.tailFinDetached = false;
    this.tailBulkheadTriggerAltM = 1500 + Math.round(Math.random() * 400);
    if (typeof this.applyBodyDamageEvent === 'function') {
      this.applyBodyDamageEvent('tail', 'damaged');
    } else if (this.partDamage) {
      this.partDamage.tail = 'damaged';
    }
    if (typeof this.showPopup === 'function') {
      this.showPopup('⚠️ [테일 스트라이크] 이륙 중 꼬리 지면 접촉! 후방 압력 격벽 균열 — 고고도 상승 시 파손 위험!');
    }
    return true;
  },

  checkTailstrikeAltitudeFailure() {
    if (!this.hasTakeoffTailstrike || this.tailFinDetached || this.isDestroyed || this.isOnGround) return false;
    if (!this.planeGroup) return false;
    const altM = Math.max(0, this.planeGroup.position.y - (this.groundY || 6.84));
    const triggerAlt = this.tailBulkheadTriggerAltM || 1600;
    if (altM >= triggerAlt) {
      this.triggerTailFinBreakoff();
      return true;
    }
    return false;
  },

  spawnDetachedTailFinDebris() {
    if (!this.scene || !this.planeGroup || typeof THREE === 'undefined') return;
    const pos = this.planeGroup.position;
    const quat = this.planeGroup.quaternion;
    const tailOffset = new THREE.Vector3(0, 3.2, 16.0).applyQuaternion(quat);
    const tailWorld = pos.clone().add(tailOffset);
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

    // 1. 떨어져 나가는 수직꼬리날개 파편 메쉬
    if (typeof THREE.BoxGeometry === 'function' && typeof THREE.MeshStandardMaterial === 'function') {
      const finGeo = new THREE.BoxGeometry(0.65, 5.8, 4.6);
      const finMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.4 });
      const finMesh = new THREE.Mesh(finGeo, finMat);
      finMesh.position.copy(tailWorld);
      finMesh.quaternion.copy(quat);
      finMesh.velocity = backward.clone().multiplyScalar(22).add(new THREE.Vector3((Math.random() - 0.5) * 8, 4.5, 0));
      finMesh.rotVel = new THREE.Vector3(1.8, 2.4, 3.1);
      finMesh.life = 4.5;
      if (Array.isArray(this.particles)) this.particles.push(finMesh);
      this.scene.add(finMesh);
    }

    // 2. 고고도 급감압 백색 안개 & 기체 파편 파티클 분출
    if (typeof this.emitPartParticles === 'function') {
      this.emitPartParticles('tail', 'spark', 12);
      this.emitPartParticles('tail', 'smoke', 10);
    }
  },

  triggerTailFinBreakoff() {
    if (this.tailFinDetached || this.isDestroyed) return false;
    this.tailFinDetached = true;
    this.currentEmergency = 'tail_loss';
    this.emergencyTimer = 0;
    this.emergencyBonusGiven = false;
    this.partDamage = this.partDamage || {
      nose: 'normal', belly: 'normal', tail: 'normal',
      wingL: 'normal', wingR: 'normal', engineL: 'normal', engineR: 'normal'
    };
    this.partDamage.tail = 'failed';
    this.hullIntegrity = Math.max(20, (this.hullIntegrity || 100) - 35);
    this.screenShake = Math.max(this.screenShake || 0, 1.6);

    // 수직꼬리날개 / 방향타 메쉬를 시각적으로 이탈 처리 (종료하지 않고 비행 계속 가능)
    this._detachedTailNodes = this._detachedTailNodes || [];
    const hideNode = (node) => {
      if (!node || !node.visible) return;
      node.visible = false;
      this._detachedTailNodes.push(node);
    };
    if (this.glbMovingPartsController && Array.isArray(this.glbMovingPartsController.controlPanels)) {
      for (const panel of this.glbMovingPartsController.controlPanels) {
        if (panel && panel.control === 'rudder' && panel.pivot) hideNode(panel.pivot);
      }
    }
    if (this.controlSurfaces && this.controlSurfaces.rudder) {
      hideNode(this.controlSurfaces.rudder);
    }
    if (this.planeGroup && typeof this.planeGroup.traverse === 'function') {
      this.planeGroup.traverse((obj) => {
        if (obj && obj.isMesh && /rudder|vstab|vertical.*stab|tail.*fin/i.test(obj.name || '')) {
          hideNode(obj);
        }
      });
    }

    this.spawnDetachedTailFinDebris();

    if (typeof this.playMetalCrunchSound === 'function') this.playMetalCrunchSound();
    if (typeof this.playGearSnapSound === 'function') this.playGearSnapSound();
    if (typeof this.playGPWSWhoopSiren === 'function') this.playGPWSWhoopSiren();
    if (typeof this.triggerGPWS === 'function') {
      this.triggerGPWS(
        'EMERGENCY',
        '💥 TAIL FIN SEPARATED! HYDRAULIC LOSS!',
        '테일스트라이크 격벽 파열로 꼬리날개 파손! 방향타 불능 — 스로틀과 롤로 비상착륙을 시도하십시오!',
        'danger'
      );
    }
    if (typeof this.speakGPWS === 'function') this.speakGPWS('HYDRAULIC FAILURE, TAIL DAMAGED');
    if (typeof this.showPopup === 'function') {
      this.showPopup('💥 [고고도 격벽 파열] 꼬리날개가 떨어져 나갔습니다! 방향타 상실 — 비상착륙을 시도하세요!');
    }
    if (typeof this.triggerPassengerReaction === 'function') {
      this.triggerPassengerReaction('emergency_engine_fire');
    }
    return true;
  },

  clearEmergency() {
    this.currentEmergency = null;
    this.emergencyTimer = 0;
    this.resetTailstrikeState();
    this.isGearCollapsed = false;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.updateGearUI('DOWN', 'gear-down');
    this.landingGears.forEach(g => {
      g.visible = true;
      if (g.userData) {
        if (g.userData.strutPivot) {
          g.userData.strutPivot.visible = true;
          g.userData.strutPivot.rotation.set(0, 0, 0);
        }
        if (g.userData.doorL) g.userData.doorL.rotation.set(0, 0, 0);
        if (g.userData.doorR) g.userData.doorR.rotation.set(0, 0, 0);
        if (g.userData.bogieBeam) g.userData.bogieBeam.rotation.set(0, 0, 0);
      }
    });
    this.clearGPWS();
    if (this.emergencyPanel) this.emergencyPanel.classList.add('hidden');
    this.showPopup('✅ 비상 상황 해제: 기체 및 모든 시스템이 정상화되었습니다.');
    this.triggerPassengerReaction('emergency_cleared');
  },

  // 조류 충돌 이펙트 (새 모양 파편 & 깃털 파티클)
  createBirdStrikeEffect() {
    const geo = new THREE.DodecahedronGeometry(0.35, 0);
    const featherColors = [0x475569, 0x1e293b, 0xffffff, 0x94a3b8];
    for (let i = 0; i < 30; i++) {
      const color = featherColors[Math.floor(Math.random() * featherColors.length)];
      const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      p.position.copy(this.planeGroup.position).add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, -8));
      p.velocity = new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 4, 6 + Math.random() * 8);
      p.life = 0.8 + Math.random() * 0.4;
      this.particles.push(p);
      this.scene.add(p);
    }
  },

  // 1번 엔진 화염 & 연기 파티클 생성
  createEngineFireParticles() {
    if (this.engineExhaustPoints.length === 0) return;
    const leftEnginePos = this.engineExhaustPoints[0].clone().applyQuaternion(this.planeGroup.quaternion).add(this.planeGroup.position);

    // 1. 오렌지/레드 화염
    const fireGeo = new THREE.BoxGeometry(0.9, 0.9, 1.2);
    const fireColors = [0xef4444, 0xf97316, 0xfbbf24];
    const fireMat = new THREE.MeshBasicMaterial({
      color: fireColors[Math.floor(Math.random() * fireColors.length)],
      transparent: true,
      opacity: 0.85
    });
    const fireP = new THREE.Mesh(fireGeo, fireMat);
    fireP.position.copy(leftEnginePos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8));
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeGroup.quaternion);
    fireP.velocity = backward.multiplyScalar(this.speed * 0.6 + 2.0).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 2.0, 0));
    fireP.life = 0.45;
    this.particles.push(fireP);
    this.scene.add(fireP);

    // 2. 짙은 검은 연기
    const smokeGeo = new THREE.DodecahedronGeometry(1.2, 0);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.65
    });
    const smokeP = new THREE.Mesh(smokeGeo, smokeMat);
    smokeP.position.copy(leftEnginePos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, 2.0));
    smokeP.velocity = backward.multiplyScalar(this.speed * 0.4 + 1.0).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.5 + Math.random() * 1.5, 0));
    smokeP.life = 0.9;
    this.particles.push(smokeP);
    this.scene.add(smokeP);
  },

  // 비상 상황 실시간 물리 업데이트
  updateEmergency(dt) {
    if (!this.currentEmergency || this.isDestroyed) return;
    this.emergencyTimer += dt;

    switch (this.currentEmergency) {
      case 'engine_fire':
        // 추력 최대 50% 제한
        if (this.throttle > 0.5) {
          this.throttle = 0.5;
        }
        // 6-DOF 물리 코어 미연동 시에만 수동 요 모멘트 적용 (연동 시 EngineModel의 비대칭 추력 모멘트가 물리적으로 작용)
        if (!this._flight3dCore) {
          this.planeGroup.rotateY(0.0032);
        }
        // 화염 및 연기 지속 분출
        this.createEngineFireParticles();
        // 기체 미세 진동
        this.screenShake = Math.max(this.screenShake, 0.08);
        break;

      case 'bird_strike':
        // 전 엔진 정지: 스로틀 0 강제 유지
        this.throttle = 0;
        break;

      case 'windshear':
        // 6-DOF 코어가 활성화된 경우 getWindWorld가 3D 마이크로버스트 하강기류(-14 m/s)와 돌풍 전단을 자연스럽게 가함
        if (!this._flight3dCore) {
          const shearOsc = Math.sin(Date.now() * 0.007);
          const downdraft = (11.0 + shearOsc * 6.0) * dt;
          this.planeGroup.position.y -= downdraft;
          this.planeGroup.rotateZ(shearOsc * 0.005);
          this.planeGroup.rotateX(Math.cos(Date.now() * 0.005) * 0.004);
        }
        this.screenShake = Math.max(this.screenShake, 0.35);
        break;

      case 'gear_failure':
        // 기어가 나오지 않음 보장
        if (this.gearExtended) {
          this.gearExtended = false;
          this.landingGears.forEach(g => g.visible = false);
        }
        break;

      case 'tail_loss':
        // 꼬리날개 이탈 후 기체 떨림 및 감압 연기 지속 (조종 불능 종료 없이 비상착륙 시도 가능)
        this.screenShake = Math.max(this.screenShake, 0.12);
        if (!this._flight3dCore && !this.isOnGround && this.planeGroup) {
          const osc = Math.sin(this.emergencyTimer * 1.45);
          this.planeGroup.rotateY(osc * 0.0028);
          this.planeGroup.rotateZ(Math.cos(this.emergencyTimer * 1.45) * 0.0022);
        }
        break;
    }
  },

  // 영웅적 비상착륙 성공 판정
  checkEmergencyLandingSuccess(landingType) {
    if (!this.currentEmergency || this.emergencyBonusGiven || this.isDestroyed) return;

    this.emergencyBonusGiven = true;
    this.score += 3000;

    const titles = {
      engine_fire: '🔥 1번 엔진 화재 극복 착륙',
      bird_strike: '🦅 버드 스트라이크 무동력 활공 착륙',
      windshear: '🌪️ 마이크로버스트 윈드시어 돌파 착륙',
      gear_failure: '🛞 기어 고장 동체 비상착륙 (Belly Landing)',
      tail_loss: '💥 꼬리날개 파손(테일스트라이크 격벽 파열) 기적의 비상착륙'
    };
    const emTitle = titles[this.currentEmergency] || '비상 상황 안전 착륙';

    const landingNames = {
      amphibian_water: '해상 안전 착수',
      water_ditching: '허드슨강의 기적! 해상 비상착수',
      belly_landing: '불꽃 튀는 동체 비상착륙',
      runway_landing: '활주로 비상착륙'
    };
    const landName = landingNames[landingType] || '안전 착륙';

    this.showPopup(`🏆 영웅적 착륙 성공! (+3,000점) [${emTitle}]`);
    this.playCautionChime();
    this.triggerPassengerReaction('emergency_landing_success');

    setTimeout(() => {
      const modalTitle = document.getElementById('modal-title');
      const modalDesc = document.getElementById('modal-desc');
      if (modalTitle && modalDesc) {
        modalTitle.textContent = '🏆 HEROIC EMERGENCY LANDING';
        modalDesc.innerHTML = `
          <span style="color:#f59e0b; font-weight:800; font-size:18px;">${emTitle} 성공!</span><br>
          방식: <strong style="color:#38bdf8;">${landName}</strong><br>
          비상 상황 속에서도 침착한 조종술로 승객 전원의 생명을 구했습니다.<br>
          <span style="color:#10b981; font-weight:700;">🎖️ 비상착륙 특별 보너스: +3,000점 획득!</span>
        `;
        if (this.startBtn) this.startBtn.textContent = '게이트에서 다시 시작 🔄';
        if (this.takeoffDirectBtn) this.takeoffDirectBtn.textContent = '활주로에서 즉시 이륙하기 🛫';
        this.overlay.classList.remove('hidden');
      }
    }, 1800);
  }

  });
})();

