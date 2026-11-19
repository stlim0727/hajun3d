/**
 * Sky Jet Explorer 3D - Three.js Lights, Sky, Stars, Clouds, PAPI & Procedural Terrain
 * Subsystem: environment (9 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // 조명 설정 (주간 쨍한 태양광 & 난반사 억제 & 야간 달빛 & 1024 고속 섀도우 맵)
  initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.28);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xdff2fd, 0x1e293b, 0.38);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.15);
    this.sunLightOffset = new THREE.Vector3(500, 900, 400);
    this.sunLight.position.copy(this.sunLightOffset);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 3200;
    const d = 110;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 야간 달빛 (Soft Moonlight for Night Flying)
    this.moonLight = new THREE.DirectionalLight(0x93c5fd, 0.0);
    this.moonLight.position.set(-600, 950, -450);
    this.scene.add(this.moonLight);
  },

  updateSunShadowTarget() {
    if (!this.sunLight || !this.planeGroup) return;
    const frustumSize = 220;
    const texelSize = frustumSize / 2048;
    const px = Math.round(this.planeGroup.position.x / texelSize) * texelSize;
    const pz = Math.round(this.planeGroup.position.z / texelSize) * texelSize;
    this.sunLight.target.position.set(px, 0, pz);
    const offset = this.sunLightOffset || { x: 500, y: 900, z: 400 };
    this.sunLight.position.set(px + offset.x, offset.y, pz + offset.z);
    this.sunLight.target.updateMatrixWorld();
  },

  // ----------------------------------------------------------------
  // 1-C. 밤하늘 은하수 별무리 (Starlit Night Sky)
  // ----------------------------------------------------------------
  initStars() {
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 38000 + Math.random() * 26000;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 600; // 지평선 상공
      const z = r * Math.sin(phi) * Math.sin(theta) - 15000;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 은은한 별빛 컬러 (화이트, 아이스 블루, 미세 골드)
      const colRand = Math.random();
      if (colRand > 0.7) {
        colors[i * 3] = 0.75; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 1.0; // 블루
      } else if (colRand > 0.4) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.85; // 골드
      } else {
        colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.98; colors[i * 3 + 2] = 1.0; // 화이트
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 55,
      vertexColors: true,
      transparent: true,
      opacity: (this.timeOfDay === 'night' ? 0.95 : 0.0) // 주간 0.0, 야간 0.95
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  },

  // ----------------------------------------------------------------
  // 2. 현실적인 자연 지형, 산맥, 해안선, 입체 구름 및 해상 참조물
  // ----------------------------------------------------------------
  _makeTextureRng(seed = 4242) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },

  createOceanCanvasTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const rand = this._makeTextureRng(7319);
    const TWO_PI = Math.PI * 2;

    // 베이스 깊은 해수면 컬러 (Rich deep marine blue)
    ctx.fillStyle = '#035388';
    ctx.fillRect(0, 0, 512, 512);

    // 4주기 매크로 너울 대역 (Macro ocean swell bands - 512px 주기 완벽 심리스 타일)
    for (let y = 0; y < 512; y += 8) {
      const swellPhase = (y / 512) * TWO_PI * 4;
      const swell = Math.sin(swellPhase);
      if (swell > 0) {
        ctx.fillStyle = `rgba(14, 165, 233, ${(0.18 + swell * 0.32).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(2, 40, 78, ${(0.20 + (-swell) * 0.38).toFixed(3)})`;
      }
      ctx.fillRect(0, y, 512, 8);
    }

    // 사선 방향 해류 / 교차 너울 음영 (Cross-swell shading)
    for (let k = 0; k < 6; k++) {
      const bandY = (k / 6) * 512;
      const grad = ctx.createLinearGradient(0, bandY, 0, bandY + 42);
      grad.addColorStop(0.0, 'rgba(2, 40, 78, 0.0)');
      grad.addColorStop(0.45, 'rgba(2, 40, 78, 0.42)');
      grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.24)');
      grad.addColorStop(1.0, 'rgba(2, 40, 78, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, bandY, 512, 42);
    }

    ctx.lineCap = 'round';

    // 1차 풍파 능선 (Primary bright wind-wave crests, 16행 심리스 주기)
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.62)';
    ctx.lineWidth = 2.4;
    for (let row = 0; row < 16; row++) {
      const yBase = row * 32 + 12;
      const phase = row * 1.15;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const wy = yBase + Math.sin((x / 512) * TWO_PI * 4 + phase) * 6.5
          + Math.cos((x / 512) * TWO_PI * 8 - phase) * 2.5;
        if (x === 0) {
          if (typeof ctx.moveTo === 'function') ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        } else {
          ctx.lineTo(x, wy);
        }
      }
      ctx.stroke();
    }

    // 2차 깊은 골짜기 음영 리플 (Secondary dark wave troughs for crisp bump relief)
    ctx.strokeStyle = 'rgba(2, 32, 68, 0.55)';
    ctx.lineWidth = 2.0;
    for (let row = 0; row < 16; row++) {
      const yBase = row * 32 + 24;
      const phase = row * 1.7 + 0.8;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const wy = yBase + Math.cos((x / 512) * TWO_PI * 3 + phase) * 5.5
          + Math.sin((x / 512) * TWO_PI * 6 + phase) * 2.0;
        if (x === 0) {
          if (typeof ctx.moveTo === 'function') ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        } else {
          ctx.lineTo(x, wy);
        }
      }
      ctx.stroke();
    }

    // 선명한 백색 포말 파도 호 (Whitecap foam arcs, 좌우 래핑)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 64; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const len = 14 + rand() * 26;
      const arch = (rand() - 0.5) * 8;
      for (const ox of [0, sx + len > 512 ? -512 : (sx < 0 ? 512 : 9999)]) {
        if (ox === 9999) continue;
        ctx.beginPath();
        if (typeof ctx.moveTo === 'function') ctx.moveTo(sx + ox, sy);
        else ctx.lineTo(sx + ox, sy);
        ctx.bezierCurveTo(
          sx + ox + len * 0.35, sy - arch,
          sx + ox + len * 0.65, sy + arch * 0.4,
          sx + ox + len, sy + (rand() - 0.5) * 3
        );
        ctx.stroke();
      }
    }

    // 햇빛 반사 & 물보라 포말 입자 (650 foam spray/sparkle speckles)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (let i = 0; i < 650; i++) {
      const px = rand() * 512;
      const py = rand() * 512;
      const pr = 0.8 + rand() * 1.9;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1200, 1200); // 100m x 100m 타일로 저고도 수면 속도감 극대화
    tex.anisotropy = 8;
    return tex;
  },
  createOceanNormalTexture() {
    // Tangent-space normal map for water surface micro-relief (Bump Mapping).
    const W = 1024, H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Height field (single pass, ~1M sin calls) then central-difference normals.
    const height = new Float32Array(W * H);
    const kx1 = 0.018, ky1 = 0.0075;
    const kx2 = 0.011, ky2 = -0.014;
    const kx3 = 0.005, ky3 = 0.021;
    const amp = 0.85;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        height[y * W + x] = amp * (
          Math.sin(x * kx1 + y * ky1) +
          Math.sin(x * kx2 + y * ky2) +
          Math.sin(x * kx3 + y * ky3)
        );
      }
    }

    const img = ctx.createImageData(W, H);
    const data = img.data;
    for (let y = 0; y < H; y++) {
      const ym = (y - 1 + H) % H;
      const yp = (y + 1) % H;
      for (let x = 0; x < W; x++) {
        const xm = (x - 1 + W) % W;
        const xp = (x + 1) % W;
        const dx = height[y * W + xp] - height[y * W + xm];
        const dz = height[yp * W + x] - height[ym * W + x];
        const len = Math.hypot(dx, dz, 2.0);
        const nx = -dx / len;
        const nz = -dz / len;
        const idx = (y * W + x) * 4;
        data[idx]     = (nx * 0.5 + 0.5) * 255;
        data[idx + 1] = 128;
        data[idx + 2] = (nz * 0.5 + 0.5) * 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1200, 1200);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  createTerrainNormalTexture() {
    // Tangent-space normal map for terrain surface micro-relief (soil, grass, rock).
    const W = 512, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Higher-frequency, noisier height field than water (granular terrain detail).
    const height = new Float32Array(W * H);
    const kx1 = 0.09, ky1 = 0.11;
    const kx2 = 0.21, ky2 = -0.17;
    const kx3 = 0.37, ky3 = 0.29;
    const amp = 0.65;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        height[y * W + x] = amp * (
          Math.sin(x * kx1 + y * ky1) +
          Math.sin(x * kx2 + y * ky2) +
          Math.sin(x * kx3 + y * ky3)
        );
      }
    }

    const img = ctx.createImageData(W, H);
    const data = img.data;
    for (let y = 0; y < H; y++) {
      const ym = (y - 1 + H) % H;
      const yp = (y + 1) % H;
      for (let x = 0; x < W; x++) {
        const xm = (x - 1 + W) % W;
        const xp = (x + 1) % W;
        const dx = height[y * W + xp] - height[y * W + xm];
        const dz = height[yp * W + x] - height[ym * W + x];
        const len = Math.hypot(dx, dz, 2.0);
        const nx = -dx / len;
        const nz = -dz / len;
        const idx = (y * W + x) * 4;
        data[idx]     = (nx * 0.5 + 0.5) * 255;
        data[idx + 1] = 128;
        data[idx + 2] = (nz * 0.5 + 0.5) * 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(500, 400);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  createTerrainCanvasTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const rand = this._makeTextureRng(9187);

    // 베이스 비옥한 대륙 녹지 컬러
    ctx.fillStyle = '#254f2b';
    ctx.fillRect(0, 0, 512, 512);

    // 8x8 결정론적 농지/초원/숲/토양 패치 그리드 (고고도/저고도 모두 식별 가능한 패치워크)
    const parcelColors = [
      'rgba(34, 112, 56, 0.68)',
      'rgba(20, 62, 35, 0.70)',
      'rgba(110, 128, 52, 0.54)',
      'rgba(92, 82, 56, 0.46)',
      'rgba(54, 130, 72, 0.58)'
    ];
    const cellSize = 64; // 512 / 8 = 64px (완벽 심리스)
    for (let gy = 0; gy < 8; gy++) {
      for (let gx = 0; gx < 8; gx++) {
        const px = gx * cellSize;
        const py = gy * cellSize;
        const colorIdx = Math.floor(rand() * parcelColors.length);
        ctx.fillStyle = parcelColors[colorIdx];
        ctx.fillRect(px, py, cellSize, cellSize);

        // 밭 이랑 / 경작 줄무늬 (Internal furrow/crop stripes)
        const horizontal = rand() > 0.5;
        ctx.strokeStyle = rand() > 0.5 ? 'rgba(134, 239, 172, 0.24)' : 'rgba(16, 40, 22, 0.30)';
        ctx.lineWidth = 1.5;
        for (let s = 8; s < cellSize; s += 10) {
          ctx.beginPath();
          if (horizontal) {
            if (typeof ctx.moveTo === 'function') ctx.moveTo(px + 2, py + s);
            else ctx.lineTo(px + 2, py + s);
            ctx.lineTo(px + cellSize - 2, py + s);
          } else {
            if (typeof ctx.moveTo === 'function') ctx.moveTo(px + s, py + 2);
            else ctx.lineTo(px + s, py + 2);
            ctx.lineTo(px + s, py + cellSize - 2);
          }
          ctx.stroke();
        }
      }
    }

    // 방풍림 경계 & 시골 비포장 도로 그리드 (Hedgerows & dirt track grid lines)
    for (let g = 0; g < 8; g++) {
      const pos = g * cellSize;
      const isRoad = g % 4 === 0;
      ctx.strokeStyle = isRoad ? 'rgba(140, 128, 102, 0.42)' : 'rgba(16, 36, 20, 0.62)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      if (typeof ctx.moveTo === 'function') ctx.moveTo(0, pos);
      else ctx.lineTo(0, pos);
      ctx.lineTo(512, pos);
      ctx.stroke();

      ctx.beginPath();
      if (typeof ctx.moveTo === 'function') ctx.moveTo(pos, 0);
      else ctx.lineTo(pos, 0);
      ctx.lineTo(pos, 512);
      ctx.stroke();
    }

    // 2,800개 고대비 식생/토양 입자 그레인 (2px ~ 4px)
    for (let i = 0; i < 2800; i++) {
      const gx = rand() * 510;
      const gy = rand() * 510;
      const sz = 2 + Math.floor(rand() * 3);
      const tone = rand();
      if (tone > 0.65) ctx.fillStyle = 'rgba(163, 230, 53, 0.28)';
      else if (tone > 0.30) ctx.fillStyle = 'rgba(20, 48, 25, 0.38)';
      else ctx.fillStyle = 'rgba(120, 104, 74, 0.28)';
      ctx.fillRect(gx, gy, sz, sz);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(500, 400); // ~100m x 100m 타일
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  createAirfieldGroundTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const rand = this._makeTextureRng(5521);

    // 공항 잔디 깎기 줄무늬 (Alternating mowed airfield turf bands - 64px 스트라이프)
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = (y / 64) % 2 === 0 ? '#285432' : '#346b40';
      ctx.fillRect(0, y, 512, 64);
    }

    // 자연스러운 잔디/클로버/모래 패치
    const patchColors = [
      'rgba(22, 78, 38, 0.34)',
      'rgba(74, 124, 68, 0.30)',
      'rgba(101, 118, 62, 0.25)',
      'rgba(20, 52, 28, 0.32)'
    ];
    for (let i = 0; i < 110; i++) {
      ctx.fillStyle = patchColors[i % patchColors.length];
      ctx.fillRect(rand() * 480, rand() * 480, 18 + rand() * 46, 16 + rand() * 42);
    }

    // 배수로 및 공항 서비스 도로 이음새 그리드 (Drainage channels & service road seams)
    for (let g = 0; g < 4; g++) {
      const p = g * 128;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.48)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      if (typeof ctx.moveTo === 'function') ctx.moveTo(0, p);
      else ctx.lineTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.34)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      if (typeof ctx.moveTo === 'function') ctx.moveTo(p, 0);
      else ctx.lineTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
    }

    // 3,000개 거친 잔디/토양 그레인 입자 (2px ~ 4px)
    for (let i = 0; i < 3000; i++) {
      const sz = 2 + Math.floor(rand() * 3);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(134, 239, 172, 0.24)' : 'rgba(15, 38, 22, 0.34)';
      ctx.fillRect(rand() * 510, rand() * 510, sz, sz);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.anisotropy = 8;
    return tex;
  },

  createSandCanvasTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const rand = this._makeTextureRng(3109);
    const TWO_PI = Math.PI * 2;

    // 따뜻한 백사장 베이스
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 512, 512);

    // 바람에 쓸린 모래 언덕 물결 무늬 (Wind-rippled dune bands)
    ctx.lineCap = 'round';
    for (let row = 0; row < 24; row++) {
      const yBase = row * (512 / 24) + 8;
      ctx.strokeStyle = row % 2 === 0 ? 'rgba(254, 240, 138, 0.52)' : 'rgba(161, 98, 7, 0.38)';
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const wy = yBase + Math.sin((x / 512) * TWO_PI * 3 + row * 0.7) * 4.5;
        if (x === 0) {
          if (typeof ctx.moveTo === 'function') ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        } else {
          ctx.lineTo(x, wy);
        }
      }
      ctx.stroke();
    }

    // 젖은 모래 해안선 줄무늬 (Wet-sand shoreline streaks)
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(133, 77, 14, 0.24)';
      ctx.fillRect(rand() * 420, rand() * 500, 48 + rand() * 88, 6 + rand() * 12);
    }

    // 2,200개 자갈 및 조개껍데기 반점
    for (let i = 0; i < 2200; i++) {
      const sz = 2 + Math.floor(rand() * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 251, 235, 0.48)' : 'rgba(120, 53, 15, 0.30)';
      ctx.fillRect(rand() * 510, rand() * 510, sz, sz);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.anisotropy = 8;
    return tex;
  },

  applyPlanarWorldUVs(geometry, tileSizeX, tileSizeZ, repeatX = 1, repeatZ = 1, originX = 0, originZ = 0) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position || typeof THREE === 'undefined') return;
    const pos = geometry.attributes.position;
    const count = typeof pos.count === 'number'
      ? pos.count
      : Math.floor((pos.array ? pos.array.length : 0) / (pos.itemSize || 3));
    if (!count) return;

    const uvs = new Float32Array(count * 2);
    const denomX = (tileSizeX || 1) * (repeatX || 1);
    const denomZ = (tileSizeZ || 1) * (repeatZ || 1);
    for (let i = 0; i < count; i++) {
      const x = pos.array ? pos.array[i * 3] : pos.getX(i);
      const z = pos.array ? pos.array[i * 3 + 2] : pos.getZ(i);
      uvs[i * 2] = (x - originX) / denomX;
      uvs[i * 2 + 1] = (z - originZ) / denomZ;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  },

  applyRunwayStripUVs(geometry, repeatY = 380) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position || typeof THREE === 'undefined') return;
    const pos = geometry.attributes.position;
    const count = typeof pos.count === 'number'
      ? pos.count
      : Math.floor((pos.array ? pos.array.length : 0) / (pos.itemSize || 3));
    if (!count) return;

    const uvs = new Float32Array(count * 2);
    const denomZ = 10.0 * (repeatY || 380);
    const chunkSize = (count % 4 === 0) ? 4 : count;

    for (let start = 0; start < count; start += chunkSize) {
      const end = Math.min(count, start + chunkSize);
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      for (let i = start; i < end; i++) {
        const x = pos.array ? pos.array[i * 3] : pos.getX(i);
        const z = pos.array ? pos.array[i * 3 + 2] : pos.getZ(i);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
      }
      const spanX = (maxX - minX) || 1;
      for (let i = start; i < end; i++) {
        const x = pos.array ? pos.array[i * 3] : pos.getX(i);
        const z = pos.array ? pos.array[i * 3 + 2] : pos.getZ(i);
        uvs[i * 2] = (x - minX) / spanX;
        uvs[i * 2 + 1] = (z - minZ) / denomZ;
      }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  },

  applyEnvironmentTexturesToGLB(scene, groupType) {
    if (!scene || typeof THREE === 'undefined') return;

    if (!this.oceanTexture) this.oceanTexture = this.createOceanCanvasTexture();
    if (!this.continentTexture) this.continentTexture = this.createTerrainCanvasTexture();
    if (!this.terrainNormalTexture) this.terrainNormalTexture = this.createTerrainNormalTexture();
    if (!this.oceanNormalTexture) this.oceanNormalTexture = this.createOceanNormalTexture();
    if (!this.airfieldGroundTexture) this.airfieldGroundTexture = this.createAirfieldGroundTexture();
    if (!this.sandTexture) this.sandTexture = this.createSandCanvasTexture();
    if (!this.runwayAsphaltTexture && typeof this.createRunwayAsphaltTexture === 'function') {
      this.runwayAsphaltTexture = this.createRunwayAsphaltTexture(380);
    }
    if (!this.taxiwayAsphaltTexture && typeof this.createRunwayAsphaltTexture === 'function') {
      this.taxiwayAsphaltTexture = this.createRunwayAsphaltTexture(1);
    }

    const setWhite = (mat) => {
      if (mat.color && typeof mat.color.setHex === 'function') {
        mat.color.setHex(0xffffff);
      }
    };

    const getPosCount = (geo) => {
      const pos = geo && geo.attributes && geo.attributes.position;
      if (!pos) return 0;
      if (typeof pos.count === 'number') return pos.count;
      return pos.array ? Math.floor(pos.array.length / (pos.itemSize || 3)) : 0;
    };

    scene.traverse((c) => {
      if (!c || !c.isMesh || !c.geometry || !c.material) return;
      let mat = Array.isArray(c.material) ? c.material[0] : c.material;
      const matName = mat && mat.name ? mat.name : '';
      if (!matName) return;

      if (matName === 'VastOceanFloor' || matName === 'OceanWater' || matName === 'MasterOcean') {
        this.applyPlanarWorldUVs(c.geometry, 90, 90, 1200, 1200);
        setWhite(mat);
        mat.map = this.oceanTexture;
        mat.normalMap = this.oceanNormalTexture;
        mat.normalScale = new THREE.Vector2(0.9, 0.9);
        mat.roughness = 0.08;
        mat.metalness = 0.0;
        if (this.scene && this.scene.environment) {
          mat.envMap = this.scene.environment;
          mat.envMapIntensity = 0.6;
        }
        if (matName === 'OceanWater') {
          if (c.position) c.position.y = -1.46;
          mat.polygonOffset = true;
          mat.polygonOffsetFactor = 1;
          mat.polygonOffsetUnits = 1;
        } else {
          mat.polygonOffset = true;
          mat.polygonOffsetFactor = 2;
          mat.polygonOffsetUnits = 2;
          if (matName === 'VastOceanFloor') {
            this.oceanMaterial = mat;
          }
        }
        mat.needsUpdate = true;
      } else if (matName === 'ContinentalMainlandGrass' || matName === 'MasterContinent') {
        this.applyPlanarWorldUVs(c.geometry, 120, 120, 500, 400, 0, -28000);
        setWhite(mat);
        mat.map = this.continentTexture;
        mat.normalMap = this.terrainNormalTexture;
        mat.normalScale = new THREE.Vector2(0.8, 0.8);
        mat.roughness = 0.86;
        mat.metalness = 0.06;
        mat.needsUpdate = true;
      } else if (matName === 'AirportGround' || matName === 'IncheonApronGround') {
        this.applyPlanarWorldUVs(c.geometry, 80, 80, 1, 1, 0, 0);
        setWhite(mat);
        mat.map = this.airfieldGroundTexture;
        mat.bumpMap = this.airfieldGroundTexture;
        mat.bumpScale = 0.42;
        mat.roughness = 0.85;
        mat.metalness = 0.08;
        mat.needsUpdate = true;
      } else if (matName === 'AsphaltRunway' || matName === 'IncheonMegaRunways' || matName === 'MasterRunway') {
        mat = typeof mat.clone === 'function' ? mat.clone() : mat;
        c.material = mat;
        const posCount = getPosCount(c.geometry);
        const isRunwayStrip = posCount <= 12;
        if (isRunwayStrip) {
          this.applyRunwayStripUVs(c.geometry, 380);
          setWhite(mat);
          mat.map = this.runwayAsphaltTexture;
          mat.bumpMap = this.runwayAsphaltTexture;
          mat.bumpScale = 0.28;
          mat.roughness = 0.76;
          mat.metalness = 0.12;
        } else {
          this.applyPlanarWorldUVs(c.geometry, 24, 24, 1, 1, 0, 0);
          setWhite(mat);
          mat.map = this.taxiwayAsphaltTexture;
          mat.bumpMap = this.taxiwayAsphaltTexture;
          mat.bumpScale = 0.24;
          mat.roughness = 0.80;
          mat.metalness = 0.10;
        }
        const offset = isRunwayStrip ? -2 : -1;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = offset;
        mat.polygonOffsetUnits = offset;
        mat.needsUpdate = true;
      } else if (
        matName === 'TaxiwayYellowLines' ||
        matName === 'IncheonTaxiLines'
      ) {
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -3;
        mat.polygonOffsetUnits = -3;
        mat.needsUpdate = true;
      } else if (
        matName === 'RunwayWhiteMarkings' ||
        matName === 'IncheonWhiteMarkings' ||
        matName === 'MasterWhiteMarkings'
      ) {
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -4;
        mat.polygonOffsetUnits = -4;
        mat.needsUpdate = true;
      } else if (
        matName === 'GoldenCoastlineSand' ||
        matName === 'IslandTropicalSand' ||
        matName === 'BeachSand'
      ) {
        this.applyPlanarWorldUVs(c.geometry, 45, 45, 1, 1, 0, -28000);
        setWhite(mat);
        mat.map = this.sandTexture;
        mat.bumpMap = this.sandTexture;
        mat.bumpScale = 0.30;
        mat.roughness = 0.90;
        mat.metalness = 0.04;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -2;
        mat.polygonOffsetUnits = -2;
        mat.needsUpdate = true;
      } else if (
        matName === 'IslandTropicalHill' ||
        matName === 'MountainProceduralTerrain' ||
        matName === 'MasterMountains'
      ) {
        this.applyPlanarWorldUVs(c.geometry, 75, 75, 500, 400, 0, 0);
        mat.vertexColors = true;
        mat.normalMap = this.terrainNormalTexture;
        mat.normalScale = new THREE.Vector2(1.0, 1.0);
        mat.roughness = 0.92;
        mat.needsUpdate = true;
      }
    });
  },

  // ----------------------------------------------------------------
  // 1-D. 100% 순수 바이너리 GLB 환경 & 초고속 렌더 파이프라인
  // ----------------------------------------------------------------
  initEnvironments() {
    this.airportGroup = new THREE.Group();
    this.incheonAirportGroup = new THREE.Group();
    this.terrainGroup = new THREE.Group();
    this.cityGroup = new THREE.Group();
    this.cloudsGroup = new THREE.Group();

    this.scene.add(this.terrainGroup);
    this.scene.add(this.airportGroup);
    this.scene.add(this.incheonAirportGroup);
    this.scene.add(this.cityGroup);
    this.scene.add(this.cloudsGroup);

    // 동적 엔티티 배열 초기화 (불필요한 CPU 루프 100% 제거)
    this.movingVehicles = [];
    this.movingPedestrians = [];
    this.beachPeople = [];
    this.cityNightLights = [];
    this.airportBuses = [];
    this.movingGroundCrew = [];
    this.marshallerCrew = [];
    this.aiAircraftList = [];
    this.animatedJetways = [];

    // 수학적 충돌 바운딩 박스 (드로우콜 0개, 순수 수학 연산)
    this.initCollisionBoxes();

    // PAPI 활주로 접근각 지시등
    this.initPAPILights();

    // 초경량 3D 뭉게구름
    this.initClouds();

    // 지형 노멀 맵 (GLB 마운트 전에 생성)
    this.terrainNormalTexture = this.createTerrainNormalTexture();

    // 모든 공항, 인천공항, 지형/대양/산맥, 해운대 메트로폴리스를 GLB 모델로 즉각 마운트
    this.loadAllRealGLBModels();
  },

  initCollisionBoxes() {
    this.obstacles = [
      {
        box: new THREE.Box3(
          new THREE.Vector3(-560, 0, -240),
          new THREE.Vector3(-200, 24, -160)
        ),
        name: '제1여객터미널'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-465, 0, 485),
          new THREE.Vector3(-435, 105, 515)
        ),
        name: '관제탑'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-490, 0, -1250),
          new THREE.Vector3(-350, 35, -1150)
        ),
        name: '항공정비 격납고'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-775, 0, -45255),
          new THREE.Vector3(-325, 32, -45145)
        ),
        name: '인천국제공항 T1'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-670, 0, -44720),
          new THREE.Vector3(-630, 120, -44680)
        ),
        name: '인천공항 메가 관제탑'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-210, 0, -28730),
          new THREE.Vector3(-150, 411, -28670)
        ),
        name: '해운대 엘시티 랜드마크 타워 (411m)'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-103, 0, -28773),
          new THREE.Vector3(-57, 310, -28727)
        ),
        name: '해운대 엘시티 레지던스 타워 A (310m)'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-303, 0, -28773),
          new THREE.Vector3(-257, 310, -28727)
        ),
        name: '해운대 엘시티 레지던스 타워 B (310m)'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(340, 0, -27415),
          new THREE.Vector3(360, 120, -27385)
        ),
        name: '광안대교 동측 주탑'
      },
      {
        box: new THREE.Box3(
          new THREE.Vector3(-360, 0, -27415),
          new THREE.Vector3(-340, 120, -27385)
        ),
        name: '광안대교 서측 주탑'
      }
    ];
    const marineCityX = [120, 220, 340, 460, 600, 750, 900, -420, -560, -720, -900];
    marineCityX.forEach((cx, i) => {
      const h = 150 + (i % 5) * 45;
      const cz = -28800 - (i % 3) * 70;
      this.obstacles.push({
        box: new THREE.Box3(
          new THREE.Vector3(cx - 21, 0, cz - 21),
          new THREE.Vector3(cx + 21, h, cz + 21)
        ),
        name: `해운대 마린시티 마천루 #${i + 1} (${h}m)`
      });
    });

    this.initTerrainColliders();
  },

  _getIslandTerrainDefs() {
    return [
      { x: -450, z: -3500, r: 90, h: 30, variant: 'rolling' },
      { x: 480, z: -7500, r: 120, h: 38, variant: 'twin' },
      { x: -380, z: -12500, r: 110, h: 35, variant: 'ridge' },
      { x: 520, z: -17500, r: 130, h: 42, variant: 'volcanic' },
      { x: -480, z: -22000, r: 140, h: 48, variant: 'twin' },
      { x: 380, z: -26000, r: 110, h: 38, variant: 'rolling' }
    ];
  },

  _getMountainTerrainDefs() {
    return [
      // 출발 해상 공항 주변 원경
      { x: -3200, z: -2500, r: 580, h: 580, variant: 'ridge' },
      { x: 3300, z: -2200, r: 600, h: 620, variant: 'twin' },
      // 항로 주변
      { x: -4200, z: -12000, r: 880, h: 920, variant: 'alpine' },
      { x: 4200, z: -18000, r: 920, h: 960, variant: 'massif' },
      // 대륙 해안선 좌우 거대 곶 (Z = -28000)
      { x: -5500, z: -28500, r: 1150, h: 1150, variant: 'ridge' },
      { x: 5500, z: -28500, r: 1150, h: 1150, variant: 'twin' },
      // ★ 목적지 대륙 육지 공항 배후의 웅장한 대륙 산맥 능선 (Continental Majestic Mountain Range: Z = -47000 ~ -60000)
      { x: -3800, z: -47500, r: 1300, h: 1300, variant: 'massif' },
      { x: 3800, z: -47800, r: 1250, h: 1250, variant: 'ridge' },
      { x: -5500, z: -52000, r: 1600, h: 1650, variant: 'alpine' },
      { x: 5500, z: -52000, r: 1550, h: 1600, variant: 'twin' },
      { x: 0, z: -56000, r: 1900, h: 1850, variant: 'alpine' },
      { x: -3500, z: -58000, r: 1700, h: 1700, variant: 'ridge' },
      { x: 3500, z: -58000, r: 1650, h: 1680, variant: 'massif' },
      // 산맥 앞자락 구릉지대 (Foothills for layered mountain range depth)
      { x: -2900, z: -49200, r: 900, h: 640, variant: 'rolling' },
      { x: 2950, z: -49600, r: 880, h: 610, variant: 'twin' },
      { x: -6400, z: -55000, r: 1200, h: 980, variant: 'ridge' },
      { x: 6400, z: -55200, r: 1180, h: 950, variant: 'alpine' }
    ];
  },

  initTerrainColliders() {
    this.terrainColliders = [];
    const islandDefs = this._getIslandTerrainDefs();
    islandDefs.forEach((isl, idx) => {
      const islSeed = 101 + idx * 37.3;
      const hillRadius = isl.r * 0.82;
      const hillSeed = islSeed + 13.7;
      const hillMaxR = hillRadius * 1.6;
      this.terrainColliders.push({
        x: isl.x,
        z: isl.z,
        baseY: 1.6,
        radius: hillRadius,
        maxRadiusSq: hillMaxR * hillMaxR,
        height: isl.h,
        variant: isl.variant,
        seed: hillSeed,
        isMountain: false,
        params: this._getTerrainParams(isl.variant, hillSeed),
        name: `해상 섬 언덕 #${idx + 1}`
      });
    });

    const mountainDefs = this._getMountainTerrainDefs();
    mountainDefs.forEach((m, idx) => {
      const mSeed = 501 + idx * 43.9;
      const mMaxR = m.r * 1.6;
      this.terrainColliders.push({
        x: m.x,
        z: m.z,
        baseY: -20,
        radius: m.r,
        maxRadiusSq: mMaxR * mMaxR,
        height: m.h,
        variant: m.variant,
        seed: mSeed,
        isMountain: true,
        params: this._getTerrainParams(m.variant, mSeed),
        name: `대륙 산악 지형 (${Math.round(m.h)}m)`
      });
    });
  },

  initPAPILights() {
    this.papiLights = [];
    if (!this.airportGroup) return;
    for (let p = 0; p < 4; p++) {
      const lamp = new THREE.PointLight(0xffffff, 2.2, 90);
      lamp.position.set(97, 3.2, 1250 + p * 8);
      this.airportGroup.add(lamp);
      this.papiLights.push(lamp);
    }
    this.beaconLight = new THREE.PointLight(0xff2222, 1.8, 300);
    this.beaconLight.position.set(-450, 102, 500);
    this.airportGroup.add(this.beaconLight);
  },

  initClouds() {
    if (!this.cloudsGroup) return;
    while (this.cloudsGroup.children.length > 0) this.cloudsGroup.remove(this.cloudsGroup.children[0]);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.90,
      flatShading: true
    });
    const cloudGeo = new THREE.DodecahedronGeometry(35, 1);
    for (let i = 0; i < 28; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      const angle = (i / 28) * Math.PI * 2;
      const dist = 2000 + (i % 5) * 1500;
      const zBase = -1000 - i * 1500;
      cloud.position.set(Math.cos(angle) * dist, 400 + (i % 4) * 80, zBase);
      cloud.scale.set(3.5, 1.2, 2.5);
      this.cloudsGroup.add(cloud);
    }
  },

  // ----------------------------------------------------------------
  // 2-A. 고폴리곤 절차적 언덕 · 산맥 지형 생성기 (Procedural Terrain Geometry)
  // ----------------------------------------------------------------
  _terrainHash2D(ix, iz, seed) {
    const n = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  },

  _terrainNoise2D(x, z, seed) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uz = fz * fz * (3.0 - 2.0 * fz);

    const a = this._terrainHash2D(ix, iz, seed);
    const b = this._terrainHash2D(ix + 1, iz, seed);
    const c = this._terrainHash2D(ix, iz + 1, seed);
    const d = this._terrainHash2D(ix + 1, iz + 1, seed);

    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  },

  _terrainFbm(x, z, seed, octaves = 4) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      val += amp * (this._terrainNoise2D(x * freq, z * freq, seed + i * 17.3) * 2 - 1);
      norm += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return val / norm;
  },

  _terrainRidgedFbm(x, z, seed, octaves = 4) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      const n = this._terrainNoise2D(x * freq, z * freq, seed + i * 29.1) * 2 - 1;
      const ridge = 1.0 - Math.abs(n);
      val += amp * (ridge * ridge);
      norm += amp;
      amp *= 0.5;
      freq *= 2.13;
    }
    return val / norm;
  },

  createOrganicBeachGeometry(radius, height, radialSegments = 32, seed = 1) {
    const geo = new THREE.CylinderGeometry(radius, radius * 1.15, height, radialSegments, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const len = Math.hypot(x, z);
      if (len > 0.001) {
        const nx = x / len;
        const nz = z / len;
        const warp = 1.0 + 0.16 * this._terrainFbm(nx * 2.2, nz * 2.2, seed, 3);
        pos.setX(i, x * warp);
        pos.setZ(i, z * warp);
      }
      pos.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  },

  _getTerrainParams(variant, seed) {
    const aspectX = variant === 'ridge' ? 1.32 : (variant === 'twin' ? 1.24 : (variant === 'massif' ? 1.15 : 1.0));
    const aspectZ = variant === 'ridge' ? 0.74 : (variant === 'twin' ? 0.84 : 1.0);
    const ridgeRot = (seed * 1.37) % Math.PI;
    return {
      aspectX,
      aspectZ,
      ridgeRot,
      cosR: Math.cos(ridgeRot),
      sinR: Math.sin(ridgeRot),
      summitOffsetX: (this._terrainHash2D(1, 2, seed) - 0.5) * 0.22,
      summitOffsetZ: (this._terrainHash2D(3, 4, seed) - 0.5) * 0.22,
      spurCount: 3 + Math.floor(this._terrainHash2D(5, 6, seed) * 4),
      spurPhase: this._terrainHash2D(7, 8, seed) * Math.PI * 2
    };
  },

  _evalTerrainHeightNorm(lx, lz, t, theta, edgeNoise, variant, seed, isMountain, params) {
    const { aspectX, aspectZ, spurCount, spurPhase } = params;
    const distNorm = Math.min(1.0, Math.hypot(lx / aspectX, lz / aspectZ));
    let baseProfile = 0;

    if (variant === 'twin') {
      const d1 = Math.hypot((lx - 0.30) / 0.72, lz / 0.85);
      const d2 = Math.hypot((lx + 0.34) / 0.76, (lz - 0.08) / 0.88);
      const p1 = Math.max(0, 1 - d1);
      const p2 = Math.max(0, 1 - d2) * 0.82;
      const saddle = Math.max(p1, p2) + 0.22 * Math.min(p1, p2);
      baseProfile = Math.pow(Math.min(1, saddle), 1.2) * (1 - Math.pow(t, 3.2));
    } else if (variant === 'massif') {
      baseProfile = Math.pow(Math.max(0, 1 - distNorm * distNorm), 0.85);
      baseProfile += 0.045 * Math.sin(baseProfile * Math.PI * 5.0) * (1 - t);
    } else if (variant === 'ridge') {
      const spineDist = Math.abs(lz / aspectZ);
      const alongSpine = Math.abs(lx / aspectX);
      const spineProfile = Math.max(0, 1 - spineDist * 1.15) * Math.max(0, 1 - alongSpine * 0.82);
      baseProfile = Math.pow(spineProfile, 1.15) * (1 - Math.pow(t, 3.5));
    } else if (variant === 'volcanic') {
      baseProfile = Math.pow(Math.max(0, 1 - t), 1.25);
      if (t < 0.14) {
        const crater = (0.14 - t) / 0.14;
        baseProfile -= 0.07 * crater * crater;
      }
    } else if (variant === 'rolling') {
      baseProfile = 0.5 * (1 + Math.cos(Math.min(1, t) * Math.PI));
      baseProfile = Math.pow(baseProfile, 0.85);
    } else {
      baseProfile = Math.pow(Math.max(0, 1 - t), 1.32);
    }

    const ridgeNoise = this._terrainRidgedFbm(lx * 2.6, lz * 2.6, seed + 11.7, 4);
    const detailNoise = this._terrainFbm(lx * 5.2, lz * 5.2, seed + 23.4, 3);
    const spurWave = 0.5 + 0.5 * Math.cos(theta * spurCount + spurPhase + edgeNoise * 1.6);

    const envelope = Math.sin(Math.min(1, t) * Math.PI);
    const upperEnvelope = (1 - t) * Math.pow(t, 0.35);

    const ridgeAmp = isMountain ? 0.34 : 0.24;
    const spurAmp = isMountain ? 0.14 : 0.10;
    const detailAmp = isMountain ? 0.09 : 0.07;

    let hNorm = baseProfile
      + (ridgeNoise - 0.42) * ridgeAmp * (0.35 + 0.65 * envelope)
      + (spurWave - 0.5) * spurAmp * upperEnvelope
      + detailNoise * detailAmp * envelope;

    const baseFade = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1.0;
    hNorm = Math.max(0, hNorm * baseFade);

    return { hNorm, ridgeNoise, detailNoise };
  },

  getTerrainColliderHit(worldX, worldY, worldZ, clearance = 6.0) {
    if (!this.terrainColliders || this.terrainColliders.length === 0) return null;
    for (let i = 0; i < this.terrainColliders.length; i++) {
      const c = this.terrainColliders[i];
      if (worldY - clearance > c.baseY + c.height * 1.25) continue;
      const dx = worldX - c.x;
      const dz = worldZ - c.z;
      if (dx * dx + dz * dz > c.maxRadiusSq) continue;

      const p = c.params;
      const ndx = dx / c.radius;
      const ndz = dz / c.radius;
      const lx = ndx * p.cosR + ndz * p.sinR;
      const lz = -ndx * p.sinR + ndz * p.cosR;

      // Invert summitOffset shift iteratively so collider height matches procedural mesh
      let t = Math.min(1.0, Math.hypot(lx / p.aspectX, lz / p.aspectZ));
      let theta = 0;
      let edgeNoise = 0;
      let rScaled = 0;
      for (let iter = 0; iter < 4; iter++) {
        const shiftFade = Math.pow(Math.max(0, 1 - t), 1.4);
        const u = (lx - p.summitOffsetX * shiftFade) / p.aspectX;
        const v = (lz - p.summitOffsetZ * shiftFade) / p.aspectZ;
        rScaled = Math.hypot(u, v);
        theta = Math.atan2(v, u);
        edgeNoise = this._terrainFbm(Math.cos(theta) * 2.1, Math.sin(theta) * 2.1, c.seed + 5.1, 3);
        const nextT = rScaled / (1.0 + 0.18 * edgeNoise * Math.pow(Math.min(1, rScaled), 0.65));
        t = iter < 3 ? Math.max(0, Math.min(1.2, 0.5 * t + 0.5 * nextT)) : nextT;
      }
      if (rScaled >= 1.2 || t >= 1.0) continue;

      const { hNorm } = this._evalTerrainHeightNorm(lx, lz, t, theta, edgeNoise, c.variant, c.seed, c.isMountain, p);
      const terrainY = c.baseY + hNorm * c.height;
      if (worldY - clearance <= terrainY) {
        return { collider: c, terrainY };
      }
    }
    return null;
  },

  createProceduralTerrainGeometry({
    radius,
    height,
    radialSegments = 44,
    heightRings = 18,
    variant = 'alpine',
    seed = 1,
    isMountain = true,
    hasSnow = false
  }) {
    const vertexCount = 1 + radialSegments * heightRings;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    const params = this._getTerrainParams(variant, seed);
    const { aspectX, aspectZ, cosR, sinR, summitOffsetX, summitOffsetZ } = params;

    const evalPoint = (t, theta) => {
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Organic base footprint warp
      const edgeNoise = this._terrainFbm(cosT * 2.1, sinT * 2.1, seed + 5.1, 3);
      const rScale = 1.0 + 0.18 * edgeNoise * Math.pow(t, 0.65);

      let lx = cosT * t * rScale * aspectX;
      let lz = sinT * t * rScale * aspectZ;

      // Subtle summit shift that fades to 0 at the base perimeter
      const shiftFade = Math.pow(1 - t, 1.4);
      lx += summitOffsetX * shiftFade;
      lz += summitOffsetZ * shiftFade;

      // World-space oriented local coords
      const wx = (lx * cosR - lz * sinR) * radius;
      const wz = (lx * sinR + lz * cosR) * radius;

      const { hNorm, ridgeNoise, detailNoise } = this._evalTerrainHeightNorm(
        lx, lz, t, theta, edgeNoise, variant, seed, isMountain, params
      );

      const wy = hNorm * height;
      return { x: wx, y: wy, z: wz, hNorm, ridgeNoise, detailNoise };
    };

    const assignColor = (idx, hNorm, ridgeNoise, detailNoise) => {
      const c = new THREE.Color();
      if (isMountain) {
        const snowLine = hasSnow ? (0.73 + detailNoise * 0.08 - (ridgeNoise - 0.5) * 0.06) : 1.5;
        const rockThreshold = 0.36 + detailNoise * 0.08 - (ridgeNoise - 0.5) * 0.14;
        if (hNorm >= snowLine) {
          c.setHex(hNorm > snowLine + 0.08 ? 0xf8fafc : 0xe2e8f0);
        } else if (hNorm >= 0.58 || (hNorm >= rockThreshold && ridgeNoise > 0.52)) {
          c.setHex(detailNoise > 0.05 ? 0x64748b : 0x78716c);
        } else if (hNorm >= 0.26) {
          const blend = (hNorm - 0.26) / 0.32;
          const forest = new THREE.Color(detailNoise > 0 ? 0x2d6a4f : 0x3a6b4c);
          const slate = new THREE.Color(0x52796f);
          c.copy(forest).lerp(slate, blend);
        } else {
          c.setHex(detailNoise > 0 ? 0x1b4332 : 0x2d6a4f);
        }
      } else {
        // Island hills: lush coastal greens with rocky cliff accents on ridges
        if (hNorm >= 0.68 && (variant === 'volcanic' || ridgeNoise > 0.58)) {
          c.setHex(0x57534e);
        } else if (hNorm >= 0.50) {
          c.setHex(detailNoise > 0 ? 0x2d6a4f : 0x3f7d3a);
        } else if (hNorm >= 0.18) {
          c.setHex(detailNoise > 0 ? 0x15803d : 0x166534);
        } else {
          c.setHex(0x16a34a);
        }
      }
      colors[idx * 3] = c.r;
      colors[idx * 3 + 1] = c.g;
      colors[idx * 3 + 2] = c.b;
    };

    // Vertex 0: Apex
    const apex = evalPoint(0, 0);
    positions[0] = apex.x;
    positions[1] = apex.y;
    positions[2] = apex.z;
    assignColor(0, apex.hNorm, apex.ridgeNoise, apex.detailNoise);

    // Rings 1..heightRings
    for (let ring = 1; ring <= heightRings; ring++) {
      const t = ring / heightRings;
      for (let seg = 0; seg < radialSegments; seg++) {
        const theta = (seg / radialSegments) * Math.PI * 2;
        const vIdx = 1 + (ring - 1) * radialSegments + seg;
        const p = evalPoint(t, theta);
        positions[vIdx * 3] = p.x;
        positions[vIdx * 3 + 1] = p.y;
        positions[vIdx * 3 + 2] = p.z;
        assignColor(vIdx, p.hNorm, p.ridgeNoise, p.detailNoise);
      }
    }

    // Apex fan triangles (CCW looking from outside/above)
    for (let seg = 0; seg < radialSegments; seg++) {
      const nextSeg = (seg + 1) % radialSegments;
      indices.push(0, 1 + nextSeg, 1 + seg);
    }

    // Quad bands between rings
    for (let ring = 1; ring < heightRings; ring++) {
      const rowStart = 1 + (ring - 1) * radialSegments;
      const nextRowStart = 1 + ring * radialSegments;
      for (let seg = 0; seg < radialSegments; seg++) {
        const nextSeg = (seg + 1) % radialSegments;
        const a = rowStart + seg;
        const b = rowStart + nextSeg;
        const c = nextRowStart + seg;
        const d = nextRowStart + nextSeg;
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  },

  // ----------------------------------------------------------------
  initTerrainAndSky() {
    // 1. 바다 (광활한 대양 120,000m x 120,000m - 해수면 Y = -1.5, 대륙 영역[-25000..25000, -68000..-28000]과 비중첩 분할로 원거리 Z-Fighting 원천 차단)
    this.oceanTexture = this.createOceanCanvasTexture();
    this.oceanNormalTexture = this.createOceanNormalTexture();
    this.oceanMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: this.oceanTexture,
      normalMap: this.oceanNormalTexture,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.06,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      specular: 0x66ccff,
      specularIntensity: 1.15,
      ior: 1.33,
      transmission: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2
    });
    const seaTiles = [
      { w: 120000, d: 63000, x: 0, z: 3500 },       // 남측 대양 (Z: -28000 ~ +35000)
      { w: 120000, d: 17000, x: 0, z: -76500 },     // 북측 대양 (Z: -85000 ~ -68000)
      { w: 35000, d: 40000, x: -42500, z: -48000 }, // 서측 대양 (X: -60000 ~ -25000)
      { w: 35000, d: 40000, x: 42500, z: -48000 }   // 동측 대양 (X: +25000 ~ +60000)
    ];
    seaTiles.forEach(tile => {
      const seaGeo = new THREE.PlaneGeometry(tile.w, tile.d, 8, 8);
      const seaMesh = new THREE.Mesh(seaGeo, this.oceanMaterial);
      seaMesh.rotation.x = -Math.PI / 2;
      seaMesh.position.set(tile.x, -1.5, tile.z);
      seaMesh.receiveShadow = true;
      this.scene.add(seaMesh);
    });

    // 1-B. 거대한 대륙 육지 (Continental Mainland: Z = -28000 ~ -68000, 상단 표면 정확히 Y = 0.0)
    // 폭 50km x 길이 40km, 두께 8m, 중심 Y = -4.0 -> 상단면 Y = 0.0 (공항 바닥과 단차 및 바다 비중첩으로 Z-Fighting 원천 차단)
    const continentGeo = new THREE.BoxGeometry(50000, 8.0, 40000);
    this.continentTexture = this.createTerrainCanvasTexture();
    const continentMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.continentTexture,
      bumpMap: this.continentTexture,
      bumpScale: 0.55,
      roughness: 0.86,
      metalness: 0.06
    });
    const continent = new THREE.Mesh(continentGeo, continentMat);
    continent.position.set(0, -4.0, -48000);
    continent.receiveShadow = true;
    this.scene.add(continent);

    // 대륙 남쪽 해안선 백사장 (Golden Beach Coastline: Z = -28000 - 대륙 상단보다 25cm 위 Y = 0.25 + polygonOffset)
    const coastGeo = new THREE.PlaneGeometry(50000, 600);
    this.sandTexture = this.sandTexture || this.createSandCanvasTexture();
    const coastMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sandTexture,
      bumpMap: this.sandTexture,
      bumpScale: 0.30,
      roughness: 0.90,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const coast = new THREE.Mesh(coastGeo, coastMat);
    coast.rotation.x = -Math.PI / 2;
    coast.position.set(0, 0.25, -28000);
    coast.receiveShadow = true;
    this.scene.add(coast);

    // 2. 해상 섬 군락 (Islands along 45km flight path - 속도 체감 시각적 이정표)
    this.initTerrainColliders();
    this.islandsGroup = new THREE.Group();
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
    const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });

    const islandDefs = this._getIslandTerrainDefs();

    islandDefs.forEach((isl, idx) => {
      const island = new THREE.Group();
      const islSeed = 101 + idx * 37.3;

      // 해변 모래사장 (유기적 해안선)
      const beach = new THREE.Mesh(this.createOrganicBeachGeometry(isl.r, 3.5, 32, islSeed), sandMat);
      beach.position.y = 0.5;
      beach.receiveShadow = true;
      island.add(beach);

      // 고폴리곤 다형성 녹색 중앙 언덕
      const hillRadius = isl.r * 0.82;
      const hillSeed = islSeed + 13.7;
      const hillGeo = this.createProceduralTerrainGeometry({
        radius: hillRadius,
        height: isl.h,
        radialSegments: 32,
        heightRings: 12,
        variant: isl.variant,
        seed: hillSeed,
        isMountain: false,
        hasSnow: false
      });
      const hill = new THREE.Mesh(hillGeo, grassMat);
      hill.position.y = 1.6;
      hill.castShadow = true;
      hill.receiveShadow = true;
      island.add(hill);

      // 야자수 몇 그루
      for (let p = 0; p < 5; p++) {
        const pAng = (p / 5) * Math.PI * 2 + Math.random() * 0.5;
        const pDist = isl.r * 0.78;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 7, 5), palmTrunkMat);
        trunk.position.set(Math.cos(pAng) * pDist, 3.5, Math.sin(pAng) * pDist);
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;
        island.add(trunk);

        const leaf = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.2, 5), palmLeafMat);
        leaf.position.set(Math.cos(pAng) * pDist, 7.5, Math.sin(pAng) * pDist);
        island.add(leaf);
      }

      island.position.set(isl.x, 0, isl.z);
      this.islandsGroup.add(island);
    });
    this.scene.add(this.islandsGroup);

    // 3. 해상 대형 화물선 (Cargo Ships with foam wake)
    this.shipsGroup = new THREE.Group();
    const shipHullMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
    const shipDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });

    const shipDefs = [
      { x: 320, z: -4500, rot: 0.1 },
      { x: -420, z: -11000, rot: -0.25 },
      { x: 280, z: -19500, rot: 0.05 },
      { x: -350, z: -25000, rot: 0.2 },
    ];

    shipDefs.forEach(s => {
      const ship = new THREE.Group();
      // 선체
      const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 75), shipHullMat);
      hull.position.y = 2.0;
      hull.castShadow = true;
      ship.add(hull);

      // 상부 선교
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 18), shipDeckMat);
      bridge.position.set(0, 8.5, 22);
      ship.add(bridge);

      // 컨테이너 화물 박스들
      const colors = [0x2563eb, 0x16a34a, 0xd97706, 0xdc2626];
      for (let cz = -26; cz <= 8; cz += 11) {
        for (let cx of [-4, 4]) {
          const cMat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
          const cont = new THREE.Mesh(new THREE.BoxGeometry(6.5, 5.5, 9.5), cMat);
          cont.position.set(cx, 6.5, cz);
          ship.add(cont);
        }
      }

      // 후방 항적 포말 (Wake Foam trail)
      const wake = new THREE.Mesh(new THREE.PlaneGeometry(24, 120), wakeMat);
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(0, 0.05, 75);
      ship.add(wake);

      ship.position.set(s.x, 0, s.z);
      ship.rotation.y = s.rot;
      this.shipsGroup.add(ship);
    });
    this.scene.add(this.shipsGroup);

    // 4. 원경 산맥 (Mountain Ranges in distance - 고폴리곤 다형성 대륙 대산맥)
    this.mountainsGroup = new THREE.Group();
    const mountainMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    const mountainDefs = this._getMountainTerrainDefs();

    mountainDefs.forEach((m, idx) => {
      const mSeed = 501 + idx * 43.9;
      const geo = this.createProceduralTerrainGeometry({
        radius: m.r,
        height: m.h,
        radialSegments: 44,
        heightRings: 18,
        variant: m.variant,
        seed: mSeed,
        isMountain: true,
        hasSnow: m.h >= 850
      });
      const mesh = new THREE.Mesh(geo, mountainMat);
      mesh.position.set(m.x, -20, m.z);
      this.mountainsGroup.add(mesh);
    });
    this.scene.add(this.mountainsGroup);

    // 5. 하늘 3D 뭉게구름 & 저고도 스침 구름 (Speed Passing Clouds)
    this.cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    });

    for (let i = 0; i < 90; i++) {
      const cloud = new THREE.Group();
      const nBlobs = 4 + Math.floor(Math.random() * 5);
      for (let j = 0; j < nBlobs; j++) {
        const r = 40 + Math.random() * 50;
        const blob = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), cloudMat);
        blob.position.set((j - nBlobs / 2) * 45, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 35);
        cloud.add(blob);
      }
      const dist = 1000 + Math.random() * 9000;
      const angle = Math.random() * Math.PI * 2;
      cloud.position.set(Math.cos(angle) * dist, 350 + Math.random() * 650, Math.sin(angle) * dist - 22000);
      this.cloudsGroup.add(cloud);
    }

    // 비행기 순항 고도 부근 저고도 스침 구름 (Low Altitude Speed Clouds: Y=70~140)
    for (let c = 0; c < 35; c++) {
      const lowCloud = new THREE.Mesh(new THREE.DodecahedronGeometry(25 + Math.random() * 30, 1), cloudMat);
      const cDist = -1200 - Math.random() * 42000;
      const cSide = (Math.random() - 0.5) * 1200;
      lowCloud.position.set(cSide, 85 + Math.random() * 95, cDist);
      lowCloud.scale.set(1.8, 0.65, 1.4);
      this.cloudsGroup.add(lowCloud);
    }

    this.scene.add(this.cloudsGroup);
  },

  // ----------------------------------------------------------------
  // 3. 350+ 3D 나무 군락 (소나무 & 활엽수)
  // ----------------------------------------------------------------
  initTrees() {
    this.treesGroup = new THREE.Group();

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });
    const pineMat1 = new THREE.MeshLambertMaterial({ color: 0x1b4332, flatShading: true });
    const pineMat2 = new THREE.MeshLambertMaterial({ color: 0x2d6a4f, flatShading: true });
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 6);
    const leavesGeo1 = new THREE.ConeGeometry(4.2, 9, 6);
    const leavesGeo2 = new THREE.ConeGeometry(3.2, 7, 6);

    const treePositions = [];

    // 출발 공항 외곽 녹지 (밀도 및 성능 최적화)
    for (let i = 0; i < 55; i++) {
      const x = (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 260);
      const z = -1400 + Math.random() * 2800;
      treePositions.push({ x, z, y: 2 });
    }

    // 목적지 대륙 육지 공항 및 대륙 숲 (Z = -43000 ~ -48000)
    for (let i = 0; i < 95; i++) {
      const x = (Math.random() > 0.5 ? 1 : -1) * (320 + Math.random() * 600);
      const z = -45000 - 1800 + Math.random() * 3600;
      treePositions.push({ x, z, y: 2 });
    }

    // 중간 항로 해안 및 섬들
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 600 + Math.random() * 3600;
      treePositions.push({
        x: Math.cos(angle) * dist,
        z: -12000 + Math.sin(angle) * dist * 2.5,
        y: 2
      });
    }

    treePositions.forEach(pos => {
      const tree = new THREE.Group();

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 2.5;
      tree.add(trunk);

      const mat = Math.random() > 0.5 ? pineMat1 : pineMat2;
      const l1 = new THREE.Mesh(leavesGeo1, mat);
      l1.position.y = 7.5;
      tree.add(l1);

      const l2 = new THREE.Mesh(leavesGeo2, mat);
      l2.position.y = 11.5;
      tree.add(l2);

      const s = 1.25 + Math.random() * 0.75;
      tree.scale.set(s, s, s);
      tree.position.set(pos.x, pos.y, pos.z);
      this.treesGroup.add(tree);
    });

    this.scene.add(this.treesGroup);
  }

  });
})();

