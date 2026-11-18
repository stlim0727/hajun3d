/**
 * Sky Jet Explorer 3D - Contrails, Touchdown Smokes, Vapor Particles, Airframe Debris & Damage Physics
 * Subsystem: effects (22 methods)
 */

(function() {
  'use strict';

  const DEFAULT_SPEED_EFFECT_INTENSITY = 0.35;
  const SPEED_EFFECT_STORAGE_KEY = 'hajun3d_speed_effect_intensity';

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
  },

  registerObstacle(mesh, name, offset = new THREE.Vector3(0, 0, 0)) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.translate(offset);
    this.obstacles.push({ box, name, mesh });
  },

  // ----------------------------------------------------------------
  // 속도감 시각 효과 (High-Speed Streamlines & Wingtip Trails)
  // ----------------------------------------------------------------
  loadSpeedEffectIntensity() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(SPEED_EFFECT_STORAGE_KEY);
        if (saved !== null && saved !== '') {
          const parsed = parseFloat(saved);
          if (Number.isFinite(parsed)) {
            return Math.min(1.0, Math.max(0.0, parsed));
          }
        }
      }
    } catch (_) {
      // ignore storage errors in restricted environments
    }
    return DEFAULT_SPEED_EFFECT_INTENSITY;
  },

  setSpeedEffectIntensity(value, options = {}) {
    const num = Number(value);
    const clamped = Number.isFinite(num) ? Math.min(1.0, Math.max(0.0, num)) : DEFAULT_SPEED_EFFECT_INTENSITY;
    this.speedEffectIntensity = clamped;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SPEED_EFFECT_STORAGE_KEY, clamped.toFixed(2));
      }
    } catch (_) {
      // ignore storage errors in restricted environments
    }

    if (clamped <= 0.005) {
      if (this.speedLineMaterial) this.speedLineMaterial.opacity = 0;
      if (this.speedLinesGroup) this.speedLinesGroup.visible = false;
      if (this.speedVignetteEl) this.speedVignetteEl.style.opacity = '0';
    } else if (this.speedLinesGroup) {
      this.speedLinesGroup.visible = true;
    }

    if (typeof this.updateSpeedEffectUI === 'function') {
      this.updateSpeedEffectUI();
    }

    if (options.announce && typeof this.showPopup === 'function') {
      const pct = Math.round(clamped * 100);
      this.showPopup(pct === 0
        ? '💨 기류/속도선 이펙트: 끄기 (0%)'
        : `💨 기류/속도선 이펙트 강도: ${pct}%`);
    }
  },

  initSpeedEffects() {
    this.speedEffectIntensity = this.loadSpeedEffectIntensity();

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
    this.speedLinesGroup.visible = this.speedEffectIntensity > 0.005;
    this.scene.add(this.speedLinesGroup);

    this.speedVignetteEl = document.getElementById('speed-vignette');
    if (typeof this.updateSpeedEffectUI === 'function') {
      this.updateSpeedEffectUI();
    }

    this.initProximityEffects();
  },

  /**
   * Returns local surface elevation and whether the aircraft is over water.
   */
  getSurfaceUnderPlane(x, z) {
    if (x >= -700 && x <= 700 && z >= -2200 && z <= 2200) {
      return { surfaceY: 2.0, isWater: false };
    }
    if (z <= -42800 && z >= -47200 && x >= -700 && x <= 700) {
      return { surfaceY: 2.0, isWater: false };
    }
    if (z <= -28000 && x >= -25000 && x <= 25000) {
      return { surfaceY: 0.0, isWater: false };
    }
    return { surfaceY: -1.5, isWater: true };
  },

  initProximityEffects() {
    if (
      !this.scene ||
      typeof THREE === 'undefined' ||
      typeof THREE.PlaneGeometry !== 'function' ||
      typeof THREE.IcosahedronGeometry !== 'function' ||
      typeof THREE.MeshBasicMaterial !== 'function' ||
      typeof THREE.Mesh !== 'function'
    ) {
      return;
    }

    // 1. 저고도 지면/수면 근접 투영 그림자 (Contact / Proximity Shadow)
    let shadowTex = null;
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
        grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.72)');
        grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.36)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        shadowTex = new THREE.CanvasTexture(canvas);
      }
    }

    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      map: shadowTex,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    this.proximityShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.proximityShadowMesh.rotation.x = -Math.PI / 2;
    this.proximityShadowMesh.visible = false;
    this.proximityShadowMesh.renderOrder = 1;
    this.scene.add(this.proximityShadowMesh);

    // 2. 저고도 수면 다운워시 파문 링 (Water Downwash Skim Ring)
    let ringTex = null;
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const rCanvas = document.createElement('canvas');
      rCanvas.width = 128;
      rCanvas.height = 128;
      const rCtx = rCanvas.getContext && rCanvas.getContext('2d');
      if (rCtx) {
        const rGrad = rCtx.createRadialGradient(64, 64, 24, 64, 64, 62);
        rGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.0)');
        rGrad.addColorStop(0.55, 'rgba(224, 242, 254, 0.35)');
        rGrad.addColorStop(0.78, 'rgba(255, 255, 255, 0.55)');
        rGrad.addColorStop(1.0, 'rgba(224, 242, 254, 0.0)');
        rCtx.fillStyle = rGrad;
        rCtx.fillRect(0, 0, 128, 128);
        ringTex = new THREE.CanvasTexture(rCanvas);
      }
    }

    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      map: ringTex,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.waterWakeRingMesh = new THREE.Mesh(shadowGeo, wakeMat);
    this.waterWakeRingMesh.rotation.x = -Math.PI / 2;
    this.waterWakeRingMesh.visible = false;
    this.waterWakeRingMesh.renderOrder = 2;
    this.scene.add(this.waterWakeRingMesh);

    // 3. Zero-GC 수면 물보라 파티클 풀 (36개 고정 재사용)
    const poolSize = 36;
    const puffGeo = new THREE.IcosahedronGeometry(1.0, 0);
    this.proximityParticlePool = [];
    this._proximityPoolCursor = 0;
    this._proximitySpawnAccum = 0;

    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(puffGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.proximityParticlePool.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        baseScale: 1,
        growRate: 1,
        maxOpacity: 0.5
      });
    }
  },

  updateProximitySurfaceEffects(dt, currentKmh) {
    if (!this.planeGroup) return;

    const pos = this.planeGroup.position;
    const { surfaceY, isWater } = this.getSurfaceUnderPlane(pos.x, pos.z);
    const gearOffset = Math.max(1.5, (this.groundY || 6.84) - 2.0);
    const clearance = Math.max(0, pos.y - surfaceY - gearOffset);
    this._surfaceClearance = clearance;
    this._isOverWaterSurface = isWater;

    // 1. 근접 투영 그림자 업데이트 (수면 초저고도에서는 부드러운 수면 투영 그림자 유지, 활주로/육상에서는 정밀 2048 섀도우 맵의 선명한 실루엣을 위해 원형 블러 메쉬 숨김)
    if (this.proximityShadowMesh) {
      if (isWater && clearance < 180) {
        const prox = 1.0 - clearance / 180;
        const span = this.currentPlaneType === 'dc10' ? 48 : (this.currentPlaneType === 'a380' ? 68 : 34);
        const spread = span * (0.85 + (clearance / 180) * 1.45);
        this.proximityShadowMesh.visible = true;
        this.proximityShadowMesh.position.set(pos.x, surfaceY + 0.08, pos.z);
        this.proximityShadowMesh.scale.set(spread, spread * 1.15, 1);
        this.proximityShadowMesh.material.opacity = 0.38 * Math.pow(prox, 1.35);
      } else {
        this.proximityShadowMesh.visible = false;
      }
    }

    // 2. 저고도 수면 다운워시 파문 링 (수면 위 28m 이하, 속도 60km/h 이상)
    if (this.waterWakeRingMesh) {
      if (isWater && clearance < 28 && currentKmh > 60) {
        const waterProx = 1.0 - clearance / 28;
        const speedFactor = Math.min(1.0, currentKmh / 280);
        const pulse = 1.0 + Math.sin(performance.now() * 0.012) * 0.08;
        const ringScale = (24 + (1.0 - waterProx) * 18) * pulse;
        this.waterWakeRingMesh.visible = true;
        this.waterWakeRingMesh.position.set(pos.x, surfaceY + 0.12, pos.z);
        this.waterWakeRingMesh.scale.set(ringScale, ringScale * 1.55, 1);
        this.waterWakeRingMesh.rotation.z = this.planeGroup.rotation.y;
        this.waterWakeRingMesh.material.opacity = Math.min(0.65, waterProx * speedFactor * 0.65);
      } else {
        this.waterWakeRingMesh.visible = false;
      }
    }

    // 3. 저고도 수면 물보라 파티클 스폰 & 업데이트 (Zero-GC, 수면 위에서만 발생)
    const pool = this.proximityParticlePool;
    if (!pool || pool.length === 0) return;

    const maxSpawnClearance = 34;
    const shouldSpawn = isWater && currentKmh > 65 && clearance < maxSpawnClearance;

    if (shouldSpawn) {
      const prox = 1.0 - clearance / maxSpawnClearance;
      const spawnRate = 42 * prox * Math.min(1.2, currentKmh / 220);
      this._proximitySpawnAccum += dt * spawnRate;

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);

      while (this._proximitySpawnAccum >= 1.0) {
        this._proximitySpawnAccum -= 1.0;
        const p = pool[this._proximityPoolCursor];
        this._proximityPoolCursor = (this._proximityPoolCursor + 1) % pool.length;

        const side = (Math.random() - 0.5) * 26;
        const backOffset = 4 + Math.random() * 10;
        p.active = true;
        p.maxLife = 0.45 + Math.random() * 0.35;
        p.life = p.maxLife;
        p.baseScale = 1.4 + prox * 1.8;
        p.growRate = 9.5;
        p.maxOpacity = 0.58 * prox;

        p.mat.color.setHex(Math.random() > 0.35 ? 0xe0f2fe : 0xffffff);
        p.mesh.position.set(
          pos.x + right.x * side - forward.x * backOffset,
          surfaceY + 0.35 + Math.random() * 0.6,
          pos.z + right.z * side - forward.z * backOffset
        );
        p.vx = right.x * (side > 0 ? 1 : -1) * (4 + Math.random() * 6) - forward.x * (6 + Math.random() * 8);
        p.vy = 3.2 + prox * 3.5 + Math.random() * 2.0;
        p.vz = right.z * (side > 0 ? 1 : -1) * (4 + Math.random() * 6) - forward.z * (6 + Math.random() * 8);
        p.mesh.scale.setScalar(p.baseScale);
        p.mat.opacity = p.maxOpacity;
        p.mesh.visible = true;
      }
    }

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = 1.0 - p.life / p.maxLife;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 4.5 * dt;
      const s = p.baseScale + t * p.growRate;
      p.mesh.scale.set(s, s * 0.65, s);
      p.mat.opacity = p.maxOpacity * (1.0 - t);
    }
  },

  updateSpeedEffects(dt, currentKmh) {
    if (!this.speedLinesGroup || !this.speedLineMaterial) return;

    const intensity = typeof this.speedEffectIntensity === 'number'
      ? Math.min(1.0, Math.max(0.0, this.speedEffectIntensity))
      : DEFAULT_SPEED_EFFECT_INTENSITY;

    // 시속 135 km/h 이상부터 스트림 라인 점진 등장 (이륙 활주 체감 강화), 800 km/h에서 최고조
    const speedRatio = Math.min(1.0, Math.max(0, (currentKmh - 135) / 665)); // 0.0 ~ 1.0

    const rawTargetOpacity = speedRatio > 0.04 ? (0.06 + speedRatio * 0.62) : 0.0;
    const targetOpacity = rawTargetOpacity * intensity;
    this.speedLineMaterial.opacity = THREE.MathUtils.lerp(this.speedLineMaterial.opacity, targetOpacity, 0.1);
    this.speedLinesGroup.visible = this.speedLineMaterial.opacity > 0.005;

    // 스피드 라인 위치 및 회전을 기체 중심으로 추종
    this.speedLinesGroup.position.copy(this.planeGroup.position);
    this.speedLinesGroup.quaternion.copy(this.planeGroup.quaternion);

    if (this.speedLinesGroup.visible && this.speedLineMaterial.opacity > 0.01) {
      const posAttr = this.speedLinesGroup.geometry.attributes.position;
      const posArr = posAttr.array;
      const moveSpeed = (42.0 + speedRatio * 145.0) * dt * 60;

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
      if (intensity > 0.01 && currentKmh > 420) {
        const vigOpacity = Math.min(0.85, (currentKmh - 420) / 400) * intensity;
        this.speedVignetteEl.style.opacity = vigOpacity.toFixed(2);
      } else {
        this.speedVignetteEl.style.opacity = '0';
      }
    }

    // 4. 바다 텍스처 미세 너울 애니메이션 (실제 이동에 의한 광학 흐름과 조화)
    if (this.oceanTexture) {
      this.oceanTexture.offset.y -= dt * 0.035;
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

  resetPartialDamageState() {
    this.isGearCollapsed = false;
    this.isBellySliding = false;
    this.isNoseDented = false;
    this.gearDamageState = { nose: 'normal', mainLeft: 'normal', mainRight: 'normal' };
    this.partDamage = {
      nose: 'normal',
      belly: 'normal',
      tail: 'normal',
      wingL: 'normal',
      wingR: 'normal',
      engineL: 'normal',
      engineR: 'normal'
    };
    this._partSparkFrame = 0;
    this._partSmokeFrame = 0;
  },

  _collapseGearAssembly(gear, idx) {
    if (!gear) return;
    const u = gear.userData;
    if (u && u.damageState === 'collapsed') return;
    if (u) u.damageState = 'collapsed';
    gear.rotation.x = Math.PI / 2.3;
    gear.rotation.z = idx % 2 === 0 ? 0.45 : -0.45;
    gear.position.y += 1.3;
    if (u) {
      if (u.doorL) u.doorL.rotation.z = -1.2;
      if (u.doorR) u.doorR.rotation.z = 1.2;
      if (u.strutPivot) {
        u.strutPivot.rotation.x = Math.PI / 3.0;
        u.strutPivot.rotation.z = idx % 2 === 0 ? 0.5 : -0.5;
      }
    }
  },

  // 2. 랜딩 기어 파손 & 동체 착륙 (거친 착륙 접지 시)
  collapseLandingGears() {
    if (this.isGearCollapsed) return;
    this.isGearCollapsed = true;
    this.gearPhase = 'COLLAPSED';
    this.hullIntegrity = Math.max(20, this.hullIntegrity - 45);
    this.playGearSnapSound();

    if (this.gearDamageState) {
      this.gearDamageState.nose = 'collapsed';
      this.gearDamageState.mainLeft = 'collapsed';
      this.gearDamageState.mainRight = 'collapsed';
    }

    this.landingGears.forEach((gear, idx) => {
      this._collapseGearAssembly(gear, idx);
    });

    if (this.glbGearAction && this.glbMixer) {
      this.glbGearAction.time = 0;
      this.glbMixer.update(0);
    }

    this.groundY = 5.02; // 동체 접지 고도 (동체 하단 Y=-2.9, 활주로 표면 Y=2.12)
    this.isBellySliding = true;
    this.updateGearUI('파손 (FAIL)', 'gear-transit');
    this.showPopup('⚠️ 랜딩 기어 파손! 동체 활주(Belly Landing) 중입니다!');
  },

  applyGearDamageEvent(gearId, state) {
    if (!gearId || !state) return;
    const labels = { nose: '노즈', mainLeft: '좌측 메인', mainRight: '우측 메인' };
    const label = labels[gearId] || gearId;
    this.gearDamageState = this.gearDamageState || { nose: 'normal', mainLeft: 'normal', mainRight: 'normal' };

    const rank = { normal: 0, damaged: 1, collapsed: 2 };
    if ((rank[state] ?? 0) <= (rank[this.gearDamageState[gearId]] ?? 0)) return;
    this.gearDamageState[gearId] = state;

    const sparkPart = gearId === 'nose' ? 'nose' : 'belly';
    if (state === 'damaged') {
      this.hullIntegrity = Math.max(25, this.hullIntegrity - 10);
      this.landingGears.forEach((gear, idx) => {
        const u = gear.userData;
        if (u && u.gearId === gearId && u.damageState !== 'collapsed') {
          u.damageState = 'damaged';
          gear.rotation.z = idx % 2 === 0 ? 0.14 : -0.14;
          if (u.strutPivot) u.strutPivot.rotation.z = idx % 2 === 0 ? 0.16 : -0.16;
        }
      });
      this.emitPartParticles(sparkPart, 'spark', 6);
      if (typeof this.playCautionChime === 'function') this.playCautionChime();
      this.showPopup(`⚠️ [기어 손상] ${label} 랜딩 기어에 충격 손상 발생!`);
      return;
    }

    if (state === 'collapsed') {
      this.hullIntegrity = Math.max(20, this.hullIntegrity - 20);
      this.playGearSnapSound();
      this.landingGears.forEach((gear, idx) => {
        if (gear.userData && gear.userData.gearId === gearId) {
          this._collapseGearAssembly(gear, idx);
        }
      });
      this.emitPartParticles(sparkPart, 'spark', 10);

      const allCollapsed = Object.values(this.gearDamageState).every(s => s === 'collapsed');
      if (allCollapsed) {
        this.isGearCollapsed = true;
        this.gearPhase = 'COLLAPSED';
        this.isBellySliding = true;
        if (this.glbGearAction && this.glbMixer) {
          this.glbGearAction.time = 0;
          this.glbMixer.update(0);
        }
        this.updateGearUI('파손 (FAIL)', 'gear-transit');
        this.showPopup('⚠️ 전 랜딩 기어 파손! 동체 활주(Belly Landing) 중입니다!');
      } else {
        this.updateGearUI('부분 파손 (PARTIAL)', 'gear-transit');
        this.showPopup(`💥 [부분 파손] ${label} 랜딩 기어 붕괴!`);
      }
    }
  },

  getPartLocalOffset(partId) {
    if (!this._partOffsetCache) {
      this._partOffsetCache = new THREE.Vector3();
    }
    const out = this._partOffsetCache;
    if ((partId === 'engineL' || partId === 'engineR') && Array.isArray(this.engineExhaustPoints) && this.engineExhaustPoints.length > 0) {
      const targetLeft = partId === 'engineL';
      let match = this.engineExhaustPoints.find(p => (targetLeft ? p.x < -0.5 : p.x > 0.5));
      if (!match) match = this.engineExhaustPoints[targetLeft ? 0 : this.engineExhaustPoints.length - 1];
      return out.copy(match);
    }
    const defaults = {
      engineL: [-5.06, -1.5, -2.0],
      engineR: [5.06, -1.5, -2.0],
      wingL: [-14.0, 0.0, 2.0],
      wingR: [14.0, 0.0, 2.0],
      tail: [0.0, 0.0, 12.0],
      nose: [0.0, -1.0, -12.0],
      belly: [0.0, -2.2, 0.0]
    };
    const coords = defaults[partId] || defaults.belly;
    return out.set(coords[0], coords[1], coords[2]);
  },

  emitPartParticles(partId, kind, count = 2) {
    if (!this.planeGroup || !this.scene || !this.particles) return;
    if (this.particles.length >= 50) return;

    const offset = this.getPartLocalOffset(partId);
    const worldPos = offset.clone().applyQuaternion(this.planeGroup.quaternion).add(this.planeGroup.position);
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeGroup.quaternion);

    if (!this._dmgSparkMat) {
      this._dmgSparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      this._dmgFireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      this._dmgSmokeMat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.72 });
      this._dmgGeo = new THREE.BoxGeometry(0.55, 0.55, 0.85);
    }

    const pGeo = this.sharedExhaustGeo || this._dmgGeo;
    const pMat = kind === 'fire' ? this._dmgFireMat : (kind === 'smoke' ? this._dmgSmokeMat : this._dmgSparkMat);
    const limit = Math.min(count, 50 - this.particles.length);

    for (let i = 0; i < limit; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(worldPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.8
      ));
      if (kind === 'spark') {
        p.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 4.0,
          Math.random() * 2.5 + 0.5,
          (Math.random() - 0.5) * 4.0
        ).addScaledVector(backward, Math.max(2, (this.speed || 0) * 0.4));
        p.life = 0.25 + Math.random() * 0.15;
      } else {
        p.velocity = backward.clone().multiplyScalar(Math.max(4, (this.speed || 0) * 0.65)).add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          Math.random() * 1.8 + 0.4,
          (Math.random() - 0.5) * 1.4
        ));
        p.life = kind === 'fire' ? 0.35 : 0.65;
      }
      this.particles.push(p);
      this.scene.add(p);
    }
  },

  applyBodyDamageEvent(partId, state) {
    if (!partId || !state) return;
    this.partDamage = this.partDamage || {
      nose: 'normal', belly: 'normal', tail: 'normal',
      wingL: 'normal', wingR: 'normal', engineL: 'normal', engineR: 'normal'
    };
    const rank = { normal: 0, damaged: 1, failed: 2 };
    if ((rank[state] ?? 0) <= (rank[this.partDamage[partId]] ?? 0)) return;
    this.partDamage[partId] = state;

    const dmgDelta = state === 'failed' ? 20 : 10;
    this.hullIntegrity = Math.max(15, this.hullIntegrity - dmgDelta);
    this.playGearSnapSound();

    if (partId === 'nose') this.isNoseDented = true;
    if (partId === 'belly') this.isBellySliding = true;

    const kind = (state === 'failed' && (partId === 'engineL' || partId === 'engineR')) ? 'fire' : 'spark';
    this.emitPartParticles(partId, kind, state === 'failed' ? 10 : 6);

    const messages = {
      engineL: state === 'failed' ? '🔥 [엔진 파손] 좌측 엔진 파손! 추력 상실 및 화재!' : '⚠️ [엔진 손상] 좌측 엔진 지면 접촉 손상!',
      engineR: state === 'failed' ? '🔥 [엔진 파손] 우측 엔진 파손! 추력 상실 및 화재!' : '⚠️ [엔진 손상] 우측 엔진 지면 접촉 손상!',
      wingL: state === 'failed' ? '💥 [날개 파손] 좌측 주익 심각한 손상! 비대칭 양력 주의!' : '⚠️ [날개 손상] 좌측 날개 끝 지면 접촉 손상!',
      wingR: state === 'failed' ? '💥 [날개 파손] 우측 주익 심각한 손상! 비대칭 양력 주의!' : '⚠️ [날개 손상] 우측 날개 끝 지면 접촉 손상!',
      tail: state === 'failed' ? '💥 [테일 스트라이크] 꼬리 날개/후방 동체 심각한 손상!' : '⚠️ [테일 스트라이크] 후방 동체 지면 마찰 손상!',
      nose: state === 'failed' ? '💥 [기수 파손] 기수 충격 파손!' : '⚠️ [기수 손상] 기수 경미한 충격 손상!',
      belly: state === 'failed' ? '💥 [동체 파손] 하부 동체 마찰 파손!' : '⚠️ [동체 접촉] 동체 하부 활주 마찰!'
    };
    if (messages[partId]) {
      this.showPopup(messages[partId]);
    }
  },

  applyBodyContactSparks(partId, speed) {
    if (!partId || (speed || 0) < 1.5) return;
    this._partSparkFrame = (this._partSparkFrame || 0) + 1;
    if (this._partSparkFrame % 3 !== 0) return;
    this.emitPartParticles(partId, 'spark', 2);
  },

  updatePartialDamageEffects(dt) {
    if (!this.partDamage || this.isDestroyed || !this.isPlaying) return;
    this._partSmokeFrame = (this._partSmokeFrame || 0) + 1;
    if (this._partSmokeFrame % 4 !== 0) return;

    const parts = ['engineL', 'engineR', 'wingL', 'wingR', 'tail'];
    for (let i = 0; i < parts.length; i++) {
      const id = parts[i];
      const st = this.partDamage[id];
      if (!st || st === 'normal') continue;
      if ((id === 'engineL' || id === 'engineR') && st === 'failed') {
        this.emitPartParticles(id, 'fire', 1);
        this.emitPartParticles(id, 'smoke', 1);
      } else {
        this.emitPartParticles(id, 'smoke', 1);
      }
    }
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
    const sinkRate = Math.abs(this.verticalSpeed);
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
    const sinkRate = Math.abs(this.verticalSpeed);
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
    // 정상 이륙 및 비행 시 비현실적인 사각형 화염/배기 큐브 파티클 방출 비활성화
    // (실제 엔진 화재 비상 상황은 emergency.js의 createEngineFireParticles 및 damage emitPartParticles에서 처리)
    return;
  },

  // ----------------------------------------------------------------
  // 11. 공항 건물 및 산악·언덕 지형 충돌 검사 (고도별 스킵 및 성능 최적화)
  // ----------------------------------------------------------------
  checkObstacleCollisions() {
    if (this.isDestroyed || !this.planeGroup) return;

    const planePos = this.planeGroup.position;
    const currentKmh = this.speed * 280;

    // 1) 산악·언덕 지형 충돌 검사 (최고봉 ~2,050m 이하 구간, 기체 중심+기수+미부+양날개+동체하부 다점 검사)
    if (planePos.y <= 2500 && typeof this.getTerrainColliderHit === 'function') {
      if (!this._terrainProbeVec) this._terrainProbeVec = new THREE.Vector3();
      if (!this._terrainProbeOffsets) {
        this._terrainProbeOffsets = [
          { x: 0, y: 0, z: 0, clearance: 6.0 },
          { x: 0, y: -3.2, z: 0, clearance: 2.5 },
          { x: 0, y: 0, z: -20, clearance: 4.0 },
          { x: 0, y: 2.5, z: 20, clearance: 4.0 },
          { x: -20, y: 0, z: 2, clearance: 4.0 },
          { x: 20, y: 0, z: 2, clearance: 4.0 }
        ];
      }
      const q = this.planeGroup.quaternion;
      const probe = this._terrainProbeVec;
      const offsets = this._terrainProbeOffsets;
      for (let i = 0; i < offsets.length; i++) {
        const o = offsets[i];
        probe.set(o.x, o.y, o.z).applyQuaternion(q).add(planePos);
        const terrainHit = this.getTerrainColliderHit(probe.x, probe.y, probe.z, o.clearance);
        if (terrainHit) {
          if (currentKmh > 55) {
            this.triggerExplosion(`${terrainHit.collider.name} 정면 충돌 폭발`);
            return;
          } else {
            this.applyNoseDent();
            this.speed = -0.15;
            const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
            this.planeGroup.position.addScaledVector(backward, 4.0);
            return;
          }
        }
      }
    }

    this.collisionFrameCount = (this.collisionFrameCount || 0) + 1;
    if (this.collisionFrameCount % 2 !== 0) return; // 건물 충돌은 2프레임에 1회 검사

    // 2) 공항/도심 건물 충돌 검사 (최고층 엘시티 411m 이상이면 스킵)
    if (planePos.y > 450) return;

    // 비행기 중심 기준 충돌 스피어
    const planeSphere = new THREE.Sphere(planePos, 8.0);

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.box.intersectsSphere(planeSphere)) {
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

