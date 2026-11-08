/**
 * Sky Jet Explorer 3D - Contrails, Touchdown Smokes, Vapor Particles, Airframe Debris & Damage Physics
 * Subsystem: effects (22 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // AI 항공기 굵고 웅장한 선명한 제트 비행운 파티클 (하늘에 뚜렷이 남음)
  createContrailParticle(pos, quat, sideOffset = 0) {
    if (!this.scene) return;
    const geo = new THREE.SphereGeometry(4.8, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65
    });
    const p = new THREE.Mesh(geo, mat);
    const offset = new THREE.Vector3(sideOffset, 0, 16).applyQuaternion(quat);
    p.position.copy(pos).add(offset);
    p.isContrail = true;
    p.life = 1.0;
    this.scene.add(p);
    this.particles.push(p);
  },

  // 활주로 착륙 타이어 백색 접지 연기
  createTouchdownSmoke(pos) {
    if (!this.scene) return;
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.SphereGeometry(1.6 + Math.random() * 1.8, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf1f5f9,
        transparent: true,
        opacity: 0.75
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(
        pos.x + (Math.random() - 0.5) * 8,
        pos.y + 0.8 + Math.random() * 1.5,
        pos.z + (Math.random() - 0.5) * 14
      );
      p.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        1.5 + Math.random() * 2.5,
        (Math.random() - 0.5) * 3
      );
      p.life = 0.8;
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  registerObstacle(mesh, name, offset = new THREE.Vector3(0, 0, 0)) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.translate(offset);
    this.obstacles.push({ box, name, mesh });
  },

  // ----------------------------------------------------------------
  // 속도감 시각 효과 (High-Speed Streamlines & Wingtip Trails)
  // ----------------------------------------------------------------
  initSpeedEffects() {
    // 1. 고속 공기 기류 스트림 라인 (3D Speed Lines)
    const lineCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * 6); // 2 vertices per line (x,y,z, x,y,z)

    this.speedLineData = [];
    for (let i = 0; i < lineCount; i++) {
      const radius = 6.0 + Math.random() * 32.0;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.65 + 1.5;
      const z = -45.0 + Math.random() * 90.0;
      const length = 12.0 + Math.random() * 22.0;
      const speedMult = 1.0 + Math.random() * 0.8;

      this.speedLineData.push({ x, y, z, length, speedMult });

      const idx = i * 6;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      positions[idx + 3] = x;
      positions[idx + 4] = y;
      positions[idx + 5] = z - length;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.speedLineMaterial = new THREE.LineBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5
    });

    this.speedLinesGroup = new THREE.LineSegments(geometry, this.speedLineMaterial);
    this.speedLinesGroup.frustumCulled = false;
    this.scene.add(this.speedLinesGroup);

    this.speedVignetteEl = document.getElementById('speed-vignette');
  },

  updateSpeedEffects(dt, currentKmh) {
    if (!this.speedLinesGroup || !this.speedLineMaterial) return;

    // 시속 240 km/h 이상부터 스트림 라인 점진 등장, 800 km/h에서 최고조
    const speedRatio = Math.min(1.0, Math.max(0, (currentKmh - 220) / 580)); // 0.0 ~ 1.0

    const targetOpacity = speedRatio > 0.04 ? (0.15 + speedRatio * 0.68) : 0.0;
    this.speedLineMaterial.opacity = THREE.MathUtils.lerp(this.speedLineMaterial.opacity, targetOpacity, 0.1);

    // 스피드 라인 위치 및 회전을 기체 중심으로 추종
    this.speedLinesGroup.position.copy(this.planeGroup.position);
    this.speedLinesGroup.quaternion.copy(this.planeGroup.quaternion);

    if (this.speedLineMaterial.opacity > 0.01) {
      const posAttr = this.speedLinesGroup.geometry.attributes.position;
      const posArr = posAttr.array;
      const moveSpeed = (28.0 + speedRatio * 110.0) * dt * 60;

      for (let i = 0; i < this.speedLineData.length; i++) {
        const item = this.speedLineData[i];
        item.z += moveSpeed * item.speedMult;
        if (item.z > 50) {
          item.z = -50 - Math.random() * 20;
          const radius = 6.0 + Math.random() * 32.0;
          const angle = Math.random() * Math.PI * 2;
          item.x = Math.cos(angle) * radius;
          item.y = Math.sin(angle) * radius * 0.65 + 1.5;
          item.length = 12.0 + Math.random() * 22.0;
        }

        const idx = i * 6;
        posArr[idx] = item.x;
        posArr[idx + 1] = item.y;
        posArr[idx + 2] = item.z;
        posArr[idx + 3] = item.x;
        posArr[idx + 4] = item.y;
        posArr[idx + 5] = item.z - item.length;
      }
      posAttr.needsUpdate = true;
    }

    // 2. 고속 윙팁 베이퍼 트레일 (날개 끝 응축운)
    if (!this.isOnGround && (currentKmh > 520 || (currentKmh > 320 && Math.abs(this.roll) > 0.35))) {
      const wingSpan = this.currentPlaneType === 'dc10' ? 24.5 : 17.5;
      [-wingSpan, wingSpan].forEach(sideX => {
        const tipPos = new THREE.Vector3(sideX, 0.2, 3.5).applyQuaternion(this.planeGroup.quaternion).add(this.planeGroup.position);
        this.createVaporParticle(tipPos, currentKmh);
      });
    }

    // 3. 화면 테두리 스피드 비네트 효과
    if (this.speedVignetteEl) {
      if (currentKmh > 420) {
        const vigOpacity = Math.min(0.85, (currentKmh - 420) / 400);
        this.speedVignetteEl.style.opacity = vigOpacity.toFixed(2);
      } else {
        this.speedVignetteEl.style.opacity = '0';
      }
    }

    // 4. 바다 텍스처 흘림 애니메이션
    if (this.oceanTexture) {
      this.oceanTexture.offset.y -= (this.speed * 0.008) * dt * 60;
    }
  },

  createVaporParticle(pos, currentKmh) {
    const geo = new THREE.PlaneGeometry(1.2, 4.5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: Math.min(0.65, (currentKmh - 380) / 450),
      side: THREE.DoubleSide
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.quaternion.copy(this.planeGroup.quaternion);
    p.life = 0.8;
    this.scene.add(p);
    this.particles.push(p);
  },

  // ----------------------------------------------------------------
  // 7. 다단계 파손 & 대폭발 분해 물리 엔진 (Damage System)
  // ----------------------------------------------------------------

  // 1. 노즈 찌그러짐 (저속 건물 접촉 시)
  applyNoseDent() {
    if (this.isNoseDented) return;
    this.isNoseDented = true;
    this.hullIntegrity = Math.max(30, this.hullIntegrity - 30);
    this.playMetalCrunchSound();

    if (this.noseMesh) {
      this.noseMesh.scale.set(1.4, 0.7, 0.4);
      this.noseMesh.position.z += 1.8;
      this.noseMesh.rotation.z += 0.25;
    }
    this.createDentSparks(this.planeGroup.position);
    this.showPopup('💥 쾅! 기수가 찌그러졌습니다! (저속 충돌 손상)');
  },

  // 2. 랜딩 기어 파손 & 동체 착륙 (거친 착륙 접지 시)
  collapseLandingGears() {
    if (this.isGearCollapsed) return;
    this.isGearCollapsed = true;
    this.gearPhase = 'COLLAPSED';
    this.hullIntegrity = Math.max(20, this.hullIntegrity - 45);
    this.playGearSnapSound();

    this.landingGears.forEach((gear, idx) => {
      gear.rotation.x = Math.PI / 2.3;
      gear.rotation.z = idx % 2 === 0 ? 0.45 : -0.45;
      gear.position.y += 1.3;
      const u = gear.userData;
      if (u) {
        if (u.doorL) u.doorL.rotation.z = -1.2;
        if (u.doorR) u.doorR.rotation.z = 1.2;
        if (u.strutPivot) {
          u.strutPivot.rotation.x = Math.PI / 3.0;
          u.strutPivot.rotation.z = idx % 2 === 0 ? 0.5 : -0.5;
        }
      }
    });

    this.groundY = 5.02; // 동체 접지 고도 (동체 하단 Y=-2.9, 활주로 표면 Y=2.12)
    this.isBellySliding = true;
    this.updateGearUI('파손 (FAIL)', 'gear-transit');
    this.showPopup('⚠️ 랜딩 기어 파손! 동체 활주(Belly Landing) 중입니다!');
  },

  // ----------------------------------------------------------------
  // 사고 강도 정밀 분석 및 인명 피해 집계 시스템 (Crash Severity & Casualty Analyzer)
  // - 충돌 당시 속도, 수직 강하율, 충격 대상 및 추정 충격 가속도(G-Force) 분석
  // - 탑승객 285명의 피해(사망, 중상, 경상, 무사 구조)를 정밀 산출
  // ----------------------------------------------------------------
  analyzeCrashSeverity(cause, impactKmh, sinkRate) {
    const totalPassengers = 285;
    const isObstacle = cause.includes('건물') || cause.includes('충돌') || cause.includes('정면');
    const isWater = cause.includes('바다') || cause.includes('수면') || cause.includes('해상');

    // 충격 가속도 (G-Force) 정밀 추정 공식
    let estimatedG = (impactKmh * 0.125) + (sinkRate * 2.1);
    if (isObstacle) estimatedG *= 1.4; // 강성 건물 충돌 충격 증폭
    if (isWater && impactKmh > 200) estimatedG *= 1.25; // 고속 수면 충돌 표면장력 충격 증폭
    estimatedG = parseFloat(Math.max(4.5, estimatedG).toFixed(1));

    // 충격 운동에너지 (MJ, 약 150톤 제트 여객기 기준)
    const velocityMs = impactKmh / 3.6;
    const kineticEnergy = Math.max(12, Math.round(0.5 * 150000 * (velocityMs * velocityMs) / 1000000));

    let severityGrade = 1;
    let gradeTitle = 'GRADE 1 (파국적 전파 파괴)';
    let severityPercent = 100;
    let severityColor = '#ef4444';
    let finding = '';

    let fatalities = 0;
    let seriousInjuries = 0;
    let minorInjuries = 0;
    let unharmed = 0;

    if (estimatedG >= 40 || impactKmh >= 320 || (isObstacle && impactKmh >= 160)) {
      // 1등급: 파국적 전파 파괴 (Catastrophic Obliteration)
      severityGrade = 1;
      gradeTitle = 'GRADE 1: 파국적 전파 파괴 (Catastrophic Obliteration)';
      severityPercent = Math.min(100, Math.round(92 + (estimatedG - 40) * 0.35));
      severityColor = '#ef4444';

      fatalities = Math.min(285, 276 + Math.floor(Math.random() * 10)); // 276~285명
      seriousInjuries = Math.min(285 - fatalities, Math.floor(Math.random() * 8));
      minorInjuries = Math.min(285 - fatalities - seriousInjuries, Math.floor(Math.random() * 3));
      unharmed = totalPassengers - (fatalities + seriousInjuries + minorInjuries);
      finding = `시속 ${impactKmh}km/h(충격 ${estimatedG}G, 충격에너지 ${kineticEnergy}MJ)의 극단적 충격력으로 기체 프레임과 객실 룸이 산산조각 분해되며 대폭발이 일어났습니다.`;

    } else if (estimatedG >= 25 || impactKmh >= 210) {
      // 2등급: 대형 기체 분쇄 참사 (Severe Airframe Breakup)
      severityGrade = 2;
      gradeTitle = 'GRADE 2: 대형 기체 분쇄 (Severe Airframe Breakup)';
      severityPercent = Math.round(72 + ((estimatedG - 25) / 15) * 18);
      severityColor = '#f97316';

      fatalities = 175 + Math.floor(Math.random() * 45); // 175~219명
      seriousInjuries = 40 + Math.floor(Math.random() * 25); // 40~64명
      minorInjuries = Math.min(285 - fatalities - seriousInjuries, 15 + Math.floor(Math.random() * 20));
      unharmed = totalPassengers - (fatalities + seriousInjuries + minorInjuries);
      finding = `고속 격돌로 주익 연료 탱크가 파열되고 중앙 동체가 두 동강 났습니다. 기체 후미 일부 좌석에서 소수의 생존자가 기적적으로 구조되었습니다.`;

    } else if (estimatedG >= 13 || impactKmh >= 130) {
      // 3등급: 중형 구조 파손 (Heavy Structural Damage)
      severityGrade = 3;
      gradeTitle = 'GRADE 3: 중형 구조 파손 (Heavy Structural Damage)';
      severityPercent = Math.round(42 + ((estimatedG - 13) / 12) * 26);
      severityColor = '#f59e0b';

      fatalities = 25 + Math.floor(Math.random() * 40); // 25~64명
      seriousInjuries = 75 + Math.floor(Math.random() * 45); // 75~119명
      minorInjuries = 65 + Math.floor(Math.random() * 35); // 65~99명
      unharmed = totalPassengers - (fatalities + seriousInjuries + minorInjuries);
      finding = `강한 하강 강하율(${sinkRate.toFixed(1)}m/s)과 지면 충돌로 동체 하부가 압착되었으나, 캐빈 내 안전벨트 및 완충 시트 덕분에 과반수 승객이 생존했습니다.`;

    } else {
      // 4등급: 저속 경질 불시착 (Survivable Hard Impact)
      severityGrade = 4;
      gradeTitle = 'GRADE 4: 연성 충돌 및 경질 불시착 (Survivable Hard Impact)';
      severityPercent = Math.max(18, Math.round(18 + (estimatedG / 13) * 22));
      severityColor = '#eab308';

      fatalities = Math.floor(Math.random() * 6); // 0~5명
      seriousInjuries = 25 + Math.floor(Math.random() * 30); // 25~54명
      minorInjuries = 110 + Math.floor(Math.random() * 40); // 110~149명
      unharmed = totalPassengers - (fatalities + seriousInjuries + minorInjuries);
      finding = `비교적 저속(시속 ${impactKmh}km/h)에서 충돌하여 기체 외피 파손에 그쳤으며, 신속한 비상탈출 슬라이드 전개로 대부분의 승객이 안전하게 대피했습니다.`;
    }

    // 승객 285명 오차 보정
    if (fatalities + seriousInjuries + minorInjuries + unharmed !== totalPassengers) {
      unharmed = Math.max(0, totalPassengers - (fatalities + seriousInjuries + minorInjuries));
    }

    return {
      cause,
      impactKmh,
      sinkRate: sinkRate.toFixed(1),
      estimatedG,
      kineticEnergy,
      severityGrade,
      gradeTitle,
      severityPercent,
      severityColor,
      finding,
      fatalities,
      seriousInjuries,
      minorInjuries,
      unharmed,
      totalPassengers
    };
  },

  renderCrashReportHTML(report) {
    return `
      <div class="crash-report-card">
        <div class="crash-header">
          <div class="crash-badge" style="background:${report.severityColor}22; border-color:${report.severityColor}; color:${report.severityColor};">
            ⚠️ 항공사고 조사 보고서 (ARAIB OFFICIAL REPORT)
          </div>
          <div class="crash-cause-title">${report.cause}</div>
          <div style="font-size:12px; font-weight:800; color:${report.severityColor}; margin-top:3px;">
            ${report.gradeTitle}
          </div>
        </div>

        <div class="crash-metrics-grid">
          <div class="crash-metric-box">
            <span class="m-lbl">충돌 속도</span>
            <span class="m-val" style="color:#ef4444;">${report.impactKmh} km/h</span>
          </div>
          <div class="crash-metric-box">
            <span class="m-lbl">수직 강하율</span>
            <span class="m-val" style="color:#f59e0b;">${report.sinkRate} m/s</span>
          </div>
          <div class="crash-metric-box">
            <span class="m-lbl">충격 가속도</span>
            <span class="m-val" style="color:#ef4444;">${report.estimatedG} G</span>
          </div>
          <div class="crash-metric-box">
            <span class="m-lbl">충격 운동에너지</span>
            <span class="m-val" style="color:#38bdf8;">${report.kineticEnergy} MJ</span>
          </div>
        </div>

        <div class="crash-sev-bar-wrap">
          <div class="sev-bar-text">
            <span>사고 충격 강도 지수</span>
            <strong style="color:${report.severityColor};">${report.severityPercent}%</strong>
          </div>
          <div class="sev-bar-bg">
            <div class="sev-bar-fill" style="width:${report.severityPercent}%; background:${report.severityColor};"></div>
          </div>
        </div>

        <div class="casualty-box">
          <div class="cas-header">
            <span>👥 탑승객 285명 피해자 집계 현황</span>
            <small>긴급 인명 구조 현황</small>
          </div>
          <div class="cas-cards-grid">
            <div class="cas-card fatal">
              <div class="cas-count">${report.fatalities}명</div>
              <div class="cas-label">사망 (Fatal)</div>
            </div>
            <div class="cas-card serious">
              <div class="cas-count">${report.seriousInjuries}명</div>
              <div class="cas-label">중상 (Serious)</div>
            </div>
            <div class="cas-card minor">
              <div class="cas-count">${report.minorInjuries}명</div>
              <div class="cas-label">경상 (Minor)</div>
            </div>
            <div class="cas-card unharmed">
              <div class="cas-count">${report.unharmed}명</div>
              <div class="cas-label">무사 구조 (Unharmed)</div>
            </div>
          </div>
        </div>

        <div class="crash-analysis-desc">
          <strong>📋 사고 원인 및 기체 손상 분석:</strong><br>
          ${report.finding}
        </div>
      </div>
      <div style="font-size:12.5px; color:#94a3b8; text-align:center; line-height:1.5;">
        다음 비행에서는 안전한 접근 속도와 적정 강하율을 유지해 보세요!
      </div>
    `;
  },

  // 3. 다단계 대폭발 & 기체 파쇄 분해 (Catastrophic Explosion Breakup)
  triggerExplosion(cause = '추락 폭발') {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isPlaying = false;
    this.clearGPWS();
    this.stopJetSound();
    this.isStalling = false;

    // 충돌 직전 속도와 강하율로 정밀 사고 강도 및 피해자 분석
    const impactKmh = Math.max(35, Math.round(this.speed * 280));
    const sinkRate = Math.abs(this.verticalSpeed * 10);
    const report = this.analyzeCrashSeverity(cause, impactKmh, sinkRate);

    this.hullIntegrity = 0;
    this.speed = 0;
    this.screenShake = 1.8; // 강한 카메라 흔들림
    if (this.speedLineMaterial) this.speedLineMaterial.opacity = 0;
    if (this.speedVignetteEl) this.speedVignetteEl.style.opacity = '0';
    this.playExplosionSound();

    // 기체 본체는 숨기고 파쇄된 개별 잔해 파츠 생성
    this.planeGroup.visible = false;
    this.spawnAirframeDebris(this.planeGroup.position, this.planeGroup.rotation);

    // 거대한 다단계 화염구 & 충격파 & 짙은 연기 기둥 분출
    this.createMassiveExplosion(this.planeGroup.position);

    // 긴급 속보 팝업 및 승객 절규 표출
    this.showPopup(`🚨 [사고 분석] 충격 ${report.estimatedG}G! 사망 ${report.fatalities}명, 부상 ${report.seriousInjuries + report.minorInjuries}명, 무사 ${report.unharmed}명`);
    this.displayPassengerDialogue(`💥 [객실 탑승객 285명] "쿵!! (충격 ${report.estimatedG}G로 기체 대폭발! 사망 ${report.fatalities}명, 부상 ${report.seriousInjuries + report.minorInjuries}명 발생!)"`);

    setTimeout(() => {
      const modalTitle = document.getElementById('modal-title');
      const modalDesc = document.getElementById('modal-desc');
      if (modalTitle) modalTitle.textContent = '🚨 CRASH INVESTIGATION REPORT';
      if (modalDesc) modalDesc.innerHTML = this.renderCrashReportHTML(report);

      this.startBtn.textContent = '게이트에서 다시 시작 🔄';
      this.takeoffDirectBtn.textContent = '활주로에서 즉시 이륙하기 🛫';
      this.overlay.classList.remove('hidden');
    }, 2400);
  },

  // 공항 및 육지 대륙 영역 판정 (바다 vs 육지 지면)
  isOverAirport(x, z) {
    // 1. 출발 초대형 해상 공항 섬: X [-700, 700], Z [-2200, 2200]
    if (x >= -700 && x <= 700 && z >= -2200 && z <= 2200) return true;
    // 2. 목적지 거대 대륙 육지 전체 (Z <= -28000): 드넓은 대륙 평야 및 육지 공항
    if (z <= -28000 && x >= -25000 && x <= 25000) return true;
    return false;
  },

  // 바다 고속 격돌 추락 (Sky-high Water Geyser & Ocean Crash)
  triggerWaterCrash(cause = '해상 고속 격돌 추락') {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isPlaying = false;
    this.clearGPWS();
    this.stopJetSound();
    this.isStalling = false;

    // 충돌 직전 속도와 강하율로 정밀 사고 강도 및 피해자 분석
    const impactKmh = Math.max(35, Math.round(this.speed * 280));
    const sinkRate = Math.abs(this.verticalSpeed * 10);
    const report = this.analyzeCrashSeverity(cause, impactKmh, sinkRate);

    this.hullIntegrity = 0;
    this.speed = 0;
    this.screenShake = 2.2;
    if (this.speedLineMaterial) this.speedLineMaterial.opacity = 0;
    if (this.speedVignetteEl) this.speedVignetteEl.style.opacity = '0';
    this.playExplosionSound();

    this.planeGroup.visible = false;
    this.spawnAirframeDebris(this.planeGroup.position, this.planeGroup.rotation);
    this.createMassiveWaterGeyser(this.planeGroup.position);

    // 긴급 속보 팝업 및 승객 절규 표출
    this.showPopup(`🚨 [해상 사고 분석] 충격 ${report.estimatedG}G! 사망 ${report.fatalities}명, 부상 ${report.seriousInjuries + report.minorInjuries}명, 무사 ${report.unharmed}명`);
    this.displayPassengerDialogue(`🌊 [객실 탑승객 285명] "바다로 격돌!! (충격 ${report.estimatedG}G! 사망 ${report.fatalities}명, 부상 ${report.seriousInjuries + report.minorInjuries}명 발생!)"`);

    setTimeout(() => {
      const modalTitle = document.getElementById('modal-title');
      const modalDesc = document.getElementById('modal-desc');
      if (modalTitle) modalTitle.textContent = '🌊 SEA IMPACT & CASUALTY REPORT';
      if (modalDesc) modalDesc.innerHTML = this.renderCrashReportHTML(report);

      this.startBtn.textContent = '게이트에서 다시 시작 🔄';
      this.takeoffDirectBtn.textContent = '활주로에서 즉시 이륙하기 🛫';
      this.overlay.classList.remove('hidden');
    }, 2400);
  },

  // 바다 비상착수 물보라 스프레이
  createWaterSpray(pos) {
    const geo = new THREE.DodecahedronGeometry(1.2, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(geo, mat);
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetZ = (Math.random() - 0.5) * 5;
      p.position.set(pos.x + offsetX, 0.4, pos.z + offsetZ);
      p.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        2.0 + Math.random() * 3.5,
        3.0 + Math.random() * 4.0
      );
      p.life = 0.6 + Math.random() * 0.3;
      this.scene.add(p);
      this.particles.push(p);
    }
  },

  // 거대한 물기둥 & 수면 파동 충격파 (Massive Water Geyser)
  createMassiveWaterGeyser(pos) {
    const ringGeo = new THREE.RingGeometry(2, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    const shockRing = new THREE.Mesh(ringGeo, ringMat);
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.set(pos.x, 0.2, pos.z);
    shockRing.isShockwave = true;
    shockRing.life = 1.2;
    this.scene.add(shockRing);
    this.particles.push(shockRing);

    const dropGeo = new THREE.DodecahedronGeometry(2.8, 1);
    const dropColors = [0xffffff, 0xe0f2fe, 0xbae6fd, 0x7dd3fc, 0x38bdf8];
    for (let i = 0; i < 85; i++) {
      const color = dropColors[Math.floor(Math.random() * dropColors.length)];
      const p = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      p.position.copy(pos);
      p.position.y = 0.5;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 10.0;
      p.position.x += Math.cos(angle) * radius;
      p.position.z += Math.sin(angle) * radius;

      const vHoriz = 3.0 + Math.random() * 7.0;
      p.velocity = new THREE.Vector3(
        Math.cos(angle) * vHoriz,
        10.0 + Math.random() * 16.0,
        Math.sin(angle) * vHoriz
      );
      p.life = 1.3 + Math.random() * 0.5;
      this.scene.add(p);
      this.particles.push(p);
    }
  },

  // 기체 구조 분해 잔해 조각 생성 (Debris Physics)
  spawnAirframeDebris(pos, rot) {
    const scorchedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.2
    });
    const burningWingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7
    });

    // 1. 기수/조종석 잔해
    const noseDebris = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6, 12), scorchedMat);
    noseDebris.position.copy(pos).add(new THREE.Vector3(0, 2, -10));
    noseDebris.velocity = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, -8 - Math.random() * 6);
    noseDebris.angularVel = new THREE.Vector3(0.08, 0.05, 0.12);
    this.scene.add(noseDebris);
    this.debrisPieces.push(noseDebris);

    // 2. 좌측 주익 잔해
    const leftWingDebris = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4), burningWingMat);
    leftWingDebris.position.copy(pos).add(new THREE.Vector3(-8, 1, 0));
    leftWingDebris.velocity = new THREE.Vector3(-7 - Math.random() * 5, 5 + Math.random() * 5, (Math.random() - 0.5) * 5);
    leftWingDebris.angularVel = new THREE.Vector3(0.1, 0.15, 0.06);
    this.scene.add(leftWingDebris);
    this.debrisPieces.push(leftWingDebris);

    // 3. 우측 주익 잔해
    const rightWingDebris = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4), burningWingMat);
    rightWingDebris.position.copy(pos).add(new THREE.Vector3(8, 1, 0));
    rightWingDebris.velocity = new THREE.Vector3(7 + Math.random() * 5, 5 + Math.random() * 5, (Math.random() - 0.5) * 5);
    rightWingDebris.angularVel = new THREE.Vector3(-0.1, -0.15, 0.06);
    this.scene.add(rightWingDebris);
    this.debrisPieces.push(rightWingDebris);

    // 4. 동체 중앙 잔해
    const fuselageDebris = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 15, 16), scorchedMat);
    fuselageDebris.rotation.x = Math.PI / 2;
    fuselageDebris.position.copy(pos).add(new THREE.Vector3(0, 2, 2));
    fuselageDebris.velocity = new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 3, -3);
    fuselageDebris.angularVel = new THREE.Vector3(0.04, 0.02, 0.08);
    this.scene.add(fuselageDebris);
    this.debrisPieces.push(fuselageDebris);

    // 5. 엔진 잔해들 (구르고 튕김)
    for (let e = 0; e < 2; e++) {
      const engDebris = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5, 12), scorchedMat);
      engDebris.rotation.x = Math.PI / 2;
      engDebris.position.copy(pos).add(new THREE.Vector3((e === 0 ? -7 : 7), 1, 0));
      engDebris.velocity = new THREE.Vector3((e === 0 ? -9 : 9), 6, -5 + Math.random() * 3);
      engDebris.angularVel = new THREE.Vector3(0.2, 0.1, 0.15);
      this.scene.add(engDebris);
      this.debrisPieces.push(engDebris);
    }
  },

  // 거대한 다단계 화염구, 충격파, 솟구치는 짙은 연기 기둥
  createMassiveExplosion(pos) {
    // 1. 충격파 링 (Ground Shockwave)
    const shockRing = new THREE.Mesh(
      new THREE.RingGeometry(1, 4, 32),
      new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.copy(pos);
    shockRing.position.y = 1.0;
    shockRing.isShockwave = true;
    shockRing.life = 0.9;
    this.particles.push(shockRing);
    this.scene.add(shockRing);

    // 2. 다단계 화염구 (Fireball Cluster)
    const fireGeo = new THREE.SphereGeometry(3.5, 10, 10);
    const fireColors = [0xffffff, 0xfacc15, 0xf97316, 0xef4444];
    for (let i = 0; i < 65; i++) {
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      const p = new THREE.Mesh(fireGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
      p.position.copy(pos);
      const angle = Math.random() * Math.PI * 2;
      const spd = 4.0 + Math.random() * 7.5;
      p.velocity = new THREE.Vector3(Math.cos(angle) * spd, 3.0 + Math.random() * 6.5, Math.sin(angle) * spd);
      p.life = 0.9 + Math.random() * 0.4;
      this.particles.push(p);
      this.scene.add(p);
    }

    // 3. 하늘로 치솟는 짙은 연기 기둥 (Rising Black Smoke Column)
    const smokeGeo = new THREE.DodecahedronGeometry(4.5, 1);
    const smokeColors = [0x1e293b, 0x334155, 0x475569];
    for (let s = 0; s < 50; s++) {
      const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
      const smoke = new THREE.Mesh(smokeGeo, new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.85, roughness: 1.0 }));
      smoke.position.copy(pos);
      smoke.position.x += (Math.random() - 0.5) * 8;
      smoke.position.z += (Math.random() - 0.5) * 8;
      smoke.velocity = new THREE.Vector3((Math.random() - 0.5) * 1.5, 5.0 + Math.random() * 6.0, (Math.random() - 0.5) * 1.5);
      smoke.life = 1.8 + Math.random() * 0.8;
      this.particles.push(smoke);
      this.scene.add(smoke);
    }
  },

  createDentSparks(pos) {
    const pGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let i = 0; i < 24; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(pos);
      p.position.y += 1.2;
      p.velocity = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3);
      p.life = 0.5;
      this.particles.push(p);
      this.scene.add(p);
    }
  },

  createBellySparks() {
    if (!this.isBellySliding || this.speed < 0.2) return;
    if (this.particles.length > 50) return;
    const pGeo = this.sharedExhaustGeo || new THREE.BoxGeometry(0.4, 0.4, 0.8);
    const pMat = this.exhaustMatFull || new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(this.planeGroup.position);
      p.position.y = 0.5;
      p.velocity = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2);
      p.life = 0.25;
      this.particles.push(p);
      this.scene.add(p);
    }
  },

  createJetExhaustParticles() {
    if (!this.isPlaying || this.throttle < 0.1 || this.isDestroyed) return;
    this.exhaustFrameCount = (this.exhaustFrameCount || 0) + 1;
    if (this.exhaustFrameCount % 2 !== 0) return; // 2프레임에 1회 방출로 GC 부하 50% 절감
    if (this.particles.length > 50) return; // 파티클 풀 상한선 유지

    const isFull = this.throttle > 0.8;
    const pMat = isFull ? this.exhaustMatFull : this.exhaustMatNormal;
    const pGeo = this.sharedExhaustGeo;

    this.engineExhaustPoints.forEach(pt => {
      const p = new THREE.Mesh(pGeo, pMat);
      const worldPos = pt.clone().applyQuaternion(this.planeGroup.quaternion).add(this.planeGroup.position);
      p.position.copy(worldPos);

      const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeGroup.quaternion);
      p.velocity = backward.multiplyScalar(this.speed * 0.7);
      p.life = isFull ? 0.45 : 0.25;
      this.particles.push(p);
      this.scene.add(p);
    });
  },

  // ----------------------------------------------------------------
  // 11. 공항 건물 충돌 검사 (고고도 스킵 및 성능 최적화)
  // ----------------------------------------------------------------
  checkObstacleCollisions() {
    if (this.isDestroyed || !this.planeGroup) return;

    // 비행기 고도가 40m 이상이면 지상 건물 충돌 검사 스킵 (CPU 부하 0)
    const planePos = this.planeGroup.position;
    if (planePos.y > 40) return;

    this.collisionFrameCount = (this.collisionFrameCount || 0) + 1;
    if (this.collisionFrameCount % 2 !== 0) return; // 2프레임에 1회 검사

    // 비행기 중심 기준 충돌 스피어
    const planeSphere = new THREE.Sphere(planePos, 8.0);

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.box.intersectsSphere(planeSphere)) {
        const currentKmh = this.speed * 280;

        if (currentKmh > 55) {
          // 시속 55km 이상 고속 격돌: 대폭발!
          this.triggerExplosion(`${obs.name} 건물 정면 충돌 폭발`);
          return;
        } else {
          // 시속 55km 이하 천천히 부딪힘: 앞쪽 찌그러짐 & 뒤로 튕김!
          this.applyNoseDent();
          this.speed = -0.15;
          const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeGroup.quaternion);
          this.planeGroup.position.addScaledVector(backward, 4.0);
          break;
        }
      }
    }
  },

  // 잔해 조각 물리 (Debris Gravity & Ground Bounce)
  updateDebrisPhysics(dt) {
    this.debrisPieces.forEach(p => {
      if (p.velocity) {
        p.position.add(p.velocity.clone().multiplyScalar(dt * 15));
        p.velocity.y -= 9.8 * dt * 2.2; // 중력

        // 지면 바운스
        if (p.position.y <= 1.0) {
          p.position.y = 1.0;
          p.velocity.y = -p.velocity.y * 0.4;
          p.velocity.x *= 0.85;
          p.velocity.z *= 0.85;
        }
      }
      if (p.angularVel) {
        p.rotation.x += p.angularVel.x;
        p.rotation.y += p.angularVel.y;
        p.rotation.z += p.angularVel.z;
      }
    });
  },

  // 파티클 & 충격파 업데이트
  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= (p.isContrail ? 0.012 : 0.02);

      if (p.isShockwave) {
        p.scale.multiplyScalar(1.08);
        p.material.opacity = p.life;
      } else if (p.isContrail) {
        p.scale.multiplyScalar(1.02);
        p.material.opacity = p.life * 0.45;
      } else {
        if (p.velocity) p.position.add(p.velocity.clone().multiplyScalar(dt * 12));
        p.scale.setScalar(Math.max(0.01, p.life));
      }

      if (p.life <= 0) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
      }
    }
  }

  });
})();

