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
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });

    const islandDefs = [
      { x: -450, z: -3500, r: 90, h: 30 },
      { x: 480, z: -7500, r: 120, h: 38 },
      { x: -380, z: -12500, r: 110, h: 35 },
      { x: 520, z: -17500, r: 130, h: 42 },
      { x: -480, z: -22000, r: 140, h: 48 },
      { x: 380, z: -26000, r: 110, h: 38 },
    ];

    islandDefs.forEach(isl => {
      const island = new THREE.Group();
      // 해변 모래사장
      const beach = new THREE.Mesh(new THREE.CylinderGeometry(isl.r, isl.r * 1.15, 3.5, 18), sandMat);
      beach.position.y = 0.5;
      beach.receiveShadow = true;
      island.add(beach);

      // 녹색 중앙 언덕
      const hill = new THREE.Mesh(new THREE.ConeGeometry(isl.r * 0.75, isl.h, 12), grassMat);
      hill.position.y = isl.h / 2 + 1;
      hill.castShadow = true;
      hill.receiveShadow = true;
      island.add(hill);

      // 야자수 몇 그루
      for (let p = 0; p < 5; p++) {
        const pAng = (p / 5) * Math.PI * 2 + Math.random() * 0.5;
        const pDist = isl.r * 0.45;
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

    // 4. 원경 산맥 (Mountain Ranges in distance - 대륙 배경 웅장한 대산맥 추가)
    this.mountainsGroup = new THREE.Group();
    const mountainMat1 = new THREE.MeshLambertMaterial({ color: 0x2d6a4f, flatShading: true });
    const mountainMat2 = new THREE.MeshLambertMaterial({ color: 0x40916c, flatShading: true });
    const mountainMat3 = new THREE.MeshLambertMaterial({ color: 0x52796f, flatShading: true });

    const mountainDefs = [
      // 출발 해상 공항 주변 원경
      { x: -3200, z: -2500, r: 550, h: 580 },
      { x: 3300, z: -2200, r: 580, h: 620 },
      // 항로 주변
      { x: -4200, z: -12000, r: 850, h: 920 },
      { x: 4200, z: -18000, r: 900, h: 960 },
      // 대륙 해안선 좌우 거대 곶 (Z = -28000)
      { x: -5500, z: -28500, r: 1100, h: 1150 },
      { x: 5500, z: -28500, r: 1100, h: 1150 },
      // ★ 목적지 대륙 육지 공항 배후의 웅장한 대륙 산맥 능선 (Continental Majestic Mountain Range: Z = -47000 ~ -60000)
      { x: -3800, z: -47500, r: 1250, h: 1300 },
      { x: 3800, z: -47800, r: 1200, h: 1250 },
      { x: -5500, z: -52000, r: 1550, h: 1650 },
      { x: 5500, z: -52000, r: 1500, h: 1600 },
      { x: 0, z: -56000, r: 1850, h: 1850 },
      { x: -3500, z: -58000, r: 1650, h: 1700 },
      { x: 3500, z: -58000, r: 1600, h: 1680 },
    ];

    mountainDefs.forEach(m => {
      const geo = new THREE.ConeGeometry(m.r, m.h, 7);
      const mat = Math.random() > 0.6 ? mountainMat1 : (Math.random() > 0.5 ? mountainMat2 : mountainMat3);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(m.x, m.h / 2 - 20, m.z);
      mesh.rotation.y = Math.random() * Math.PI;
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

