/**
 * Sky Jet Explorer 3D - 현실적인 고해상도 비행, 공항 이착륙 & 다단계 파손/충돌 시뮬레이터
 * - 정밀 3D 모델링: 고해상도 여객기 (DC-10 삼발기 & MD-80 후방 쌍발기), 객실 창문, 날개 플랩/에일러론/엘리베이터/러더 실시간 가동
 * - 정밀 공항 환경: 디테일한 탑승교(아코디언 캐노피, 유압 대차, 회전 로툰다), 36L 정밀 활주로, PAPI 진입각 지시등, 유도로 조명, 지상 차량, 350+ 3D 나무 군락, 산맥
 * - 개선된 공기역학: 이륙 버그 완전 해결, 활주로 즉시 이륙 모드 지원, 피치 상승 양력 부양
 * - 다단계 파손/재난 물리: 저속 노즈 찌그러짐 튕김, 거친 착륙 기어 파손 동체착륙, 고속 추락 시 날개/동체/엔진 파쇄 분해 및 거대한 화염/연기 기둥 연출
 */

class AirplaneGame {
  constructor() {
    this.container = document.getElementById('game-container');

    // 비행기 기종 ('dc10' 또는 'md80')
    this.currentPlaneType = 'dc10';

    // 운항 상태 (FLIGHT PHASES)
    this.flightPhase = 'BOARDING'; // BOARDING, TAXI_OUT, TAKEOFF_RUN, CLIMB_CRUISE, APPROACH, TOUCHDOWN, TAXI_IN
    this.passengers = 285;
    this.score = 0;
    this.startTime = 0;
    this.isPlaying = false;
    this.cameraMode = '3rd';
    this.soundEnabled = true;

    // 기체 내구도 및 파손 상태 (Damage System)
    this.hullIntegrity = 100;
    this.isDestroyed = false;
    this.isNoseDented = false;
    this.isGearCollapsed = false;
    this.isBellySliding = false;

    // 비행 물리 변수
    this.speed = 0.0;            // 전진 속도 단위
    this.throttle = 0.0;         // 스로틀 (0.0 ~ 1.0)
    this.pitch = 0.0;            // 피치 각도 (라디안)
    this.roll = 0.0;             // 롤 각도 (라디안)
    this.yaw = 0.0;              // 요 각도 (라디안)
    this.verticalSpeed = 0.0;    // 수직 상승/하강 속도
    this.prevY = 6.84;
    this.isOnGround = true;      // 지상 접지 여부
    this.groundY = 6.84;         // 지상 고도 (활주로 Y=2.12에 타이어 접지)
    this.gearExtended = true;    // 기어 다운 여부
    this.screenShake = 0.0;      // 화면 흔들림 강도

    // 실속 및 GPWS 경보 시스템 (Stall & EGPWS Warning System)
    this.isStalling = false;
    this.stallSeverity = 0.0;
    this.gpwsState = null;
    this.lastSpokenPhrase = null;
    this.lastSpokenTime = 0;
    this.lastWhoopTime = 0;
    this.lastChimeTime = 0;
    this.lastStickShakerTime = 0;

    // 입력 상태
    this.keys = {
      up: false,          // ↑: 기수 하강 (Pitch Down)
      down: false,        // ↓: 기수 상승 (Pitch Up)
      left: false,        // A / ←: 좌측 롤/조향
      right: false,       // D / →: 우측 롤/조향
      fastForward: false, // W: 가속
      brake: false        // S: 감속 / 역추진
    };

    // 모바일 조이스틱
    this.joystickData = { x: 0, y: 0, active: false };

    // 가동 조종면 참조 (Ailerons, Elevators, Rudder, Nose Wheel)
    this.controlSurfaces = {
      leftAileron: null,
      rightAileron: null,
      leftElevator: null,
      rightElevator: null,
      rudder: null,
      noseWheelGroup: null
    };

    // 씬 객체 및 컬렉션
    this.landingGears = [];
    this.wheels = [];       // 활주로 굴림 바퀴
    this.engineExhaustPoints = [];
    this.particles = [];
    this.debrisPieces = []; // 파쇄된 기체 잔해 조각들
    this.obstacles = [];    // 건물 등 충돌 박스
    this.papiLights = [];   // PAPI 진입각 지시등

    // 사운드 시스템
    this.audioCtx = null;
    this.jetNoiseSrc = null;
    this.jetNoiseFilter = null;
    this.jetNoiseGain = null;
    this.jetRumble = null;
    this.turbineWhine = null;
    this.gpwsSirenGain = null;

    this.initThree();
    this.initLights();
    this.initTerrainAndSky();
    this.initAirports();
    this.initTrees();
    this.buildAircraft(this.currentPlaneType);
    this.initAudio();
    this.initUI();
    this.setupEvents();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ----------------------------------------------------------------
  // 1. 고해상도 Three.js 씬 & 렌더러 (ACES Filmic Tone Mapping)
  // ----------------------------------------------------------------
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec8e3);
    this.scene.fog = new THREE.FogExp2(0xa3d5ed, 0.00035);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      15000
    );
    this.camera.position.set(0, 15, 65);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  // 조명 설정
  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdff2fd, 0x334155, 0.65);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    this.sunLight.position.set(500, 900, 400);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 5000;
    const d = 900;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  // ----------------------------------------------------------------
  // 2. 현실적인 자연 지형, 산맥, 해안선, 입체 구름
  // ----------------------------------------------------------------
  initTerrainAndSky() {
    // 바다 (물결 광택 재질)
    const seaGeo = new THREE.PlaneGeometry(32000, 32000, 16, 16);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.8
    });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -2;
    sea.receiveShadow = true;
    this.scene.add(sea);

    // 원경 산맥 (Mountain Ranges in distance)
    this.mountainsGroup = new THREE.Group();
    const mountainMat1 = new THREE.MeshLambertMaterial({ color: 0x2d6a4f, flatShading: true });
    const mountainMat2 = new THREE.MeshLambertMaterial({ color: 0x40916c, flatShading: true });
    const mountainMat3 = new THREE.MeshLambertMaterial({ color: 0x52796f, flatShading: true });

    // 동서남북 원경에 웅장한 능선 배치
    const mountainDefs = [
      { x: -1600, z: -1500, r: 450, h: 480 },
      { x: -2100, z: -3200, r: 650, h: 720 },
      { x: -1800, z: -4800, r: 520, h: 580 },
      { x: 1700, z: -1200, r: 480, h: 520 },
      { x: 2200, z: -3000, r: 700, h: 760 },
      { x: 1900, z: -4600, r: 560, h: 620 },
      { x: 0, z: -7500, r: 900, h: 950 },
      { x: -800, z: -8000, r: 850, h: 880 },
      { x: 800, z: -7800, r: 800, h: 840 },
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

    // 하늘 3D 뭉게구름 (Fluffy Volumetric Clouds)
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
      const dist = 1000 + Math.random() * 6000;
      const angle = Math.random() * Math.PI * 2;
      cloud.position.set(Math.cos(angle) * dist, 320 + Math.random() * 550, Math.sin(angle) * dist - 2000);
      this.cloudsGroup.add(cloud);
    }
    this.scene.add(this.cloudsGroup);
  }

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

    // 출발 공항 외곽 녹지
    for (let i = 0; i < 130; i++) {
      const x = (Math.random() > 0.5 ? 1 : -1) * (220 + Math.random() * 260);
      const z = -1200 + Math.random() * 2400;
      treePositions.push({ x, z, y: 2 });
    }

    // 목적지 공항 외곽 녹지
    for (let i = 0; i < 130; i++) {
      const x = (Math.random() > 0.5 ? 1 : -1) * (220 + Math.random() * 260);
      const z = -4500 - 1200 + Math.random() * 2400;
      treePositions.push({ x, z, y: 2 });
    }

    // 중간 항로 해안 및 섬들
    for (let i = 0; i < 110; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 600 + Math.random() * 2600;
      treePositions.push({
        x: Math.cos(angle) * dist,
        z: -2200 + Math.sin(angle) * dist * 0.8,
        y: 2
      });
    }

    treePositions.forEach(pos => {
      const tree = new THREE.Group();

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 2.5;
      trunk.castShadow = true;
      tree.add(trunk);

      const mat = Math.random() > 0.5 ? pineMat1 : pineMat2;
      const l1 = new THREE.Mesh(leavesGeo1, mat);
      l1.position.y = 7.5;
      l1.castShadow = true;
      tree.add(l1);

      const l2 = new THREE.Mesh(leavesGeo2, mat);
      l2.position.y = 11.5;
      l2.castShadow = true;
      tree.add(l2);

      const s = 0.85 + Math.random() * 0.55;
      tree.scale.set(s, s, s);
      tree.position.set(pos.x, pos.y, pos.z);
      this.treesGroup.add(tree);
    });

    this.scene.add(this.treesGroup);
  }

  // ----------------------------------------------------------------
  // 4. 고해상도 국제공항 & 정밀 탑승교 & PAPI 유도등
  // ----------------------------------------------------------------
  initAirports() {
    this.airportGroup = new THREE.Group();
    this.obstacles = [];

    // 아스팔트 바닥
    const islandGeo = new THREE.BoxGeometry(900, 4, 2800);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const airportGround = new THREE.Mesh(islandGeo, groundMat);
    airportGround.position.set(0, 0, 0);
    airportGround.receiveShadow = true;
    this.airportGroup.add(airportGround);

    // --------------------------------------------------------------
    // 36L 정밀 활주로 (80m x 2400m)
    // --------------------------------------------------------------
    const runwayGeo = new THREE.PlaneGeometry(80, 2400);
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(120, 2.1, 0);
    runway.receiveShadow = true;
    this.airportGroup.add(runway);

    // 활주로 시단 피아노 건반 (Threshold Piano Keys)
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1100, 1100].forEach(zBase => {
      for (let k = -32; k <= 32; k += 5.5) {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 45), whiteMat);
        bar.rotation.x = -Math.PI / 2;
        bar.position.set(120 + k, 2.15, zBase);
        this.airportGroup.add(bar);
      }
    });

    // 활주로 중앙선
    for (let z = -1050; z <= 1050; z += 55) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 32), whiteMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(120, 2.15, z);
      this.airportGroup.add(stripe);
    }

    // 착륙 목표 지점 (Aiming Point)
    [-850, 850].forEach(z => {
      [-18, 18].forEach(xOff => {
        const aim = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 55), whiteMat);
        aim.rotation.x = -Math.PI / 2;
        aim.position.set(120 + xOff, 2.15, z);
        this.airportGroup.add(aim);
      });
    });

    // PAPI (Precision Approach Path Indicator) 4구 진입각 지시등
    this.papiLights = [];
    for (let p = 0; p < 4; p++) {
      const papiBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.2, 1.8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 })
      );
      papiBox.position.set(65, 2.6, 750 + p * 8);
      this.airportGroup.add(papiBox);

      const lamp = new THREE.PointLight(0xffffff, 2, 80);
      lamp.position.set(67, 3.2, 750 + p * 8);
      this.airportGroup.add(lamp);
      this.papiLights.push(lamp);
    }

    // --------------------------------------------------------------
    // 유도로 및 황색 유도선 (Taxiways)
    // --------------------------------------------------------------
    const taxiway = new THREE.Mesh(
      new THREE.PlaneGeometry(55, 2400),
      new THREE.MeshStandardMaterial({ color: 0x242e3d, roughness: 0.85 })
    );
    taxiway.rotation.x = -Math.PI / 2;
    taxiway.position.set(-60, 2.08, 0);
    taxiway.receiveShadow = true;
    this.airportGroup.add(taxiway);

    // 연결 유도로 3개소
    [-900, 0, 900].forEach(z => {
      const link = new THREE.Mesh(new THREE.PlaneGeometry(160, 50), new THREE.MeshStandardMaterial({ color: 0x242e3d }));
      link.rotation.x = -Math.PI / 2;
      link.position.set(30, 2.08, z);
      this.airportGroup.add(link);
    });

    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const taxiLine = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2350), yellowMat);
    taxiLine.rotation.x = -Math.PI / 2;
    taxiLine.position.set(-60, 2.15, 0);
    this.airportGroup.add(taxiLine);

    // --------------------------------------------------------------
    // 여객 터미널 빌딩
    // --------------------------------------------------------------
    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.7,
      transparent: true,
      opacity: 0.88
    });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(110, 38, 380), terminalMat);
    terminal.position.set(-270, 19, 0);
    terminal.castShadow = true;
    this.airportGroup.add(terminal);
    this.registerObstacle(terminal, '여객 터미널 빌딩');

    // --------------------------------------------------------------
    // 정밀 탑승교 (Passenger Boarding Bridge / Jet Bridge)
    // 회전 로툰다 + 신축형 유리창 터널 + 유압 바퀴 대차 + 아코디언 캐노피
    // --------------------------------------------------------------
    const jetBridgeGroup = new THREE.Group();

    // 1. 원형 로툰다 (피벗 타워)
    const rotunda = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.5, 12, 18),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 })
    );
    rotunda.position.set(-215, 10, 0);
    rotunda.castShadow = true;
    jetBridgeGroup.add(rotunda);

    // 2. 신축형 텔레스코픽 터널 통로 (유리창 패널 포함)
    const tunnel = new THREE.Mesh(
      new THREE.BoxGeometry(60, 6.5, 7.5),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    tunnel.position.set(-182, 9.2, 0);
    tunnel.castShadow = true;
    jetBridgeGroup.add(tunnel);

    // 터널 좌우 유리창
    const bridgeGlass = new THREE.Mesh(
      new THREE.BoxGeometry(56, 3.2, 7.7),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 })
    );
    bridgeGlass.position.set(-182, 9.5, 0);
    jetBridgeGroup.add(bridgeGlass);

    // 3. 하부 이동 대차 & 유압 리프트 기둥 (Wheel Bogie)
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const liftColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 7.5, 12), columnMat);
    liftColumn.position.set(-162, 5.2, 0);
    liftColumn.castShadow = true;
    jetBridgeGroup.add(liftColumn);

    const axle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 7.5), columnMat);
    axle.position.set(-162, 1.5, 0);
    jetBridgeGroup.add(axle);

    [-3.2, 3.2].forEach(zTire => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 1.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
      );
      tire.rotation.x = Math.PI / 2;
      tire.position.set(-162, 1.6, zTire);
      tire.castShadow = true;
      jetBridgeGroup.add(tire);
    });

    // 4. 항공기 도킹 캐빈 & 아코디언 고무 주름 캐노피
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(10, 7.2, 8.5),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
    );
    cabin.position.set(-148, 8.5, 0);
    cabin.castShadow = true;
    jetBridgeGroup.add(cabin);

    // 아코디언 고무 주름 (Accordion Pleated Bellows)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    for (let c = 0; c < 5; c++) {
      const fold = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.45, 8, 16), canopyMat);
      fold.rotation.y = Math.PI / 2;
      fold.position.set(-142 + c * 0.7, 8.5, 0);
      fold.scale.set(1.2, 1.1, 1);
      jetBridgeGroup.add(fold);
    }

    this.airportGroup.add(jetBridgeGroup);
    this.registerObstacle(rotunda, '탑승교 지지 타워');

    // --------------------------------------------------------------
    // 공항 관제탑 (ATC Tower)
    // --------------------------------------------------------------
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 15, 120, 18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    towerBase.position.set(-270, 60, -320);
    towerBase.castShadow = true;
    this.airportGroup.add(towerBase);
    this.registerObstacle(towerBase, '공항 관제탑');

    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 13, 20, 18),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.85 })
    );
    towerCab.position.set(-270, 125, -320);
    this.airportGroup.add(towerCab);

    this.beaconLight = new THREE.PointLight(0x38bdf8, 2.5, 300);
    this.beaconLight.position.set(-270, 138, -320);
    this.airportGroup.add(this.beaconLight);

    // 격납고 (Hangar)
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(130, 32, 100),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 })
    );
    hangar.position.set(-260, 16, 280);
    hangar.castShadow = true;
    this.airportGroup.add(hangar);
    this.registerObstacle(hangar, '항공기 정비 격납고');

    // 지상 서비스 차량 (GSE Vehicles - 토잉카 & 연료 트럭)
    this.initAirportGSE();

    this.scene.add(this.airportGroup);

    // --------------------------------------------------------------
    // 목적지 공항 (Airport 2 - 4500m 전방)
    // --------------------------------------------------------------
    this.destAirportGroup = this.airportGroup.clone();
    this.destAirportGroup.position.set(0, 0, -4500);
    this.scene.add(this.destAirportGroup);

    // 목적지 건물 충돌체 등록
    this.destAirportGroup.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'BoxGeometry' && child.position.x < -150) {
        this.registerObstacle(child, '목적지 공항 시설물', new THREE.Vector3(0, 0, -4500));
      }
    });
  }

  // 지상 서비스 차량 (Pushback Tug & Fuel Truck)
  initAirportGSE() {
    const tugMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // 토잉 트랙터
    const tug = new THREE.Group();
    const tugBody = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 14), tugMat);
    tugBody.position.y = 2.2;
    tugBody.castShadow = true;
    tug.add(tugBody);

    const tugCab = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 5), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    tugCab.position.set(0, 4.8, 3.5);
    tug.add(tugCab);

    [-3.6, 3.6].forEach(x => {
      [-4.5, 4.5].forEach(z => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.2, 14), wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 1.6, z);
        tug.add(w);
      });
    });

    tug.position.set(-130, 0, 45);
    this.airportGroup.add(tug);
  }

  registerObstacle(mesh, name, offset = new THREE.Vector3(0, 0, 0)) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.translate(offset);
    this.obstacles.push({ box, name, mesh });
  }

  // ----------------------------------------------------------------
  // 5. 고해상도 3D 제트 여객기 (DC-10 & MD-80) & 가동 조종면
  // ----------------------------------------------------------------
  buildAircraft(type) {
    if (this.planeGroup) {
      this.scene.remove(this.planeGroup);
    }

    this.planeGroup = new THREE.Group();
    this.landingGears = [];
    this.wheels = [];
    this.engineExhaustPoints = [];
    this.debrisPieces = [];
    this.isNoseDented = false;
    this.isGearCollapsed = false;

    // 조종면 초기화
    this.controlSurfaces = {
      leftAileron: null,
      rightAileron: null,
      leftElevator: null,
      rightElevator: null,
      rudder: null,
      noseWheelGroup: null
    };

    // 프리미엄 항공사 PBR 재질
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.22
    });
    const cheatlineMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.35
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.7
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.3
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.12
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x091428,
      roughness: 0.1,
      metalness: 0.95,
      transparent: true,
      opacity: 0.9
    });
    const cabinWindowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });

    // 랜딩기어 생성 헬퍼
    const makeGear = (x, y, z, isNose = false) => {
      const gearGroup = new THREE.Group();
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.4, 12), chromeMat);
      strut.position.set(0, -1.7, 0);
      strut.castShadow = true;
      gearGroup.add(strut);

      const axleGroup = new THREE.Group();
      axleGroup.position.set(0, -3.2, 0);

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.0, 10), chromeMat);
      axle.rotation.z = Math.PI / 2;
      axleGroup.add(axle);

      [-0.85, 0.85].forEach(wheelX => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.55, 18), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wheelX, 0, 0);
        wheel.castShadow = true;
        axleGroup.add(wheel);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.58, 14), chromeMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(wheelX, 0, 0);
        axleGroup.add(hub);

        this.wheels.push(wheel);
      });

      gearGroup.add(axleGroup);
      gearGroup.position.set(x, y, z);
      this.planeGroup.add(gearGroup);

      if (isNose) {
        this.controlSurfaces.noseWheelGroup = axleGroup;
      }
      this.landingGears.push(gearGroup);
    };

    if (type === 'dc10') {
      // ------------------------------------------------------------
      // [DC-10 삼발기] 와이드바디 점보 여객기
      // ------------------------------------------------------------
      // 1. 유선형 원통 동체 (Fuselage)
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 30, 32), fuselageMat);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      this.planeGroup.add(fuselage);
      this.fuselageMesh = fuselage;

      // 노즈 콘 (찌그러짐 변형 가능)
      const nose = new THREE.Mesh(new THREE.SphereGeometry(2.9, 24, 20, 0, Math.PI * 2, 0, Math.PI / 2), fuselageMat);
      nose.rotation.x = -Math.PI / 2;
      nose.position.set(0, 0, -15);
      nose.scale.set(1, 1, 1.45);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (Cockpit Glass with Pillars)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.15, 2.4), glassMat);
      windshield.position.set(0, 1.85, -14.2);
      windshield.rotation.x = 0.38;
      this.planeGroup.add(windshield);

      // 객실 창문 열 (Rows of Illuminated Cabin Windows)
      for (let side of [-1, 1]) {
        for (let w = -11; w <= 11; w += 1.1) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.65), cabinWindowMat);
          win.position.set(side * 2.91, 0.6, w);
          win.rotation.y = side * Math.PI / 2;
          this.planeGroup.add(win);
        }
      }

      // 치트라인 (Blue Cheatline with Gold Accent)
      const cheatline = new THREE.Mesh(
        new THREE.CylinderGeometry(2.92, 2.92, 26, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
        cheatlineMat
      );
      cheatline.rotation.x = Math.PI / 2;
      cheatline.position.set(0, 0, -1);
      this.planeGroup.add(cheatline);

      // 2. 후퇴익 주익 & 가동 에일러론 (Swept Wings & Movable Ailerons)
      const mainWingsGroup = new THREE.Group();

      const makeWingSection = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // 주익 본체 (Swept Tapered Wing)
        const mainW = new THREE.Mesh(new THREE.BoxGeometry(16, 0.45, 4.8), wingMat);
        mainW.position.set(sign * 9.5, 0, 0);
        mainW.rotation.y = -sign * 0.36;
        mainW.rotation.z = sign * 0.06; // 상반각 (Dihedral)
        mainW.castShadow = true;
        wing.add(mainW);

        // 크롬 전연 슬랫 (Chrome Leading Edge)
        const slat = new THREE.Mesh(new THREE.BoxGeometry(16, 0.48, 0.6), chromeMat);
        slat.position.set(sign * 9.5, 0, -2.4);
        slat.rotation.y = -sign * 0.36;
        slat.rotation.z = sign * 0.06;
        wing.add(slat);

        // 윙렛 (Wingtip Fence) & 항행등 (Nav Light)
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 1.8), cheatlineMat);
        winglet.position.set(sign * 17.5, 1.1, sign * -1.8);
        winglet.rotation.y = -sign * 0.36;
        wing.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 }) // 좌현 적색 / 우현 녹색
        );
        navLight.position.set(sign * 17.6, 0.2, sign * -1.6);
        wing.add(navLight);

        // ★ 가동 에일러론 (Movable Aileron on Trailing Edge)
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 13.5, 0, sign * 1.5 + 2.2);

        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.28, 1.4), wingMat);
        aileronMesh.position.set(0, 0, 0.7);
        aileronMesh.rotation.y = -sign * 0.36;
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeWingSection(true));
      mainWingsGroup.add(makeWingSection(false));
      mainWingsGroup.position.set(0, -0.6, -1);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. 3개 대형 제트 엔진 (Wing Engines #1, #3 & Fin Engine #2)
      const makeEngine = (x, y, z, isCenter = false) => {
        const eng = new THREE.Group();
        const r = isCenter ? 1.6 : 1.45;

        // 나셀 카울
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, 5.6, 24), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        // 크롬 흡입구 림
        const inletLip = new THREE.Mesh(new THREE.TorusGeometry(r - 0.05, 0.18, 12, 24), chromeMat);
        inletLip.position.set(0, 0, -2.8);
        eng.add(inletLip);

        // 엔진 흡입구 내부 (Dark Turbofan Intake Disk & Central Bullet Cone)
        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(r - 0.15, r - 0.15, 0.25, 24),
          new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.4);
        eng.add(intakeDisk);

        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.9, 16), chromeMat);
        spinner.rotation.x = -Math.PI / 2;
        spinner.position.set(0, 0, -2.35);
        eng.add(spinner);

        // 배기 노즐 콘
        const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 14), chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0, 0, 3.2);
        eng.add(exhaust);

        eng.position.set(x, y, z);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, y, z + 3.8));
      };

      makeEngine(-8.8, -2.4, 0);       // #1 Left Wing Engine
      makeEngine(8.8, -2.4, 0);        // #3 Right Wing Engine
      makeEngine(0, 4.8, 13.5, true);  // #2 Tail Fin Engine (DC-10 독점 삼발기 디자인!)

      // 4. 수직 꼬리날개 & 가동 방향타 (Vertical Fin & Movable Rudder)
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.8, 5.2), fuselageMat);
      finMesh.position.set(0, 8.8, 14.5);
      finMesh.rotation.x = -0.32;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      // ★ 가동 방향타 (Movable Rudder)
      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 8.8, 17.0);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.2, 1.8), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.9);
      rudderMesh.rotation.x = -0.32;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 5. 수평 안정판 & 가동 승강타 (Horizontal Stabilizer & Movable Elevators)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 1.5, 16.5);

      const hStabMesh = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.38, 3.8), wingMat);
      hStabMesh.rotation.y = -0.28;
      hStabGroup.add(hStabMesh);

      // ★ 가동 승강타 (Movable Elevators)
      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.8);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.28, 1.4), wingMat);
      elevMesh.position.set(0, 0, 0.7);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // 랜딩기어 (활주로 Y=2.12에 바퀴 접지: y=-0.6)
      makeGear(0, -0.6, -11.5, true);
      makeGear(-4.9, -0.6, 1.8);
      makeGear(4.9, -0.6, 1.8);

    } else {
      // ------------------------------------------------------------
      // [MD-80 후방 쌍발기] 날렵한 롱바디 협동체 & T-Tail
      // ------------------------------------------------------------
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 34, 30), fuselageMat);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      this.planeGroup.add(fuselage);
      this.fuselageMesh = fuselage;

      const nose = new THREE.Mesh(new THREE.ConeGeometry(2.1, 8.5, 24), fuselageMat);
      nose.rotation.x = -Math.PI / 2;
      nose.position.set(0, -0.1, -21.2);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 2.0), glassMat);
      windshield.position.set(0, 1.35, -16.8);
      windshield.rotation.x = 0.42;
      this.planeGroup.add(windshield);

      // 객실 창문 열
      for (let side of [-1, 1]) {
        for (let w = -13; w <= 12; w += 1.0) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.58), cabinWindowMat);
          win.position.set(side * 2.11, 0.45, w);
          win.rotation.y = side * Math.PI / 2;
          this.planeGroup.add(win);
        }
      }

      // 주익 & 에일러론
      const mainWingsGroup = new THREE.Group();
      [-1, 1].forEach(sign => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(15, 0.38, 4.2), wingMat);
        wing.position.set(sign * 8.8, -0.4, 0);
        wing.rotation.y = -sign * 0.32;
        wing.rotation.z = sign * 0.05;
        wing.castShadow = true;
        mainWingsGroup.add(wing);

        // 윙렛 & 항행등
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 1.4), cheatlineMat);
        winglet.position.set(sign * 16.2, 0.8, sign * -1.4);
        mainWingsGroup.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 16.3, 0.2, sign * -1.2);
        mainWingsGroup.add(navLight);

        // 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 12.5, -0.4, sign * 1.2 + 2.0);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.24, 1.2), wingMat);
        aileronMesh.position.set(0, 0, 0.6);
        aileronMesh.rotation.y = -sign * 0.32;
        aileronPivot.add(aileronMesh);
        mainWingsGroup.add(aileronPivot);

        if (sign < 0) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;
      });
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 후방 동체 좌우 2기 제트 엔진
      [-3.3, 3.3].forEach(x => {
        const eng = new THREE.Group();
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.98, 5.8, 20), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.15, 10, 20), chromeMat);
        lip.position.set(0, 0, -2.9);
        eng.add(lip);

        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 0.95, 0.2, 20),
          new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.6);
        eng.add(intakeDisk);

        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 12), chromeMat);
        spinner.rotation.x = -Math.PI / 2;
        spinner.position.set(0, 0, -2.55);
        eng.add(spinner);

        eng.position.set(x, 0.5, 12.0);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, 0.5, 15.2));
      });

      // T-Tail 수직 꼬리날개 & 러더
      const finGroup = new THREE.Group();
      const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 8.4, 4.4), fuselageMat);
      vFin.position.set(0, 5.2, 17.0);
      vFin.rotation.x = -0.34;
      finGroup.add(vFin);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 5.2, 19.2);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 1.6), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.8);
      rudderMesh.rotation.x = -0.34;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // T-Tail 상단 수평 안정판 & 승강타
      const tTailGroup = new THREE.Group();
      tTailGroup.position.set(0, 9.2, 18.2);
      const tTail = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.36, 3.2), wingMat);
      tTailGroup.add(tTail);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.6);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.25, 1.2), wingMat);
      elevMesh.position.set(0, 0, 0.6);
      elevatorPivot.add(elevMesh);
      tTailGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(tTailGroup);

      // 랜딩기어 (활주로 Y=2.12에 바퀴 접지: y=-0.6)
      makeGear(0, -0.6, -14.2, true);
      makeGear(-4.1, -0.6, 1.5);
      makeGear(4.1, -0.6, 1.5);
    }

    // 기본 위치 (초기엔 활주로 36L 정렬)
    this.planeGroup.position.set(120, this.groundY, 800);
    this.planeGroup.rotation.set(0, 0, 0);
    this.scene.add(this.planeGroup);
  }

  // ----------------------------------------------------------------
  // 6. 사운드 시스템 (합성 Web Audio)
  // ----------------------------------------------------------------
  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  startJetSound() {
    if (!this.audioCtx || !this.soundEnabled || this.jetNoiseSrc) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    // 1. 고품질 제트 기류 & 연소 노이즈 (Pink Noise + Lowpass Filter) - 실제 제트 엔진의 핵심 "슈우우/로오오"
    const bufferSize = Math.floor(this.audioCtx.sampleRate * 2.0);
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    const noiseSrc = this.audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(320, this.audioCtx.currentTime);
    noiseFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    noiseSrc.start();
    this.jetNoiseSrc = noiseSrc;
    this.jetNoiseFilter = noiseFilter;
    this.jetNoiseGain = noiseGain;

    // 2. 묵직하고 깊은 터빈 회전 코어 중저음 (Sawtooth 대신 부드러운 Triangle 파형)
    this.jetRumble = this.audioCtx.createOscillator();
    this.jetRumble.type = 'triangle';
    this.jetRumble.frequency.setValueAtTime(56, this.audioCtx.currentTime);

    const rumbleFilter = this.audioCtx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(160, this.audioCtx.currentTime);

    const rumbleGain = this.audioCtx.createGain();
    rumbleGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);

    this.jetRumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.audioCtx.destination);
    this.jetRumble.start();
    this.rumbleGainNode = rumbleGain;

    // 3. 은은한 터보팬 스풀링 고음 (자극적인 삐- 소리를 없애고 미세한 회전음만 전달)
    this.turbineWhine = this.audioCtx.createOscillator();
    this.turbineWhine.type = 'sine';
    this.turbineWhine.frequency.setValueAtTime(260, this.audioCtx.currentTime);

    const turbineGain = this.audioCtx.createGain();
    turbineGain.gain.setValueAtTime(0.012, this.audioCtx.currentTime); // 매우 은은하게
    this.turbineWhine.connect(turbineGain);
    turbineGain.connect(this.audioCtx.destination);
    this.turbineWhine.start();
    this.turbineGainNode = turbineGain;
  }

  stopJetSound() {
    if (this.jetNoiseSrc) {
      try { this.jetNoiseSrc.stop(); } catch (e) {}
      this.jetNoiseSrc = null;
    }
    if (this.jetRumble) {
      try { this.jetRumble.stop(); } catch (e) {}
      this.jetRumble = null;
    }
    if (this.turbineWhine) {
      try { this.turbineWhine.stop(); } catch (e) {}
      this.turbineWhine = null;
    }
  }

  playMetalCrunchSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.41);
  }

  playExplosionSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    // 저주파 서브베이스 굉음
    const sub = this.audioCtx.createOscillator();
    const subGain = this.audioCtx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(140, this.audioCtx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(20, this.audioCtx.currentTime + 1.8);
    subGain.gain.setValueAtTime(0.7, this.audioCtx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.8);
    sub.connect(subGain);
    subGain.connect(this.audioCtx.destination);
    sub.start();
    sub.stop(this.audioCtx.currentTime + 1.85);
  }

  playGearSnapSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.45, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.31);
  }

  playTouchdownScreech() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1150, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, this.audioCtx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.36);
  }

  // 실제 조종석 GPWS 음성 경보 (Speech Synthesis)
  speakGPWS(phrase) {
    if (!this.soundEnabled) return;
    const now = Date.now();
    if (this.lastSpokenPhrase === phrase && now - this.lastSpokenTime < 1600) return;
    this.lastSpokenPhrase = phrase;
    this.lastSpokenTime = now;

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(phrase);
        u.lang = 'en-US';
        u.rate = 1.05;
        u.pitch = 0.95;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      // 브라우저 음성 미지원 시 무시
    }
  }

  // GPWS "Whoop Whoop" 사이렌 사운드 (420Hz -> 840Hz FM Sweep)
  playGPWSWhoopSiren() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const now = Date.now();
    if (now - this.lastWhoopTime < 1400) return;
    this.lastWhoopTime = now;

    if (!this.gpwsSirenGain) {
      this.gpwsSirenGain = this.audioCtx.createGain();
      this.gpwsSirenGain.connect(this.audioCtx.destination);
    }
    this.gpwsSirenGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

    for (let w = 0; w < 2; w++) {
      const startTime = this.audioCtx.currentTime + w * 0.28;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, startTime);
      osc.frequency.exponentialRampToValueAtTime(840, startTime + 0.18);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.gpwsSirenGain);
      osc.start(startTime);
      osc.stop(startTime + 0.24);
    }
  }

  stopGPWSSiren() {
    if (this.gpwsSirenGain && this.audioCtx) {
      try {
        this.gpwsSirenGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      } catch (e) {}
    }
  }

  // 주의 차임벨 (Caution High-Low Chime)
  playCautionChime() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const now = Date.now();
    if (now - this.lastChimeTime < 1800) return;
    this.lastChimeTime = now;

    [750, 560].forEach((freq, idx) => {
      const t = this.audioCtx.currentTime + idx * 0.16;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // 스틱 셰이커 & 실속 딸깍음 (Stick Shaker Stall Clacker)
  playStickShakerSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const now = Date.now();
    if (now - this.lastStickShakerTime < 220) return;
    this.lastStickShakerTime = now;

    for (let i = 0; i < 4; i++) {
      const t = this.audioCtx.currentTime + i * 0.04;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140 + Math.random() * 40, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    }
  }

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
  }

  // 2. 랜딩 기어 파손 & 동체 착륙 (거친 착륙 접지 시)
  collapseLandingGears() {
    if (this.isGearCollapsed) return;
    this.isGearCollapsed = true;
    this.hullIntegrity = Math.max(20, this.hullIntegrity - 45);
    this.playGearSnapSound();

    this.landingGears.forEach((gear, idx) => {
      gear.rotation.x = Math.PI / 2.3;
      gear.rotation.z = idx % 2 === 0 ? 0.45 : -0.45;
      gear.position.y += 1.3;
    });

    this.groundY = 5.02; // 동체 접지 고도 (동체 하단 Y=-2.9, 활주로 표면 Y=2.12)
    this.isBellySliding = true;
    this.showPopup('⚠️ 랜딩 기어 파손! 동체 활주(Belly Landing) 중입니다!');
  }

  // 3. 다단계 대폭발 & 기체 파쇄 분해 (Catastrophic Explosion Breakup)
  triggerExplosion(cause = '추락 폭발') {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isPlaying = false;
    this.clearGPWS();
    this.stopJetSound();
    this.isStalling = false;
    this.hullIntegrity = 0;
    this.speed = 0;
    this.screenShake = 1.8; // 강한 카메라 흔들림
    this.playExplosionSound();

    // 기체 본체는 숨기고 파쇄된 개별 잔해 파츠 생성
    this.planeGroup.visible = false;
    this.spawnAirframeDebris(this.planeGroup.position, this.planeGroup.rotation);

    // 거대한 다단계 화염구 & 충격파 & 짙은 연기 기둥 분출
    this.createMassiveExplosion(this.planeGroup.position);
    this.showPopup(`🔥 ${cause}! 기체가 완전히 산산조각 났습니다.`);

    setTimeout(() => {
      document.getElementById('modal-title').textContent = '💥 FLIGHT TERMINATED';
      document.getElementById('modal-desc').innerHTML = `
        <span style="color:#ef4444; font-weight:800; font-size:16px;">${cause}</span><br>
        강한 충격으로 인해 기체가 산산조각 분해되며 폭발했습니다.<br>
        다음 비행에서는 안전한 착륙 속도와 이륙 각도를 유지해 보세요!
      `;
      this.startBtn.textContent = '게이트에서 다시 시작 🔄';
      this.takeoffDirectBtn.textContent = '활주로에서 즉시 이륙하기 🛫';
      this.overlay.classList.remove('hidden');
    }, 2800);
  }

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
  }

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
  }

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
  }

  createBellySparks() {
    if (!this.isBellySliding || this.speed < 0.2) return;
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const pGeo = new THREE.BoxGeometry(0.4, 0.4, 0.8);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(this.planeGroup.position);
      p.position.y = 0.5;
      p.velocity = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2);
      p.life = 0.35;
      this.particles.push(p);
      this.scene.add(p);
    }
  }

  createJetExhaustParticles() {
    if (!this.isPlaying || this.throttle < 0.1 || this.isDestroyed) return;
    const isFull = this.throttle > 0.8;
    const pMat = new THREE.MeshBasicMaterial({
      color: isFull ? 0xf97316 : 0xe2e8f0,
      transparent: true,
      opacity: isFull ? 0.8 : 0.35
    });
    const pGeo = new THREE.BoxGeometry(0.8, 0.8, 1.8);

    this.engineExhaustPoints.forEach(pt => {
      const p = new THREE.Mesh(pGeo, pMat);
      const worldPos = pt.clone().applyEuler(this.planeGroup.rotation).add(this.planeGroup.position);
      p.position.copy(worldPos);

      const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeGroup.quaternion);
      p.velocity = backward.multiplyScalar(this.speed * 0.7);
      p.life = isFull ? 0.6 : 0.3;
      this.particles.push(p);
      this.scene.add(p);
    });
  }

  toggleLandingGear() {
    if (this.isGearCollapsed) {
      this.showPopup('❌ 랜딩 기어가 파손되어 작동하지 않습니다!');
      return;
    }
    this.gearExtended = !this.gearExtended;
    document.getElementById('gear-text').textContent = this.gearExtended ? '기어 DOWN' : '기어 UP';
    this.landingGears.forEach(gear => {
      gear.visible = this.gearExtended;
    });
    this.showPopup(this.gearExtended ? '🛞 랜딩 기어 전개 (Gear Down)' : '✈️ 랜딩 기어 수납 (Gear Up)');
  }

  switchAircraft(type) {
    if (this.currentPlaneType === type) return;
    this.currentPlaneType = type;
    this.groundY = 6.84;
    this.buildAircraft(type);

    const nameText = type === 'dc10' ? 'DC-10 삼발기' : 'MD-80 쌍발기';
    document.getElementById('plane-name-text').textContent = nameText;
    this.showPopup(`✈ 기종 변경: ${nameText}`);

    document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(type === 'dc10' ? 'select-dc10' : 'select-md80');
    if (activeBtn) activeBtn.classList.add('active');
  }

  // ----------------------------------------------------------------
  // 8. UI 초기화 & 시작 모드 바인딩 (활주로 즉시 이륙 vs 게이트 탑승)
  // ----------------------------------------------------------------
  initUI() {
    this.scoreDisplay = document.getElementById('score-display');
    this.phaseDisplay = document.getElementById('flight-phase-display');
    this.paxDisplay = document.getElementById('pax-display');
    this.timeDisplay = document.getElementById('time-display');
    this.speedBar = document.getElementById('speed-bar');
    this.speedVal = document.getElementById('speed-val');
    this.altBar = document.getElementById('alt-bar');
    this.altVal = document.getElementById('alt-val');
    this.boostBar = document.getElementById('boost-bar');
    this.boostVal = document.getElementById('boost-val');
    this.hullBar = document.getElementById('hull-bar');
    this.hullVal = document.getElementById('hull-val');
    this.popupMsg = document.getElementById('popup-msg');
    this.overlay = document.getElementById('overlay-screen');

    // 자세계(인공수평의), VSI, 실속 뱃지, GPWS 배너 바인딩
    this.attitudeHorizon = document.getElementById('attitude-horizon');
    this.speedBadge = document.getElementById('speed-status-badge');
    this.vsiVal = document.getElementById('vsi-val');
    this.gpwsBanner = document.getElementById('gpws-banner');
    this.gpwsText = document.getElementById('gpws-text');
    this.gpwsSubtext = document.getElementById('gpws-subtext');
    this.gpwsIcon = document.getElementById('gpws-icon');

    this.startBtn = document.getElementById('start-btn');
    this.takeoffDirectBtn = document.getElementById('takeoff-direct-btn');
    this.gearBtn = document.getElementById('gear-btn');
    this.camToggleBtn = document.getElementById('cam-toggle-btn');
    this.camModeText = document.getElementById('cam-mode-text');
    this.soundBtn = document.getElementById('sound-btn');
    this.planeToggleBtn = document.getElementById('plane-toggle-btn');
    this.targetArrow = document.querySelector('.target-indicator .arrow');
    this.targetDist = document.getElementById('target-dist');

    this.gearBtn.addEventListener('click', () => { this.toggleLandingGear(); });
    document.getElementById('select-dc10').addEventListener('click', () => { this.switchAircraft('dc10'); });
    document.getElementById('select-md80').addEventListener('click', () => { this.switchAircraft('md80'); });
    this.planeToggleBtn.addEventListener('click', () => {
      this.switchAircraft(this.currentPlaneType === 'dc10' ? 'md80' : 'dc10');
    });

    // 1. 활주로 즉시 이륙 모드 (추천)
    if (this.takeoffDirectBtn) {
      this.takeoffDirectBtn.addEventListener('click', () => {
        this.startDirectTakeoff();
      });
    }

    // 2. 게이트 출발 모드
    this.startBtn.addEventListener('click', () => {
      this.startGateDeparture();
    });

    this.camToggleBtn.addEventListener('click', () => { this.toggleCamera(); });
    this.soundBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
    });

    document.getElementById('help-btn').addEventListener('click', () => {
      this.overlay.classList.remove('hidden');
    });
  }

  // 모드 1: 활주로 즉시 이륙 (Direct Runway Takeoff)
  startDirectTakeoff() {
    this.overlay.classList.add('hidden');
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    this.hullIntegrity = 100;
    this.groundY = 6.84;
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();
    this.flightPhase = 'TAKEOFF_RUN';
    this.phaseDisplay.textContent = '활주로 이륙 활주 (Takeoff)';

    this.buildAircraft(this.currentPlaneType);
    this.planeGroup.position.set(120, this.groundY, 800);
    this.planeGroup.rotation.set(0, 0, 0); // 활주로 북쪽(Z = -1)을 향해 정렬

    // 즉시 출력을 80%로 올려 가속
    this.throttle = 0.85;
    this.showPopup('🛫 활주로 정렬 완료! 속도 200km/h 도달 시 ↓ 아래 화살표를 눌러 기수를 띄우세요!');
    this.startJetSound();
  }

  // 모드 2: 게이트 탑승 & 유도로 주행 (Full Gate Departure)
  startGateDeparture() {
    this.overlay.classList.add('hidden');
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    this.hullIntegrity = 100;
    this.groundY = 6.84;
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();
    this.flightPhase = 'TAXI_OUT';
    this.phaseDisplay.textContent = '유도로 주행 (Taxiway)';

    this.buildAircraft(this.currentPlaneType);
    this.planeGroup.position.set(-135, this.groundY, 0);
    this.planeGroup.rotation.set(0, Math.PI / 2, 0);

    this.throttle = 0.2;
    this.showPopup('📢 승객 285명 탑승 완료! 0~9 키로 출력을 올려 유도로(황색선)로 이동하세요.');
    this.startJetSound();
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === '3rd' ? '1st' : '3rd';
    this.camModeText.textContent = this.cameraMode === '3rd' ? '3인칭' : '1인칭';
    this.showPopup(this.cameraMode === '3rd' ? '3인칭 후방 시점' : '1인칭 조종석 시점');
  }

  showPopup(text) {
    this.popupMsg.textContent = text;
    this.popupMsg.classList.add('show');
    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => {
      this.popupMsg.classList.remove('show');
    }, 1800);
  }

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
        case 'KeyC':
          this.toggleCamera();
          break;
        case 'KeyP':
          this.planeToggleBtn.click();
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
  }

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
  }

  // ----------------------------------------------------------------
  // 10. 메인 루프 & 공기역학 물리 (이륙 버그 완전 해결)
  // ----------------------------------------------------------------
  animate(now) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.isPlaying && !this.isDestroyed) {
      this.updateFlightPhysics(dt);
      this.updateControlSurfaces(dt);
      this.checkObstacleCollisions();
      this.updateHUD();
      this.updateParticles(dt);
      this.createJetExhaustParticles();
      this.createBellySparks();
    } else {
      this.updateDebrisPhysics(dt);
      this.updateParticles(dt);
    }

    // 지상 주행 시 바퀴 회전 애니메이션
    if (this.isOnGround && Math.abs(this.speed) > 0.01 && this.wheels.length > 0) {
      const rollDelta = this.speed * 0.45;
      this.wheels.forEach(w => {
        w.rotation.x += rollDelta;
      });
    }

    // 관제탑 비콘 라이트 점멸
    if (this.beaconLight) {
      this.beaconLight.intensity = 1.0 + Math.sin(Date.now() * 0.008) * 1.5;
    }

    // PAPI 라이트 각도 가이던스 (활주로 고도에 따른 색상 변화)
    if (this.papiLights.length > 0 && this.planeGroup) {
      const alt = this.planeGroup.position.y;
      this.papiLights.forEach((lamp, idx) => {
        // 이상적인 3도 글라이드 슬로프 기준 램프 색상 변환 (백색: 높음, 적색: 낮음)
        if (alt > 40 + idx * 15) {
          lamp.color.setHex(0xffffff); // 화이트
        } else {
          lamp.color.setHex(0xef4444); // 레드
        }
      });
    }

    // 화면 흔들림 감쇠
    if (this.screenShake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShake;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.92;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // 가동 조종면 실시간 애니메이션 (에일러론, 엘리베이터, 러더, 노즈 휠)
  updateControlSurfaces(dt) {
    let rollInput = 0;
    if (this.keys.left) rollInput -= 1;
    if (this.keys.right) rollInput += 1;
    rollInput += this.joystickData.x;

    let pitchInput = 0;
    if (this.keys.up) pitchInput -= 1;   // 하강
    if (this.keys.down) pitchInput += 1; // 상승
    pitchInput += this.joystickData.y;

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

    // 3. 러더 & 노즈 휠: 방향 조향
    const targetRudder = -rollInput * 0.42;
    if (this.controlSurfaces.rudder) {
      this.controlSurfaces.rudder.rotation.y = THREE.MathUtils.lerp(
        this.controlSurfaces.rudder.rotation.y,
        targetRudder,
        0.18
      );
    }
    if (this.controlSurfaces.noseWheelGroup && this.isOnGround) {
      this.controlSurfaces.noseWheelGroup.rotation.y = THREE.MathUtils.lerp(
        this.controlSurfaces.noseWheelGroup.rotation.y,
        -rollInput * 0.45,
        0.2
      );
    }
  }

  updateFlightPhysics(dt) {
    const currentY = this.planeGroup.position.y;
    this.verticalSpeed = (currentY - this.prevY) / Math.max(0.001, dt);
    this.prevY = currentY;

    if (this.keys.fastForward) {
      this.throttle = Math.min(1.0, this.throttle + 0.02);
    }
    if (this.keys.brake) {
      this.throttle = Math.max(0.0, this.throttle - 0.03);
    }

    const currentKmh = this.speed * 280;

    // --------------------------------------------------------------
    // 1. 지상(Ground) 활주 물리
    // --------------------------------------------------------------
    if (this.isOnGround) {
      let targetSpeed = this.throttle * 3.0;
      if (this.keys.brake || this.isBellySliding) {
        targetSpeed *= 0.35;
      }
      this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, 0.05);

      // A/D 키 노즈 휠 조향
      let steerInput = 0;
      if (this.keys.left) steerInput -= 1;
      if (this.keys.right) steerInput += 1;
      steerInput += this.joystickData.x;

      this.planeGroup.rotateY(-steerInput * 0.022);

      // 전진 이동
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      this.planeGroup.position.addScaledVector(forward, this.speed * 1.8);
      this.planeGroup.position.y = this.groundY;

      // 지상 자세 (수평 정렬)
      this.planeGroup.rotation.x = 0;
      this.planeGroup.rotation.z = 0;

      // ★ 이륙 로테이션 (Takeoff Rotation): 180 km/h 이상 & 아래 화살표(↓) 입력 시 부드럽게 상승!
      const pullUpInput = this.keys.down || (this.joystickData.y > 0.3);

      if (currentKmh >= 180 && pullUpInput && !this.isGearCollapsed) {
        this.isOnGround = false;
        this.flightPhase = 'CLIMB_CRUISE';
        this.phaseDisplay.textContent = '상승 및 순항 비행';
        this.showPopup('🛫 Rotate! 비행기가 하늘로 떠올랐습니다. G 키를 눌러 기어를 접으세요!');
        this.score += 500;

        // 양력으로 기수를 띄우고 즉시 고도 상승 부여
        this.planeGroup.rotateX(0.08); // 기수 상승
        this.planeGroup.position.y += 1.5; // 지면 즉시 이탈
      }

    } else {
      // --------------------------------------------------------------
      // 2. 공중 비행(In-Flight) 항공역학 & 실속(Stall) 물리
      // --------------------------------------------------------------
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);

      // 상승 시 중력 감속(Climb Drag), 하강 시 중력 가속(Dive Gravity)
      let targetAirSpeed = THREE.MathUtils.clamp(0.42 + this.throttle * 2.8, 0.22, 3.5);
      if (forward.y > 0.08) {
        targetAirSpeed -= forward.y * 1.15; // 기수가 높을수록 속도 급감
      } else if (forward.y < -0.08) {
        targetAirSpeed += (-forward.y) * 0.95; // 기수가 낮을수록 중력 가속
      }

      this.speed = THREE.MathUtils.lerp(this.speed, targetAirSpeed, 0.038);
      const currentKmh = this.speed * 280;

      // 쿼터니언 기반 로컬 축 벡터 추출
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
      const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1); // < 0 이면 우측 경사, > 0 이면 좌측 경사
      const bankAngle = Math.abs(Math.asin(bankTilt));
      const effectiveVStall = (160 / Math.sqrt(Math.max(0.28, Math.cos(bankAngle)))) + (this.gearExtended ? 12 : 0);

      let pitchInput = 0;
      let rollInput = 0;

      if (this.keys.up) pitchInput -= 1;   // ↑ 위 화살표: 기수 하강 (Pitch Down)
      if (this.keys.down) pitchInput += 1; // ↓ 아래 화살표: 기수 상승 (Pitch Up)
      if (this.keys.left) rollInput -= 1;  // A: 좌측 롤
      if (this.keys.right) rollInput += 1; // D: 우측 롤

      pitchInput += this.joystickData.y;
      rollInput += this.joystickData.x;

      // ★ 현실적인 실속(Stall) 판정 & 물리 반응
      if (currentKmh < effectiveVStall || forward.y > 0.65) {
        this.isStalling = true;
        this.stallSeverity = Math.min(1.0, Math.max(0.2, (effectiveVStall - currentKmh) / 35.0 + Math.max(0, forward.y - 0.45)));

        // 1. 기체 버핏팅 (Airframe Shudder / Buffeting 진동)
        const buffetX = (Math.random() - 0.5) * 0.038 * this.stallSeverity;
        const buffetZ = (Math.random() - 0.5) * 0.048 * this.stallSeverity;
        this.planeGroup.rotateX(buffetX);
        this.planeGroup.rotateZ(buffetZ);
        this.screenShake = Math.max(this.screenShake, 0.38 * this.stallSeverity);

        // 2. 실속 시 공기역학적 기수 급강하 경향 (Nose Drop)
        this.planeGroup.rotateX(-0.016 * this.stallSeverity);

        // 3. 양력 붕괴로 인한 고도 침하 (Altitude Loss)
        this.planeGroup.position.y -= (7.5 * this.stallSeverity) * dt;

        // 4. 조종면 반응 둔화 (Mushy Controls: 공기 박리로 72% 무력화)
        pitchInput *= 0.28;
        rollInput *= 0.28;

        this.playStickShakerSound();
      } else {
        this.isStalling = false;
        this.stallSeverity = 0.0;
      }

      // 1. 피치 조종 (아래 화살표를 누르면 기수가 위로 들려 상승!)
      this.planeGroup.rotateX(pitchInput * 0.026);

      // 2. 롤 뱅크 조종 (D/우측 화살표: 우측 날개 내림, A/좌측 화살표: 좌측 날개 내림)
      // 최대 뱅크각(약 55도, bankTilt ~ 0.82) 제한으로 기체 뒤집힘 방지 및 안정성 확보
      const maxBankTilt = 0.82;
      if ((rollInput > 0 && bankTilt > -maxBankTilt) || (rollInput < 0 && bankTilt < maxBankTilt)) {
        this.planeGroup.rotateZ(-rollInput * 0.038);
      }

      // 3. 조종 키 중립 시 자연스러운 수평 복원 (Dihedral Roll Damping)
      if (rollInput === 0 && Math.abs(bankTilt) > 0.015) {
        this.planeGroup.rotateZ(-bankTilt * 0.014);
      }

      // 4. ★ 정밀 협조 선회 (Coordinated Turn & Rudder Yaw):
      // 비행기가 우측으로 기울면 정확히 우측으로 선회하고, 좌측으로 기울면 좌측으로 선회!
      // bankTilt < 0 (우측 기울임) -> rotateY 음수 (Three.js 우회전)
      // bankTilt > 0 (좌측 기울임) -> rotateY 양수 (Three.js 좌회전)
      const aerodynamicTurn = bankTilt * 0.026;
      const rudderYaw = -rollInput * 0.016; // 키 입력에 의한 즉각 러더 요
      this.planeGroup.rotateY(aerodynamicTurn + rudderYaw);

      // 5. 회전된 최신 전방 비행 벡터로 이동
      const updatedForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      this.planeGroup.position.addScaledVector(updatedForward, this.speed * 2.5);

      // GPWS 및 경보 시스템 평가
      this.checkGPWS(dt);

      // ------------------------------------------------------------
      // 3. 지면 접지 / 착륙 / 추락 판정 (안전 착륙 검사)
      // ------------------------------------------------------------
      // 지면 접촉 판정: 비행기가 아래로 하강 중일 때만 체크 (이륙 상승 중에는 절대 체크하지 않음!)
      if (this.planeGroup.position.y <= this.groundY + 0.2 && this.verticalSpeed < -0.8) {
        const sinkRate = -this.verticalSpeed; // 강하율 (m/s)

        // 실제 월드 업 벡터를 통해 뒤집힘 확인 (짐벌락 버그 원천 차단)
        const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.planeGroup.quaternion);
        const isUpsideDown = worldUp.y < -0.2;

        // 치명적 추락: 거꾸로 뒤집힌 채 추락하거나 강하율이 15 m/s 초과
        if (sinkRate > 15.0 || (isUpsideDown && currentKmh > 130)) {
          this.triggerExplosion('지면 고속 격돌 추락');
          return;
        }

        // 거친 착륙: 랜딩 기어 부러짐
        if (sinkRate > 6.8 || !this.gearExtended) {
          if (!this.gearExtended) {
            this.showPopup('⚠️ 랜딩 기어 없이 착륙하여 동체로 활주합니다!');
          } else {
            this.collapseLandingGears();
          }

          this.isOnGround = true;
          this.planeGroup.position.y = this.groundY;
          this.clearGPWS(); // 착륙 즉시 PULL UP 및 모든 경보음 완전 해제 & 끄기!

          // 한계 초과 시 폭발
          if (sinkRate > 12.0 || currentKmh > 330) {
            this.triggerExplosion('과도한 착륙 충격으로 인한 기체 파손 폭발');
            return;
          }
        } else {
          // 정상 부드러운 착륙 (Soft Touchdown)
          this.isOnGround = true;
          this.planeGroup.position.y = this.groundY;
          this.clearGPWS(); // 착륙 즉시 PULL UP 및 모든 경보음 완전 해제 & 끄기!
          this.playTouchdownScreech();

          if (this.planeGroup.position.z < -2500) {
            this.flightPhase = 'TAXI_IN';
            this.phaseDisplay.textContent = '목적지 착륙 접지 완료';
            this.showPopup('🛬 부드러운 착륙 성공! 0 키 또는 S 키로 감속하며 게이트로 주행하세요.');
            this.score += 1000;
          }
        }
      }
    }

    // --------------------------------------------------------------
    // 카메라 추적 (부드러운 러프)
    // --------------------------------------------------------------
    if (this.cameraMode === '3rd') {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const camOffset = new THREE.Vector3(0, 9.5, 42.0).applyQuaternion(this.planeGroup.quaternion);
      const targetCamPos = this.planeGroup.position.clone().add(camOffset);
      this.camera.position.lerp(targetCamPos, 0.14);

      const lookTarget = this.planeGroup.position.clone().add(forward.clone().multiplyScalar(40));
      this.camera.lookAt(lookTarget);
    } else {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const cockpitOffset = new THREE.Vector3(0, 2.0, -14.0).applyQuaternion(this.planeGroup.quaternion);
      this.camera.position.copy(this.planeGroup.position).add(cockpitOffset);

      const lookTarget = this.planeGroup.position.clone().add(forward.clone().multiplyScalar(100));
      this.camera.lookAt(lookTarget);
    }

    // 제트 엔진 오디오 파라미터 실시간 부드러운 보간 (스로틀 0~1 연동)
    if (this.audioCtx && this.soundEnabled) {
      const t = this.throttle; // 0.0 ~ 1.0
      const now = this.audioCtx.currentTime;

      // 1. 공기 분사 제트 노이즈 (저속에서는 낮은 웅웅거림, 고속에서는 거대한 굉음)
      if (this.jetNoiseFilter && this.jetNoiseGain) {
        const targetCutoff = 320 + t * 1350; // 320Hz ~ 1670Hz
        const targetNoiseGain = 0.08 + t * 0.22;
        this.jetNoiseFilter.frequency.setTargetAtTime(targetCutoff, now, 0.15);
        this.jetNoiseGain.gain.setTargetAtTime(targetNoiseGain, now, 0.15);
      }

      // 2. 터빈 회전 코어 저음
      if (this.jetRumble) {
        const targetRumbleFreq = 54 + t * 44; // 54Hz ~ 98Hz
        this.jetRumble.frequency.setTargetAtTime(targetRumbleFreq, now, 0.15);
      }

      // 3. 은은한 터빈 휘파람음
      if (this.turbineWhine) {
        const targetWhineFreq = 260 + t * 360; // 260Hz ~ 620Hz
        this.turbineWhine.frequency.setTargetAtTime(targetWhineFreq, now, 0.15);
      }
    }
  }

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
  }

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
  }

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
  }

  // ----------------------------------------------------------------
  // 11. 공항 건물 충돌 검사 (저속 찌그러짐 vs 고속 대폭발)
  // ----------------------------------------------------------------
  checkObstacleCollisions() {
    if (this.isDestroyed) return;

    // 비행기 중심 기준 충돌 스피어
    const planePos = this.planeGroup.position;
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
  }

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
  }

  // 파티클 & 충격파 업데이트
  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= 0.02;

      if (p.isShockwave) {
        p.scale.multiplyScalar(1.08);
        p.material.opacity = p.life;
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

  // ----------------------------------------------------------------
  // 12. HUD 계기판 수치 갱신
  // ----------------------------------------------------------------
  updateHUD() {
    const kmh = Math.round(this.speed * 280);
    this.speedVal.textContent = this.isOnGround ? `${kmh} km/h (지상 주행)` : `${kmh} km/h (비행 중)`;
    const speedPercent = Math.min(100, Math.round((kmh / 800) * 100));
    this.speedBar.style.width = `${speedPercent}%`;

    const altitude = Math.max(0, Math.round((this.planeGroup.position.y - this.groundY) * 10));
    this.altVal.textContent = this.isOnGround ? `0 m (지상)` : `${altitude} m (비행 고도)`;
    const altPercent = Math.min(100, Math.round((altitude / 2500) * 100));
    this.altBar.style.width = `${altPercent}%`;

    // 1. 자세계 (인공수평의 PFD) 갱신: 쿼터니언 기반 정밀 수평선
    if (this.attitudeHorizon) {
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
      const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
      const bankAngle = Math.asin(bankTilt); // 우측 롤 시 음수 rad
      const pitchPixels = Math.max(-28, Math.min(28, forwardVec.y * 50));
      this.attitudeHorizon.style.transform = `rotate(${bankAngle}rad) translateY(${pitchPixels}px)`;
    }

    // 2. 수직 승강계 (VSI) 갱신
    if (this.vsiVal) {
      const vsi = (this.verticalSpeed * 10).toFixed(1);
      this.vsiVal.textContent = (this.verticalSpeed >= 0 ? '+' : '') + vsi + ' m/s';
      if (this.verticalSpeed < -0.8) {
        this.vsiVal.style.color = '#ef4444'; // 위험 강하
      } else if (this.verticalSpeed < -0.5) {
        this.vsiVal.style.color = '#f59e0b'; // 주의 강하
      } else {
        this.vsiVal.style.color = '#38bdf8'; // 정상
      }
    }

    // 3. 속도계 실속(Stall) 상태 뱃지
    if (this.speedBadge) {
      if (this.isStalling) {
        this.speedBadge.textContent = 'STALL!';
        this.speedBadge.className = 'badge-status stall';
      } else if (kmh < 180 && !this.isOnGround) {
        this.speedBadge.textContent = 'CAUTION';
        this.speedBadge.className = 'badge-status stall';
      } else {
        this.speedBadge.textContent = 'NORMAL';
        this.speedBadge.className = 'badge-status normal';
      }
    }

    const thrPercent = Math.round(this.throttle * 100);
    const thrDigit = Math.round(this.throttle * 10);
    this.boostVal.textContent = `${thrPercent}% [키 ${thrDigit}]`;
    this.boostBar.style.width = `${thrPercent}%`;

    this.hullVal.textContent = `${this.hullIntegrity}% ${this.isNoseDented ? '(기수 찌그러짐)' : (this.isGearCollapsed ? '(기어 파손)' : '(정상)')}`;
    this.hullBar.style.width = `${this.hullIntegrity}%`;
    if (this.hullIntegrity < 40) {
      this.hullBar.className = 'gauge-bar-fill hull-fill danger';
    } else if (this.hullIntegrity < 75) {
      this.hullBar.className = 'gauge-bar-fill hull-fill warning';
    } else {
      this.hullBar.className = 'gauge-bar-fill hull-fill';
    }

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    this.timeDisplay.textContent = `${m}:${s}`;

    let targetPos = new THREE.Vector3(120, this.groundY, 0);
    if (this.flightPhase === 'CLIMB_CRUISE') {
      targetPos = new THREE.Vector3(120, this.groundY, -4500);
    }
    const dist = Math.round(this.planeGroup.position.distanceTo(targetPos) * 2);
    this.targetDist.textContent = `${this.flightPhase === 'TAXI_OUT' ? '활주로 36L' : '목적지 활주로'} (${dist}m)`;

    const localVec = targetPos.clone();
    this.planeGroup.worldToLocal(localVec);
    const angle = Math.atan2(localVec.x, -localVec.z);
    this.targetArrow.style.transform = `rotate(${angle}rad)`;
  }
}

// 브라우저 로딩 후 실행
window.addEventListener('DOMContentLoaded', () => {
  window.airplaneGame = new AirplaneGame();
});
