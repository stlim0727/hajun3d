/**
 * Sky Jet Explorer 3D - Three.js Lights, Sky, Stars, Clouds, PAPI & Procedural Terrain
 * Subsystem: environment (9 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // 조명 설정 (주간 태양광 & 야간 달빛 & 1024 고속 섀도우 맵)
  initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xdff2fd, 0x334155, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    this.sunLight.position.set(500, 900, 400);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 5000;
    const d = 900;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // 야간 달빛 (Soft Moonlight for Night Flying)
    this.moonLight = new THREE.DirectionalLight(0x93c5fd, 0.0);
    this.moonLight.position.set(-600, 950, -450);
    this.scene.add(this.moonLight);
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
  createOceanCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 베이스 딥 오션 컬러
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 512, 512);

    // 부드러운 해류 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, 'rgba(3, 105, 161, 0.45)');
    grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.4)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 물결 패턴 & 포말 (Wave foam lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';

    for (let y = 12; y < 512; y += 24) {
      ctx.beginPath();
      for (let x = 0; x < 512; x += 32) {
        const offset = Math.sin((x + y) * 0.06) * 7;
        ctx.bezierCurveTo(x + 10, y + offset, x + 22, y - offset, x + 32, y + offset * 0.5);
      }
      ctx.stroke();
    }

    // 미세 백색 포말 물보라 점들
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 280; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const pr = 0.8 + Math.random() * 1.8;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(160, 160);
    return tex;
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

    const aspectX = variant === 'ridge' ? 1.32 : (variant === 'twin' ? 1.24 : (variant === 'massif' ? 1.15 : 1.0));
    const aspectZ = variant === 'ridge' ? 0.74 : (variant === 'twin' ? 0.84 : 1.0);
    const ridgeRot = (seed * 1.37) % Math.PI;
    const cosR = Math.cos(ridgeRot);
    const sinR = Math.sin(ridgeRot);
    const summitOffsetX = (this._terrainHash2D(1, 2, seed) - 0.5) * 0.22;
    const summitOffsetZ = (this._terrainHash2D(3, 4, seed) - 0.5) * 0.22;
    const spurCount = 3 + Math.floor(this._terrainHash2D(5, 6, seed) * 4);
    const spurPhase = this._terrainHash2D(7, 8, seed) * Math.PI * 2;

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

      // Base elevation profile by archetype
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
        // Subtle geological terraces
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
        // 'alpine' sharp peak
        baseProfile = Math.pow(Math.max(0, 1 - t), 1.32);
      }

      // Ridged multifractal + radiating buttress spurs
      const ridgeNoise = this._terrainRidgedFbm(lx * 2.6, lz * 2.6, seed + 11.7, 4);
      const detailNoise = this._terrainFbm(lx * 5.2, lz * 5.2, seed + 23.4, 3);
      const spurWave = 0.5 + 0.5 * Math.cos(theta * spurCount + spurPhase + edgeNoise * 1.6);

      const envelope = Math.sin(Math.min(1, t) * Math.PI); // 0 at apex & base, peak mid-slope
      const upperEnvelope = (1 - t) * Math.pow(t, 0.35);

      const ridgeAmp = isMountain ? 0.34 : 0.24;
      const spurAmp = isMountain ? 0.14 : 0.10;
      const detailAmp = isMountain ? 0.09 : 0.07;

      let hNorm = baseProfile
        + (ridgeNoise - 0.42) * ridgeAmp * (0.35 + 0.65 * envelope)
        + (spurWave - 0.5) * spurAmp * upperEnvelope
        + detailNoise * detailAmp * envelope;

      // Smoothly clamp base perimeter to y = 0
      const baseFade = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1.0;
      hNorm = Math.max(0, hNorm * baseFade);

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

  initTerrainAndSky() {
    // 1. 바다 (광활한 대양 120,000m x 120,000m - 해수면 Y = -1.5)
    this.oceanTexture = this.createOceanCanvasTexture();
    const seaGeo = new THREE.PlaneGeometry(120000, 120000, 16, 16);
    this.oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      map: this.oceanTexture,
      roughness: 0.18,
      metalness: 0.35
    });
    const sea = new THREE.Mesh(seaGeo, this.oceanMaterial);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -1.5, -25000);
    sea.receiveShadow = true;
    this.scene.add(sea);

    // 1-B. 거대한 대륙 육지 (Continental Mainland: Z = -28000 ~ -68000, 상단 표면 정확히 Y = 0.0)
    // 폭 50km x 길이 40km, 두께 8m, 중심 Y = -4.0 -> 상단면 Y = 0.0 (공항 바닥 Y = 2.0과 2.0m 완벽한 단차로 Z-Fighting 원천 차단!)
    const continentGeo = new THREE.BoxGeometry(50000, 8.0, 40000);
    const continentMat = new THREE.MeshStandardMaterial({
      color: 0x245a30,
      roughness: 0.88,
      metalness: 0.1
    });
    const continent = new THREE.Mesh(continentGeo, continentMat);
    continent.position.set(0, -4.0, -48000);
    continent.receiveShadow = true;
    this.scene.add(continent);

    // 대륙 남쪽 해안선 백사장 (Golden Beach Coastline: Z = -28000 - 대륙 상단보다 4cm 위 Y = 0.04 + polygonOffset)
    const coastGeo = new THREE.PlaneGeometry(50000, 600);
    const coastMat = new THREE.MeshLambertMaterial({ 
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const coast = new THREE.Mesh(coastGeo, coastMat);
    coast.rotation.x = -Math.PI / 2;
    coast.position.set(0, 0.04, -28000);
    coast.receiveShadow = true;
    this.scene.add(coast);

    // 2. 해상 섬 군락 (Islands along 45km flight path - 속도 체감 시각적 이정표)
    this.islandsGroup = new THREE.Group();
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
    const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });

    const islandDefs = [
      { x: -450, z: -3500, r: 90, h: 30, variant: 'rolling' },
      { x: 480, z: -7500, r: 120, h: 38, variant: 'twin' },
      { x: -380, z: -12500, r: 110, h: 35, variant: 'ridge' },
      { x: 520, z: -17500, r: 130, h: 42, variant: 'volcanic' },
      { x: -480, z: -22000, r: 140, h: 48, variant: 'twin' },
      { x: 380, z: -26000, r: 110, h: 38, variant: 'rolling' },
    ];

    islandDefs.forEach((isl, idx) => {
      const island = new THREE.Group();
      const islSeed = 101 + idx * 37.3;

      // 해변 모래사장 (유기적 해안선)
      const beach = new THREE.Mesh(this.createOrganicBeachGeometry(isl.r, 3.5, 32, islSeed), sandMat);
      beach.position.y = 0.5;
      beach.receiveShadow = true;
      island.add(beach);

      // 고폴리곤 다형성 녹색 중앙 언덕
      const hillGeo = this.createProceduralTerrainGeometry({
        radius: isl.r * 0.82,
        height: isl.h,
        radialSegments: 32,
        heightRings: 12,
        variant: isl.variant,
        seed: islSeed + 13.7,
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

    const mountainDefs = [
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
      { x: 6400, z: -55200, r: 1180, h: 950, variant: 'alpine' },
    ];

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
      mesh.rotation.y = (idx * 1.17) % (Math.PI * 2);
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

