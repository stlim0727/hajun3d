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

    // 비행기 기본 기종 ('a320' 현대 최신 제트 여객기)
    this.currentPlaneType = 'a320';

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
    this.isWaterLanding = false; // 바다 비상착수 수면 활주/부유 상태
    this.waterBobPhase = 0.0;

    // 비행 물리 및 항공역학 변수 (True 3D Vector Newtonian & Aerodynamic Mechanics)
    this.speed = 0.0;            // 전진 속도 단위 (1.0 = ~280 km/h)
    this.groundSpeed = 0.0;      // 지상 활주 속도 (m/s)
    this.throttle = 0.0;         // 스로틀 레버 (0.0 ~ 1.0)
    this.n1 = 20.0;              // 터보팬 엔진 N1 회전수 (%) - Idle 20% ~ Full TOGA 100% (관성 스풀업 지연 적용)
    this.targetN1 = 20.0;
    this.velocity = new THREE.Vector3(0, 0, 0);     // 3차원 물리 속도 벡터 (m/s)
    this.acceleration = new THREE.Vector3(0, 0, 0); // 3차원 알짜 가속도 벡터 (m/s²)
    this.aoa = 0.0;              // 받음각 (Angle of Attack, rad)
    this.sideslip = 0.0;         // 미끄러짐각 (Sideslip, rad)
    this.currentG = 1.0;         // 기체 작용 하중 배수 (Load Factor, G)
    this.flaps = ['UP', '1', '2', 'FULL']; // 고양력 플랩 단계
    this.flapIndex = 0;          // 0: UP, 1: 1, 2: 2, 3: FULL
    this.spoilerExtended = false;// 비행 스포일러 / 스피드브레이크 (EXT / RET)
    this.reverseThrustActive = false; // 엔진 역추진 장치 (REV)
    this.groundSpoilersActive = false;// 터치다운 시 자동 전개 지상 스포일러
    this.pitch = 0.0;            // 피치 각도 (라디안)
    this.roll = 0.0;             // 롤 각도 (라디안)
    this.yaw = 0.0;              // 요 각도 (라디안)
    this.verticalSpeed = 0.0;    // 수직 상승/하강 속도 (m/s)
    this.prevY = 6.84;
    this.isOnGround = true;      // 지상 접지 여부
    this.groundY = 6.84;         // 지상 고도 (활주로 Y=2.12에 타이어 접지)
    this.gearExtended = true;    // 기어 다운 여부
    this.gearPhase = 'DOWN';     // 기어 동작 상태 ('DOWN' | 'EXTENDING' | 'RETRACTING' | 'UP' | 'COLLAPSED')
    this.gearPhaseTimer = 0.0;   // 기어 개폐 시퀀스 경과 시간(s)
    this.gearPhaseDuration = 2.4;// 기어 개폐 시퀀스 풀 타임(s: 도어열림 0.7s + 기어회전 1.0s + 도어닫힘 0.7s)
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

    // HOTAS 1 & 비행 조이스틱 컨트롤러 상태 (Thrustmaster T.Flight HOTAS One / Airbus TCA FBW)
    this.hotasState = {
      connected: false,
      id: '',
      rawName: '',
      mode: 'tca_airbus', // 'tca_airbus' (사이드스틱: 롤/피치, 스크롤: 스로틀, 비틀기: 러더)
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0,
      hasThrottleAxis: false,
      lastThrottleRaw: null,
      throttleAxisIndex: 2, // 기본: TCA 에어버스 사이드스틱 스크롤 슬라이더 = Axis 2
      rudderAxisIndex: 3,  // 기본: TCA 에어버스 사이드스틱 손잡이 좌우 비틀기 = Axis 3
      useTwistRudder: true,// 기본: 스틱 손잡이 좌우 비틀기 러더 활성화 (스마트 영점 & 데드존으로 쏠림 방지)
      invertThrottle: false,// 기본: 밀면 100%, 당기면 0% (정방향)
      rollCenter: 0,
      pitchCenter: 0,
      yawCenter: 0,
      calibrationFrames: 0,
      rawAxes: [],
      buttons: {},
      prevButtons: {}
    };
    this.hotasDeadzone = 0.065;
    this.hotasExpo = 1.25;

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
    this.turbofans = [];    // 제트 엔진 회전 터보팬 블레이드 그룹
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

    // 속도감 및 동적 시각/오디오 효과 (Sense of Speed & Dynamic Camera Effects)
    this.speedLinesGroup = null;
    this.speedLineData = [];
    this.speedLineMaterial = null;
    this.oceanTexture = null;
    this.speedVignetteEl = null;
    this.jetWindSrc = null;
    this.cockpitWindFilter = null;
    this.cockpitWindGain = null;

    // 비상 상황 시스템 (In-Flight Emergency System)
    this.currentEmergency = null; // 'engine_fire' | 'bird_strike' | 'windshear' | 'gear_failure'
    this.emergencyTimer = 0;
    this.emergencyPanel = null;
    this.emergencyBonusGiven = false;

    // 낮/밤 시간대 시스템 (Day / Night Cycle)
    this.timeOfDay = 'day'; // 'day' | 'night'
    this.ambientLight = null;
    this.hemiLight = null;
    this.sunLight = null;
    this.moonLight = null;
    this.stars = null;
    this.aircraftNavLights = [];
    this.beaconStrobes = [];
    this.cabinWindowMat = null;
    this.timeToggleBtn = null;
    this.timeModeText = null;

    // 프로시저럴 항공사 그래픽 텍스처 시스템 (Procedural Livery & Wing Graphics)
    this.fuselageCanvas = null;
    this.fuselageCtx = null;
    this.fuselageTexture = null;
    this.wingCanvas = null;
    this.wingCtx = null;
    this.wingTexture = null;

    // 대륙 도시, 도로, 움직이는 자동차 및 사람 시스템 (Living Continental City & Beach)
    this.cityGroup = null;
    this.movingVehicles = [];
    this.movingPedestrians = [];
    this.beachPeople = [];
    this.beachSwimmers = [];
    this.cityNightLights = [];

    // 인천공항 스타일 메가 허브 공항, 터미널 버스 및 주기 항공기 시스템
    this.incheonAirportGroup = null;
    this.aiAircraft = [];
    this.airportBuses = [];
    this.cruiseMultiplier = 1;

    // 엔진 상태 및 게이트 도착/탑승교 도킹 & 지상 요원 및 토잉카 시스템
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    this.animatedJetways = [];
    this.marshallerCrew = [];
    this.movingGroundCrew = [];
    this.movingTugs = [];
    this.dockingTriggered = false;
    this.deplaningTriggered = false;
    this.activeDockingJetway = null;

    // 마이크 및 조종석 안내 방송(Captain PA) & 승객 반응 시스템
    this.micStream = null;
    this.micAudioContext = null;
    this.micAnalyser = null;
    this.micDataArray = null;
    this.isMicActive = false;
    this.speechRecognition = null;
    this.passengerReactionTimer = null;
    this.captainPAIndex = 0;

    try {
      this.initThree();
      this.initLights();
      this.initStars();
      this.initGLBSystem();
      this.initEnvironments();
    } catch (e) {
      console.error('Scene init error:', e);
    }

    try {
      this.initUI();
      this.setupEvents();
    } catch (e) {
      console.error('UI/Events init error:', e);
    }

    try {
      this.buildAircraft(this.currentPlaneType);
    } catch (e) {
      console.error('Aircraft build error:', e);
    }

    try {
      this.initSpeedEffects();
      this.initAudio();
      this.initHOTAS();
    } catch (e) {
      console.error('Audio/SpeedFX/HOTAS init error:', e);
    }

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ----------------------------------------------------------------
  // 1. 고해상도 Three.js 씬 & 초고속 60FPS 렌더러 (Early-Z 하드웨어 가속)
  // ----------------------------------------------------------------
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec8e3);
    this.scene.fog = new THREE.FogExp2(0xa3d5ed, 0.000028);

    // near 1.2m, far 70000m로 설정하여 표준 깊이 버퍼로도 Z-Fighting 0% 보장 및 45km 초대형 대륙 횡단 시야 확보
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1.2,
      70000
    );
    this.camera.position.set(0, 15, 65);

    // logarithmicDepthBuffer: false로 GPU 조기 Z 컬링(Early-Z) 하드웨어 가속을 100% 활성화하여 프레임 드랍/끊김 원천 차단!
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 고해상도 디스플레이 필레이트 병목 제거
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // 고성능 부드러운 그림자
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 파티클 메모리 재사용 (가비지 컬렉터 멈칫 현상 영구 제거)
    this.sharedExhaustGeo = new THREE.BoxGeometry(0.8, 0.8, 1.8);
    this.exhaustMatFull = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.8 });
    this.exhaustMatNormal = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.35 });
    this.exhaustFrameCount = 0;
    this.hudFrameCount = 0;
    this.collisionFrameCount = 0;

    this.container.appendChild(this.renderer.domElement);

    // 비행기 최상위 3D 그룹 초기화 & 씬 추가
    this.planeGroup = new THREE.Group();
    this.scene.add(this.planeGroup);
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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

  // ----------------------------------------------------------------
  // 4. 고해상도 국제공항 & 정밀 탑승교 & PAPI 유도등 (초대형 메가 에어포트)
  // ----------------------------------------------------------------
  initAirports() {
    this.airportGroup = new THREE.Group();
    this.obstacles = [];

    // 아스팔트 바닥 (초대형 1,400m x 4,400m)
    const islandGeo = new THREE.BoxGeometry(1400, 4, 4400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const airportGround = new THREE.Mesh(islandGeo, groundMat);
    airportGround.position.set(0, 0, 0);
    airportGround.receiveShadow = true;
    this.airportGroup.add(airportGround);

    // --------------------------------------------------------------
    // 36L 정밀 활주로 (100m x 3800m 메가 런웨이, Y = 2.10)
    // --------------------------------------------------------------
    const runwayGeo = new THREE.PlaneGeometry(100, 3800);
    const runwayMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(160, 2.10, 0);
    runway.receiveShadow = true;
    this.airportGroup.add(runway);

    // 활주로 시단 피아노 건반 (Threshold Piano Keys - Z = ±1800, Y = 2.14)
    const whiteMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    [-1800, 1800].forEach(zBase => {
      for (let k = -42; k <= 42; k += 5.5) {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 50), whiteMat);
        bar.rotation.x = -Math.PI / 2;
        bar.position.set(160 + k, 2.14, zBase);
        this.airportGroup.add(bar);
      }
    });

    // 활주로 중앙선 (Centerline Stripes - Y = 2.14)
    for (let z = -1750; z <= 1750; z += 55) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 36), whiteMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(160, 2.14, z);
      this.airportGroup.add(stripe);
    }

    // 착륙 목표 지점 (Aiming Point - Z = ±1400, Y = 2.14)
    [-1400, 1400].forEach(z => {
      [-24, 24].forEach(xOff => {
        const aim = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 65), whiteMat);
        aim.rotation.x = -Math.PI / 2;
        aim.position.set(160 + xOff, 2.14, z);
        this.airportGroup.add(aim);
      });
    });

    // PAPI (Precision Approach Path Indicator) 4구 진입각 지시등
    this.papiLights = [];
    for (let p = 0; p < 4; p++) {
      const papiBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, 2.0),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 })
      );
      papiBox.position.set(95, 2.6, 1250 + p * 8);
      this.airportGroup.add(papiBox);

      const lamp = new THREE.PointLight(0xffffff, 2.2, 90);
      lamp.position.set(97, 3.2, 1250 + p * 8);
      this.airportGroup.add(lamp);
      this.papiLights.push(lamp);
    }

    // --------------------------------------------------------------
    // 유도로 및 황색 유도선 (Taxiways - 75m x 3800m, Y = 2.06)
    // --------------------------------------------------------------
    const taxiway = new THREE.Mesh(
      new THREE.PlaneGeometry(75, 3800),
      new THREE.MeshStandardMaterial({ 
        color: 0x242e3d, 
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    );
    taxiway.rotation.x = -Math.PI / 2;
    taxiway.position.set(-80, 2.06, 0);
    taxiway.receiveShadow = true;
    this.airportGroup.add(taxiway);

    // 연결 유도로 5개소 (Connectors: -1500, -750, 0, 750, 1500, Y = 2.06)
    [-1500, -750, 0, 750, 1500].forEach(z => {
      const link = new THREE.Mesh(new THREE.PlaneGeometry(240, 65), new THREE.MeshStandardMaterial({ 
        color: 0x242e3d,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      }));
      link.rotation.x = -Math.PI / 2;
      link.position.set(40, 2.06, z);
      this.airportGroup.add(link);
    });

    const yellowMat = new THREE.MeshBasicMaterial({ 
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const taxiLine = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3750), yellowMat);
    taxiLine.rotation.x = -Math.PI / 2;
    taxiLine.position.set(-80, 2.09, 0);
    this.airportGroup.add(taxiLine);

    // --------------------------------------------------------------
    // 활주로 및 유도로 야간 조명 시스템 (Airport Night Runway Lighting System)
    // --------------------------------------------------------------
    const nightGroup = new THREE.Group();
    nightGroup.name = 'airportNightLights';
    nightGroup.visible = (this.timeOfDay === 'night');

    const edgeBulbGeo = new THREE.SphereGeometry(0.75, 6, 6);
    const whiteBulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const greenBulbMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const redBulbMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const blueBulbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. 활주로 양측 측면 유도등 (Runway Edge Lights: X = 160 ± 52, Z = -1800 ~ 1800)
    for (let z = -1800; z <= 1800; z += 60) {
      const isThreshold = (z > 1650);
      const isEnd = (z < -1650);
      const mat = isThreshold ? greenBulbMat : (isEnd ? redBulbMat : whiteBulbMat);

      [-52, 52].forEach(xOff => {
        const bulb = new THREE.Mesh(edgeBulbGeo, mat);
        bulb.position.set(160 + xOff, 2.45, z);
        nightGroup.add(bulb);
      });
    }

    // 2. 유도로 측면 청색 유도등 (Taxiway Blue Edge Lights: X = -80 ± 40, Z = -1800 ~ 1800)
    for (let z = -1800; z <= 1800; z += 90) {
      [-40, 40].forEach(xOff => {
        const bulb = new THREE.Mesh(edgeBulbGeo, blueBulbMat);
        bulb.position.set(-80 + xOff, 2.35, z);
        nightGroup.add(bulb);
      });
    }

    // 3. 터미널 창문 야간 백라이트 발광 스트립 (Terminal Night Windows)
    const terminalWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let tz = -320; tz <= 320; tz += 90) {
      for (let ty of [12, 24, 36]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(65, 4.5), terminalWindowMat);
        win.position.set(-289, ty, tz);
        win.rotation.y = Math.PI / 2;
        nightGroup.add(win);
      }
    }

    this.airportGroup.add(nightGroup);

    // --------------------------------------------------------------
    // 여객 터미널 허브 빌딩 (대형 180m x 48m x 780m)
    // --------------------------------------------------------------
    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.7,
      transparent: true,
      opacity: 0.88
    });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(180, 48, 780), terminalMat);
    terminal.position.set(-380, 24, 0);
    terminal.castShadow = true;
    this.airportGroup.add(terminal);
    this.registerObstacle(terminal, '국제공항 여객 터미널 빌딩');

    // --------------------------------------------------------------
    // 멀티 실시간 회전 도킹 탑승교 (Gate 1, 2, 3 Animated Boarding Bridges)
    // - 평상시에는 실제 공항처럼 옆(유도로/벽면 방향)을 보며 대기하다가,
    // - 비행기가 게이트에 정지하면 로툰다를 축으로 회전하여 비행기 L1 문으로 도킹!
    // --------------------------------------------------------------
    const createJetBridge = (gateZ, gateName, gateIdx) => {
      const jetBridgeGroup = new THREE.Group();

      // 1. 원형 로툰다 (피벗 타워 - 고정 축)
      const rotunda = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 14, 18),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 })
      );
      rotunda.position.set(-285, 11, gateZ);
      rotunda.castShadow = true;
      jetBridgeGroup.add(rotunda);

      // 2. ★ 로툰다 중심 회전 암 피벗 그룹 (Rotunda Swing Arm Pivot)
      const armPivot = new THREE.Group();
      armPivot.position.set(-285, 0, gateZ);

      // 평상시 대기 각도: 실제 공항처럼 옆(대략 40도)을 바라봄
      const standbyAngle = (gateIdx % 2 === 0) ? 0.68 : -0.68;
      const dockedAngle = 0.0; // 비행기 정지선 L1 도어를 향함
      armPivot.rotation.y = standbyAngle;

      // 3. 신축형 텔레스코픽 터널 통로 (암 피벗에 부착되어 함께 회전)
      const tunnel = new THREE.Mesh(
        new THREE.BoxGeometry(85, 7.5, 8.5),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
      );
      tunnel.position.set(45, 10.2, 0);
      tunnel.castShadow = true;
      armPivot.add(tunnel);

      // 터널 좌우 유리창
      const bridgeGlass = new THREE.Mesh(
        new THREE.BoxGeometry(80, 3.8, 8.7),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 })
      );
      bridgeGlass.position.set(45, 10.5, 0);
      armPivot.add(bridgeGlass);

      // 4. 하부 이동 대차 & 유압 리프트 기둥 (Wheel Bogie - 브릿지와 함께 바닥을 굴러 회전)
      const columnMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const liftColumn = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 8.5, 12), columnMat);
      liftColumn.position.set(75, 5.5, 0);
      liftColumn.castShadow = true;
      armPivot.add(liftColumn);

      const axle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 8.5), columnMat);
      axle.position.set(75, 1.6, 0);
      armPivot.add(axle);

      [-3.6, 3.6].forEach(zTire => {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8, 1.8, 1.6, 16),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        tire.rotation.x = Math.PI / 2;
        tire.position.set(75, 1.8, zTire);
        tire.castShadow = true;
        armPivot.add(tire);
      });

      // 5. 항공기 도킹 캐빈 & 아코디언 고무 주름 캐노피
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(12, 8.5, 9.5),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
      );
      cabin.position.set(91, 9.5, 0);
      cabin.castShadow = true;
      armPivot.add(cabin);

      // 아코디언 고무 주름 (비행기 동체 밀착 캐노피)
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      for (let c = 0; c < 5; c++) {
        const fold = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.5, 8, 16), canopyMat);
        fold.rotation.y = Math.PI / 2;
        fold.position.set(98 + c * 0.75, 9.5, 0);
        fold.scale.set(1.2, 1.1, 1);
        armPivot.add(fold);
      }

      jetBridgeGroup.add(armPivot);
      this.airportGroup.add(jetBridgeGroup);
      this.registerObstacle(rotunda, `${gateName} 지지 타워`);

      // 실시간 회전 도킹 탑승교 등록
      this.animatedJetways.push({
        name: gateName,
        armPivot,
        standbyAngle,
        dockedAngle,
        currentAngle: standbyAngle,
        targetAngle: standbyAngle,
        stopX: -155,
        stopZ: gateZ,
        isDocked: false
      });
    };

    // 1번, 2번, 3번 게이트 탑승교 생성
    createJetBridge(0, '해상공항 1번 탑승교 게이트', 0);
    createJetBridge(180, '해상공항 2번 탑승교 게이트', 1);
    createJetBridge(-180, '해상공항 3번 탑승교 게이트', 2);

    // --------------------------------------------------------------
    // 1번 게이트 전용 정지선 및 유도 표식 (Gate 1 Bay Markings)
    // --------------------------------------------------------------
    const gateStopGroup = new THREE.Group();
    // 1. 적색 정지선 (Stop Line)
    const stopBar = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 1.8), 
      new THREE.MeshBasicMaterial({ 
        color: 0xef4444,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );
    stopBar.rotation.x = -Math.PI / 2;
    stopBar.position.set(-155, 2.14, 0);
    gateStopGroup.add(stopBar);

    // 2. 황색 가이드 링
    const guideRing = new THREE.Mesh(
      new THREE.RingGeometry(7.0, 8.2, 28), 
      new THREE.MeshBasicMaterial({ 
        color: 0xfacc15, 
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );
    guideRing.rotation.x = -Math.PI / 2;
    guideRing.position.set(-155, 2.14, 0);
    gateStopGroup.add(guideRing);

    // 3. 전자식 시각 도킹 유도 장치 (VDGS 스탠드)
    const vdgsPole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 16, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    vdgsPole.position.set(-155, 8.0, -18);
    gateStopGroup.add(vdgsPole);

    const vdgsScreen = new THREE.Mesh(
      new THREE.BoxGeometry(9, 6, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.85 })
    );
    vdgsScreen.position.set(-155, 14.5, -18);
    gateStopGroup.add(vdgsScreen);

    this.airportGroup.add(gateStopGroup);

    // --------------------------------------------------------------
    // 공항 관제탑 (ATC Tower)
    // --------------------------------------------------------------
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 18, 130, 18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    towerBase.position.set(-380, 65, -500);
    towerBase.castShadow = true;
    this.airportGroup.add(towerBase);
    this.registerObstacle(towerBase, '공항 관제탑');

    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 15, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.85 })
    );
    towerCab.position.set(-380, 135, -500);
    this.airportGroup.add(towerCab);

    this.beaconLight = new THREE.PointLight(0x38bdf8, 2.8, 350);
    this.beaconLight.position.set(-380, 150, -500);
    this.airportGroup.add(this.beaconLight);

    // 격납고 (Hangar)
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(160, 36, 120),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 })
    );
    hangar.position.set(-380, 18, 480);
    hangar.castShadow = true;
    this.airportGroup.add(hangar);
    this.registerObstacle(hangar, '항공기 정비 격납고');

    // 지상 서비스 차량 (GSE Vehicles - 토잉카 & 연료 트럭)
    this.initAirportGSE();

    this.scene.add(this.airportGroup);

  }

  // ----------------------------------------------------------------
  // 지상 요원 3D 메쉬 생성 (마샬러 유도 요원 또는 램프 순찰 요원)
  // ----------------------------------------------------------------
  createGroundCrewMesh(isMarshaller = false) {
    const group = new THREE.Group();

    // 고시인성 형광 안전 조끼 및 장비 재질
    const vestMat = new THREE.MeshStandardMaterial({
      color: isMarshaller ? 0xf97316 : 0xfacc15, // 오렌지/옐로우 형광 안전조끼
      roughness: 0.5,
      metalness: 0.1
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 고휘도 반사띠
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // 작업 바지
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }); // 안전모

    // 1. 몸통 (형광 안전 조끼)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 0.45), vestMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    group.add(torso);

    // 반사띠 2줄 (가슴 & 허리)
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.48), stripeMat);
    stripe1.position.y = 1.48;
    group.add(stripe1);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.48), stripeMat);
    stripe2.position.y = 1.15;
    group.add(stripe2);

    // 2. 머리 & 안전모
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), skinMat);
    head.position.y = 2.15;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
    helmet.position.y = 2.22;
    group.add(helmet);

    // 3. 다리 (좌/우 보행 피벗)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.24, 0.8, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), pantsMat);
    lLegMesh.position.y = -0.4;
    leftLeg.add(lLegMesh);
    group.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.24, 0.8, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), pantsMat);
    rLegMesh.position.y = -0.4;
    rightLeg.add(rLegMesh);
    group.add(rightLeg);

    // 4. 팔 (좌/우 유도/보행 피벗)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.52, 1.8, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), vestMat);
    lArmMesh.position.y = -0.35;
    leftArm.add(lArmMesh);
    group.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.52, 1.8, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), vestMat);
    rArmMesh.position.y = -0.35;
    rightArm.add(rArmMesh);
    group.add(rightArm);

    let leftWand = null;
    let rightWand = null;

    if (isMarshaller) {
      // 마샬러 유도봉 (야간/주간 고휘도 발광봉)
      const wandMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.8
      });
      const wandGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8);

      leftWand = new THREE.Mesh(wandGeo, wandMat);
      leftWand.position.set(0, -0.75, 0.2);
      leftWand.rotation.x = Math.PI / 4;
      leftArm.add(leftWand);

      rightWand = new THREE.Mesh(wandGeo, wandMat);
      rightWand.position.set(0, -0.75, 0.2);
      rightWand.rotation.x = Math.PI / 4;
      rightArm.add(rightWand);
    }

    return {
      group,
      torso,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      leftWand,
      rightWand,
      isMarshaller
    };
  }

  // ----------------------------------------------------------------
  // 수하물 카트를 견인하는 공항 토잉카(Towing Tug) 3D 메쉬 생성
  // ----------------------------------------------------------------
  createTowingTugMesh(cartsCount = 2) {
    const group = new THREE.Group();
    const wheels = [];

    // 토잉 트랙터 본체 (공항 특유의 밝은 산업용 옐로우)
    const tugMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.3 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const hitchMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

    // 트랙터 차체 (길이 5.2m x 폭 2.6m x 높이 1.4m)
    const tractorBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 5.2), tugMat);
    tractorBody.position.y = 1.0;
    tractorBody.castShadow = true;
    group.add(tractorBody);

    // 전면 대형 강철 범퍼
    const fwdBumper = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.6), bumperMat);
    fwdBumper.position.set(0, 0.7, -2.7);
    group.add(fwdBumper);

    // 운전석 캐빈 프레임
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 2.4), bumperMat);
    cabRoof.position.set(0, 2.4, 0.2);
    group.add(cabRoof);

    // 루프 경광등 (주황 비콘)
    const beacon = new THREE.PointLight(0xf59e0b, 2.5, 25);
    beacon.position.set(0, 2.6, 0.2);
    group.add(beacon);
    const beaconDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.5 })
    );
    beaconDome.position.set(0, 2.55, 0.2);
    group.add(beaconDome);

    // 트랙터 4륜 광폭 타이어
    [
      { x: -1.4, z: -1.6 }, { x: 1.4, z: -1.6 },
      { x: -1.4, z: 1.6 },  { x: 1.4, z: 1.6 }
    ].forEach(wPos => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 14), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wPos.x, 0.7, wPos.z);
      tire.castShadow = true;
      group.add(tire);
      wheels.push(tire);
    });

    // 수하물 카트(Baggage Carts) 견인 트레일러 연결
    const baggageCartMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const luggageColors = [0xef4444, 0x2563eb, 0x10b981, 0x8b5cf6, 0xf97316];

    for (let c = 0; c < cartsCount; c++) {
      const zOffset = 3.6 + c * 4.0;

      // 견인 히치 바
      const hitch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), hitchMat);
      hitch.rotation.x = Math.PI / 2;
      hitch.position.set(0, 0.5, zOffset - 0.6);
      group.add(hitch);

      // 카트 베이스 트레이
      const cartBed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 3.0), baggageCartMat);
      cartBed.position.set(0, 0.65, zOffset + 1.2);
      cartBed.castShadow = true;
      group.add(cartBed);

      // 카트 사이드 레일 가드
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 3.0), hitchMat);
      railL.position.set(-1.05, 1.1, zOffset + 1.2);
      group.add(railL);
      const railR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 3.0), hitchMat);
      railR.position.set(1.05, 1.1, zOffset + 1.2);
      group.add(railR);

      // 여행용 수하물 가방들 (Luggage Suitcases)
      for (let l = 0; l < 4; l++) {
        const lugColor = luggageColors[(c * 3 + l) % luggageColors.length];
        const lugMat = new THREE.MeshStandardMaterial({ color: lugColor, roughness: 0.4 });
        const lugMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.65), lugMat);
        lugMesh.position.set((l % 2 === 0 ? -0.45 : 0.45), 1.05, zOffset + 0.65 + Math.floor(l / 2) * 1.0);
        lugMesh.rotation.y = (Math.random() - 0.5) * 0.2;
        group.add(lugMesh);
      }

      // 카트 4륜 캐스터 바퀴
      [-1.0, 1.0].forEach(cx => {
        [-0.9, 0.9].forEach(cz => {
          const cTire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 10), tireMat);
          cTire.rotation.z = Math.PI / 2;
          cTire.position.set(cx, 0.35, zOffset + 1.2 + cz);
          group.add(cTire);
          wheels.push(cTire);
        });
      });
    }

    return { group, beacon, wheels };
  }

  // 지상 안내원(Marshaller & Ground Crew) 및 계류장을 분주히 달리는 토잉카 시스템 초기화
  initAirportGSE() {
    // --------------------------------------------------------------
    // 1. 출발 해상공항 1번 게이트 정면 마샬러 (유도봉 안내 요원)
    // --------------------------------------------------------------
    const mMesh = this.createGroundCrewMesh(true);
    mMesh.group.position.set(-155, 2.12, -22);
    mMesh.group.rotation.y = 0; // 남쪽(+Z)을 향해 서서 비행기를 마주봄
    this.airportGroup.add(mMesh.group);
    this.marshallerCrew.push({
      mesh: mMesh,
      pos: new THREE.Vector3(-155, 2.12, -22)
    });

    // --------------------------------------------------------------
    // 2. 출발 해상공항 순찰 지상 안내원들 4명 (Apron Ramp Agents)
    // --------------------------------------------------------------
    const crewDefs = [
      { x: -140, z: -80, minZ: -180, maxZ: 120, speed: 1.4, dir: 1 },
      { x: -170, z: 120, minZ: -40, maxZ: 260, speed: 1.2, dir: -1 },
      { x: -210, z: -150, minZ: -280, maxZ: 80, speed: 1.5, dir: 1 },
      { x: -240, z: 200, minZ: 60, maxZ: 380, speed: 1.3, dir: -1 }
    ];

    crewDefs.forEach((cDef, idx) => {
      const crew = this.createGroundCrewMesh(false);
      crew.group.position.set(cDef.x, 2.12, cDef.z);
      this.airportGroup.add(crew.group);
      this.movingGroundCrew.push({
        group: crew.group,
        mesh: crew,
        z: cDef.z,
        minZ: cDef.minZ,
        maxZ: cDef.maxZ,
        speed: cDef.speed,
        dir: cDef.dir,
        walkOffset: idx * 1.5
      });
    });

    // --------------------------------------------------------------
    // 3. 출발 해상공항 계류장 주행 토잉카 3대 (Towing Tugs with Baggage Carts)
    // --------------------------------------------------------------
    const tugDefs = [
      { x: -130, z: -120, minZ: -280, maxZ: 280, speed: 8.5, dir: 1, carts: 3 },
      { x: -215, z: 180, minZ: -220, maxZ: 360, speed: 9.2, dir: -1, carts: 2 },
      { x: -175, z: 320, minZ: 80, maxZ: 520, speed: 7.8, dir: 1, carts: 2 }
    ];

    tugDefs.forEach((tDef, idx) => {
      const tugData = this.createTowingTugMesh(tDef.carts);
      tugData.group.position.set(tDef.x, 2.12, tDef.z);
      this.airportGroup.add(tugData.group);
      this.movingTugs.push({
        group: tugData.group,
        beacon: tugData.beacon,
        wheels: tugData.wheels,
        z: tDef.z,
        minZ: tDef.minZ,
        maxZ: tDef.maxZ,
        speed: tDef.speed,
        dir: tDef.dir,
        beaconOffset: idx * 1.8
      });
    });
  }

  // ----------------------------------------------------------------
  // 4-A. 인천국제공항 스타일 초대형 메가 허브 공항 (Incheon Int'l Airport Hub)
  // - 제1여객터미널(T1, 1600m 아치 글래스 루프), 제2여객터미널(T2), 탑승동(Concourse)
  // - 2본 평행 4,000m 메가 활주로 (16R/34L & 15L/33R) & 고속 탈출 유도로
  // - 교통센터(160m 유리 돔), 20개 탑승교, 100m 8각 하이테크 관제탑
  // - 주기된 다른 항공기 12대 (B747, A320, DC-10 대한항공/아시아나풍 리버리)
  // ----------------------------------------------------------------
  initIncheonAirport() {
    this.incheonAirportGroup = new THREE.Group();
    const incheonZ = -45000;

    // 공용 재질
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x242e3d, roughness: 0.85, metalness: 0.1 });
    const runwayMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.7, 
      polygonOffset: true, 
      polygonOffsetFactor: -1, 
      polygonOffsetUnits: -1 
    });
    const whiteLineMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      polygonOffset: true, 
      polygonOffsetFactor: -2, 
      polygonOffsetUnits: -2 
    });
    const yellowTaxiMat = new THREE.MeshBasicMaterial({ 
      color: 0xfacc15, 
      polygonOffset: true, 
      polygonOffsetFactor: -2, 
      polygonOffsetUnits: -2 
    });
    const terminalGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.85,
      transparent: true,
      opacity: 0.90
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.45 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65 });

    // 1. 거대한 인천공항 아스팔트 에이프런 바닥 (2,800m x 6,200m)
    const apron = new THREE.Mesh(new THREE.BoxGeometry(2800, 4, 6200), groundMat);
    apron.position.set(-150, 0, incheonZ);
    apron.receiveShadow = true;
    this.incheonAirportGroup.add(apron);

    // 2. 복수 평행 4,000m 메가 활주로 2본 (16R/34L & 15L/33R)
    [160, 820].forEach((rX, rIdx) => {
      const rName = rIdx === 0 ? '16R/34L (서측 메인 활주로)' : '15L/33R (동측 평행 활주로)';
      const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 4000), runwayMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(rX, 2.10, incheonZ);
      rMesh.receiveShadow = true;
      this.incheonAirportGroup.add(rMesh);

      // 활주로 시단 피아노 건반 (Threshold Keys)
      [-1900, 1900].forEach(zOff => {
        for (let k = -44; k <= 44; k += 5.5) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 52), whiteLineMat);
          bar.rotation.x = -Math.PI / 2;
          bar.position.set(rX + k, 2.14, incheonZ + zOff);
          this.incheonAirportGroup.add(bar);
        }
      });

      // 중앙선
      for (let z = -1850; z <= 1850; z += 55) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 38), whiteLineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(rX, 2.14, incheonZ + z);
        this.incheonAirportGroup.add(stripe);
      }

      // 착륙 목표 지점 (Aiming Point)
      [-1450, 1450].forEach(z => {
        [-24, 24].forEach(xOff => {
          const aim = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 70), whiteLineMat);
          aim.rotation.x = -Math.PI / 2;
          aim.position.set(rX + xOff, 2.14, incheonZ + z);
          this.incheonAirportGroup.add(aim);
        });
      });

      // 4구 PAPI 진입각 지시등
      for (let p = 0; p < 4; p++) {
        const lamp = new THREE.PointLight(0xffffff, 2.2, 90);
        lamp.position.set(rX - 65, 3.2, incheonZ + 1250 + p * 8);
        this.scene.add(lamp);
        this.papiLights.push(lamp);
      }
    });

    // 활주로 진입등 시스템 (ALS: 고휘도 스트로브 바 24개)
    const alsGroup = new THREE.Group();
    const whiteLampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redLampMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let zDist = 2050; zDist <= 3550; zDist += 65) {
      const isOuter = zDist > 3000;
      const barMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 1.8), isOuter ? redLampMat : whiteLampMat);
      barMesh.position.set(160, 2.4, incheonZ + zDist);
      alsGroup.add(barMesh);

      const barMesh2 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 1.8), isOuter ? redLampMat : whiteLampMat);
      barMesh2.position.set(820, 2.4, incheonZ + zDist);
      alsGroup.add(barMesh2);
    }
    this.incheonAirportGroup.add(alsGroup);

    // 3. 고속 탈출 유도로 & 평행 유도로 시스템
    [-60, 490].forEach(taxX => {
      const taxLine = new THREE.Mesh(new THREE.PlaneGeometry(75, 4200), groundMat);
      taxLine.rotation.x = -Math.PI / 2;
      taxLine.position.set(taxX, 2.06, incheonZ);
      this.incheonAirportGroup.add(taxLine);

      const yLine = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4150), yellowTaxiMat);
      yLine.rotation.x = -Math.PI / 2;
      yLine.position.set(taxX, 2.09, incheonZ);
      this.incheonAirportGroup.add(yLine);
    });

    // 유도로 연결선 8개소
    [-1500, -900, -300, 300, 900, 1500].forEach(zLink => {
      const link = new THREE.Mesh(new THREE.PlaneGeometry(1100, 55), groundMat);
      link.rotation.x = -Math.PI / 2;
      link.position.set(380, 2.06, incheonZ + zLink);
      this.incheonAirportGroup.add(link);
    });

    // --------------------------------------------------------------
    // 4. 인천공항 제1여객터미널 (T1: 1,600m 우아한 곡면 글래스 아치 루프)
    // --------------------------------------------------------------
    const t1Group = new THREE.Group();
    t1Group.position.set(-420, 0, incheonZ);

    // 1) 메인 중앙 홀 (Great Central Hall: 220m x 48m x 450m)
    const t1Hall = new THREE.Mesh(new THREE.BoxGeometry(220, 48, 450), terminalGlassMat);
    t1Hall.position.set(0, 24, 0);
    t1Hall.castShadow = true;
    t1Group.add(t1Hall);
    this.registerObstacle(t1Hall, '인천공항 제1여객터미널 중앙홀', new THREE.Vector3(-420, 0, incheonZ));

    // 중앙 아치형 날개 지붕 (Curved Aero-Roof)
    const t1RoofCenter = new THREE.Mesh(new THREE.CylinderGeometry(130, 130, 470, 32, 1, false, 0, Math.PI), roofMat);
    t1RoofCenter.rotation.x = Math.PI / 2;
    t1RoofCenter.rotation.z = Math.PI;
    t1RoofCenter.position.set(0, 44, 0);
    t1RoofCenter.scale.set(0.9, 0.22, 1.0);
    t1RoofCenter.castShadow = true;
    t1Group.add(t1RoofCenter);

    // 2) T1 좌우 윙 콘코스 (North & South Concourse Wings: 전장 1,600m 확장)
    [-1, 1].forEach(side => {
      const wingLen = 600;
      const wingZ = side * (225 + wingLen / 2);
      const wingMesh = new THREE.Mesh(new THREE.BoxGeometry(110, 34, wingLen), terminalGlassMat);
      wingMesh.position.set(-20, 17, wingZ);
      wingMesh.castShadow = true;
      t1Group.add(wingMesh);

      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(125, 6, wingLen + 20), roofMat);
      wingRoof.position.set(-20, 35, wingZ);
      wingRoof.castShadow = true;
      t1Group.add(wingRoof);
      this.registerObstacle(wingMesh, `인천공항 T1 ${side === -1 ? '남측' : '북측'} 윙 콘코스`, new THREE.Vector3(-420, 0, incheonZ));
    });

    // 3) 4층 출국장 고가도로 램프 (Elevated Departure Viaduct: 폭 26m, 전장 1,400m)
    const viaductMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const viaductRamp = new THREE.Mesh(new THREE.BoxGeometry(26, 3.5, 1400), viaductMat);
    viaductRamp.position.set(-135, 12.5, 0);
    viaductRamp.castShadow = true;
    t1Group.add(viaductRamp);

    // 고가 교각 기둥 24개
    for (let vz = -650; vz <= 650; vz += 60) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 11, 12), concreteMat);
      pillar.position.set(-135, 5.5, vz);
      t1Group.add(pillar);
    }

    // 1층 입국장 도로 (폭 28m, 전장 1,500m)
    const arrivalRoad = new THREE.Mesh(new THREE.PlaneGeometry(28, 1500), runwayMat);
    arrivalRoad.rotation.x = -Math.PI / 2;
    arrivalRoad.position.set(-168, 2.12, 0);
    t1Group.add(arrivalRoad);

    this.incheonAirportGroup.add(t1Group);

    // --------------------------------------------------------------
    // 5. 인천공항 교통센터 (Transportation Center 돔 & 주차빌딩 2동)
    // --------------------------------------------------------------
    const tcGroup = new THREE.Group();
    tcGroup.position.set(-720, 0, incheonZ);

    // 유선형 초대형 유리 돔 (160m x 95m x 28m)
    const tcDome = new THREE.Mesh(
      new THREE.SphereGeometry(95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      terminalGlassMat
    );
    tcDome.scale.set(0.9, 0.32, 1.4);
    tcDome.position.set(0, 0, 0);
    tcDome.castShadow = true;
    tcGroup.add(tcDome);
    this.registerObstacle(tcDome, '인천공항 교통센터 돔', new THREE.Vector3(-720, 0, incheonZ));

    // 단기/장기 주차타워 2동
    [-180, 180].forEach(pz => {
      const parkTower = new THREE.Mesh(new THREE.BoxGeometry(110, 24, 180), concreteMat);
      parkTower.position.set(0, 12, pz);
      parkTower.castShadow = true;
      tcGroup.add(parkTower);
      this.registerObstacle(parkTower, '인천공항 주차타워', new THREE.Vector3(-720, 0, incheonZ));
    });

    this.incheonAirportGroup.add(tcGroup);

    // --------------------------------------------------------------
    // 6. 인천공항 중앙 탑승동 (Concourse: 전장 900m, 폭 110m)
    // --------------------------------------------------------------
    const concourseGroup = new THREE.Group();
    concourseGroup.position.set(-180, 0, incheonZ);

    const ccBody = new THREE.Mesh(new THREE.BoxGeometry(90, 28, 900), terminalGlassMat);
    ccBody.position.set(0, 14, 0);
    ccBody.castShadow = true;
    concourseGroup.add(ccBody);

    const ccRoof = new THREE.Mesh(new THREE.BoxGeometry(105, 5, 920), roofMat);
    ccRoof.position.set(0, 29, 0);
    ccRoof.castShadow = true;
    concourseGroup.add(ccRoof);
    this.registerObstacle(ccBody, '인천공항 탑승동 (Concourse)', new THREE.Vector3(-180, 0, incheonZ));

    this.incheonAirportGroup.add(concourseGroup);

    // --------------------------------------------------------------
    // 7. 인천공항 제2여객터미널 (T2: 모던 H형 에어로 터미널 1,200m)
    // --------------------------------------------------------------
    const t2Group = new THREE.Group();
    t2Group.position.set(-1100, 0, incheonZ);

    const t2Main = new THREE.Mesh(new THREE.BoxGeometry(160, 42, 600), terminalGlassMat);
    t2Main.position.set(0, 21, 0);
    t2Main.castShadow = true;
    t2Group.add(t2Main);

    [-360, 360].forEach(wZ => {
      const t2Wing = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 320), terminalGlassMat);
      t2Wing.position.set(30, 15, wZ);
      t2Wing.castShadow = true;
      t2Group.add(t2Wing);
    });
    this.registerObstacle(t2Main, '인천공항 제2여객터미널 (T2)', new THREE.Vector3(-1100, 0, incheonZ));

    this.incheonAirportGroup.add(t2Group);

    // --------------------------------------------------------------
    // 8. 인천공항 실시간 회전 도킹 탑승교 20개소 (Jetways 1~20) & VDGS 전광판
    // - 평상시 옆쪽(대기 각도)을 보며 대기하다가 비행기가 게이트에 도착하면 L1 도어로 스윙 도킹!
    // --------------------------------------------------------------
    const makeIncheonJetway = (xPos, zPos, gateIdx, name = '게이트 탑승교') => {
      const jGroup = new THREE.Group();

      // 로툰다 고정 타워
      const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 14, 16), concreteMat);
      rotunda.position.set(xPos, 9, incheonZ + zPos);
      rotunda.castShadow = true;
      jGroup.add(rotunda);

      // ★ 로툰다 중심 회전 암 피벗 그룹 (Swing Arm Pivot)
      const armPivot = new THREE.Group();
      armPivot.position.set(xPos, 0, incheonZ + zPos);
      const standbyAngle = (gateIdx % 2 === 0) ? 0.65 : -0.65;
      const dockedAngle = 0.0;
      armPivot.rotation.y = standbyAngle;

      // 통로 브릿지 (암 피벗에 부착되어 함께 회전)
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(75, 7.5, 8.5), roofMat);
      bridge.position.set(40, 8.5, 0);
      bridge.castShadow = true;
      armPivot.add(bridge);

      // 유리창
      const bGlass = new THREE.Mesh(new THREE.BoxGeometry(70, 3.8, 8.7), terminalGlassMat);
      bGlass.position.set(40, 9, 0);
      armPivot.add(bGlass);

      // 휠 대차
      const wheelColumn = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 8, 10), concreteMat);
      wheelColumn.position.set(65, 4.5, 0);
      armPivot.add(wheelColumn);

      // 도킹 캐빈 & 아코디언 캐노피
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 9), concreteMat);
      cabin.position.set(80, 8, 0);
      armPivot.add(cabin);

      const canopy = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.5, 8, 16), groundMat);
      canopy.rotation.y = Math.PI / 2;
      canopy.position.set(86, 8, 0);
      armPivot.add(canopy);

      jGroup.add(armPivot);

      // VDGS 전자식 도킹 유도 전광판 (Visual Docking Guidance System)
      const vdgsBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 5.5, 7.5),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 1.2 })
      );
      vdgsBox.position.set(xPos + 92, 12, incheonZ + zPos);
      jGroup.add(vdgsBox);

      // 지상 정지선 및 유도 황색선
      const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.6), whiteLineMat);
      stopLine.rotation.x = -Math.PI / 2;
      stopLine.position.set(xPos + 95, 2.14, incheonZ + zPos);
      jGroup.add(stopLine);

      this.incheonAirportGroup.add(jGroup);
      this.registerObstacle(rotunda, name, new THREE.Vector3(xPos, 0, incheonZ + zPos));

      this.animatedJetways.push({
        name,
        armPivot,
        standbyAngle,
        dockedAngle,
        currentAngle: standbyAngle,
        targetAngle: standbyAngle,
        stopX: xPos + 95,
        stopZ: incheonZ + zPos,
        isDocked: false
      });
    };

    // T1 탑승교 10개 (동측 계류장 방면)
    [-450, -350, -250, -150, -50, 50, 150, 250, 350, 450].forEach((zGate, gIdx) => {
      makeIncheonJetway(-330, zGate, gIdx, `인천공항 T1 ${gIdx + 1}번 게이트`);
    });

    // 탑승동 탑승교 6개
    [-300, -180, -60, 60, 180, 300].forEach((zGate, gIdx) => {
      makeIncheonJetway(-130, zGate, 10 + gIdx, `인천공항 탑승동 ${11 + gIdx}번 게이트`);
    });

    // T2 탑승교 4개
    [-200, -70, 70, 200].forEach((zGate, gIdx) => {
      makeIncheonJetway(-1020, zGate, 16 + gIdx, `인천공항 T2 ${17 + gIdx}번 게이트`);
    });

    // --------------------------------------------------------------
    // 9. 인천공항 상징 100m 8각 하이테크 관제탑 (ATC Tower)
    // --------------------------------------------------------------
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-420, 0, incheonZ - 850);

    // 8각 콘크리트 코어 샤프트 (높이 95m)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 95, 8), concreteMat);
    shaft.position.y = 47.5;
    shaft.castShadow = true;
    towerGroup.add(shaft);

    // 360도 파노라마 유리 관제실 캡슐 (3층 구조)
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(28, 16, 22, 16), terminalGlassMat);
    cab.position.y = 100;
    cab.castShadow = true;
    towerGroup.add(cab);

    // 상단 레이더 돔
    const radome = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), roofMat);
    radome.position.y = 114;
    towerGroup.add(radome);

    // 최상단 야간 항공 장애등 비콘
    const atcBeacon = new THREE.PointLight(0x38bdf8, 3.5, 450);
    atcBeacon.position.y = 122;
    towerGroup.add(atcBeacon);

    this.incheonAirportGroup.add(towerGroup);
    this.registerObstacle(shaft, '인천공항 관제탑', new THREE.Vector3(-420, 0, incheonZ - 850));

    // --------------------------------------------------------------
    // 10. 화물 터미널 & 정비 격납고 (Cargo Hub & Hangars)
    // --------------------------------------------------------------
    [-46500, -43500].forEach((zC, cIdx) => {
      const cargoBldg = new THREE.Mesh(new THREE.BoxGeometry(180, 28, 110), concreteMat);
      cargoBldg.position.set(-850, 14, zC);
      cargoBldg.castShadow = true;
      this.incheonAirportGroup.add(cargoBldg);
      this.registerObstacle(cargoBldg, `인천공항 화물 터미널 #${cIdx + 1}`);
    });

    // --------------------------------------------------------------
    // 10-B. 인천공항 계류장 지상 마샬러, 순찰 요원 및 토잉카 시스템
    // --------------------------------------------------------------
    // 1) 인천공항 T1 1번 게이트 정면 마샬러 요원
    const incheonMarshaller = this.createGroundCrewMesh(true);
    incheonMarshaller.group.position.set(-235, 2.12, incheonZ - 475);
    incheonMarshaller.group.rotation.y = 0; // 마주봄
    this.incheonAirportGroup.add(incheonMarshaller.group);
    this.marshallerCrew.push({
      mesh: incheonMarshaller,
      pos: new THREE.Vector3(-235, 2.12, incheonZ - 475)
    });

    // 2) 인천공항 계류장 순찰 요원들 4명
    const incheonCrewDefs = [
      { x: -220, z: incheonZ - 300, minZ: incheonZ - 420, maxZ: incheonZ - 180, speed: 1.4, dir: 1 },
      { x: -250, z: incheonZ + 100, minZ: incheonZ - 50,  maxZ: incheonZ + 250, speed: 1.3, dir: -1 },
      { x: -70,  z: incheonZ - 120, minZ: incheonZ - 260, maxZ: incheonZ + 40,  speed: 1.5, dir: 1 },
      { x: -100, z: incheonZ + 180, minZ: incheonZ + 50,  maxZ: incheonZ + 320, speed: 1.2, dir: -1 }
    ];
    incheonCrewDefs.forEach((cDef, idx) => {
      const crew = this.createGroundCrewMesh(false);
      crew.group.position.set(cDef.x, 2.12, cDef.z);
      this.incheonAirportGroup.add(crew.group);
      this.movingGroundCrew.push({
        group: crew.group,
        mesh: crew,
        z: cDef.z,
        minZ: cDef.minZ,
        maxZ: cDef.maxZ,
        speed: cDef.speed,
        dir: cDef.dir,
        walkOffset: idx * 1.5
      });
    });

    // 3) 인천공항 계류장 주행 토잉카 4대
    const incheonTugDefs = [
      { x: -210, z: incheonZ - 350, minZ: incheonZ - 600, maxZ: incheonZ - 100, speed: 9.0, dir: 1, carts: 3 },
      { x: -260, z: incheonZ + 220, minZ: incheonZ - 50,  maxZ: incheonZ + 500, speed: 8.5, dir: -1, carts: 2 },
      { x: -80,  z: incheonZ - 50,  minZ: incheonZ - 350, maxZ: incheonZ + 250, speed: 9.5, dir: 1, carts: 3 },
      { x: 380,  z: incheonZ + 100, minZ: incheonZ - 400, maxZ: incheonZ + 600, speed: 11.0, dir: -1, carts: 2 }
    ];
    incheonTugDefs.forEach((tDef, idx) => {
      const tugData = this.createTowingTugMesh(tDef.carts);
      tugData.group.position.set(tDef.x, 2.12, tDef.z);
      this.incheonAirportGroup.add(tugData.group);
      this.movingTugs.push({
        group: tugData.group,
        beacon: tugData.beacon,
        wheels: tugData.wheels,
        z: tDef.z,
        minZ: tDef.minZ,
        maxZ: tDef.maxZ,
        speed: tDef.speed,
        dir: tDef.dir,
        beaconOffset: idx * 1.5
      });
    });

    // --------------------------------------------------------------
    // 11. 주기된 다른 항공기들 (AI Aircrafts 12대 + 택싱 비행기 1대)
    // --------------------------------------------------------------
    this.initAIAircrafts(incheonZ);

    this.scene.add(this.incheonAirportGroup);
  }

  // ----------------------------------------------------------------
  // 4-B. 주기 및 택싱 중인 다른 여객기들 (AI Aircrafts: B747, A320, DC-10 등)
  // - 대한항공풍 스카이블루 리버리, 아시아나풍 색동 리버리, 카고 화물 리버리
  // ----------------------------------------------------------------
  initAIAircrafts(incheonZ) {
    this.aiAircraft = [];

    // 1. 게이트에 도킹된 주기 AI 여객기들 10대
    const parkedDefs = [
      { type: 'b747', livery: 'korean', x: -245, z: incheonZ - 350, rotY: Math.PI / 2, name: 'B747 대한항공 점보' },
      { type: 'a320', livery: 'asiana', x: -250, z: incheonZ - 250, rotY: Math.PI / 2, name: 'A320 아시아나' },
      { type: 'dc10', livery: 'sky',    x: -248, z: incheonZ - 150, rotY: Math.PI / 2, name: 'DC-10 스카이' },
      { type: 'b747', livery: 'korean', x: -245, z: incheonZ + 150, rotY: Math.PI / 2, name: 'B747 대한항공 점보' },
      { type: 'a320', livery: 'asiana', x: -250, z: incheonZ + 250, rotY: Math.PI / 2, name: 'A320 아시아나' },
      { type: 'md80', livery: 'sky',    x: -252, z: incheonZ + 350, rotY: Math.PI / 2, name: 'MD-80 제트' },
      // 탑승동 게이트
      { type: 'a320', livery: 'korean', x: -50, z: incheonZ - 180, rotY: Math.PI / 2, name: 'A320 탑승동' },
      { type: 'a320', livery: 'asiana', x: -50, z: incheonZ + 180, rotY: Math.PI / 2, name: 'A320 탑승동' },
      // 화물 계류장
      { type: 'b747', livery: 'cargo',  x: -720, z: incheonZ - 1500, rotY: 0, name: 'B747 화물기 #1' },
      { type: 'dc10', livery: 'cargo',  x: -720, z: incheonZ + 1500, rotY: 0, name: 'DC-10 화물기 #2' }
    ];

    parkedDefs.forEach(def => {
      const plane = this.createParkedAircraft(def.type, def.livery);
      plane.position.set(def.x, 2.12, def.z);
      plane.rotation.y = def.rotY;
      this.incheonAirportGroup.add(plane);
      this.registerObstacle(plane, def.name);
    });

    // --------------------------------------------------------------
    // 2. ★ 살아 숨쉬는 비행 AI 항공기 편대 16대 (눈앞에서 날아다니고 활주하는 역동적 항공망)
    // --------------------------------------------------------------

    // [AI-1: 출발 해상공항 36R 활주로 쾌속 이륙기 (A320 대한항공)]
    // 플레이어 바로 옆 활주로에서 굉음을 내며 전속력으로 활주하여 이륙!
    const depTakeoff = this.createParkedAircraft('a320', 'korean');
    depTakeoff.position.set(-120, 2.12, 1200);
    depTakeoff.rotation.set(0, 0, 0); // 북쪽(활주로 진행방향)을 향해 똑바로 정렬
    this.scene.add(depTakeoff);
    this.aiAircraft.push({
      id: 'dep_takeoff',
      name: '대한항공 A320 [출발 해상공항 쾌속 이륙편]',
      mesh: depTakeoff,
      mode: 'DEP_TAKEOFF_CIRCUIT',
      state: 'TAKEOFF_ROLL',
      speed: 70, // 시속 280km로 빠른 활주
      heading: 0
    });

    // [AI-2: 출발 해상공항 상공 저고도 가로지르기 (B747-400 대한항공)]
    // 게임 시작 시 출발 활주로 바로 앞 하늘(고도 190m)을 가로질러 날아감!
    const depCross = this.createParkedAircraft('b747', 'korean');
    depCross.position.set(-2200, 190, 400);
    depCross.rotation.set(0, -Math.PI / 2, 0); // 동쪽(+X) 진행방향 정렬
    this.scene.add(depCross);
    this.aiAircraft.push({
      id: 'dep_cross',
      name: '대한항공 B747 점보 [해상공항 상공 횡단편]',
      mesh: depCross,
      mode: 'DEP_CROSSING',
      speed: 95,
      heading: -Math.PI / 2 // 서 -> 동 횡단
    });

    // [AI-3: 출발 해상공항 36L 활주로 착륙 접근기 (MD-80 스카이)]
    const depLanding = this.createParkedAircraft('md80', 'sky');
    depLanding.position.set(160, 220, 2600);
    depLanding.rotation.set(-0.04, 0, 0); // 북쪽(-Z) 활주로를 향해 글라이드슬롭 정렬
    this.scene.add(depLanding);
    this.aiAircraft.push({
      id: 'dep_landing',
      name: '스카이 MD-80 [해상공항 접근 착륙편]',
      mesh: depLanding,
      mode: 'DEP_LANDING_CIRCUIT',
      state: 'APPROACH',
      speed: 80,
      heading: 0
    });

    // [AI-4: 출발 해상공항 바다 상공 웅장한 선회기 (DC-10 삼발기)]
    const depOrbit = this.createParkedAircraft('dc10', 'asiana');
    depOrbit.position.set(1800, 280, 0);
    depOrbit.rotation.set(0, Math.PI, 0.26);
    this.scene.add(depOrbit);
    this.aiAircraft.push({
      id: 'dep_orbit',
      name: '아시아나 DC-10 [해상공항 바다 선회편]',
      mesh: depOrbit,
      mode: 'DEP_ORBIT',
      speed: 85,
      orbitAngle: 0,
      orbitRadius: 1800,
      orbitAlt: 280
    });

    // [AI-5: 플레이어 전방 편대 선도 순항기 (A320 아시아나)]
    // 플레이어가 날아갈 때 항상 앞쪽 700m 상공에서 하얀 비행운을 뿜으며 똑바로 날아감!
    const proxLead = this.createParkedAircraft('a320', 'asiana');
    proxLead.position.set(80, 240, -1200);
    proxLead.rotation.set(0, 0, 0); // 북쪽 진행방향
    this.scene.add(proxLead);
    this.aiAircraft.push({
      id: 'prox_lead',
      name: '아시아나 A320 [항로 선도 순항편]',
      mesh: proxLead,
      mode: 'PROX_LEAD',
      speed: 92,
      heading: 0
    });

    // [AI-6: 플레이어 좌측 대항 근접 교차기 (B747-400 점보 - Head-on Crossing)]
    // 플레이어 좌측 280m에서 반대 방향(남쪽)으로 마주쳐 굉음을 내며 스쳐 지나감!
    const proxHeadon1 = this.createParkedAircraft('b747', 'cargo');
    proxHeadon1.position.set(-280, 280, -2800);
    proxHeadon1.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향 정렬
    this.scene.add(proxHeadon1);
    this.aiAircraft.push({
      id: 'prox_headon1',
      name: 'B747 대형 화물기 [대항 남하 교차편]',
      mesh: proxHeadon1,
      mode: 'PROX_HEADON',
      speed: 100,
      offsetSide: -320,
      heading: Math.PI
    });

    // [AI-7: 플레이어 우측 초고속 콩코드 대항 교차기 (Concorde 콩코드)]
    const proxHeadon2 = this.createParkedAircraft('concorde', 'korean');
    proxHeadon2.position.set(340, 360, -4500);
    proxHeadon2.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향 정렬
    this.scene.add(proxHeadon2);
    this.aiAircraft.push({
      id: 'prox_headon2',
      name: '콩코드 초음속기 [마하 2.0 고공 교차편]',
      mesh: proxHeadon2,
      mode: 'PROX_HEADON',
      speed: 155, // 시속 580km
      offsetSide: 380,
      heading: Math.PI
    });

    // [AI-8: 200km 대륙 항로 중부 순항기 1 (A320 대한항공)]
    const enrA320 = this.createParkedAircraft('a320', 'korean');
    enrA320.position.set(-180, 380, -14000);
    enrA320.rotation.set(0, 0, 0); // 북쪽(-Z) 진행방향
    this.scene.add(enrA320);
    this.aiAircraft.push({
      id: 'enr_a320',
      name: '대한항공 A320 [대륙 항로 북상 정기편]',
      mesh: enrA320,
      mode: 'ENROUTE_NORTH',
      speed: 105,
      heading: 0
    });

    // [AI-9: 200km 대륙 항로 중부 순항기 2 (DC-10 스카이)]
    const enrDC10 = this.createParkedAircraft('dc10', 'sky');
    enrDC10.position.set(240, 420, -22000);
    enrDC10.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향
    this.scene.add(enrDC10);
    this.aiAircraft.push({
      id: 'enr_dc10',
      name: '스카이 DC-10 [대륙 항로 남하 정기편]',
      mesh: enrDC10,
      mode: 'ENROUTE_SOUTH',
      speed: 98,
      heading: Math.PI
    });

    // [AI-10: 대륙 횡단 초고속 콩코드 (Concorde)]
    const enrConcorde = this.createParkedAircraft('concorde', 'asiana');
    enrConcorde.position.set(0, 540, -30000);
    enrConcorde.rotation.set(0, 0, 0); // 북쪽(-Z) 진행방향
    this.scene.add(enrConcorde);
    this.aiAircraft.push({
      id: 'enr_concorde',
      name: '콩코드 초음속기 [대륙 횡단 초음속 회랑]',
      mesh: enrConcorde,
      mode: 'ENROUTE_NORTH',
      speed: 160,
      heading: 0
    });

    // [AI-11: 대륙 CBD 마천루 숲 상공 저공 순항기 (MD-80)]
    const enrCity = this.createParkedAircraft('md80', 'korean');
    enrCity.position.set(1200, 260, -37000);
    enrCity.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향
    this.scene.add(enrCity);
    this.aiAircraft.push({
      id: 'enr_city',
      name: '대한항공 MD-80 [대륙 메트로폴리스 상공편]',
      mesh: enrCity,
      mode: 'ENROUTE_SOUTH',
      speed: 90,
      heading: Math.PI
    });

    // [AI-12: 인천국제공항 15L 활주로 전담 연속 이착륙기 (B747-400 대한항공)]
    const icnTakeoff = this.createParkedAircraft('b747', 'korean');
    icnTakeoff.position.set(450, 2.12, incheonZ - 1400);
    icnTakeoff.rotation.set(0, Math.PI, 0); // 남쪽(+Z 활주로 이륙방향) 정렬
    this.scene.add(icnTakeoff);
    this.aiAircraft.push({
      id: 'icn_takeoff',
      name: '대한항공 B747 [인천 15L 이륙 활주편]',
      mesh: icnTakeoff,
      mode: 'ICN_TAKEOFF_CIRCUIT',
      state: 'TAKEOFF_ROLL',
      speed: 85,
      heading: Math.PI
    });

    // [AI-13: 인천국제공항 16R 활주로 착륙 어프로치기 (A320 아시아나)]
    const icnLanding = this.createParkedAircraft('a320', 'asiana');
    icnLanding.position.set(160, 240, incheonZ + 6000);
    icnLanding.rotation.set(-0.04, 0, 0); // 북쪽(-Z 활주로) 향해 글라이드슬롭 정렬
    this.scene.add(icnLanding);
    this.aiAircraft.push({
      id: 'icn_landing',
      name: '아시아나 A320 [인천 16R 착륙 어프로치편]',
      mesh: icnLanding,
      mode: 'ICN_LANDING_CIRCUIT',
      state: 'FINAL_APPROACH',
      speed: 78,
      heading: 0
    });

    // [AI-14: 인천공항 관제탑 상공 홀딩 패턴 선회기 (B747 대한항공)]
    const icnHolding = this.createParkedAircraft('b747', 'korean');
    icnHolding.position.set(1600, 480, incheonZ);
    icnHolding.rotation.set(0, Math.PI, 0.26);
    this.scene.add(icnHolding);
    this.aiAircraft.push({
      id: 'icn_holding',
      name: '대한항공 B747 [인천공항 상공 대기 선회편]',
      mesh: icnHolding,
      mode: 'ICN_HOLDING',
      speed: 95,
      orbitAngle: 0
    });

    // [AI-15: 인천공항 15L 착륙 최종 접근기 (DC-10 삼발기)]
    const icnFinal2 = this.createParkedAircraft('dc10', 'asiana');
    icnFinal2.position.set(450, 320, incheonZ + 8500);
    icnFinal2.rotation.set(-0.04, 0, 0); // 북쪽(-Z 활주로) 향해 정렬
    this.scene.add(icnFinal2);
    this.aiAircraft.push({
      id: 'icn_final2',
      name: '아시아나 DC-10 [인천 15L 착륙 어프로치편]',
      mesh: icnFinal2,
      mode: 'ICN_LANDING_CIRCUIT_15L',
      state: 'FINAL_APPROACH',
      speed: 76,
      heading: 0
    });

    // [AI-16: 인천공항 유도로 택싱 지상 여객기 (A320)]
    const icnTaxi = this.createParkedAircraft('a320', 'korean');
    icnTaxi.position.set(-60, 2.12, incheonZ + 800);
    icnTaxi.rotation.set(0, 0, 0); // 북쪽(-Z) 주행 정렬
    this.incheonAirportGroup.add(icnTaxi);
    this.aiAircraft.push({
      id: 'icn_taxi',
      name: '대한항공 A320 [유도로 지상 유도 주행]',
      mesh: icnTaxi,
      mode: 'TAXIWAY_GROUND',
      speed: 18,
      minZ: incheonZ - 1400,
      maxZ: incheonZ + 1400,
      dir: -1
    });
  }

  // AI 여객기 경량 고품질 메쉬 생성 헬퍼
  createParkedAircraft(type, livery = 'korean') {
    const group = new THREE.Group();

    // 리버리별 색상 지정
    let bodyColor = 0xf8fafc;
    let cheatlineColor = 0x0284c7; // 기본 블루
    let tailColor = 0x0369a1;

    if (livery === 'korean') {
      bodyColor = 0xf0f9ff;
      cheatlineColor = 0x38bdf8; // 대한항공 스카이블루
      tailColor = 0x0284c7;
    } else if (livery === 'asiana') {
      bodyColor = 0xfafafa;
      cheatlineColor = 0xef4444; // 아시아나 색동 레드
      tailColor = 0xf59e0b;
    } else if (livery === 'cargo') {
      bodyColor = 0xe2e8f0;
      cheatlineColor = 0x475569;
      tailColor = 0x334155;
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.25 });
    const cheatlineMat = new THREE.MeshStandardMaterial({ color: cheatlineColor, roughness: 0.25 });
    const tailMat = new THREE.MeshStandardMaterial({ color: tailColor, roughness: 0.25 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });

    const isJumbo = (type === 'b747');
    const isConcorde = (type === 'concorde');
    const fRadius = isJumbo ? 3.4 : (type === 'dc10' ? 2.9 : (isConcorde ? 1.45 : 2.1));
    const fLength = isJumbo ? 38.0 : (type === 'dc10' ? 30.0 : (isConcorde ? 44.0 : 22.0));
    const wingSpan = isJumbo ? 34.0 : (type === 'dc10' ? 24.0 : (isConcorde ? 17.5 : 18.0));

    // 1. 동체 (Fuselage)
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(fRadius, fRadius, fLength, 18), bodyMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.position.y = fRadius + 2.2;
    fuse.castShadow = true;
    group.add(fuse);

    // B747 2층 어퍼덱 험프
    if (isJumbo) {
      const hump = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 15, 16, 1, false, 0, Math.PI), bodyMat);
      hump.rotation.x = Math.PI / 2;
      hump.rotation.z = Math.PI;
      hump.position.set(0, fRadius + 3.2, -6.5);
      hump.scale.set(0.95, 1.0, 1.0);
      group.add(hump);
    }

    // 노즈 콘 (콩코드는 날카로운 롱 노즈)
    const noseLen = isConcorde ? 8.5 : fRadius * 2.8;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(fRadius, noseLen, 18), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, fRadius + 2.2, -fLength / 2 - (noseLen / 2));
    if (isConcorde) nose.rotation.x = -Math.PI / 2 + 0.08; // 드룹 노즈 살짝 처짐
    group.add(nose);

    // 윈드실드
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(fRadius * 0.9, 1.1, 1.8), glassMat);
    windshield.position.set(0, fRadius + (isJumbo ? 4.2 : (isConcorde ? 2.5 : 3.0)), -fLength / 2 - 1.2);
    windshield.rotation.x = isConcorde ? 0.22 : 0.38;
    group.add(windshield);

    // 치트라인 띠
    const cheatline = new THREE.Mesh(new THREE.CylinderGeometry(fRadius + 0.05, fRadius + 0.05, fLength * 0.85, 18), cheatlineMat);
    cheatline.rotation.x = Math.PI / 2;
    cheatline.position.set(0, fRadius + 2.2, 0);
    cheatline.scale.set(1.01, 1.0, 0.15);
    group.add(cheatline);

    // 2. 주익 날개 (Wings) - 콩코드는 거대 델타익
    if (isConcorde) {
      const deltaWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.35, 24.0), wingMat);
      deltaWing.position.set(0, fRadius + 1.6, 3.5);
      deltaWing.rotation.x = 0.04;
      group.add(deltaWing);
    } else {
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.45, isJumbo ? 7.5 : 4.8), wingMat);
      wingL.position.set(-wingSpan / 2, fRadius + 1.8, 0);
      wingL.rotation.y = 0.35;
      wingL.rotation.z = 0.06;
      wingL.castShadow = true;
      group.add(wingL);

      const wingR = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.45, isJumbo ? 7.5 : 4.8), wingMat);
      wingR.position.set(wingSpan / 2, fRadius + 1.8, 0);
      wingR.rotation.y = -0.35;
      wingR.rotation.z = -0.06;
      wingR.castShadow = true;
      group.add(wingR);

      // 윙렛
      [-1, 1].forEach(side => {
        const wlet = new THREE.Mesh(new THREE.BoxGeometry(0.28, isJumbo ? 3.4 : 2.2, 1.8), cheatlineMat);
        wlet.position.set(side * wingSpan, fRadius + 3.0, -side * 2.5);
        wlet.rotation.y = -side * 0.35;
        group.add(wlet);
      });
    }

    // 3. 제트 엔진 (Engines)
    if (isConcorde) {
      // 콩코드 하부 4연장 사각 나셀 팩
      [-4.5, 4.5].forEach(ex => {
        const engBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 8.5), bodyMat);
        engBox.position.set(ex, fRadius + 0.6, 6.5);
        engBox.castShadow = true;
        group.add(engBox);

        // 배기 노즐 2기
        [-0.8, 0.8].forEach(nx => {
          const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.60, 1.4, 12), chromeMat);
          nozzle.rotation.x = Math.PI / 2;
          nozzle.position.set(ex + nx, fRadius + 0.6, 11.2);
          group.add(nozzle);
        });
      });
    } else {
      const engineCount = isJumbo ? 4 : (type === 'dc10' ? 3 : 2);
      const engXPositions = isJumbo ? [-14, -8, 8, 14] : (type === 'dc10' ? [-8.5, 8.5] : [-6.5, 6.5]);
      engXPositions.forEach(ex => {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.05, 4.6, 14), bodyMat);
        eng.rotation.x = Math.PI / 2;
        eng.position.set(ex, fRadius + 0.5, 0.5);
        eng.castShadow = true;
        group.add(eng);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 8, 16), chromeMat);
        lip.position.set(ex, fRadius + 0.5, -1.8);
        group.add(lip);
      });
    }

    if (type === 'dc10') {
      // 꼬리날개 중앙 2번 엔진
      const tailEng = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.15, 5.0, 14), bodyMat);
      tailEng.rotation.x = Math.PI / 2;
      tailEng.position.set(0, fRadius + 8.5, fLength / 2 - 2.5);
      group.add(tailEng);
    }

    // 4. 수직 꼬리날개 (Vertical Fin)
    const finHeight = isJumbo ? 9.5 : (type === 'dc10' ? 8.2 : 6.8);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, finHeight, 5.5), tailMat);
    fin.position.set(0, fRadius + 2.2 + finHeight / 2, fLength / 2 - 2.2);
    fin.rotation.x = -0.35;
    fin.castShadow = true;
    group.add(fin);

    // 수평 미익
    const hStab = new THREE.Mesh(new THREE.BoxGeometry(wingSpan * 0.45, 0.35, 3.2), wingMat);
    hStab.position.set(0, fRadius + 3.8, fLength / 2 - 1.5);
    group.add(hStab);

    // 5. 랜딩기어 바퀴
    [-2.8, 2.8].forEach(wx => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.5, 12), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.78, 1.5);
      group.add(wheel);
    });
    const noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 10), tireMat);
    noseWheel.rotation.z = Math.PI / 2;
    noseWheel.position.set(0, 0.6, -fLength / 2 + 2.5);
    group.add(noseWheel);

    return group;
  }

  // ----------------------------------------------------------------
  // 4-C. 공항 리무진 버스 터미널 도착/정차/출발 시스템 (Bus Arrival Loop)
  // - 공항 리무진 버스, KAL 리무진, 터미널 셔틀 등 24대 실시간 도착 연출
  // ----------------------------------------------------------------
  initAirportBuses() {
    this.airportBuses = [];
    const incheonZ = -45000;

    const busTypes = [
      { name: 'limousine', color: 0x1e3a8a, label: '인천공항 리무진' }, // 네이비
      { name: 'kal',       color: 0x0284c7, label: 'KAL 리무진' },     // 스카이블루
      { name: 'express',   color: 0xdc2626, label: '경기 공항버스' },   // 레드
      { name: 'shuttle',   color: 0x16a34a, label: '터미널 무료셔틀' }  // 그린
    ];

    // 터미널 1층 입국장 & 3층 출국장 승강장에 도착하고 순환하는 버스 20대
    for (let b = 0; b < 20; b++) {
      const bInfo = busTypes[b % busTypes.length];
      const isDeparture = (b % 2 === 0); // 3층 출국장(고가) vs 1층 입국장(지상)
      const busMesh = this.createAirportBusMesh(bInfo.color, bInfo.label);

      const targetX = isDeparture ? -555 : -588;
      const targetY = isDeparture ? 14.5 : 2.14;
      // 정류장 정차 구간: Z = incheonZ - 350 ~ incheonZ + 350
      const stopZ = incheonZ - 320 + (b / 20) * 640;

      busMesh.position.set(targetX, targetY, incheonZ + 1200 - b * 150);
      busMesh.rotation.y = Math.PI; // 남쪽 -> 북쪽 방향 주행
      this.incheonAirportGroup.add(busMesh);

      this.airportBuses.push({
        mesh: busMesh,
        speed: 18 + Math.random() * 6,
        isDeparture,
        targetX,
        targetY,
        stopZ,
        state: 'APPROACHING', // 'APPROACHING' | 'STOPPED' | 'DEPARTING'
        stopTimer: 0,
        stopDuration: 5.5 + Math.random() * 5.0, // 5~10초간 승강장에 정차
        minZ: incheonZ - 900,
        maxZ: incheonZ + 1500
      });
    }
  }

  // 공항 리무진 버스 정밀 3D 모델링
  createAirportBusMesh(color, label = '공항 리무진') {
    const v = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.35 });
    const whiteRoofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.95 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const bW = 2.8, bH = 3.4, bL = 12.5;

    // 하부 차체 바디
    const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH * 0.55, bL), bodyMat);
    body.position.y = (bH * 0.55) / 2 + 0.6;
    body.castShadow = true;
    v.add(body);

    // 파노라마 창문 띠
    const windowBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.05, 1.25, bL - 1.2), glassMat);
    windowBand.position.set(0, 2.35, 0);
    v.add(windowBand);

    // 화이트 루프 패널
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.4, bL), whiteRoofMat);
    roof.position.set(0, 3.15, 0);
    roof.castShadow = true;
    v.add(roof);

    // 루프 상단 에어컨 공조기 유닛
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.8), whiteRoofMat);
    acUnit.position.set(0, 3.45, 0.5);
    v.add(acUnit);

    // 대형 전면 곡면 윈드실드
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.2, 1.8, 0.4), glassMat);
    windshield.position.set(0, 2.1, -bL / 2 - 0.05);
    windshield.rotation.x = -0.15;
    v.add(windshield);

    // 헤드라이트 & 테일라이트
    [-bW * 0.38, bW * 0.38].forEach(hx => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.2), lightMat);
      hl.position.set(hx, 0.9, -bL / 2 - 0.08);
      v.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.2), tailMat);
      tl.position.set(hx, 0.9, bL / 2 + 0.08);
      v.add(tl);
    });

    // 휠 6개 (전방 1축, 후방 2축 대형 리무진 구조)
    [-bL * 0.36, bL * 0.24, bL * 0.36].forEach(wZ => {
      [-bW / 2 - 0.1, bW / 2 + 0.1].forEach(wX => {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 12), wheelMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(wX, 0.62, wZ);
        tire.castShadow = true;
        v.add(tire);
      });
    });

    return v;
  }

  // 공항 리무진 버스 실시간 이동 및 승강장 정차/출발 루프
  updateAirportBuses(dt) {
    if (!this.airportBuses || this.airportBuses.length === 0) return;

    this.airportBuses.forEach(b => {
      if (b.state === 'APPROACHING') {
        // 승강장 방면으로 주행 (Z 감소)
        b.mesh.position.z -= b.speed * dt;

        // 정류장(stopZ) 근처에 도달하면 감속 및 정차!
        if (Math.abs(b.mesh.position.z - b.stopZ) < 8.0) {
          b.mesh.position.z = b.stopZ;
          b.state = 'STOPPED';
          b.stopTimer = 0;
        }
      } else if (b.state === 'STOPPED') {
        // 정류장에 정차하여 승객 승하차 대기 (비상등 점멸)
        b.stopTimer += dt;
        if (b.stopTimer >= b.stopDuration) {
          // 승객 승하차 완료 -> 다시 출발!
          b.state = 'DEPARTING';
        }
      } else if (b.state === 'DEPARTING') {
        // 다시 가속하며 터미널 탈출
        b.mesh.position.z -= (b.speed * 1.1) * dt;

        // 터미널 순환로 끝에 도달하면 다시 고속도로에서 진입하도록 루프
        if (b.mesh.position.z < b.minZ) {
          b.mesh.position.z = b.maxZ;
          b.state = 'APPROACHING';
        }
      }
    });
  }

  // AI 여객기 활주로 이착륙 활주, 고공 순항 및 공역 비행 실시간 업데이트 (진행 방향과 기수 100% 일치)
  updateAIAircraft(dt) {
    if (!this.aiAircraft || this.aiAircraft.length === 0) return;

    this.aiContrailTimer = (this.aiContrailTimer || 0) + dt;
    const shouldSpawnContrail = (this.aiContrailTimer >= 0.05); // 0.05초마다 굵고 웅장한 비행운 분출
    if (shouldSpawnContrail) this.aiContrailTimer = 0;

    const incheonZ = -45000;
    const playerPos = this.planeGroup ? this.planeGroup.position : new THREE.Vector3(0, 0, 0);

    this.aiAircraft.forEach(ai => {
      const p = ai.mesh.position;

      // ------------------------------------------------------------
      // 1. [AI-1] 출발 해상공항 36R 활주로 쾌속 이륙 서킷 (A320 대한항공)
      // - 플레이어 바로 옆 활주로에서 굉음을 내며 북쪽(-Z)으로 가속 질주 후 이륙!
      // ------------------------------------------------------------
      if (ai.mode === 'DEP_TAKEOFF_CIRCUIT') {
        if (ai.state === 'TAKEOFF_ROLL') {
          ai.speed = Math.min(105, ai.speed + dt * 38);
          p.z -= ai.speed * dt; // 북쪽 방향 고속 질주 (1200 -> -350)
          p.y = 2.12;
          p.x = -120;
          ai.mesh.rotation.set(0, 0, 0); // 북쪽(-Z) 정면 전진

          if (p.z < -350) {
            ai.state = 'LIFTOFF_CLIMB';
          }
        } else if (ai.state === 'LIFTOFF_CLIMB') {
          p.z -= ai.speed * dt;
          p.y += (ai.speed * 0.42) * dt;
          ai.mesh.rotation.set(0.22, 0, 0); // 북쪽을 보며 기수 상승 (피치 업)

          if (p.y >= 260) {
            ai.state = 'CIRCUIT_ORBIT';
            ai.orbitAngle = Math.PI; // -Z 위치에서 원형 궤도 자연스럽게 연결
          }
        } else if (ai.state === 'CIRCUIT_ORBIT') {
          ai.orbitAngle += dt * 0.38;
          p.x = Math.cos(ai.orbitAngle) * 1400;
          p.z = Math.sin(ai.orbitAngle) * 1400;
          p.y = 260;
          // 접선 속도 방향: Math.PI - ai.orbitAngle, 좌선회 뱅크: 0.26
          ai.mesh.rotation.set(0, Math.PI - ai.orbitAngle, 0.26);

          if (ai.orbitAngle >= Math.PI * 3) {
            ai.state = 'APPROACH_LAND';
          }
        } else if (ai.state === 'APPROACH_LAND') {
          p.x = THREE.MathUtils.lerp(p.x, -120, 0.06);
          p.z -= 65 * dt; // 북쪽으로 강하 접근
          p.y = THREE.MathUtils.lerp(p.y, 2.12, 0.045);
          ai.mesh.rotation.set(-0.04, 0, 0); // 북쪽을 보며 부드러운 착륙 강하각

          if (p.y <= 2.4 && p.z <= 600) {
            p.y = 2.12;
            p.z = 1400;
            ai.speed = 30;
            ai.state = 'TAKEOFF_ROLL';
            this.createTouchdownSmoke(new THREE.Vector3(-120, 2.12, 600));
          }
        }
      }

      // ------------------------------------------------------------
      // 2. [AI-2] 출발 해상공항 상공 저고도 가로지르기 (B747 대한항공)
      // - 출발 활주로 앞바다 하늘(고도 190m)을 서->동(+X)으로 웅장하게 횡단!
      // ------------------------------------------------------------
      else if (ai.mode === 'DEP_CROSSING') {
        p.x += ai.speed * dt; // 동쪽(+X)으로 전진 비행
        p.y = 190;
        p.z = 400;
        ai.mesh.rotation.set(0, -Math.PI / 2, 0); // 동쪽(+X) 정면 비행
        if (p.x > 2500) {
          p.x = -2500; // 서쪽에서 다시 횡단 루프
        }
      }

      // ------------------------------------------------------------
      // 3. [AI-3] 출발 해상공항 36L 활주로 접근 착륙기 (MD-80 스카이)
      // - 남쪽 바다에서 북쪽(-Z) 활주로를 향해 똑바로 하강 접근!
      // ------------------------------------------------------------
      else if (ai.mode === 'DEP_LANDING_CIRCUIT') {
        p.z -= ai.speed * dt; // 북쪽(-Z)으로 진입
        p.y = Math.max(2.12, p.y - dt * 18.0);
        p.x = 160;
        ai.mesh.rotation.set(-0.04, 0, 0); // 북쪽 정면 착륙 강하
        if (p.y <= 2.2 && p.z < 200) {
          this.createTouchdownSmoke(p.clone());
          p.z = 3500; // 남쪽 바다에서 다시 착륙 접근 루프
          p.y = 260;
        }
      }

      // ------------------------------------------------------------
      // 4. [AI-4] 출발 해상공항 바다 상공 웅장한 선회기 (DC-10 삼발기)
      // ------------------------------------------------------------
      else if (ai.mode === 'DEP_ORBIT') {
        ai.orbitAngle = (ai.orbitAngle || 0) + dt * 0.28;
        const r = ai.orbitRadius || 1800;
        p.x = Math.cos(ai.orbitAngle) * r;
        p.z = Math.sin(ai.orbitAngle) * r;
        p.y = ai.orbitAlt || 280;
        ai.mesh.rotation.set(0, Math.PI - ai.orbitAngle, 0.26); // 진행 방향 일치 + 뱅크각
      }

      // ------------------------------------------------------------
      // 5. [AI-5] 플레이어 전방 편대 선도 순항기 (A320 아시아나)
      // - 플레이어 앞쪽 700m 상공에서 북쪽(-Z)으로 앞서 비행!
      // ------------------------------------------------------------
      else if (ai.mode === 'PROX_LEAD') {
        const targetZ = playerPos.z - 750;
        p.z = THREE.MathUtils.lerp(p.z, targetZ, 0.05);
        p.x = THREE.MathUtils.lerp(p.x, playerPos.x + 120, 0.03);
        p.y = THREE.MathUtils.lerp(p.y, Math.max(80, playerPos.y + 35), 0.04);
        ai.mesh.rotation.set(0, 0, 0); // 북쪽(-Z) 정면 비행
      }

      // ------------------------------------------------------------
      // 6. [AI-6 & 7] 플레이어 근접 대항 교차기 (Head-on Close Crossing)
      // - 남쪽(+Z)을 똑바로 바라보며 남하하여 마주쳐 스쳐 지나감!
      // ------------------------------------------------------------
      else if (ai.mode === 'PROX_HEADON') {
        p.z += ai.speed * dt; // 남쪽(+Z)으로 비행
        p.x = playerPos.x + (ai.offsetSide || -300);
        ai.mesh.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 정면 비행!

        // 플레이어 뒤쪽 1200m로 벗어나면 다시 플레이어 전방 2200m에 리스폰!
        if (p.z > playerPos.z + 1200) {
          p.z = playerPos.z - 2200;
          p.y = Math.max(90, playerPos.y + 40 + Math.random() * 60);
        }
      }

      // ------------------------------------------------------------
      // 7. [AI-8, 10] 200km 대륙 항로 북상 순항기들 (A320, Concorde)
      // - 북쪽(-Z)을 바라보며 순항!
      // ------------------------------------------------------------
      else if (ai.mode === 'ENROUTE_NORTH') {
        p.z -= ai.speed * dt; // 북쪽 이동
        ai.mesh.rotation.set(0, 0, 0); // 북쪽(-Z) 정면
        if (p.z < incheonZ - 3000) {
          p.z = 2500;
        }
      }

      // ------------------------------------------------------------
      // 8. [AI-9, 11] 200km 대륙 항로 남하 순항기들 (DC-10, MD-80)
      // - 남쪽(+Z)을 바라보며 순항!
      // ------------------------------------------------------------
      else if (ai.mode === 'ENROUTE_SOUTH') {
        p.z += ai.speed * dt; // 남쪽 이동
        ai.mesh.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 정면
        if (p.z > 2500) {
          p.z = incheonZ - 3000;
        }
      }

      // ------------------------------------------------------------
      // 9. [AI-12] 인천국제공항 15L 활주로 전담 연속 이륙기 (B747 점보)
      // - 인천 15L 활주로에서 남쪽(+Z)으로 활주/이륙 후 서킷 비행!
      // ------------------------------------------------------------
      else if (ai.mode === 'ICN_TAKEOFF_CIRCUIT') {
        if (ai.state === 'TAKEOFF_ROLL') {
          ai.speed = Math.min(105, ai.speed + dt * 32);
          p.z += ai.speed * dt; // 남쪽을 향해 활주로 질주
          p.y = 2.12;
          p.x = 450;
          ai.mesh.rotation.set(0, Math.PI, 0); // 남쪽 정면 활주

          if (p.z > incheonZ + 1800) {
            ai.state = 'ROTATION_CLIMB';
          }
        } else if (ai.state === 'ROTATION_CLIMB') {
          p.z += ai.speed * dt;
          p.y += (ai.speed * 0.42) * dt;
          ai.mesh.rotation.set(0.22, Math.PI, 0); // 남쪽을 보며 기수 상승

          if (p.y >= 380) {
            ai.state = 'DOWNWIND_CRUISE';
          }
        } else if (ai.state === 'DOWNWIND_CRUISE') {
          p.z -= ai.speed * dt; // 북쪽(-Z)으로 순항
          p.x = 1200;
          p.y = 420;
          ai.mesh.rotation.set(0, 0, 0); // 북쪽 정면 비행

          if (p.z < incheonZ - 3800) {
            ai.state = 'BASE_FINAL';
          }
        } else if (ai.state === 'BASE_FINAL') {
          p.z += ai.speed * dt * 0.45; // 남쪽(+Z)으로 강하 접근
          p.x = THREE.MathUtils.lerp(p.x, 450, 0.05);
          p.y = THREE.MathUtils.lerp(p.y, 2.12, 0.04);
          ai.mesh.rotation.set(-0.04, Math.PI, 0); // 남쪽을 보며 강하

          if (p.y <= 2.8 && Math.abs(p.x - 450) < 35) {
            ai.state = 'TAKEOFF_ROLL';
            p.y = 2.12;
            p.x = 450;
            p.z = incheonZ - 1500;
            ai.speed = 35;
            this.createTouchdownSmoke(p.clone());
          }
        }
      }

      // ------------------------------------------------------------
      // 10. [AI-13, 15] 인천국제공항 활주로 착륙 어프로치기들
      // - 대륙 쪽에서 북쪽(인천공항 -Z)을 향해 똑바로 강하 접근!
      // ------------------------------------------------------------
      else if (ai.mode === 'ICN_LANDING_CIRCUIT' || ai.mode === 'ICN_LANDING_CIRCUIT_15L') {
        const rwyX = ai.mode === 'ICN_LANDING_CIRCUIT' ? 160 : 450;
        p.z -= ai.speed * dt; // 북쪽 이동
        p.y = Math.max(2.12, p.y - dt * 16.0);
        p.x = rwyX;
        ai.mesh.rotation.set(-0.04, 0, 0); // 북쪽 정면 착륙 강하

        if (p.z <= incheonZ + 1200) {
          p.y = 2.12;
          this.createTouchdownSmoke(p.clone());
          p.z = incheonZ + 8000;
          p.y = 280;
        }
      }

      // ------------------------------------------------------------
      // 11. [AI-14] 인천공항 상공 홀딩 패턴 선회기 (B747)
      // ------------------------------------------------------------
      else if (ai.mode === 'ICN_HOLDING') {
        ai.orbitAngle = (ai.orbitAngle || 0) + dt * 0.28;
        p.x = Math.cos(ai.orbitAngle) * 1600;
        p.z = incheonZ + Math.sin(ai.orbitAngle) * 1600;
        p.y = 480;
        ai.mesh.rotation.set(0, Math.PI - ai.orbitAngle, 0.26); // 진행 방향 일치 + 뱅크각
      }

      // ------------------------------------------------------------
      // 12. [AI-16] 인천공항 지상 유도로 택싱기 (A320)
      // ------------------------------------------------------------
      else if (ai.mode === 'TAXIWAY_GROUND') {
        p.z += ai.dir * ai.speed * dt;
        if (p.z < incheonZ - 1400) {
          p.z = incheonZ - 1400;
          ai.dir = 1; // 남쪽으로 전환
          ai.mesh.rotation.y = Math.PI; // 남쪽 정면 바라봄!
        } else if (p.z > incheonZ + 1400) {
          p.z = incheonZ + 1400;
          ai.dir = -1; // 북쪽으로 전환
          ai.mesh.rotation.y = 0; // 북쪽 정면 바라봄!
        } else {
          ai.mesh.rotation.y = (ai.dir === 1) ? Math.PI : 0;
        }
      }

      // ★ 비행 중인 모든 항공기 양 날개 2줄 선명한 제트 비행운(Contrail) 분출! (고도 35m 이상)
      if (shouldSpawnContrail && p.y > 35 && ai.mode !== 'TAXIWAY_GROUND') {
        this.createContrailParticle(p, ai.mesh.quaternion, -6.5);
        this.createContrailParticle(p, ai.mesh.quaternion, 6.5);
      }
    });
  }

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
  }

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
  }

  // ----------------------------------------------------------------
  // 4-B. 대륙 메트로폴리스 도시, 빽빽한 주택가, 해변 휴양객 및 움직이는 자동차 & 보행자 시스템
  // ----------------------------------------------------------------
  initContinentalCityAndBeach() {
    this.cityGroup = new THREE.Group();
    this.movingVehicles = [];
    this.movingPedestrians = [];
    this.beachPeople = [];
    this.cityNightLights = [];

    // 공용 재질들
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 });
    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const grassPlotMat = new THREE.MeshLambertMaterial({ color: 0x22543d });

    // --------------------------------------------------------------
    // 1. 대륙 간선 도로망 (Highways & City Roadways)
    // --------------------------------------------------------------
    // 1) 동서 해안 메가 고속도로 (Coastal Expressway: Z = -28350, 폭 32m, 길이 12,000m)
    const coastalHwy = new THREE.Mesh(new THREE.PlaneGeometry(12000, 32), roadMat);
    coastalHwy.rotation.x = -Math.PI / 2;
    coastalHwy.position.set(0, 0.08, -28350);
    this.cityGroup.add(coastalHwy);

    // 중앙 황색 차선
    const coastalLine = new THREE.Mesh(new THREE.PlaneGeometry(12000, 0.8), roadLineMat);
    coastalLine.rotation.x = -Math.PI / 2;
    coastalLine.position.set(0, 0.09, -28350);
    this.cityGroup.add(coastalLine);

    // 2) 대륙 공항 직통 대로 (Airport Grand Boulevard: X = -580, Z = -28350 ~ -46000, 폭 28m)
    const airportHwy = new THREE.Mesh(new THREE.PlaneGeometry(28, 17650), roadMat);
    airportHwy.rotation.x = -Math.PI / 2;
    airportHwy.position.set(-580, 0.08, -37175);
    this.cityGroup.add(airportHwy);

    const airportHwyLine = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 17650), roadLineMat);
    airportHwyLine.rotation.x = -Math.PI / 2;
    airportHwyLine.position.set(-580, 0.09, -37175);
    this.cityGroup.add(airportHwyLine);

    // 3) 도시 횡단 간선도로 5개 노선 (City Arterial Super-Avenues: 길이 14,000m 광활 확장)
    [-31000, -34500, -38000, -41500, -48000].forEach(zRoad => {
      const cityAve = new THREE.Mesh(new THREE.PlaneGeometry(14000, 26), roadMat);
      cityAve.rotation.x = -Math.PI / 2;
      cityAve.position.set(0, 0.08, zRoad);
      this.cityGroup.add(cityAve);

      const aveLine = new THREE.Mesh(new THREE.PlaneGeometry(14000, 0.7), roadLineMat);
      aveLine.rotation.x = -Math.PI / 2;
      aveLine.position.set(0, 0.09, zRoad);
      this.cityGroup.add(aveLine);
    });

    // 4) 동부 신도시 남북 간선대로 (East Metropolis Boulevard: X = 1600, Z = -28350 ~ -49000, 폭 26m)
    const eastHwy = new THREE.Mesh(new THREE.PlaneGeometry(26, 20650), roadMat);
    eastHwy.rotation.x = -Math.PI / 2;
    eastHwy.position.set(1600, 0.08, -38675);
    this.cityGroup.add(eastHwy);

    const eastHwyLine = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 20650), roadLineMat);
    eastHwyLine.rotation.x = -Math.PI / 2;
    eastHwyLine.position.set(1600, 0.09, -38675);
    this.cityGroup.add(eastHwyLine);

    // 5) 서부 해안 산업지구 남북 대로 (West Waterfront Boulevard: X = -2800, Z = -28350 ~ -46000, 폭 24m)
    const westHwy = new THREE.Mesh(new THREE.PlaneGeometry(24, 17650), roadMat);
    westHwy.rotation.x = -Math.PI / 2;
    westHwy.position.set(-2800, 0.08, -37175);
    this.cityGroup.add(westHwy);

    // --------------------------------------------------------------
    // 2. 3D 자동차 생성 헬퍼 (Moving Vehicle Builder)
    // --------------------------------------------------------------
    const carColors = [0xef4444, 0x2563eb, 0xf59e0b, 0x10b981, 0xf8fafc, 0x0f172a, 0x64748b, 0x8b5cf6];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const wheelHubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    const createVehicle = (type, color) => {
      const v = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.35 });
      const wheels = [];

      let bW = 2.0, bH = 1.4, bL = 4.6, cabinL = 2.4, cabinH = 0.9, cabinZ = -0.15;
      if (type === 'bus') {
        bW = 2.7; bH = 3.2; bL = 12.0;
        const busBody = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bL), bodyMat);
        busBody.position.y = bH / 2 + 0.6;
        busBody.castShadow = true;
        v.add(busBody);

        // 버스 승객 창문 띠
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 1.2, bL - 1.2), glassMat);
        winBand.position.set(0, bH - 0.5 + 0.6, 0);
        v.add(winBand);

        // 휠 4개 (전후)
        [-bL * 0.35, bL * 0.35].forEach(wZ => {
          [-bW / 2 - 0.1, bW / 2 + 0.1].forEach(wX => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 12), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);
            wGroup.position.set(wX, 0.65, wZ);
            v.add(wGroup);
            wheels.push(wGroup);
          });
        });
      } else if (type === 'truck') {
        bW = 2.5; bH = 3.4; bL = 8.5;
        // 운전석 캡
        const cab = new THREE.Mesh(new THREE.BoxGeometry(bW, 2.4, 2.6), bodyMat);
        cab.position.set(0, 1.8, -2.6);
        cab.castShadow = true;
        v.add(cab);

        // 윈드실드
        const cabWin = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.05, 0.9, 1.2), glassMat);
        cabWin.position.set(0, 2.2, -2.8);
        v.add(cabWin);

        // 후방 화물 컨테이너
        const cargoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, bH, 5.4), cargoMat);
        cargo.position.set(0, bH / 2 + 0.6, 1.2);
        cargo.castShadow = true;
        v.add(cargo);

        [-3.0, 0.6, 2.6].forEach(wZ => {
          [-bW / 2 - 0.1, bW / 2 + 0.1].forEach(wX => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);
            wGroup.position.set(wX, 0.6, wZ);
            v.add(wGroup);
            wheels.push(wGroup);
          });
        });
      } else {
        // sedan or suv
        if (type === 'suv') {
          bW = 2.2; bH = 1.7; bL = 4.8; cabinL = 3.0; cabinH = 1.0; cabinZ = 0.2;
        }
        // 하부 차체
        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH * 0.55, bL), bodyMat);
        bodyMesh.position.y = (bH * 0.55) / 2 + 0.4;
        bodyMesh.castShadow = true;
        v.add(bodyMesh);

        // 상부 캐빈 & 글래스
        const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.88, cabinH, cabinL), glassMat);
        cabinMesh.position.set(0, bodyMesh.position.y + (bH * 0.55) / 2 + cabinH / 2 - 0.05, cabinZ);
        v.add(cabinMesh);

        // 루프 패널
        const roof = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.86, 0.12, cabinL * 0.95), bodyMat);
        roof.position.set(0, cabinMesh.position.y + cabinH / 2 + 0.06, cabinZ);
        v.add(roof);

        // 휠 4개
        [-bL * 0.32, bL * 0.32].forEach(wZ => {
          [-bW / 2 - 0.06, bW / 2 + 0.06].forEach(wX => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 8), wheelHubMat);
            hub.rotation.z = Math.PI / 2;
            wGroup.add(hub);

            wGroup.position.set(wX, 0.42, wZ);
            v.add(wGroup);
            wheels.push(wGroup);
          });
        });
      }

      // 전방 헤드라이트 (Light-On in Night)
      [-bW * 0.36, bW * 0.36].forEach(hX => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.15), headlightMat);
        hl.position.set(hX, 0.8, -bL / 2 - 0.05);
        v.add(hl);
      });

      // 후방 테일라이트
      [-bW * 0.36, bW * 0.36].forEach(tX => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.15), taillightMat);
        tl.position.set(tX, 0.8, bL / 2 + 0.05);
        v.add(tl);
      });

      return { mesh: v, wheels };
    };

    // --------------------------------------------------------------
    // 3. 도로 위를 달리는 수많은 움직이는 자동차들 배치 (65대)
    // --------------------------------------------------------------
    // 1) 해안 고속도로 (동서 주행 차량 24대: Z = -28350, 차선 2개 좌우 대향)
    for (let c = 0; c < 24; c++) {
      const isEast = (c % 2 === 0);
      const laneOffset = isEast ? -7.5 : 7.5;
      const type = (c % 5 === 0) ? 'bus' : ((c % 4 === 0) ? 'truck' : ((c % 3 === 0) ? 'suv' : 'sedan'));
      const color = carColors[c % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startX = -5500 + (c / 24) * 11000 + (Math.random() - 0.5) * 200;
      mesh.position.set(startX, 0.08, -28350 + laneOffset);
      mesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'x',
        dir: isEast ? 1 : -1,
        speed: 28 + Math.random() * 14, // 100~150 km/h 고속도로
        min: -6000,
        max: 6000
      });
    }

    // 2) 공항 접근 고속도로 (남북 주행 차량 22대: X = -580, Z = -28350 ~ -45800)
    for (let c = 0; c < 22; c++) {
      const isNorth = (c % 2 === 0);
      const laneOffset = isNorth ? -6.5 : 6.5;
      const type = (c % 4 === 0) ? 'bus' : ((c % 3 === 0) ? 'suv' : 'sedan');
      const color = carColors[(c + 3) % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startZ = -28500 - (c / 22) * 17000 + (Math.random() - 0.5) * 250;
      mesh.position.set(-580 + laneOffset, 0.08, startZ);
      mesh.rotation.y = isNorth ? Math.PI : 0;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        speed: 24 + Math.random() * 10,
        min: -45800,
        max: -28350
      });
    }

    // 3) 도시 5개 횡단 간선도로 주행 차량 30대
    [-31000, -34500, -38000, -41500, -48000].forEach((zRoad, rIdx) => {
      for (let c = 0; c < 6; c++) {
        const isEast = (c % 2 === 0);
        const laneOffset = isEast ? -6.0 : 6.0;
        const type = (c % 4 === 0) ? 'bus' : ((c % 3 === 0) ? 'suv' : 'sedan');
        const color = carColors[(c + rIdx * 2) % carColors.length];
        const { mesh, wheels } = createVehicle(type, color);

        const startX = -6000 + (c / 6) * 12000 + (Math.random() - 0.5) * 200;
        mesh.position.set(startX, 0.08, zRoad + laneOffset);
        mesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
        this.cityGroup.add(mesh);

        this.movingVehicles.push({
          mesh,
          wheels,
          axis: 'x',
          dir: isEast ? 1 : -1,
          speed: 20 + Math.random() * 10,
          min: -6800,
          max: 6800
        });
      }
    });

    // 4) 동부 신도시 남북 간선대로 주행 차량 16대 (X = 1600, Z = -28350 ~ -49000)
    for (let c = 0; c < 16; c++) {
      const isNorth = (c % 2 === 0);
      const laneOffset = isNorth ? -6.0 : 6.0;
      const type = (c % 3 === 0) ? 'suv' : ((c % 4 === 0) ? 'bus' : 'sedan');
      const color = carColors[(c + 5) % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startZ = -28500 - (c / 16) * 20000 + (Math.random() - 0.5) * 200;
      mesh.position.set(1600 + laneOffset, 0.08, startZ);
      mesh.rotation.y = isNorth ? Math.PI : 0;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        speed: 25 + Math.random() * 10,
        min: -49000,
        max: -28350
      });
    }

    // 5) 서부 해안 산업지구 남북 대로 주행 트럭/차량 12대 (X = -2800, Z = -28350 ~ -46000)
    for (let c = 0; c < 12; c++) {
      const isNorth = (c % 2 === 0);
      const laneOffset = isNorth ? -5.5 : 5.5;
      const type = (c % 2 === 0) ? 'truck' : 'sedan';
      const color = carColors[(c + 1) % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startZ = -28500 - (c / 12) * 17000 + (Math.random() - 0.5) * 200;
      mesh.position.set(-2800 + laneOffset, 0.08, startZ);
      mesh.rotation.y = isNorth ? Math.PI : 0;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        speed: 20 + Math.random() * 8,
        min: -46000,
        max: -28350
      });
    }

    // --------------------------------------------------------------
    // 4. 3D 사람 모델링 헬퍼 (Humanoid Builder)
    // --------------------------------------------------------------
    const skinTones = [0xfbcfe8, 0xfde047, 0xfcd34d, 0xd97706, 0xb45309];
    const clothColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xf8fafc, 0x0f172a];
    const hairColors = [0x0f172a, 0x78350f, 0xca8a04, 0x475569];

    const createHuman = (pose = 'walk', shirtColor, pantsColor) => {
      const h = new THREE.Group();
      const skin = skinTones[Math.floor(Math.random() * skinTones.length)];
      const skinMat = new THREE.MeshLambertMaterial({ color: skin });
      const sColor = shirtColor || clothColors[Math.floor(Math.random() * clothColors.length)];
      const pColor = pantsColor || clothColors[Math.floor(Math.random() * clothColors.length)];
      const shirtMat = new THREE.MeshLambertMaterial({ color: sColor });
      const pantsMat = new THREE.MeshLambertMaterial({ color: pColor });
      const hairMat = new THREE.MeshLambertMaterial({ color: hairColors[Math.floor(Math.random() * hairColors.length)] });

      // 머리 & 헤어
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
      head.position.y = 1.62;
      h.add(head);

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), hairMat);
      hair.position.set(0, 1.70, -0.04);
      hair.scale.set(1.0, 0.65, 1.05);
      h.add(hair);

      // 상체 몸통
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), shirtMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      h.add(torso);

      // 좌/우 다리 (걷기 피벗 장착)
      const legLGroup = new THREE.Group();
      legLGroup.position.set(-0.14, 0.82, 0);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.80, 0.20), pantsMat);
      legL.position.y = -0.40;
      legLGroup.add(legL);
      h.add(legLGroup);

      const legRGroup = new THREE.Group();
      legRGroup.position.set(0.14, 0.82, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.80, 0.20), pantsMat);
      legR.position.y = -0.40;
      legRGroup.add(legR);
      h.add(legRGroup);

      // 좌/우 팔
      const armLGroup = new THREE.Group();
      armLGroup.position.set(-0.32, 1.40, 0);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.16), skinMat);
      armL.position.y = -0.31;
      armLGroup.add(armL);
      h.add(armLGroup);

      const armRGroup = new THREE.Group();
      armRGroup.position.set(0.32, 1.40, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.16), skinMat);
      armR.position.y = -0.31;
      armRGroup.add(armR);
      h.add(armRGroup);

      if (pose === 'lie') {
        // 선베드에 누워있는 포즈 (90도 틸트)
        h.rotation.x = -Math.PI / 2;
        head.rotation.x = 0.25;
      } else if (pose === 'sit') {
        // 의자에 앉아있는 포즈
        legLGroup.rotation.x = -Math.PI / 2;
        legRGroup.rotation.x = -Math.PI / 2;
        torso.position.y = 0.85;
        head.position.y = 1.32;
        hair.position.y = 1.40;
        armLGroup.position.y = 1.10;
        armRGroup.position.y = 1.10;
        legLGroup.position.y = 0.52;
        legRGroup.position.y = 0.52;
      }

      return { mesh: h, legL: legLGroup, legR: legRGroup, armL: armLGroup, armR: armRGroup, pose };
    };

    // --------------------------------------------------------------
    // 5. ★ 부산 해운대 스타일 초대형 해변가 휴양지 (Haeundae Beach Vacation Scene, Z = -28000)
    // --------------------------------------------------------------
    const parasolColors = [
      { c1: 0xef4444, c2: 0xf8fafc }, // 해운대 시그니처 레드/화이트
      { c1: 0x0284c7, c2: 0xf8fafc }, // 시원한 블루/화이트
      { c1: 0xfacc15, c2: 0x16a34a }, // 옐로우/그린
      { c1: 0xec4899, c2: 0xf8fafc }, // 핫핑크/화이트
      { c1: 0xf97316, c2: 0xfef08a }, // 오렌지/옐로우
      { c1: 0x06b6d4, c2: 0xf8fafc }  // 청록/화이트
    ];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.3 });
    const sunbedMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const towelColors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xfbbf24, 0xa855f7, 0xf97316];
    const tubeColors = [0xf43f5e, 0x06b6d4, 0xfacc15, 0x10b981, 0xa855f7];

    // 1) 해운대 상징 128개 파라솔 & 선베드 단지 (X = -3500 ~ +3500)
    for (let p = 0; p < 128; p++) {
      const pGroup = new THREE.Group();
      const pColor = parasolColors[p % parasolColors.length];

      // 파라솔 기둥
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), poleMat);
      pole.position.y = 1.6;
      pole.rotation.z = (Math.random() - 0.5) * 0.10;
      pGroup.add(pole);

      // 8각 삿갓 파라솔 캐노피
      const canGeo = new THREE.ConeGeometry(2.3, 1.05, 8);
      const canMat = new THREE.MeshLambertMaterial({ color: pColor.c1, side: THREE.DoubleSide });
      const canopy = new THREE.Mesh(canGeo, canMat);
      canopy.position.set(0, 3.1, 0);
      pGroup.add(canopy);

      // 파라솔 아래 선베드 2개 & 테이블
      [-0.95, 0.95].forEach((bedOffset, bIdx) => {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 2.1), sunbedMat);
        bed.position.set(bedOffset, 0.11, 0.25);
        bed.castShadow = true;
        pGroup.add(bed);

        const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.75), sunbedMat);
        backrest.position.set(bedOffset, 0.32, -0.6);
        backrest.rotation.x = -0.55;
        pGroup.add(backrest);

        // 선베드에 누워있는 사람 (Sunbather) 또는 앉아서 쉬는 사람
        const rand = Math.random();
        if (rand > 0.18) {
          const pose = (rand > 0.52) ? 'lie' : 'sit';
          const human = createHuman(pose);
          if (pose === 'lie') {
            human.mesh.position.set(bedOffset, 0.36, 0.25);
          } else {
            human.mesh.position.set(bedOffset, 0.15, -0.1);
            human.mesh.rotation.y = (bIdx === 0) ? 0.3 : -0.3;
          }
          pGroup.add(human.mesh);
          this.beachPeople.push(human);
        }
      });

      // 비치 미니 테이블 & 시원한 음료 캔
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.38, 8), poleMat);
      table.position.set(0, 0.19, 0.1);
      pGroup.add(table);
      const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 6), new THREE.MeshLambertMaterial({ color: pColor.c1 }));
      drink.position.set(0.08, 0.49, 0.1);
      pGroup.add(drink);

      const pX = -3450 + (p / 128) * 6900 + (Math.random() - 0.5) * 50;
      const pZ = -28070 + (p % 4) * 48 + (Math.random() - 0.5) * 20;
      pGroup.position.set(pX, 0.05, pZ);
      this.cityGroup.add(pGroup);
    }

    // 2) 모래사장 피크닉 돗자리 & 모래성 놀이 가족 그룹 28개소
    for (let m = 0; m < 28; m++) {
      const matGroup = new THREE.Group();
      const tColor = towelColors[m % towelColors.length];
      const matMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshLambertMaterial({ color: tColor, side: THREE.DoubleSide })
      );
      matMesh.rotation.x = -Math.PI / 2;
      matMesh.position.y = 0.06;
      matGroup.add(matMesh);

      // 돗자리에 옹기종기 모여 앉아 쉬는 사람들 (2~3명)
      const numSitters = 2 + (m % 2);
      for (let s = 0; s < numSitters; s++) {
        const sitter = createHuman('sit');
        const sAngle = (s / numSitters) * Math.PI * 2 + 0.3;
        sitter.mesh.position.set(Math.cos(sAngle) * 0.75, 0.06, Math.sin(sAngle) * 0.75);
        sitter.mesh.rotation.y = sAngle + Math.PI; // 중앙을 바라보며 마주 앉음
        matGroup.add(sitter.mesh);
        this.beachPeople.push(sitter);
      }

      // 모래성 (Sand Castle)
      if (m % 2 === 0) {
        const castleMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
        [-0.45, 0.45].forEach(cx => {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 8), castleMat);
          tower.position.set(cx + 1.4, 0.25, -0.2);
          matGroup.add(tower);
          const topCone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 8), castleMat);
          topCone.position.set(cx + 1.4, 0.65, -0.2);
          matGroup.add(topCone);
        });
      }

      const matX = -3200 + (m / 28) * 6400 + (Math.random() - 0.5) * 80;
      const matZ = -27920 + (m % 3) * 35;
      matGroup.position.set(matX, 0, matZ);
      this.cityGroup.add(matGroup);
    }

    // 3) 해운대 바닷가 파도 타기 & 알록달록 튜브 물놀이객 42명 (Beach Tube Swimmers)
    const tubeGeo = new THREE.TorusGeometry(0.72, 0.22, 8, 16);
    for (let sw = 0; sw < 42; sw++) {
      const swGroup = new THREE.Group();
      const tbColor = tubeColors[sw % tubeColors.length];
      const tbMat = new THREE.MeshLambertMaterial({ color: tbColor });
      const tubeMesh = new THREE.Mesh(tubeGeo, tbMat);
      tubeMesh.rotation.x = Math.PI / 2;
      tubeMesh.position.y = 0.25;
      swGroup.add(tubeMesh);

      // 튜브에 상체를 얹고 물놀이하는 사람
      const swimmer = createHuman('sit');
      swimmer.mesh.position.set(0, 0.05, 0);
      swimmer.mesh.rotation.y = (Math.random() - 0.5) * 1.5;
      swGroup.add(swimmer.mesh);

      const swX = -3300 + (sw / 42) * 6600 + (Math.random() - 0.5) * 60;
      const swZ = -27790 + (sw % 3) * 22; // 얕은 바닷물 라인
      const baseY = 0.45;
      swGroup.position.set(swX, baseY, swZ);
      this.cityGroup.add(swGroup);

      this.beachSwimmers.push({
        mesh: swGroup,
        baseY: baseY,
        phase: sw * 0.4
      });
      this.beachPeople.push(swimmer);
    }

    // 4) 해운대 해변 라이프가드 망루 3개소 (Lifeguard Towers)
    [-1400, 0, 1400].forEach((lgX, lgIdx) => {
      const lgGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
      const roofMatLg = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });

      // 4개 타워 기둥
      [-1.5, 1.5].forEach(kx => {
        [-1.5, 1.5].forEach(kz => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.5, 8), woodMat);
          post.position.set(kx, 2.25, kz);
          lgGroup.add(post);
        });
      });

      // 플랫폼 바닥
      const plat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 3.6), woodMat);
      plat.position.set(0, 4.3, 0);
      lgGroup.add(plat);

      // 빨간색 햇빛 차양 지붕
      const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), roofMatLg);
      lgRoof.position.set(0, 6.2, 0);
      lgRoof.rotation.y = Math.PI / 4;
      lgGroup.add(lgRoof);

      // 구명환 (Lifebuoy - 도넛)
      const buoy = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.12, 8, 12),
        new THREE.MeshLambertMaterial({ color: 0xef4444 })
      );
      buoy.position.set(1.85, 3.6, 0);
      buoy.rotation.y = Math.PI / 2;
      lgGroup.add(buoy);

      // 망루 위 감시 라이프가드 요원
      const guard = createHuman('walk', 0xef4444, 0xf8fafc);
      guard.mesh.position.set(0, 4.45, 0);
      lgGroup.add(guard.mesh);
      this.beachPeople.push(guard);

      lgGroup.position.set(lgX, 0.05, -27890);
      this.cityGroup.add(lgGroup);
    });

    // 5) 모래사장에 꽂혀 있는 컬러풀 서핑보드 군락 28개
    const boardColors = [0x0284c7, 0xef4444, 0xfacc15, 0x10b981, 0xa855f7, 0xf97316];
    for (let sb = 0; sb < 28; sb++) {
      const sbGroup = new THREE.Group();
      const col = boardColors[sb % boardColors.length];
      const boardMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.1 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.5, 0.08), boardMat);
      board.position.y = 1.0;
      board.rotation.x = -0.35;
      board.rotation.y = (Math.random() - 0.5) * 0.4;
      sbGroup.add(board);

      const sbX = -3100 + (sb / 28) * 6200 + (Math.random() - 0.5) * 40;
      sbGroup.position.set(sbX, 0.05, -27845 + (sb % 2) * 15);
      this.cityGroup.add(sbGroup);
    }

    // 6) 해운대 백사장 뒤편 야자수 가로수길 70여 그루 (Palm Trees)
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    for (let pl = 0; pl < 70; pl++) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 7.5, 8), palmTrunkMat);
      trunk.position.y = 3.75;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      palm.add(trunk);

      for (let lf = 0; lf < 6; lf++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2), palmLeafMat);
        leaf.position.set(0, 7.5, 0);
        leaf.rotation.y = (lf / 6) * Math.PI * 2;
        leaf.rotation.x = 0.75;
        palm.add(leaf);
      }

      const plX = -3500 + (pl / 70) * 7000 + (Math.random() - 0.5) * 35;
      palm.position.set(plX, 0.05, -28130 + (pl % 2) * 18);
      this.cityGroup.add(palm);
    }

    // 7) 해운대 비치 바 & 아이스크림 가판대 4개소 (Beach Snack Shack)
    [-2000, -700, 700, 2000].forEach((shkX, sIdx) => {
      const shack = new THREE.Group();
      const sBodyMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.7 });
      const sRoofMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

      const booth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 3.6), sBodyMat);
      booth.position.y = 1.4;
      shack.add(booth);

      const awning = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 4.2), sRoofMat);
      awning.position.set(0, 3.0, 0);
      shack.add(awning);

      const clerk = createHuman('walk', 0xf8fafc, 0xef4444);
      clerk.mesh.position.set(0, 0.05, 1.2);
      shack.add(clerk.mesh);

      const customer = createHuman('walk');
      customer.mesh.position.set(0.8, 0.05, 2.5);
      customer.mesh.rotation.y = Math.PI;
      shack.add(customer.mesh);

      this.beachPeople.push(clerk);
      this.beachPeople.push(customer);

      shack.position.set(shkX, 0.05, -28080);
      this.cityGroup.add(shack);
    });

    // 8) 비치발리볼 코트 4개소 (Beach Volleyball Courts)
    [-1000, -350, 450, 1100].forEach(vbX => {
      const vbGroup = new THREE.Group();
      [-4.0, 4.0].forEach(pX => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8), poleMat);
        p.position.set(pX, 1.75, 0);
        vbGroup.add(p);
      });
      const net = new THREE.Mesh(
        new THREE.PlaneGeometry(8.0, 1.2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, side: THREE.DoubleSide })
      );
      net.position.set(0, 2.6, 0);
      vbGroup.add(net);

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      ball.position.set(0.6, 3.6, -0.4);
      vbGroup.add(ball);

      // 4명의 비치발리볼 선수들
      [-2.2, 2.2].forEach(px => {
        [-1.8, 1.8].forEach(pz => {
          const player = createHuman('walk', 0xef4444, 0x3b82f6);
          player.mesh.position.set(px, 0.05, pz);
          player.mesh.rotation.y = (pz > 0) ? Math.PI : 0;
          vbGroup.add(player.mesh);
          this.beachPeople.push(player);
        });
      });

      vbGroup.position.set(vbX, 0.05, -27950);
      this.cityGroup.add(vbGroup);
    });

    // 9) 해변가에서 걸어다니는 휴양객 및 조깅객들 (Beach Walking Pedestrians 36명)
    for (let w = 0; w < 36; w++) {
      const isEast = (w % 2 === 0);
      const walker = createHuman('walk');
      const startX = -3200 + (w / 36) * 6400;
      walker.mesh.position.set(startX, 0.05, -27860 + (w % 4) * 22);
      walker.mesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
      this.cityGroup.add(walker.mesh);

      this.movingPedestrians.push({
        ...walker,
        axis: 'x',
        dir: isEast ? 1 : -1,
        walkSpeed: (w % 3 === 0) ? 2.8 : 1.4 + Math.random() * 0.5,
        walkPhase: Math.random() * Math.PI * 2,
        min: -3400,
        max: 3400
      });
      this.beachPeople.push(walker);
    }

    // --------------------------------------------------------------
    // 6. 빽빽한 교외 주택가 (Dense Suburban Houses - 140여 채)
    // --------------------------------------------------------------
    const roofColors = [0x991b1b, 0x1e3a8a, 0x334155, 0xb45309, 0x475569];
    const houseColors = [0xf8fafc, 0xfef3c7, 0xf1f5f9, 0xe2e8f0, 0xfde047];
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.7 });

    const createSuburbanHouse = () => {
      const hGroup = new THREE.Group();
      const rCol = roofColors[Math.floor(Math.random() * roofColors.length)];
      const hCol = houseColors[Math.floor(Math.random() * houseColors.length)];
      const wallMat = new THREE.MeshStandardMaterial({ color: hCol, roughness: 0.7 });
      const roofMat = new THREE.MeshStandardMaterial({ color: rCol, roughness: 0.5 });

      const w = 15, h = 6.8, d = 13;

      // 주택 본체 벽
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      walls.position.y = h / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      hGroup.add(walls);

      // 삼각 박공 지붕 (Gable Roof)
      const roofGeo = new THREE.ConeGeometry(w * 0.78, 4.5, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, h + 2.2, 0);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.0, 1.0, d / w);
      roof.castShadow = true;
      hGroup.add(roof);

      // 굴뚝
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 }));
      chimney.position.set(w * 0.3, h + 3.0, d * 0.2);
      hGroup.add(chimney);

      // 현관문 & 창문들
      const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.5, 0.2), doorMat);
      door.position.set(0, 1.75, d / 2 + 0.1);
      hGroup.add(door);

      [-3.8, 3.8].forEach(wx => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 0.15), winMat);
        win.position.set(wx, 3.6, d / 2 + 0.1);
        hGroup.add(win);
      });

      // 마당 잔디밭 구역
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(w + 10, d + 12), grassPlotMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(0, 0.02, 0);
      hGroup.add(lawn);

      // 진입로에 주차된 자가용
      const carColor = carColors[Math.floor(Math.random() * carColors.length)];
      const { mesh: parkedCar } = createVehicle('sedan', carColor);
      parkedCar.position.set(w / 2 + 3.2, 0.05, d / 2 - 2);
      parkedCar.rotation.y = (Math.random() - 0.5) * 0.2;
      hGroup.add(parkedCar);

      return hGroup;
    };

    // 대륙 남서부 교외 주택단지 (X = -1200 ~ -2800, Z = -29000 ~ -33000): 65채
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 9; c++) {
        const house = createSuburbanHouse();
        const hX = -2800 + c * 180 + (Math.random() - 0.5) * 20;
        const hZ = -29200 - r * 190 + (Math.random() - 0.5) * 20;
        house.position.set(hX, 0, hZ);
        this.cityGroup.add(house);
      }
    }

    // 대륙 남동부 교외 주택단지 (X = 1200 ~ 2800, Z = -29000 ~ -33000): 65채
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 9; c++) {
        const house = createSuburbanHouse();
        const hX = 1200 + c * 180 + (Math.random() - 0.5) * 20;
        const hZ = -29200 - r * 190 + (Math.random() - 0.5) * 20;
        house.position.set(hX, 0, hZ);
        this.cityGroup.add(house);
      }
    }

    // --------------------------------------------------------------
    // 7. 대형 메트로폴리스 고층 아파트 단지 & 빌딩 숲 (High-Rise City Towers)
    // --------------------------------------------------------------
    const towerFacadeColors = [0xf8fafc, 0xe2e8f0, 0x94a3b8, 0x64748b, 0x0284c7];
    const towerNightWindowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.1, // 야간 시 1.5로 부스트
      roughness: 0.3
    });
    this.cityNightLights.push(towerNightWindowMat);

    const createApartmentTower = (w, h, d, color) => {
      const tower = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 });

      // 본체 타워
      const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      core.position.y = h / 2;
      core.castShadow = true;
      core.receiveShadow = true;
      tower.add(core);

      // 격자 창문 배열 텍스처 대용 유리 블록 스트라이프
      const numFloors = Math.floor(h / 7);
      for (let f = 1; f < numFloors; f++) {
        const yFloor = f * 7;
        // 각 층 발코니
        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.2, 0.7, d + 1.2),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
        );
        balcony.position.set(0, yFloor, 0);
        tower.add(balcony);

        // 창문 띠 (Night-Glow Windows)
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 3.2, d + 0.2), towerNightWindowMat);
        winBand.position.set(0, yFloor + 2.2, 0);
        tower.add(winBand);
      }

      // 옥상 헬리패드 & 통신 안테나
      const roofTop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 3.5, d * 0.7), wallMat);
      roofTop.position.set(0, h + 1.75, 0);
      tower.add(roofTop);

      const helipad = new THREE.Mesh(
        new THREE.RingGeometry(w * 0.15, w * 0.25, 16),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
      );
      helipad.rotation.x = -Math.PI / 2;
      helipad.position.set(0, h + 3.6, 0);
      tower.add(helipad);

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 18, 8), poleMat);
      antenna.position.set(0, h + 12, 0);
      tower.add(antenna);

      // 옥상 항공 장애등 (Red Strobe)
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(0, h + 21, 0);
      tower.add(beacon);

      return tower;
    };

    // 1) 대륙 북서부 도심 아파트 단지 (X = -1500 ~ -3800, Z = -34000 ~ -41000): 18동
    for (let i = 0; i < 18; i++) {
      const w = 32 + (i % 3) * 12;
      const d = 26 + (i % 2) * 10;
      const h = 55 + (i * 7) % 65 + Math.random() * 25; // 55m ~ 135m 고층
      const col = towerFacadeColors[i % towerFacadeColors.length];
      const tower = createApartmentTower(w, h, d, col);

      const tX = -1600 - (i % 5) * 450 + (Math.random() - 0.5) * 50;
      const tZ = -34200 - Math.floor(i / 5) * 520 + (Math.random() - 0.5) * 60;
      tower.position.set(tX, 0, tZ);
      this.cityGroup.add(tower);
      this.registerObstacle(tower, `도심 아파트 타워 W${i + 1}`);
    }

    // 2) 대륙 북동부 도심 아파트 단지 (X = 1400 ~ 3800, Z = -34000 ~ -41000): 18동
    for (let i = 0; i < 18; i++) {
      const w = 30 + (i % 3) * 14;
      const d = 28 + (i % 2) * 8;
      const h = 60 + (i * 8) % 60 + Math.random() * 25; // 60m ~ 145m 초고층
      const col = towerFacadeColors[(i + 2) % towerFacadeColors.length];
      const tower = createApartmentTower(w, h, d, col);

      const tX = 1500 + (i % 5) * 450 + (Math.random() - 0.5) * 50;
      const tZ = -34200 - Math.floor(i / 5) * 520 + (Math.random() - 0.5) * 60;
      tower.position.set(tX, 0, tZ);
      this.cityGroup.add(tower);
      this.registerObstacle(tower, `도심 아파트 타워 E${i + 1}`);
    }

    // 3) ★ 대륙 도심 센트럴 비즈니스 지구 초고층 마천루 숲 (Downtown CBD Skyscrapers: 24동, 높이 110m~320m)
    // - 63빌딩 골드 타워, 롯데월드타워 스타일 유선형 스카이스크래퍼, IFC 랜드마크 타워
    const cbdGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.85 });
    const cbdGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.12, metalness: 0.92 });
    const cbdSilverMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.20, metalness: 0.70 });

    for (let c = 0; c < 24; c++) {
      const cbdGroup = new THREE.Group();
      const style = c % 3; // 0: Gold Tower, 1: Aero Skyscraper, 2: Glass Cube
      const towerH = 120 + (c * 17) % 190 + Math.random() * 30; // 120m ~ 320m 메가 스카이스크래퍼
      const baseW = 38 + (c % 4) * 8;
      const baseD = 36 + (c % 3) * 8;

      if (style === 0) {
        // 골드 커튼월 63빌딩 스타일 타워
        const core = new THREE.Mesh(new THREE.BoxGeometry(baseW, towerH, baseD), cbdGoldMat);
        core.position.y = towerH / 2;
        core.castShadow = true;
        cbdGroup.add(core);

        // 상단 사선 컷 루프
        const topSlope = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.65, 24, 4), cbdGoldMat);
        topSlope.position.set(0, towerH + 10, 0);
        topSlope.rotation.y = Math.PI / 4;
        cbdGroup.add(topSlope);
      } else if (style === 1) {
        // 롯데월드타워 스타일 유선형 초고층 스카이스크래퍼
        const core = new THREE.Mesh(new THREE.CylinderGeometry(baseW * 0.35, baseW * 0.65, towerH, 16), cbdGlassMat);
        core.position.y = towerH / 2;
        core.castShadow = true;
        cbdGroup.add(core);

        // 최상단 첨탑 안테나 (Spire)
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 35, 8), cbdSilverMat);
        spire.position.y = towerH + 17.5;
        cbdGroup.add(spire);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.y = towerH + 35;
        cbdGroup.add(beacon);
      } else {
        // IFC 메가 큐브 글래스 타워
        const core = new THREE.Mesh(new THREE.BoxGeometry(baseW, towerH, baseD), cbdGlassMat);
        core.position.y = towerH / 2;
        core.castShadow = true;
        cbdGroup.add(core);

        const crown = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.8, 14, baseD * 0.8), cbdSilverMat);
        crown.position.set(0, towerH + 7, 0);
        cbdGroup.add(crown);
      }

      // CBD 타워 배치 (도심 중앙 X = -1200 ~ +1200, Z = -35000 ~ -39500)
      const cbdX = -1000 + (c % 6) * 400 + (Math.random() - 0.5) * 60;
      const cbdZ = -35200 - Math.floor(c / 6) * 750 + (Math.random() - 0.5) * 60;
      cbdGroup.position.set(cbdX, 0, cbdZ);
      this.cityGroup.add(cbdGroup);
      this.registerObstacle(cbdGroup, `도심 마천루 타워 CBD #${c + 1}`);
    }

    // 4) 대륙 동부 광활한 신도시 아파트 단지 16동 추가 (X = 2200 ~ 4500, Z = -42000 ~ -48000)
    for (let i = 0; i < 16; i++) {
      const w = 34 + (i % 2) * 10;
      const d = 26 + (i % 3) * 6;
      const h = 65 + (i * 9) % 60 + Math.random() * 20;
      const col = towerFacadeColors[(i + 1) % towerFacadeColors.length];
      const tower = createApartmentTower(w, h, d, col);

      const tX = 2400 + (i % 4) * 480 + (Math.random() - 0.5) * 40;
      const tZ = -42500 - Math.floor(i / 4) * 650 + (Math.random() - 0.5) * 50;
      tower.position.set(tX, 0, tZ);
      this.cityGroup.add(tower);
      this.registerObstacle(tower, `동부 신도시 아파트 타워 #${i + 1}`);
    }

    // --------------------------------------------------------------
    // 8. 대륙 공항 앞 광장 & 터미널 주변 걸어다니는 사람들 (Pedestrians 30명)
    // --------------------------------------------------------------
    for (let p = 0; p < 30; p++) {
      const isNorth = (p % 2 === 0);
      const ped = createHuman('walk');
      const startX = -450 - (p % 6) * 35 + (Math.random() - 0.5) * 15;
      const startZ = -44800 - Math.floor(p / 6) * 70 + (Math.random() - 0.5) * 20;

      ped.mesh.position.set(startX, 2.14, startZ);
      ped.mesh.rotation.y = isNorth ? Math.PI : 0;
      if (this.incheonAirportGroup) {
        this.incheonAirportGroup.add(ped.mesh);
      } else {
        this.cityGroup.add(ped.mesh);
      }

      this.movingPedestrians.push({
        ...ped,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        walkSpeed: 1.5 + Math.random() * 0.4,
        walkPhase: Math.random() * Math.PI * 2,
        min: -45500,
        max: -44500
      });
    }

    this.scene.add(this.cityGroup);
  }

  // ----------------------------------------------------------------
  // 4-C. 자동차 주행 및 보행자 보행 실시간 물리 시뮬레이션
  // ----------------------------------------------------------------
  updateCityLife(dt) {
    if (!this.movingVehicles || !this.movingPedestrians) return;

    // 1. 자동차 이동 & 4개 바퀴 회전
    for (let i = 0; i < this.movingVehicles.length; i++) {
      const v = this.movingVehicles[i];
      const moveDist = v.speed * v.dir * dt;
      v.mesh.position[v.axis] += moveDist;

      // 바퀴 회전
      const rollDelta = Math.abs(moveDist) * 1.6;
      if (v.wheels) {
        for (let w = 0; w < v.wheels.length; w++) {
          v.wheels[w].rotation.x += rollDelta;
        }
      }

      // 도로 경계 루프
      if (v.dir > 0 && v.mesh.position[v.axis] > v.max) {
        v.mesh.position[v.axis] = v.min;
      } else if (v.dir < 0 && v.mesh.position[v.axis] < v.min) {
        v.mesh.position[v.axis] = v.max;
      }
    }

    // 2. 보행자 보행 이동 & 팔다리 교차 스윙
    for (let j = 0; j < this.movingPedestrians.length; j++) {
      const p = this.movingPedestrians[j];
      const step = p.walkSpeed * p.dir * dt;
      p.mesh.position[p.axis] += step;

      p.walkPhase += dt * p.walkSpeed * 5.0;
      const swing = Math.sin(p.walkPhase);
      if (p.legL && p.legR) {
        p.legL.rotation.x = swing * 0.52;
        p.legR.rotation.x = -swing * 0.52;
      }
      if (p.armL && p.armR) {
        p.armL.rotation.x = -swing * 0.45;
        p.armR.rotation.x = swing * 0.45;
      }

      // 보도 경계 왕복 반전
      if (p.dir > 0 && p.mesh.position[p.axis] > p.max) {
        p.dir = -1;
        p.mesh.rotation.y += Math.PI;
      } else if (p.dir < 0 && p.mesh.position[p.axis] < p.min) {
        p.dir = 1;
        p.mesh.rotation.y += Math.PI;
      }
    }

    // 3. 해운대 바닷가 파도 물놀이객(튜브) 수면 부유 요동 애니메이션
    if (this.beachSwimmers && this.beachSwimmers.length > 0) {
      this.beachWaveTime = (this.beachWaveTime || 0) + dt * 2.4;
      for (let s = 0; s < this.beachSwimmers.length; s++) {
        const sw = this.beachSwimmers[s];
        sw.mesh.position.y = sw.baseY + Math.sin(this.beachWaveTime + sw.phase) * 0.16;
        sw.mesh.rotation.z = Math.cos(this.beachWaveTime * 0.8 + sw.phase) * 0.06;
      }
    }
  }

  // ----------------------------------------------------------------
  // 5. 프로시저럴 항공사 그래픽 텍스처 & 실기형 공기역학 에어로다이내믹 3D 모델링
  // ----------------------------------------------------------------

  // ★ 실기형 NACA 슈퍼크리티컬 에어포일 곡면 날개 지오메트리 (앞은 둥글고 위는 볼록, 뒤는 날렵한 실기 날개)
  createAirfoilWingGeo(span, rootChord, tipChord, maxThick = 0.52, sweepBack = 3.5, dihedral = 0.8, isLeft = true) {
    try {
      const chordSegs = 20; // 코드 방향 곡선 분할
      const spanSegs = 12;  // 스팬 방향 분할
      const geo = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      const sign = isLeft ? -1 : 1;

      // 공기역학 NACA 에어포일 단면 2D 포인트 생성 (Leading Edge = 0, Trailing Edge = 1)
      const profilePoints = [];
      for (let i = 0; i <= chordSegs; i++) {
        const u = i / chordSegs;
        // NACA 0012 수식 기반 윗면 양력 캠버 곡선
        const yt = 5 * 0.12 * (0.2969 * Math.sqrt(Math.max(0, u)) - 0.1260 * u - 0.3516 * (u * u) + 0.2843 * (u * u * u) - 0.1015 * (u * u * u * u));
        profilePoints.push({ x: u, y: yt * 1.08 });
      }
      for (let i = chordSegs - 1; i >= 1; i--) {
        const u = i / chordSegs;
        const yt = 5 * 0.12 * (0.2969 * Math.sqrt(Math.max(0, u)) - 0.1260 * u - 0.3516 * (u * u) + 0.2843 * (u * u * u) - 0.1015 * (u * u * u * u));
        profilePoints.push({ x: u, y: -yt * 0.58 }); // 아랫면은 상대적으로 완만하게 처리
      }
      const numProfilePts = profilePoints.length;

      // 스팬을 따라 날개 버텍스 생성 (Root -> Tip 테이퍼, 후퇴각, 상반각)
      for (let s = 0; s <= spanSegs; s++) {
        const sFrac = s / spanSegs; // 0 (root) ~ 1 (tip)
        const currentChord = rootChord + sFrac * (tipChord - rootChord);
        const currentThick = maxThick * (1 - sFrac * 0.42);
        const currentX = sign * sFrac * span;
        const currentZ = sFrac * sweepBack;
        const currentY = sFrac * dihedral;

        for (let p = 0; p < numProfilePts; p++) {
          const pt = profilePoints[p];
          const zPos = currentZ + (pt.x - 0.32) * currentChord;
          const yPos = currentY + pt.y * currentThick;
          const xPos = currentX;

          positions.push(xPos, yPos, zPos);
          uvs.push(pt.x, sFrac);
        }
      }

      // 면(Face) 생성
      for (let s = 0; s < spanSegs; s++) {
        const row1 = s * numProfilePts;
        const row2 = (s + 1) * numProfilePts;
        for (let p = 0; p < numProfilePts; p++) {
          const pNext = (p + 1) % numProfilePts;
          const a = row1 + p;
          const b = row2 + p;
          const c = row2 + pNext;
          const d = row1 + pNext;
          if (isLeft) {
            indices.push(a, b, c);
            indices.push(a, c, d);
          } else {
            indices.push(a, c, b);
            indices.push(a, d, c);
          }
        }
      }

      // 날개 끝(Tip) 캡
      const tipRow = spanSegs * numProfilePts;
      for (let p = 1; p < numProfilePts - 1; p++) {
        if (isLeft) {
          indices.push(tipRow, tipRow + p, tipRow + p + 1);
        } else {
          indices.push(tipRow, tipRow + p + 1, tipRow + p);
        }
      }
      // 날개 뿌리(Root) 캡
      for (let p = 1; p < numProfilePts - 1; p++) {
        if (isLeft) {
          indices.push(0, p + 1, p);
        } else {
          indices.push(0, p, p + 1);
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      geo.computeVertexNormals();
      return geo;
    } catch (e) {
      console.warn('Airfoil geometry fallback:', e);
      return new THREE.BoxGeometry(span, maxThick, rootChord);
    }
  }

  // ★ 실기형 유선형 노즈 콘 지오메트리 (레이돔에서 조종석 캐노피로 이어지는 일체형 곡면)
  createStreamlinedNoseGeo(radius, length, radialSeg = 32, lengthSeg = 16) {
    try {
      const geo = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let l = 0; l <= lengthSeg; l++) {
        const t = l / lengthSeg; // 0 at nose radome, 1 at cabin junction
        const r = radius * Math.pow(Math.max(0, Math.sin(t * Math.PI / 2)), 0.60);
        const z = -length * (1 - t);
        const yDrop = (1 - t) * 0.12 * radius; // 앞쪽으로 갈수록 살짝 드룹되는 실제 여객기 노즈

        for (let rIdx = 0; rIdx <= radialSeg; rIdx++) {
          const theta = (rIdx / radialSeg) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const x = r * sinT * 0.98;
          const y = r * cosT * 0.94 - yDrop;

          positions.push(x, y, z);
          uvs.push(rIdx / radialSeg, t);
        }
      }

      for (let l = 0; l < lengthSeg; l++) {
        const row1 = l * (radialSeg + 1);
        const row2 = (l + 1) * (radialSeg + 1);
        for (let r = 0; r < radialSeg; r++) {
          const a = row1 + r;
          const b = row2 + r;
          const c = row2 + r + 1;
          const d = row1 + r + 1;
          indices.push(a, b, c);
          indices.push(a, c, d);
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      geo.computeVertexNormals();
      return geo;
    } catch (e) {
      console.warn('Nose geometry fallback:', e);
      return new THREE.SphereGeometry(radius, 24, 16);
    }
  }

  // ★ 실기형 고속 회전 티타늄 터보팬 블레이드 시스템 (Titanium Turbofan Fan Blades)
  createTurbofanFan(radius, bladeCount = 20, chromeMat) {
    const fanGroup = new THREE.Group();

    // 1. 중앙 스피너 콘 (중앙 화이트 소용돌이 스파이럴 마킹)
    const spinnerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.75
    });
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.26, radius * 0.58, 18), spinnerMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.set(0, 0, radius * 0.12);
    fanGroup.add(spinner);

    const spiralRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.13, radius * 0.024, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spiralRing.position.set(0, 0, radius * 0.06);
    fanGroup.add(spiralRing);

    // 2. 20여 장의 정교한 에어로다이내믹 티타늄 팬 블레이드 (각도 비틀림 캠버 적용)
    const bladeGeo = new THREE.BoxGeometry(radius * 0.09, radius * 0.70, radius * 0.038);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      metalness: 0.92,
      roughness: 0.18
    });

    for (let b = 0; b < bladeCount; b++) {
      const angle = (b / bladeCount) * Math.PI * 2;
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = angle;

      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0, radius * 0.50, 0);
      blade.rotation.x = 0.56; // 32도 공기역학 피치각
      blade.rotation.y = 0.10;
      bladeHolder.add(blade);
      fanGroup.add(bladeHolder);
    }

    return fanGroup;
  }

  createUpsweptAftFuselageGeo(rCabin, rTail, length, radialSeg = 32, heightSeg = 16) {
    const geo = new THREE.CylinderGeometry(rTail, rCabin, length, radialSeg, heightSeg);
    const pos = geo.attributes.position;
    const halfLen = length / 2;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y - (-halfLen)) / length; // 0.0 at cabin, 1.0 at tail
      const rise = t * (rCabin - rTail);
      pos.setZ(i, pos.getZ(i) - rise); // 로컬 Z 감소 -> 월드 Y 회전 시 위로 부드럽게 상승
    }
    geo.computeVertexNormals();
    return geo;
  }

  // ★ AI 생성급 초고해상도 실사 캔버스 그래픽 텍스처 (동체 리버리 & 음영 & 3D 엠보싱)
  updateFuselageTexture(type, isNight) {
    if (!this.fuselageCanvas) {
      this.fuselageCanvas = document.createElement('canvas');
      this.fuselageCanvas.width = 2048;
      this.fuselageCanvas.height = 1024;
      this.fuselageCtx = this.fuselageCanvas.getContext('2d');
      this.fuselageTexture = new THREE.CanvasTexture(this.fuselageCanvas);
      this.fuselageTexture.anisotropy = 8;
    }
    const ctx = this.fuselageCtx;
    const W = 2048;
    const H = 1024;
    ctx.clearRect(0, 0, W, H);

    const drawRoundRect = (c, x, y, w, h, r) => {
      if (c.roundRect) c.roundRect(x, y, w, h, r);
      else c.rect(x, y, w, h);
    };

    // 1. 에어로 펄 화이트 & 알루미늄 배면 3D 셰이딩 베이스 코트
    const baseGrad = ctx.createLinearGradient(0, 0, W, 0);
    baseGrad.addColorStop(0.00, '#94a3b8'); // 배면(Belly) 하단 메탈릭 알루미늄 음영
    baseGrad.addColorStop(0.12, '#cbd5e1');
    baseGrad.addColorStop(0.20, '#f1f5f9');
    baseGrad.addColorStop(0.25, '#ffffff'); // 우현(Starboard) 중심
    baseGrad.addColorStop(0.35, '#f8fafc');
    baseGrad.addColorStop(0.50, '#ffffff'); // 상단 루프(Crown) 하이글로스 펄
    baseGrad.addColorStop(0.65, '#f8fafc');
    baseGrad.addColorStop(0.75, '#ffffff'); // 좌현(Port) 중심
    baseGrad.addColorStop(0.80, '#f1f5f9');
    baseGrad.addColorStop(0.88, '#cbd5e1');
    baseGrad.addColorStop(1.00, '#94a3b8'); // 배면 하단
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 3D 엠보싱 듀랄루민 외피 패널 라인 (Panel Lines) & 리벳 헤드
    // 가로 종방향 패널 라인 (Dark groove + Light highlight)
    for (let y = 35; y < H - 20; y += 54) {
      // 짙은 틈새선
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.40)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();

      // 밝은 하이라이트선 (1px 아래)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, y + 1.2);
      ctx.lineTo(W, y + 1.2);
      ctx.stroke();

      // 입체 리벳 열 (어두운 점 + 흰색 반사)
      for (let x = 8; x < W; x += 14) {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.fillRect(x, y - 0.5, 1.4, 1.4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(x, y + 0.6, 1.0, 1.0);
      }
    }

    // 세로 원주방향 패널 라인
    for (let x = 48; x < W; x += 112) {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + 1.0, 0);
      ctx.lineTo(x + 1.0, H);
      ctx.stroke();
    }

    // 3. 프리미엄 항공사 스우시 리버리 (Dynamic Aero Swoosh Livery)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 1536 : 512;

      // 로열 네이비 하부 다이내믹 웨이브
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(cx - 95 * side, 960);
      ctx.bezierCurveTo(cx - 60 * side, 620, cx - 40 * side, 320, cx - 120 * side, 30);
      ctx.lineTo(cx - 90 * side, 30);
      ctx.bezierCurveTo(cx - 18 * side, 320, cx - 32 * side, 620, cx - 68 * side, 960);
      ctx.closePath();
      ctx.fill();

      // 스카이블루 메인 치트라인
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx - 58 * side, 965);
      ctx.bezierCurveTo(cx - 22 * side, 620, cx - 4 * side, 320, cx - 72 * side, 30);
      ctx.lineTo(cx - 42 * side, 30);
      ctx.bezierCurveTo(cx + 22 * side, 320, cx + 6 * side, 620, cx - 30 * side, 965);
      ctx.closePath();
      ctx.fill();

      // 골드 핀스트라이프 하이라이트
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cx - 26 * side, 940);
      ctx.bezierCurveTo(cx + 4 * side, 620, cx + 20 * side, 320, cx - 32 * side, 50);
      ctx.lineTo(cx - 16 * side, 50);
      ctx.bezierCurveTo(cx + 34 * side, 320, cx + 16 * side, 620, cx - 10 * side, 940);
      ctx.closePath();
      ctx.fill();
    });

    // 4. 항공사 정식 브랜드 레터링 & 등록 부호 (Airline Titles & Tail Number)
    const regCode = (type === 'b747') ? 'HL7472' : (type === 'dc10' ? 'HL7310' : (type === 'md80' ? 'HL7204' : (type === 'a320' ? 'HL8031' : (type === 'concorde' ? 'F-BTSC' : 'RESCUE-01'))));
    const modelTitle = (type === 'b747') ? 'BOEING 747-400' : (type === 'dc10' ? 'McDONNELL DOUGLAS DC-10' : (type === 'md80' ? 'MD-80 TWIN JET' : (type === 'a320' ? 'AIRBUS A320' : (type === 'concorde' ? 'CONCORDE SST' : 'AMPHIBIAN EXPLORER'))));

    // 좌현(Port, X=1536) 텍스트
    ctx.save();
    ctx.translate(1536 + 72, 620);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('SKY JET AIRWAYS', 0, 0);
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText(modelTitle, 0, 24);
    ctx.restore();

    ctx.save();
    ctx.translate(1536 + 60, 210);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(regCode, 0, 0);
    ctx.restore();

    // 우현(Starboard, X=512) 텍스트
    ctx.save();
    ctx.translate(512 - 72, 620);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('SKY JET AIRWAYS', 0, 0);
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText(modelTitle, 0, 24);
    ctx.restore();

    ctx.save();
    ctx.translate(512 - 60, 210);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(regCode, 0, 0);
    ctx.restore();

    // 5. 정밀 승객 객실 창문 열 (Cabin Windows - 주간: 편광 반사글래스 & 실내 좌석 실루엣 / 야간: 골든 옐로우 조명)
    const winW = 16;
    const winH = 26;
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 1536 : 512;
      for (let y = 830; y >= 165; y -= 32) {
        // 크롬 창문 이중 베젤
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        drawRoundRect(ctx, cx - winW / 2 - 3, y - winH / 2 - 3, winW + 6, winH + 6, 7);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        drawRoundRect(ctx, cx - winW / 2 - 1.5, y - winH / 2 - 1.5, winW + 3, winH + 3, 5);
        ctx.fill();

        if (isNight) {
          // 야간: 창문 내부에서 따뜻하게 빛나는 승객실 황금빛 조명 & 창문 앰비언트 글로우
          ctx.fillStyle = 'rgba(253, 224, 71, 0.40)';
          ctx.beginPath();
          drawRoundRect(ctx, cx - winW / 2 - 8, y - winH / 2 - 8, winW + 16, winH + 16, 9);
          ctx.fill();

          const winGrad = ctx.createLinearGradient(0, y - winH / 2, 0, y + winH / 2);
          winGrad.addColorStop(0.0, '#fef08a');
          winGrad.addColorStop(0.5, '#facc15');
          winGrad.addColorStop(1.0, '#f59e0b');
          ctx.fillStyle = winGrad;
          ctx.beginPath();
          drawRoundRect(ctx, cx - winW / 2, y - winH / 2, winW, winH, 4);
          ctx.fill();

          // 승객 좌석 헤드레스트 실루엣
          if ((y % 64) === 0) {
            ctx.fillStyle = 'rgba(180, 83, 9, 0.55)';
            ctx.fillRect(cx - winW / 2 + 2, y - winH / 2 + 2, winW - 4, 7);
          }
        } else {
          // 주간: 깊은 에어로 블루 틴티드 편광 글래스 + 실내 헤드레스트 + 대각선 반사 하이라이트
          const winGrad = ctx.createLinearGradient(cx - winW / 2, y - winH / 2, cx + winW / 2, y + winH / 2);
          winGrad.addColorStop(0.0, '#0c4a6e');
          winGrad.addColorStop(0.5, '#0284c7');
          winGrad.addColorStop(1.0, '#075985');
          ctx.fillStyle = winGrad;
          ctx.beginPath();
          drawRoundRect(ctx, cx - winW / 2, y - winH / 2, winW, winH, 4);
          ctx.fill();

          // 실내 좌석/블라인드 실루엣
          ctx.fillStyle = 'rgba(12, 74, 110, 0.8)';
          ctx.fillRect(cx - winW / 2 + 2, y - winH / 2 + 1, winW - 4, (y % 96 === 0 ? 11 : 6));

          // 대각 하이라이트 글레어
          ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
          ctx.beginPath();
          ctx.moveTo(cx - winW / 2 + 2, y - winH / 2 + 2);
          ctx.lineTo(cx + winW / 2 - 4, y - winH / 2 + 2);
          ctx.lineTo(cx - winW / 2 + 2, y + winH / 2 - 5);
          ctx.closePath();
          ctx.fill();
        }
      }

      // B747 2층 어퍼덱 창문 열
      if (type === 'b747') {
        const uX = cx + (side === -1 ? 62 : -62);
        for (let y = 830; y >= 530; y -= 32) {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          drawRoundRect(ctx, uX - winW / 2 - 2, y - winH / 2 - 2, winW + 4, winH + 4, 6);
          ctx.fill();

          if (isNight) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            drawRoundRect(ctx, uX - winW / 2, y - winH / 2, winW, winH, 4);
            ctx.fill();
          } else {
            ctx.fillStyle = '#0c4a6e';
            ctx.beginPath();
            drawRoundRect(ctx, uX - winW / 2, y - winH / 2, winW, winH, 4);
            ctx.fill();
          }
        }
      }
    });

    // 6. 탑승용 도어 (Boarding Doors) & 비상 탈출구 (Emergency Exits)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 1536 : 512;
      [860, 560, 260].forEach((dy) => {
        const doorW = 36;
        const doorH = 72;

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.6;
        ctx.strokeRect(cx - doorW / 2, dy - doorH / 2, doorW, doorH);

        ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
        ctx.fillRect(cx - doorW / 2 + 1, dy - doorH / 2 + 1, doorW - 2, doorH - 2);

        // 도어 윈도우
        ctx.fillStyle = isNight ? '#fef08a' : '#0369a1';
        ctx.beginPath();
        drawRoundRect(ctx, cx - 6, dy - doorH / 2 + 10, 12, 18, 5);
        ctx.fill();

        // 도어 핸들 레버
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx + (side === -1 ? 6 : -13), dy + 6, 7, 16);

        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.fillStyle = '#dc2626';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', cx, dy - doorH / 2 - 5);
      });

      // 주익 상부 비상 탈출구 (Overwing Exits)
      [460, 420].forEach(ey => {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(cx - 15, ey - 20, 30, 40);
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', cx, ey - 24);
      });
    });

    // 7. 하부 화물칸 도어 (Cargo Doors) & 힌지
    [750, 340].forEach(cy => {
      const cgX = 330;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(cgX - 38, cy - 26, 76, 52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cgX + 20, cy - 5, 9, 9);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cgX - 35, cy - 5, 8, 8);
    });

    // 8. 노즈 안티글레어 브로우 & 피토관 경고 마킹
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(1024, 940, 58, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 피토관 경고 스텐실
    [960, 1088].forEach(px => {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.fillRect(px - 14, 915, 28, 7);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PITOT', px, 921);
    });

    this.fuselageTexture.needsUpdate = true;
    return this.fuselageTexture;
  }

  // ★ AI 생성급 초고해상도 실사 주익 텍스처 (크롬 슬랫, 알루미늄 패널, 플랩/스포일러, NO STEP 경고)
  updateWingTexture(type, isNight) {
    if (!this.wingCanvas) {
      this.wingCanvas = document.createElement('canvas');
      this.wingCanvas.width = 1024;
      this.wingCanvas.height = 512;
      this.wingCtx = this.wingCanvas.getContext('2d');
      this.wingTexture = new THREE.CanvasTexture(this.wingCanvas);
      this.wingTexture.anisotropy = 8;
    }
    const ctx = this.wingCtx;
    const W = 1024;
    const H = 512;
    ctx.clearRect(0, 0, W, H);

    // 1. 에어로 알루미늄 라이트 그레이 메탈릭 베이스
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, W, H);

    // 2. 전연 고광택 미러 크롬 슬랫 밴드 (Leading Edge Chrome Slat)
    const slatGrad = ctx.createLinearGradient(0, 0, 0, 68);
    slatGrad.addColorStop(0.0, '#ffffff');
    slatGrad.addColorStop(0.35, '#f1f5f9');
    slatGrad.addColorStop(0.65, '#94a3b8');
    slatGrad.addColorStop(1.0, '#64748b');
    ctx.fillStyle = slatGrad;
    ctx.fillRect(0, 0, W, 58);

    // 슬랫 분할선
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.lineWidth = 1.6;
    for (let sx = 65; sx < W; sx += 78) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, 58);
      ctx.stroke();
    }

    // 3. 윙 스킨 알루미늄 패널 라인 & 리벳
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.4;
    for (let x = 60; x < W; x += 85) {
      ctx.beginPath();
      ctx.moveTo(x, 58);
      ctx.lineTo(x, H - 42);
      ctx.stroke();
    }
    for (let y = 105; y < H - 42; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 4. 후연 카본 복합재 플랩 & 스포일러 분할선 (Trailing Edge Flaps & Spoilers)
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, H - 42, W, 42);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    for (let fx = 110; fx < W; fx += 145) {
      ctx.beginPath();
      ctx.moveTo(fx, H - 42);
      ctx.lineTo(fx, H);
      ctx.stroke();

      // 플랩 힌지 브라켓
      ctx.fillStyle = '#64748b';
      ctx.fillRect(fx - 4, H - 28, 8, 12);
    }

    // 5. 정밀 "NO STEP" 안전 경계선 & 비상 탈출 가이드
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.0;
    ctx.strokeRect(110, 105, W - 220, H - 190);

    ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.lineWidth = 1.5;
    for (let k = 130; k < W - 130; k += 38) {
      ctx.beginPath();
      ctx.moveTo(k, 105);
      ctx.lineTo(k + 28, H - 85);
      ctx.stroke();
    }

    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    for (let tx = 200; tx < W - 180; tx += 170) {
      ctx.fillText('NO STEP', tx, 128);
      ctx.fillText('NO STEP', tx, H - 100);
    }

    ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('EMERGENCY ESCAPE ROUTE ▶▶', W / 2, H / 2);

    // 6. 타원형 연료 탱크 점검 해치 (Fuel Tank Access Panels)
    for (let px = 160; px < W - 140; px += 130) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(px, 82, 22, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      // 해치 볼트 원형 배치
      ctx.fillStyle = '#334155';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.fillRect(px + Math.cos(a) * 17 - 1, 82 + Math.sin(a) * 9 - 1, 2, 2);
      }
    }

    this.wingTexture.needsUpdate = true;
    return this.wingTexture;
  }

  // ----------------------------------------------------------------
  // ★ GLB 3D 모델 시스템 (glTF 2.0 / GLB 3D Pipeline: 비행기 & 배경 전체 자동 지원)
  // ----------------------------------------------------------------
  initGLBSystem() {
    this.customGLBModel = null;
    if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') {
      this.glbLoader = new THREE.GLTFLoader();
    }
    this.glbBuffers = this.glbBuffers || {};
    this.glbEnvironmentsLoaded = false;

    // window.GLB_BUNDLE에서 모든 비행기 및 배경 환경(공항, 인천, 지형, 해운대) 바이너리 즉시 언팩
    this.unpackGLBBundle();

    // Fullscreen Drag & Drop 리스너
    const dragOverlay = document.getElementById('glb-drag-overlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragOverlay) dragOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0 && dragOverlay) {
        dragOverlay.classList.remove('active');
        dragCounter = 0;
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (dragOverlay) dragOverlay.classList.remove('active');

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf')) {
          this.loadGLBFile(file, file.name);
        } else {
          this.showPopup('⚠️ .glb 또는 .gltf 형식의 3D 파일만 지원됩니다.');
        }
      }
    });
  }

  unpackGLBBundle() {
    this.glbBuffers = this.glbBuffers || {};
    if (typeof window !== 'undefined' && window.GLB_BUNDLE) {
      for (const key of Object.keys(window.GLB_BUNDLE)) {
        if (!this.glbBuffers[key]) {
          try {
            const b64 = window.GLB_BUNDLE[key];
            const binStr = atob(b64);
            const len = binStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binStr.charCodeAt(i);
            }
            this.glbBuffers[key] = bytes.buffer;
          } catch (err) {
            console.warn('Failed to unpack GLB for ' + key, err);
          }
        }
      }
    }
  }

  // 화면의 모든 비행기, 공항, 인천공항, 지형, 도시 배경을 실제 바이너리 GLB 파일에서 직접 로드
  loadAllRealGLBModels() {
    if (!this.glbLoader) {
      if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') {
        this.glbLoader = new THREE.GLTFLoader();
      } else {
        return;
      }
    }

    this.unpackGLBBundle();

    const parseAndMountGLB = (key, paths, onMount) => {
      // 1. 메모리 번들(window.GLB_BUNDLE)에서 즉시 파싱 (0ms 레이턴시, 100% 로컬/오프라인 지원)
      if (this.glbBuffers && this.glbBuffers[key]) {
        try {
          this.glbLoader.parse(this.glbBuffers[key], '', (gltf) => {
            onMount(gltf.scene, this.glbBuffers[key]);
            this.updateGLBStatusUI();
          });
          return;
        } catch (e) {
          console.warn(`Memory GLB parse error for ${key}:`, e);
        }
      }

      // 2. 웹 서버 / 파일 시스템 fetch 시도
      const tryFetch = (idx) => {
        if (idx >= paths.length) return;
        fetch(paths[idx])
          .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.arrayBuffer();
          })
          .then(buf => {
            this.glbBuffers = this.glbBuffers || {};
            this.glbBuffers[key] = buf;
            this.glbLoader.parse(buf, '', (gltf) => {
              onMount(gltf.scene, buf);
              this.updateGLBStatusUI();
            });
          })
          .catch(() => tryFetch(idx + 1));
      };
      tryFetch(0);
    };

    // 1. 비행기 로드 (현재 기종 또는 기본 A320)
    const planeName = this.currentPlaneType || 'a320';
    parseAndMountGLB(planeName, [`models/${planeName}.glb`, `assets/models/${planeName}.glb`, 'models/airplane.glb'], (scene, buf) => {
      this.applyGLBScene(scene, `${planeName}.glb`);
      this.glbPlaneBuffer = buf;
    });

    // 모든 기종 백그라운드 프리페치 유지 (기종 변경 즉시 반응)
    ['a320', 'b747', 'dc10', 'md80', 'concorde', 'amphibian', 'ancestor'].forEach(m => {
      if (!this.glbBuffers[m]) {
        fetch(`models/${m}.glb`)
          .then(r => r.ok ? r.arrayBuffer() : null)
          .then(b => {
            if (b) {
              this.glbBuffers = this.glbBuffers || {};
              this.glbBuffers[m] = b;
            }
          })
          .catch(() => {});
      }
    });

    // 2. 출발 공항 (36L 활주로, 관제탑, 터미널, 유도로)
    parseAndMountGLB('airport', ['models/airport.glb', 'assets/models/airport.glb'], (scene, buf) => {
      if (this.airportGroup) {
        while (this.airportGroup.children.length > 0) this.airportGroup.remove(this.airportGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.airportGroup.add(scene);
        this.glbAirportBuffer = buf;
        this.initPAPILights();
      }
    });

    // 3. 인천국제공항 메가 허브 (복수 4,000m 평행 활주로, 랜드마크 타워, T1/T2, 콘코스)
    parseAndMountGLB('incheon_airport', ['models/incheon_airport.glb', 'assets/models/incheon_airport.glb'], (scene, buf) => {
      if (this.incheonAirportGroup) {
        while (this.incheonAirportGroup.children.length > 0) this.incheonAirportGroup.remove(this.incheonAirportGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.incheonAirportGroup.add(scene);
        this.glbIncheonBuffer = buf;
      }
    });

    // 4. 지형, 산맥, 해양, 대륙, 섬, 선박 (120km 대양, 50km 대륙, 열대 섬, 대산맥)
    parseAndMountGLB('terrain', ['models/terrain.glb', 'assets/models/terrain.glb', 'models/mountains_terrain.glb'], (scene, buf) => {
      if (this.terrainGroup) {
        while (this.terrainGroup.children.length > 0) this.terrainGroup.remove(this.terrainGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.terrainGroup.add(scene);
        this.glbNatureBuffer = buf;
      }
    });

    // 5. 해운대 해변 및 대도시 (LCT 411m 마천루, 광안대교 현수교, 백사장)
    parseAndMountGLB('haeundae', ['models/haeundae.glb', 'models/city_beach.glb', 'models/haeundae_beach_city.glb', 'assets/models/haeundae.glb'], (scene, buf) => {
      if (this.cityGroup) {
        while (this.cityGroup.children.length > 0) this.cityGroup.remove(this.cityGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.cityGroup.add(scene);
        this.glbCityBuffer = buf;
      }
    });

    this.glbEnvironmentsLoaded = true;
    this.updateGLBStatusUI();
  }

  convertAllToGLBPipeline() {
    this.loadAllRealGLBModels();
  }

  updateGLBStatusUI() {
    const ids = [
      'glb-status-plane',
      'glb-status-airport',
      'glb-status-incheon',
      'glb-status-terrain',
      'glb-status-city'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = 'GLB 바이너리 적용됨';
        el.className = 'text-green';
      }
    });
  }

  loadGLBFile(fileOrBuffer, customName, targetType = 'plane') {
    if (typeof THREE.GLTFLoader === 'undefined') {
      this.showPopup('⚠️ GLTFLoader 모듈이 준비되지 않았습니다.');
      return;
    }
    if (!this.glbLoader) {
      this.glbLoader = new THREE.GLTFLoader();
    }

    const fileName = customName || (fileOrBuffer.name ? fileOrBuffer.name : 'model.glb');

    const parseBuffer = (buffer) => {
      this.glbLoader.parse(
        buffer,
        '',
        (gltf) => {
          if (targetType === 'background') {
            this.applyGLBBackground(gltf.scene, fileName);
          } else {
            this.applyGLBScene(gltf.scene, fileName);
          }
        },
        (error) => {
          console.error('GLB parse error:', error);
          this.showPopup('❌ GLB 파일을 읽는 중 오류가 발생했습니다.');
        }
      );
    };

    if (fileOrBuffer instanceof ArrayBuffer) {
      parseBuffer(fileOrBuffer);
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => parseBuffer(e.target.result);
      reader.onerror = () => this.showPopup('❌ GLB 파일을 읽는 데 실패했습니다.');
      reader.readAsArrayBuffer(fileOrBuffer);
    }
  }

  applyGLBScene(scene, fileName) {
    if (!scene) return;
    if (!this.planeGroup) {
      this.planeGroup = new THREE.Group();
      this.scene.add(this.planeGroup);
    }

    // 기존 비행기 자식 오브젝트 정리
    while (this.planeGroup.children.length > 0) {
      this.planeGroup.remove(this.planeGroup.children[0]);
    }

    // 바운딩 박스 정밀 계산 및 실제 여객기 규격으로 자동 정규화 스케일링
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetLength = (this.currentPlaneType === 'ancestor') ? 14.0 : 38.0;
    const scale = targetLength / (maxDim || 1.0);
    scene.scale.set(scale, scale, scale);

    // ★ 중심점 X=0 완벽 정렬 & 회전 영점화 (기우뚱 및 쏠림 100% 원천 차단)
    scene.position.x = 0;
    scene.position.y = -center.y * scale + (this.currentPlaneType === 'ancestor' ? 0.35 : 1.2);
    scene.position.z = -center.z * scale;
    scene.rotation.set(0, 0, 0);

    scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          node.material.roughness = Math.max(0.18, node.material.roughness || 0.4);
          node.material.metalness = Math.min(0.85, node.material.metalness || 0.2);
          node.material.side = THREE.DoubleSide;
        }
      }
    });

    this.customGLBModel = scene;
    this.planeGroup.add(scene);

    this.engineExhaustPoints = [
      new THREE.Vector3(-6.5, -0.2, 5.0),
      new THREE.Vector3(6.5, -0.2, 5.0)
    ];

    const cleanName = fileName.replace(/\.[^/.]+$/, "");
    const planeNameText = document.getElementById('plane-name-text');
    if (planeNameText) {
      planeNameText.textContent = cleanName.slice(0, 12);
    }

    this.showPopup(`🎉 GLB 3D 기체 [${cleanName}] 장착 완료!`);
  }

  applyGLBBackground(scene, fileName) {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1200.0 / (maxDim || 1.0);
    scene.scale.set(scale, scale, scale);
    scene.position.set(-center.x * scale, 0.5, -center.z * scale - 6000);
    scene.traverse((node) => {
      if (node.isMesh) node.receiveShadow = true;
    });
    this.scene.add(scene);
    this.showPopup(`🌍 커스텀 배경 GLB [${fileName}] 맵이 장착되었습니다!`);
  }

  loadGLBPreset(type) {
    if (window.closeGLBMenu) window.closeGLBMenu();
    type = type || this.currentPlaneType || 'a320';
    this.currentPlaneType = type;
    this.groundY = (type === 'ancestor') ? 1.65 : 6.84;

    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: '수륙양용 비행기',
      ancestor: '1903 조상 비행기'
    };
    const planeName = names[type] || type.toUpperCase();

    // UI 버튼 상태 갱신
    document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`select-${type}`);
    if (activeBtn) activeBtn.classList.add('active');
    const planeNameText = document.getElementById('plane-name-text');
    if (planeNameText) planeNameText.textContent = planeName;

    // 캐시된 버퍼가 있으면 즉시 바이너리 파싱 & 장착
    this.glbBuffers = this.glbBuffers || {};
    this.unpackGLBBundle();
    if (this.glbBuffers[type]) {
      this.loadGLBFile(this.glbBuffers[type], `${type.toUpperCase()}.glb`, 'plane');
      this.showPopup(`✈️ [${planeName}] 100% 바이너리 GLB 모델 장착!`);
      return;
    }

    const candidatePaths = [
      `models/${type}.glb`,
      `assets/models/${type}.glb`,
      `models/airplane.glb`
    ];

    const tryFetchGLB = (idx) => {
      if (idx >= candidatePaths.length) {
        if (typeof this.buildProceduralAircraft === 'function') {
          this.buildProceduralAircraft(type);
        }
        this.showPopup(`✈️ [${planeName}] 3D 비행기로 전환되었습니다!`);
        return;
      }
      const p = candidatePaths[idx];
      fetch(p)
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .then(buffer => {
          this.glbBuffers[type] = buffer;
          this.loadGLBFile(buffer, `${type.toUpperCase()}.glb`, 'plane');
          this.showPopup(`✈️ [${planeName}] 100% 바이너리 GLB 모델 로드 완료!`);
        })
        .catch(() => tryFetchGLB(idx + 1));
    };

    tryFetchGLB(0);
  }

  exportCurrentPlaneToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.planeGroup,
      (result) => {
        this.downloadGLBBuffer(result, `airplane_${this.currentPlaneType || 'model'}.glb`);
      },
      (err) => {
        console.error('Plane GLB export error:', err);
        this.showPopup('❌ 비행기 GLB 파일 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  }

  exportAirportToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.airportGroup,
      (result) => {
        this.downloadGLBBuffer(result, `departure_airport_36L.glb`);
      },
      (err) => {
        console.error('Airport GLB export error:', err);
        this.showPopup('❌ 출발 공항 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  }

  exportIncheonAirportToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.incheonAirportGroup,
      (result) => {
        this.downloadGLBBuffer(result, `incheon_airport_hub.glb`);
      },
      (err) => {
        console.error('Incheon Airport GLB export error:', err);
        this.showPopup('❌ 인천공항 허브 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  }

  exportTerrainToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const natureGroup = new THREE.Group();
    if (this.mountainsGroup) natureGroup.add(this.mountainsGroup.clone());
    if (this.islandsGroup) natureGroup.add(this.islandsGroup.clone());
    if (this.shipsGroup) natureGroup.add(this.shipsGroup.clone());

    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      natureGroup,
      (result) => {
        this.downloadGLBBuffer(result, `continental_terrain_and_nature.glb`);
      },
      (err) => {
        console.error('Terrain GLB export error:', err);
        this.showPopup('❌ 지형·산맥 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  }

  exportCityBeachToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.cityGroup,
      (result) => {
        this.downloadGLBBuffer(result, `haeundae_beach_city_background.glb`);
      },
      (err) => {
        console.error('City/Beach GLB export error:', err);
        this.showPopup('❌ 해운대·도시 배경 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  }

  exportFullWorldToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const worldGroup = new THREE.Group();
    if (this.planeGroup) worldGroup.add(this.planeGroup.clone());
    if (this.airportGroup) worldGroup.add(this.airportGroup.clone());
    if (this.incheonAirportGroup) worldGroup.add(this.incheonAirportGroup.clone());
    if (this.mountainsGroup) worldGroup.add(this.mountainsGroup.clone());
    if (this.islandsGroup) worldGroup.add(this.islandsGroup.clone());
    if (this.shipsGroup) worldGroup.add(this.shipsGroup.clone());
    if (this.cityGroup) worldGroup.add(this.cityGroup.clone());

    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      worldGroup,
      (result) => {
        this.downloadGLBBuffer(result, `full_airplane_and_world.glb`);
      },
      (err) => {
        console.error('World GLB export error:', err);
        this.showPopup('❌ 전체 월드 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  }

  downloadGLBBuffer(buffer, filename) {
    try {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.showPopup(`💾 [${filename}] 다운로드가 시작되었습니다!`);
    } catch (e) {
      console.error('Download error:', e);
    }
  }

  reloadGLBPlane() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    this.convertAllToGLBPipeline();
    this.showPopup('🔄 비행기 및 공항/해운대 배경이 GLB 모드로 즉시 재생성되었습니다!');
  }

  // ----------------------------------------------------------------
  // 기종 빌드 & 100% 바이너리 GLB 3D 기체 로드
  // ----------------------------------------------------------------
  buildAircraft(type) {
    if (type) this.currentPlaneType = type;
    type = type || this.currentPlaneType || 'a320';
    if (!this.planeGroup) {
      this.planeGroup = new THREE.Group();
      this.scene.add(this.planeGroup);
    }
    this.loadGLBPreset(type);
  }

  // ----------------------------------------------------------------
  // 5. 프로시저럴 3D 제트 여객기 (오프라인/비상 백업 렌더러)
  // ----------------------------------------------------------------
  buildProceduralAircraft(type) {
    if (type) this.currentPlaneType = type;
    type = type || this.currentPlaneType || 'a320';
    let savedPos = null;
    let savedQuat = null;
    if (this.planeGroup) {
      savedPos = this.planeGroup.position.clone();
      savedQuat = this.planeGroup.quaternion.clone();
      this.scene.remove(this.planeGroup);
    }

    this.planeGroup = new THREE.Group();
    if (savedPos) this.planeGroup.position.copy(savedPos);
    if (savedQuat) this.planeGroup.quaternion.copy(savedQuat);
    this.scene.add(this.planeGroup);
    this.landingGears = [];
    this.wheels = [];
    this.turbofans = [];
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

    const isNight = (this.timeOfDay === 'night');
    const liveryTex = this.updateFuselageTexture(type, isNight);
    const wingTex = this.updateWingTexture(type, isNight);

    // 프리미엄 항공사 PBR 재질 & 프로시저럴 고해상도 그래픽 텍스처 (실제 항공기 하이글로스 반사광)
    const liveryMat = new THREE.MeshStandardMaterial({
      map: liveryTex,
      roughness: 0.18,
      metalness: 0.28
    });
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.20,
      metalness: 0.25
    });
    const cheatlineMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.38
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.75
    });
    const wingMat = new THREE.MeshStandardMaterial({
      map: wingTex,
      roughness: 0.24,
      metalness: 0.32
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.08
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x091428,
      roughness: 0.08,
      metalness: 0.96,
      transparent: true,
      opacity: 0.92
    });
    const cabinWindowMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0xfef08a : 0x38bdf8,
      roughness: 0.2,
      metalness: 0.8,
      emissive: isNight ? 0xf59e0b : 0x0284c7,
      emissiveIntensity: isNight ? 1.35 : 0.4
    });
    this.cabinWindowMat = cabinWindowMat;
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });

    // 랜딩기어 생성 헬퍼 (개폐형 도어 덮개 & 4륜 대차 및 2륜 노즈 기어 지원)
    const makeGear = (x, y, z, isNose = false, is4WheelBogie = false) => {
      const gearAssembly = new THREE.Group();
      gearAssembly.position.set(x, y, z);

      // 1. 기어 베이 웰 박스 (기어 수납 격실 & 도어 프레임)
      const bayW = is4WheelBogie ? 2.8 : (isNose ? 2.0 : 2.2);
      const bayL = is4WheelBogie ? 5.2 : (isNose ? 3.6 : 3.8);
      const bayH = 0.5;

      const bayInteriorGeo = new THREE.BoxGeometry(bayW * 0.94, bayH, bayL * 0.94);
      const bayInteriorMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.9,
        metalness: 0.3
      });
      const bayInterior = new THREE.Mesh(bayInteriorGeo, bayInteriorMat);
      bayInterior.position.set(0, bayH / 2, 0);
      gearAssembly.add(bayInterior);

      // 2. 좌우 개폐형 도어 덮개 (Gear Bay Doors)
      // 좌측 도어 피벗
      const doorLGroup = new THREE.Group();
      doorLGroup.position.set(-bayW / 2, 0.05, 0);
      const doorPanelW = (bayW / 2) * 0.96;
      const doorMeshL = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW, 0.12, bayL * 0.95), fuselageMat);
      doorMeshL.position.set(doorPanelW / 2, 0, 0);
      doorMeshL.castShadow = true;
      doorLGroup.add(doorMeshL);

      const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW * 0.85, 0.08, bayL * 0.85), chromeMat);
      doorFrameL.position.set(doorPanelW / 2, 0.06, 0);
      doorLGroup.add(doorFrameL);
      gearAssembly.add(doorLGroup);

      // 우측 도어 피벗
      const doorRGroup = new THREE.Group();
      doorRGroup.position.set(bayW / 2, 0.05, 0);
      const doorMeshR = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW, 0.12, bayL * 0.95), fuselageMat);
      doorMeshR.position.set(-doorPanelW / 2, 0, 0);
      doorMeshR.castShadow = true;
      doorRGroup.add(doorMeshR);

      const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW * 0.85, 0.08, bayL * 0.85), chromeMat);
      doorFrameR.position.set(-doorPanelW / 2, 0.06, 0);
      doorRGroup.add(doorFrameR);
      gearAssembly.add(doorRGroup);

      // 3. 기어 스트럿 회전 피벗 (베이 상부 중앙 회전축)
      const strutPivot = new THREE.Group();
      strutPivot.position.set(0, 0.1, isNose ? -0.2 : 0.2);

      // 충격 흡수 메인 올레오 스트럿 (Main Oleo Strut)
      const strutH = 3.4;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, strutH, 14), chromeMat);
      strut.position.set(0, -strutH / 2, 0);
      strut.castShadow = true;
      strutPivot.add(strut);

      // 측면 브레이스 드래그 스트럿
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), chromeMat);
      brace.position.set(0, -1.0, isNose ? 0.9 : -0.9);
      brace.rotation.x = isNose ? -0.55 : 0.55;
      strutPivot.add(brace);

      // 가위형 토크 링크 (Scissor Torque Links)
      const link1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.18), chromeMat);
      link1.position.set(0, -2.0, isNose ? 0.35 : -0.35);
      link1.rotation.x = isNose ? 0.45 : -0.45;
      strutPivot.add(link1);

      const link2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.18), chromeMat);
      link2.position.set(0, -2.6, isNose ? 0.35 : -0.35);
      link2.rotation.x = isNose ? -0.45 : 0.45;
      strutPivot.add(link2);

      let bogieBeamGroup = null;

      if (is4WheelBogie) {
        // --------------------------------------------------------
        // ★ 4륜 보기 대차 (4-Wheel Bogie: 전후 2축 4바퀴)
        // --------------------------------------------------------
        bogieBeamGroup = new THREE.Group();
        bogieBeamGroup.position.set(0, -3.2, 0);

        // 보기 빔 바 (Bogie Beam)
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 2.8), chromeMat);
        beam.castShadow = true;
        bogieBeamGroup.add(beam);

        // 전방 축(Z=-1.0) & 후방 축(Z=+1.0)
        [-1.0, 1.0].forEach(axleZ => {
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 12), chromeMat);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, 0, axleZ);
          bogieBeamGroup.add(axle);

          [-1.05, 1.05].forEach(wheelX => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wheelX, 0, axleZ);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.62, 20), tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.64, 16), chromeMat);
            hub.rotation.z = Math.PI / 2;
            wheelGroup.add(hub);

            const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.68, 10), chromeMat);
            hubCap.rotation.z = Math.PI / 2;
            wheelGroup.add(hubCap);

            bogieBeamGroup.add(wheelGroup);
            this.wheels.push(tire);
          });
        });

        strutPivot.add(bogieBeamGroup);

      } else {
        // --------------------------------------------------------
        // 2륜 기어 (노즈 기어 및 일반 2바퀴 기어)
        // --------------------------------------------------------
        const axleGroup = new THREE.Group();
        axleGroup.position.set(0, -3.2, 0);

        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, isNose ? 1.6 : 2.0, 10), chromeMat);
        axle.rotation.z = Math.PI / 2;
        axleGroup.add(axle);

        const wheelOffset = isNose ? 0.65 : 0.85;
        [-wheelOffset, wheelOffset].forEach(wheelX => {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(isNose ? 0.78 : 0.92, isNose ? 0.78 : 0.92, isNose ? 0.48 : 0.55, 18),
            tireMat
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wheelX, 0, 0);
          wheel.castShadow = true;
          axleGroup.add(wheel);

          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(isNose ? 0.42 : 0.48, isNose ? 0.42 : 0.48, isNose ? 0.5 : 0.58, 14),
            chromeMat
          );
          hub.rotation.z = Math.PI / 2;
          hub.position.set(wheelX, 0, 0);
          axleGroup.add(hub);

          this.wheels.push(wheel);
        });

        strutPivot.add(axleGroup);

        if (isNose) {
          this.controlSurfaces.noseWheelGroup = axleGroup;
        }
      }

      gearAssembly.add(strutPivot);

      // 초기 상태 반영 (DOWN/UP 상태에 따른 초기 회전 각도)
      const isDown = (this.gearPhase === 'DOWN' || (this.gearPhase !== 'UP' && this.gearExtended));
      if (isDown) {
        strutPivot.rotation.x = 0;
        strutPivot.visible = true;
        doorLGroup.rotation.z = 0;
        doorRGroup.rotation.z = 0;
      } else {
        strutPivot.rotation.x = -Math.PI / 2;
        strutPivot.visible = false;
        doorLGroup.rotation.z = 0;
        doorRGroup.rotation.z = 0;
      }

      gearAssembly.userData = {
        strutPivot: strutPivot,
        doorL: doorLGroup,
        doorR: doorRGroup,
        bogieBeam: bogieBeamGroup,
        isNose: isNose,
        is4WheelBogie: is4WheelBogie,
        origPos: new THREE.Vector3(x, y, z)
      };

      this.planeGroup.add(gearAssembly);
      this.landingGears.push(gearAssembly);
    };

    if (type === 'dc10') {
      // ------------------------------------------------------------
      // [DC-10 삼발기] 와이드바디 점보 여객기 (NACA 에어포일 곡면익 & 유선형 노즈 & 회전 터보팬)
      // ------------------------------------------------------------
      // 1. 유선형 고정밀 동체 (Fuselage with Realistic Aft Upsweep & Graphic Livery)
      // 1) 중앙 승객 객실 원통 동체 (Main Cabin Fuselage)
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 17, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -3.5);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // 2) ★ 동체 후방 업스윕 섹션 (Aft Fuselage Upsweep: 상단 수평 유지, 하부 배면이 위로 부드럽게 솟아오름!)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(2.9, 1.65, 10.5, 32, 16), liveryMat);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.position.set(0, 0, 10.25);
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // 3) ★ 테일콘 & APU 배기 노즐 (Tail Cone & APU Exhaust)
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.65, 4.8, 32), fuselageMat);
      tailCone.position.set(0, 1.25, 17.9);
      tailCone.rotation.x = Math.PI / 2 + 0.12;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      const apuNozzle = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 10, 20), chromeMat);
      apuNozzle.position.set(0, 1.60, 20.3);
      this.planeGroup.add(apuNozzle);

      // 4) ★ 동체 하부 밸리 페어링 (Wing-Body Belly Fairing: 날개와 동체를 잇는 공기역학 팽창부)
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.45, 14.5), fuselageMat);
      bellyFairing.position.set(0, -2.1, 0.0);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ 실기형 유선형 노즈 콘 (장난감 반구/원뿔이 아닌 매끄러운 에어로다이내믹 노즈)
      const noseGeo = this.createStreamlinedNoseGeo(2.9, 8.2, 32, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, 0, -12);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (곡면에 일체화된 실기형 캐노피 프레임)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.12, 2.2), glassMat);
      windshield.position.set(0, 1.78, -11.4);
      windshield.rotation.x = 0.36;
      this.planeGroup.add(windshield);

      // 2. ★ 실기형 NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 & 가동 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeWingSection = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // ★ NACA 0012 기반 슈퍼크리티컬 곡면 에어포일 메쉬 (앞은 둥글고 위는 양력 캠버 곡선, 뒤는 날렵)
        const airfoilGeo = this.createAirfoilWingGeo(18.5, 7.2, 2.4, 0.54, 4.0, 0.95, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 크롬 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.38, 0.50), chromeMat);
        slat.position.set(sign * 9.8, 0.28, sign * -1.6 - 2.6);
        slat.rotation.y = -sign * 0.38;
        slat.rotation.z = -sign * 0.07;
        wing.add(slat);

        // ★ 플랩 트랙 카누 페어링 3기 (Flap Track Canoe Fairings)
        [5.4, 9.2, 13.4].forEach((canoeX, cIdx) => {
          const canoeGroup = new THREE.Group();
          const canoeLen = 3.6 - cIdx * 0.4;
          const canoeR = 0.28 - cIdx * 0.02;

          const cBody = new THREE.Mesh(new THREE.CylinderGeometry(canoeR, canoeR * 0.85, canoeLen * 0.6, 12), fuselageMat);
          cBody.rotation.x = Math.PI / 2;
          cBody.castShadow = true;
          canoeGroup.add(cBody);

          const cTail = new THREE.Mesh(new THREE.ConeGeometry(canoeR, canoeLen * 0.4, 12), chromeMat);
          cTail.rotation.x = -Math.PI / 2;
          cTail.position.set(0, 0, canoeLen * 0.5);
          canoeGroup.add(cTail);

          const cNose = new THREE.Mesh(new THREE.SphereGeometry(canoeR, 10, 8), chromeMat);
          cNose.position.set(0, 0, -canoeLen * 0.3);
          canoeGroup.add(cNose);

          const zOffset = (cIdx === 0 ? 3.0 : (cIdx === 1 ? 1.6 : 0.0));
          canoeGroup.position.set(sign * canoeX, -0.42 + cIdx * 0.06, zOffset);
          canoeGroup.rotation.y = -sign * 0.38;
          canoeGroup.rotation.z = -sign * 0.07;
          wing.add(canoeGroup);
        });

        // 윙렛 & 항행등
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.6, 1.8), cheatlineMat);
        winglet.position.set(sign * 18.2, 1.25, sign * -4.8 + 2.0);
        winglet.rotation.y = -sign * 0.38;
        winglet.rotation.z = -sign * 0.12;
        wing.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 18.4, 0.3, sign * -4.5 + 2.0);
        wing.add(navLight);

        // ★ 가동 에일러론 (주익 외측 후연 힌지 피벗)
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 13.5, 0.48, sign * -1.8 + 2.2);

        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 1.25), wingMat);
        aileronMesh.position.set(0, 0, 0.65);
        aileronMesh.rotation.y = -sign * 0.38;
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

      // 3. ★ 3개 대형 제트 엔진 (Wing Engines #1, #3 & Fin Engine #2 - 실제 회전 터보팬 블레이드 장착!)
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

        // 엔진 흡입구 내부 어두운 터널
        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.22, 24),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.55);
        eng.add(intakeDisk);

        // ★ 실제 20여 장의 고속 회전 티타늄 터보팬 블레이드 & 중앙 스파이럴 콘!
        const turbofan = this.createTurbofanFan(r * 0.88, 22, chromeMat);
        turbofan.position.set(0, 0, -2.4);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

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

      // 5. 수평 안정판 & 가동 승강타 (Horizontal Stabilizer & Movable Elevators - 업스윕 테일콘 상단 배치)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 2.0, 17.0);

      const hStabMesh = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.35, 3.8), wingMat);
      hStabMesh.rotation.y = -0.28;
      hStabMesh.castShadow = true;
      hStabGroup.add(hStabMesh);

      // ★ 가동 승강타 (Movable Elevators)
      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.8);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.24, 1.4), wingMat);
      elevMesh.position.set(0, 0, 0.7);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // 랜딩기어 (활주로 Y=2.12에 바퀴 접지: y=-0.6, DC-10 메인 4륜 보기 대차)
      makeGear(0, -0.6, -11.5, true, false);
      makeGear(-4.9, -0.6, 1.8, false, true);
      makeGear(4.9, -0.6, 1.8, false, true);

    } else if (type === 'md80') {
      // ------------------------------------------------------------
      // [MD-80 후방 쌍발기] 날렵한 롱바디 협동체 & T-Tail (실기형 Aft Upsweep & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 유선형 롱바디 동체
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 22, 30), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -4.0);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // ★ MD-80 후방 업스윕 동체 (Aft Upsweep: 상단 수평 유지, 하부 솟아오름)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(2.1, 1.15, 10.5, 30, 16), liveryMat);
      aftFuselage.position.set(0, 0, 12.25);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // ★ MD-80 스크루드라이버 테일콘
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.15, 4.5, 30), fuselageMat);
      tailCone.position.set(0, 0.95, 19.5);
      tailCone.rotation.x = Math.PI / 2 + 0.12;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      // 동체 하부 밸리 페어링
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 10.5), fuselageMat);
      bellyFairing.position.set(0, -1.6, 0.0);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ 실기형 날렵한 롱노즈 (에어로다이내믹 펜슬 노즈)
      const noseGeo = this.createStreamlinedNoseGeo(2.1, 9.0, 30, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, -0.05, -15.0);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.90, 1.8), glassMat);
      windshield.position.set(0, 1.28, -14.2);
      windshield.rotation.x = 0.40;
      this.planeGroup.add(windshield);

      // 2. ★ NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 & 에일러론
      const mainWingsGroup = new THREE.Group();
      [-1, 1].forEach(sign => {
        // ★ 공기역학 에어포일 날개
        const isLeft = (sign < 0);
        const airfoilGeo = this.createAirfoilWingGeo(16.5, 5.8, 1.9, 0.44, 3.4, 0.82, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        mainWingsGroup.add(mainAirfoil);

        // 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.35, 0.45), chromeMat);
        slat.position.set(sign * 8.2, 0.20, sign * -1.2 - 2.0);
        slat.rotation.y = -sign * 0.34;
        slat.rotation.z = -sign * 0.06;
        mainWingsGroup.add(slat);

        // 플랩 트랙 카누 페어링 2기
        [5.2, 9.8].forEach((canoeX, cIdx) => {
          const canoe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 2.8, 10), fuselageMat);
          canoe.rotation.x = Math.PI / 2;
          canoe.position.set(sign * canoeX, -0.32, (cIdx === 0 ? 2.2 : 0.8));
          canoe.rotation.y = -sign * 0.34;
          mainWingsGroup.add(canoe);
        });

        // 윙렛 & 항행등
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 1.4), cheatlineMat);
        winglet.position.set(sign * 16.2, 0.9, sign * -3.6 + 1.8);
        winglet.rotation.y = -sign * 0.34;
        mainWingsGroup.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 16.4, 0.25, sign * -3.3 + 1.8);
        mainWingsGroup.add(navLight);

        // 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 11.8, 0.35, sign * -1.5 + 2.0);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.20, 1.05), wingMat);
        aileronMesh.position.set(0, 0, 0.55);
        aileronMesh.rotation.y = -sign * 0.34;
        aileronPivot.add(aileronMesh);
        mainWingsGroup.add(aileronPivot);

        if (sign < 0) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;
      });
      mainWingsGroup.position.set(0, -0.4, 0);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // ★ 후방 동체 좌우 2기 제트 엔진 (실제 티타늄 터보팬 블레이드 회전!)
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
          new THREE.CylinderGeometry(0.96, 0.96, 0.2, 20),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.7);
        eng.add(intakeDisk);

        // 실제 고속 회전 터보팬
        const turbofan = this.createTurbofanFan(1.02, 20, chromeMat);
        turbofan.position.set(0, 0, -2.55);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

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
      makeGear(0, -0.6, -14.2, true, false);
      makeGear(-4.1, -0.6, 1.5, false, false);
      makeGear(4.1, -0.6, 1.5, false, false);

    } else if (type === 'a320') {
      // ------------------------------------------------------------
      // [A320 최신 여객기] 에어버스 협동체 베스트셀러 트윈 제트 (실기형 Aft Upsweep & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 유선형 고정밀 동체
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 16, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -3.5);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // ★ A320 후방 업스윕 동체 (Aft Upsweep: 상단 수평 유지, 하부 배면이 위로 부드럽게 솟아오름)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(2.35, 1.25, 9.5, 32, 16), liveryMat);
      aftFuselage.position.set(0, 0, 9.25);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // ★ 테일콘 & APU 배기 노즐
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.25, 4.2, 32), fuselageMat);
      tailCone.position.set(0, 1.15, 16.1);
      tailCone.rotation.x = Math.PI / 2 + 0.14;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      const apuNozzle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 16), chromeMat);
      apuNozzle.position.set(0, 1.48, 18.2);
      this.planeGroup.add(apuNozzle);

      // ★ 동체 하부 밸리 페어링 (Wing-Body Belly Fairing)
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.25, 11.5), fuselageMat);
      bellyFairing.position.set(0, -1.70, 0.2);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ 실기형 유선형 노즈 콘
      const noseGeo = this.createStreamlinedNoseGeo(2.35, 7.5, 32, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, 0, -11.5);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (Airbus A320 특유의 4면 곡면 글래스)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.02, 2.0), glassMat);
      windshield.position.set(0, 1.40, -10.9);
      windshield.rotation.x = 0.38;
      this.planeGroup.add(windshield);

      // 2. ★ NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 & 샤클렛(Sharklet) & 가동 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeA320Wing = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // ★ 유선형 에어포일 날개
        const airfoilGeo = this.createAirfoilWingGeo(17.2, 6.4, 2.2, 0.48, 3.6, 0.88, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 크롬 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.38, 0.48), chromeMat);
        slat.position.set(sign * 8.8, 0.22, sign * -1.4 - 2.3);
        slat.rotation.y = -sign * 0.38;
        slat.rotation.z = -sign * 0.07;
        wing.add(slat);

        // ★ 플랩 트랙 카누 페어링 2기 (Flap Track Canoes)
        [5.6, 9.8].forEach((canoeX, cIdx) => {
          const canoe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 3.0, 10), fuselageMat);
          canoe.rotation.x = Math.PI / 2;
          canoe.position.set(sign * canoeX, -0.34, (cIdx === 0 ? 2.5 : 1.1));
          canoe.rotation.y = -sign * 0.38;
          canoe.rotation.z = -sign * 0.07;
          wing.add(canoe);
        });

        // ★ A320 시그니처: 수직으로 솟구친 샤클렛 (Sharklet 윙팁 펜스)
        const sharkletGroup = new THREE.Group();
        sharkletGroup.position.set(sign * 17.2, 0.95, sign * -4.2 + 2.0);

        const finUpper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.8, 1.6), cheatlineMat);
        finUpper.position.set(0, 1.25, 0);
        finUpper.rotation.x = -0.22;
        finUpper.rotation.z = sign * 0.12;
        sharkletGroup.add(finUpper);

        const finLower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.9), cheatlineMat);
        finLower.position.set(0, -0.35, 0.1);
        sharkletGroup.add(finLower);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 0.15, 0.1, -0.6);
        sharkletGroup.add(navLight);
        wing.add(sharkletGroup);

        // 가동 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 12.6, 0.42, sign * -1.6 + 2.0);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.20, 1.15), wingMat);
        aileronMesh.position.set(0, 0, 0.6);
        aileronMesh.rotation.y = -sign * 0.38;
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeA320Wing(true));
      mainWingsGroup.add(makeA320Wing(false));
      mainWingsGroup.position.set(0, -0.5, 0);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. ★ 트윈 고바이패스 터보팬 엔진 (CFM56 - 실제 티타늄 팬 블레이드 회전 장착!)
      [-6.8, 6.8].forEach(x => {
        const eng = new THREE.Group();
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 3.6), fuselageMat);
        pylon.position.set(0, 1.1, 0.3);
        pylon.castShadow = true;
        eng.add(pylon);

        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.25, 5.4, 24), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.14, 12, 24), chromeMat);
        lip.position.set(0, 0, -2.7);
        eng.add(lip);

        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 0.22, 24),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.5);
        eng.add(intakeDisk);

        // 실제 회전 터보팬 블레이드
        const turbofan = this.createTurbofanFan(1.20, 22, chromeMat);
        turbofan.position.set(0, 0, -2.35);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

        const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.2, 14), chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0, 0, 3.0);
        eng.add(exhaust);

        eng.position.set(x, -2.0, 1.2);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, -2.0, 4.6));
      });

      // 4. 수직 꼬리날개 & 가동 방향타
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8.2, 5.4), fuselageMat);
      finMesh.position.set(0, 5.6, 12.8);
      finMesh.rotation.x = -0.34;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 5.6, 15.4);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 7.6, 1.8), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.9);
      rudderMesh.rotation.x = -0.34;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 5. 수평 꼬리날개 & 가동 승강타 (업스윕 테일콘 상단 배치)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 1.9, 15.0);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.35, 3.6), wingMat);
      hStab.rotation.y = -0.28;
      hStab.castShadow = true;
      hStabGroup.add(hStab);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.7);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.25, 1.3), wingMat);
      elevMesh.position.set(0, 0, 0.65);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // 랜딩기어
      makeGear(0, -0.6, -12.5, true, false);
      makeGear(-4.8, -0.6, 2.0, false, false);
      makeGear(4.8, -0.6, 2.0, false, false);

    } else if (type === 'b747') {
      // ------------------------------------------------------------
      // [B747-400 점보기] 하늘의 여왕 퀸 오브 더 스카이 (실기형 거대 Aft Upsweep & 18륜 대차 & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 거대한 와이드바디 동체
      // 1) 1층 메인 승객 객실 원통 동체
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 20, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -3.5);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // 2) ★ B747 동체 후방 업스윕 섹션 (Aft Fuselage Upsweep: 상단 수평 유지, 거대한 배면이 위로 솟아오름!)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(3.4, 1.95, 12.0, 32, 16), liveryMat);
      aftFuselage.position.set(0, 0, 12.5);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // 3) ★ 테일콘 & APU 배기 노즐
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.95, 5.2, 32), fuselageMat);
      tailCone.position.set(0, 1.50, 21.1);
      tailCone.rotation.x = Math.PI / 2 + 0.14;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      const apuNozzle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.10, 10, 20), chromeMat);
      apuNozzle.position.set(0, 1.90, 23.7);
      this.planeGroup.add(apuNozzle);

      // 4) ★ B747 거대 날개-동체 밸리 페어링 (Giant Wing-Body Belly Fairing)
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.85, 16.5), fuselageMat);
      bellyFairing.position.set(0, -2.45, 0.5);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ B747 실기형 유선형 노즈 콘
      const noseGeo = this.createStreamlinedNoseGeo(3.4, 9.2, 32, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, 0, -15.2);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // ★ B747 시그니처: 2층 어퍼덱 험프 (Upper Deck Hump)
      const hump = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 16, 24, 1, false, 0, Math.PI), liveryMat);
      hump.rotation.x = Math.PI / 2;
      hump.rotation.z = Math.PI;
      hump.position.set(0, 1.35, -9.5);
      hump.scale.set(0.95, 1.0, 1.0);
      hump.castShadow = true;
      this.planeGroup.add(hump);

      // 2층 콕핏 윈드실드 (실기형 6면 캐노피)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.20, 2.2), glassMat);
      windshield.position.set(0, 3.35, -16.0);
      windshield.rotation.x = 0.40;
      this.planeGroup.add(windshield);

      // 2. ★ 거대한 B747 실기형 NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 4기 & 대형 윙렛 & 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeB747Wing = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // ★ 거대한 전폭(23.5m per wing) 공기역학 에어포일 메쉬
        const airfoilGeo = this.createAirfoilWingGeo(23.5, 9.8, 2.8, 0.72, 6.0, 1.15, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 크롬 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.50, 0.65), chromeMat);
        slat.position.set(sign * 12.0, 0.45, sign * -2.4 - 3.0);
        slat.rotation.y = -sign * 0.48;
        slat.rotation.z = -sign * 0.08;
        wing.add(slat);

        // ★ B747 날개 하부 플랩 트랙 카누 페어링 4기 (Flap Track Canoes)
        [6.8, 10.5, 14.2, 17.8].forEach((canoeX, cIdx) => {
          const canoe = new THREE.Group();
          const canoeLen = 4.4 - cIdx * 0.4;
          const canoeR = 0.32 - cIdx * 0.02;

          const cBody = new THREE.Mesh(new THREE.CylinderGeometry(canoeR, canoeR * 0.85, canoeLen * 0.6, 12), fuselageMat);
          cBody.rotation.x = Math.PI / 2;
          cBody.castShadow = true;
          canoe.add(cBody);

          const cTail = new THREE.Mesh(new THREE.ConeGeometry(canoeR, canoeLen * 0.4, 12), chromeMat);
          cTail.rotation.x = -Math.PI / 2;
          cTail.position.set(0, 0, canoeLen * 0.5);
          canoe.add(cTail);

          const cNose = new THREE.Mesh(new THREE.SphereGeometry(canoeR, 10, 8), chromeMat);
          cNose.position.set(0, 0, -canoeLen * 0.3);
          canoe.add(cNose);

          const zPos = (cIdx === 0 ? 3.8 : (cIdx === 1 ? 2.2 : (cIdx === 2 ? 0.6 : -1.0)));
          canoe.position.set(sign * canoeX, -0.48 + cIdx * 0.06, zPos);
          canoe.rotation.y = -sign * 0.48;
          canoe.rotation.z = -sign * 0.08;
          wing.add(canoe);
        });

        // 대형 윙렛 (B747-400 Tall Winglet)
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 2.4), cheatlineMat);
        winglet.position.set(sign * 23.2, 2.2, sign * -7.5 + 2.8);
        winglet.rotation.y = -sign * 0.48;
        winglet.rotation.z = -sign * 0.15;
        wing.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 23.4, 0.5, sign * -7.2 + 2.8);
        wing.add(navLight);

        // 가동 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 16.8, 0.68, sign * -2.6 + 2.6);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.28, 1.5), wingMat);
        aileronMesh.position.set(0, 0, 0.8);
        aileronMesh.rotation.y = -sign * 0.48;
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeB747Wing(true));
      mainWingsGroup.add(makeB747Wing(false));
      mainWingsGroup.position.set(0, -0.6, 0);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. ★ 4발 대형 제트 터보팬 엔진 (CF6-80: 4기 모두 실제 티타늄 팬 블레이드 회전 장착!)
      [-14.5, -8.2, 8.2, 14.5].forEach((x, idx) => {
        const eng = new THREE.Group();
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 4.2), fuselageMat);
        pylon.position.set(0, 1.3, 0.4);
        pylon.castShadow = true;
        eng.add(pylon);

        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.38, 6.0, 24), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.16, 12, 24), chromeMat);
        lip.position.set(0, 0, -3.0);
        eng.add(lip);

        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(1.28, 1.28, 0.25, 24),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.75);
        eng.add(intakeDisk);

        // 실제 24장의 대형 CF6 회전 터보팬 블레이드
        const turbofan = this.createTurbofanFan(1.35, 24, chromeMat);
        turbofan.position.set(0, 0, -2.55);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

        const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.5, 14), chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0, 0, 3.4);
        eng.add(exhaust);

        const zOff = (Math.abs(x) > 10 ? -2.2 : 0.8);
        const yOff = (Math.abs(x) > 10 ? -1.8 : -2.4);
        eng.position.set(x, yOff, zOff);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, yOff, zOff + 4.2));
      });

      // 4. 웅장한 수직 꼬리날개 & 가동 방향타 (업스윕 테일 상단 배치)
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10.5, 6.8), fuselageMat);
      finMesh.position.set(0, 9.2, 17.5);
      finMesh.rotation.x = -0.38;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 9.2, 20.8);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 9.8, 2.2), cheatlineMat);
      rudderMesh.position.set(0, 0, 1.1);
      rudderMesh.rotation.x = -0.38;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 5. 거대한 수평미익 & 가동 승강타 (업스윕 테일콘 상단 배치)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 2.8, 19.5);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.42, 4.8), wingMat);
      hStab.rotation.y = -0.32;
      hStab.castShadow = true;
      hStabGroup.add(hStab);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 2.2);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.3, 1.6), wingMat);
      elevMesh.position.set(0, 0, 0.8);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // ★ 보잉 747-400 초대형 18륜 메인 랜딩기어 시스템 (노즈 2륜 + 메인 4개 대차 16륜 = 총 18개 바퀴 완비!)
      makeGear(0, -0.6, -15.5, true, false);      // 전방 조향 노즈 기어 (2륜)
      makeGear(-6.2, -0.6, 1.8, false, true);     // 좌측 윙 메인 기어 (4륜 대차)
      makeGear(6.2, -0.6, 1.8, false, true);      // 우측 윙 메인 기어 (4륜 대차)
      makeGear(-2.2, -0.6, 3.8, false, true);     // 좌측 바디 메인 기어 (4륜 대차)
      makeGear(2.2, -0.6, 3.8, false, true);      // 우측 바디 메인 기어 (4륜 대차)

    } else if (type === 'concorde') {
      // ------------------------------------------------------------
      // [콩코드] 마하 2.0 초음속 여객기 (Supersonic Airliner & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 슬림하고 긴 초음속 원통 동체 & 실기형 업스윕 테일
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 24, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -2.0);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // ★ 콩코드 초음속 업스윕 테일 (Supersonic Upswept Tail Cone)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(1.8, 0.65, 14, 32, 16), liveryMat);
      aftFuselage.position.set(0, 0, 17.0);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // 초음속 테일 범퍼 휠
      const tailBumper = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12), chromeMat);
      tailBumper.rotation.z = Math.PI / 2;
      tailBumper.position.set(0, 0.35, 23.5);
      this.planeGroup.add(tailBumper);

      // ★ 콩코드 시그니처: 드룹 노즈 (Drooping Supersonic Needle Nose)
      const droopNoseGroup = new THREE.Group();
      droopNoseGroup.position.set(0, 0, -14);
      const needleNose = new THREE.Mesh(new THREE.ConeGeometry(1.8, 9.5, 24), fuselageMat);
      needleNose.rotation.x = -Math.PI / 2 + 0.12; // 드룹 노즈 꺾임 각도
      needleNose.position.set(0, -0.5, -4.5);
      needleNose.castShadow = true;
      droopNoseGroup.add(needleNose);

      // 초음속 바이저 윈드실드
      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 2.4), glassMat);
      visor.position.set(0, 0.45, -2.5);
      visor.rotation.x = 0.55;
      droopNoseGroup.add(visor);

      this.planeGroup.add(droopNoseGroup);
      this.noseMesh = needleNose;

      // 2. 전설적인 오기브 델타익 (Ogive Slender Delta Wing) & 가동 엘레본 (Elevons)
      const deltaWingGroup = new THREE.Group();

      [-1, 1].forEach(sign => {
        // 복합 델타익 형상 (3단계 슬렌더 델타 메쉬)
        const d1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.38, 22), wingMat);
        d1.position.set(sign * 4.2, -0.3, 3);
        d1.rotation.y = -sign * 0.52;
        d1.castShadow = true;
        deltaWingGroup.add(d1);

        const d2 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.28, 14), wingMat);
        d2.position.set(sign * 8.6, -0.25, 7.5);
        d2.rotation.y = -sign * 0.65;
        d2.castShadow = true;
        deltaWingGroup.add(d2);

        // 항행등
        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 12.8, -0.1, 12.5);
        deltaWingGroup.add(navLight);

        // ★ 가동 엘레본 (Elevons: 에일러론 + 승강타 통합 조종면)
        const elevonPivot = new THREE.Group();
        elevonPivot.position.set(sign * 7.5, -0.25, 14.5);
        const elevonMesh = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.22, 1.8), wingMat);
        elevonMesh.position.set(0, 0, 0.9);
        elevonPivot.add(elevonMesh);
        deltaWingGroup.add(elevonPivot);

        if (sign < 0) this.controlSurfaces.leftAileron = elevonPivot;
        else this.controlSurfaces.rightAileron = elevonPivot;
      });

      this.planeGroup.add(deltaWingGroup);
      this.wingsMesh = deltaWingGroup;

      // 3. 듀얼 사각 램젯 엔진 박스 2기 (날개 하부 올림푸스 4발 엔진 & 애프터버너)
      [-4.2, 4.2].forEach(sideX => {
        const engBox = new THREE.Group();
        // 사각형 초음속 흡입구 나셀 박스
        const box = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 9.5), fuselageMat);
        box.position.set(0, -0.9, 0);
        box.castShadow = true;
        engBox.add(box);

        // 2개 트윈 애프터버너 배기 노즐
        [-0.9, 0.9].forEach(ex => {
          const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 1.4, 16), chromeMat);
          nozzle.rotation.x = Math.PI / 2;
          nozzle.position.set(ex, -0.9, 5.2);
          engBox.add(nozzle);

          // 애프터버너 불꽃 코어 링
          const flameRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.65, 0.08, 8, 16),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          flameRing.position.set(ex, -0.9, 5.8);
          engBox.add(flameRing);

          this.engineExhaustPoints.push(new THREE.Vector3(sideX + ex, -1.8, 14.5));
        });

        engBox.position.set(sideX, -0.5, 9.0);
        this.planeGroup.add(engBox);
      });

      // 4. 초음속 수직 델타핀 & 방향타
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.8, 7.5), fuselageMat);
      finMesh.position.set(0, 5.5, 14.5);
      finMesh.rotation.x = -0.55;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 5.5, 18.2);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8.2, 1.8), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.9);
      rudderMesh.rotation.x = -0.55;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 랜딩기어 (콩코드 4륜 대차)
      makeGear(0, -0.6, -13.5, true, false);
      makeGear(-4.2, -0.6, 4.5, false, true);
      makeGear(4.2, -0.6, 4.5, false, true);

    } else if (type === 'amphibian') {
      // ------------------------------------------------------------
      // [수륙양용기] 듀얼 플로트 수상비행기 & 터보프롭 수륙양용정 (그래픽 리버리)
      // ------------------------------------------------------------
      const rescueMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.1 });

      // 1. 유선형 박스-라운드 동체 (전장 25m, 직경 2.4m)
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.0, 25, 24), liveryMat);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      this.planeGroup.add(fuselage);
      this.fuselageMesh = fuselage;

      // ★ 실기형 유선형 노즈 콘
      const noseGeo = this.createStreamlinedNoseGeo(2.1, 7.2, 24, 16);
      const nose = new THREE.Mesh(noseGeo, rescueMat);
      nose.position.set(0, -0.05, -12.5);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (파노라마 해양 조종석 글래스)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.05, 2.2), glassMat);
      windshield.position.set(0, 1.15, -11.8);
      windshield.rotation.x = 0.38;
      this.planeGroup.add(windshield);

      // 2. ★ 고익기 실기형 에어포일 주익 (High-Mounted Airfoil Wings) & 가동 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeAmphibianWing = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // 에어포일 곡면 날개
        const airfoilGeo = this.createAirfoilWingGeo(14.5, 4.8, 3.6, 0.44, 0.3, 0.15, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 레스큐 오렌지 윙팁
        const tipW = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.44, 3.8), rescueMat);
        tipW.position.set(sign * 14.8, 0.2, 0);
        wing.add(tipW);

        // 윙팁 전복 방지 보조 플로트 (Wingtip Stabilizer Float)
        const tipFloatPylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.5), chromeMat);
        tipFloatPylon.position.set(sign * 14.5, -0.9, 0);
        wing.add(tipFloatPylon);

        const tipFloat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 4.0, 12), rescueMat);
        tipFloat.rotation.x = Math.PI / 2;
        tipFloat.position.set(sign * 14.5, -1.8, 0);
        wing.add(tipFloat);

        // 주익 지지 V-스트럿 (Wing Strut to Fuselage)
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5, 8), chromeMat);
        strut.position.set(sign * 5.2, -1.8, 0);
        strut.rotation.z = sign * 0.45;
        wing.add(strut);

        // 항행등
        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 15.6, 0.1, -2.0);
        wing.add(navLight);

        // 가동 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 10.5, 0, 1.8);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.22, 1.2), wingMat);
        aileronMesh.position.set(0, 0, 0.6);
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeAmphibianWing(true));
      mainWingsGroup.add(makeAmphibianWing(false));
      mainWingsGroup.position.set(0, 2.0, -1.5);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. 트윈 터보프롭 엔진 2기 & 회전 프로펠러
      [-5.5, 5.5].forEach(x => {
        const eng = new THREE.Group();
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.82, 5.2, 16), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 16), chromeMat);
        spinner.rotation.x = -Math.PI / 2;
        spinner.position.set(0, 0, -3.2);
        eng.add(spinner);

        const propDisk = new THREE.Mesh(
          new THREE.CircleGeometry(2.4, 24),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        propDisk.position.set(0, 0, -2.8);
        eng.add(propDisk);

        const exPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 10), chromeMat);
        exPipe.rotation.z = Math.PI / 3;
        exPipe.position.set(0.7, 0.4, 1.5);
        eng.add(exPipe);

        eng.position.set(x, 2.0, -1.8);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, 2.0, 1.2));
      });

      // 4. 대형 듀얼 수상 플로트 (Dual Pontoon Floats)
      [-4.0, 4.0].forEach(sideX => {
        const floatGroup = new THREE.Group();

        const pontoon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 17), fuselageMat);
        pontoon.position.set(0, 0, 0);
        pontoon.castShadow = true;
        floatGroup.add(pontoon);

        const pontoonNose = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.8, 14), rescueMat);
        pontoonNose.rotation.x = -Math.PI / 2 + 0.18;
        pontoonNose.position.set(0, 0.3, -9.5);
        floatGroup.add(pontoonNose);

        const pontoonTail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 3.2), wingMat);
        pontoonTail.position.set(0, 0.2, 9.2);
        floatGroup.add(pontoonTail);

        [-4.5, 2.5].forEach(zPos => {
          const pylon1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), chromeMat);
          pylon1.position.set(sideX > 0 ? -1.2 : 1.2, 1.4, zPos);
          pylon1.rotation.z = (sideX > 0 ? 1 : -1) * 0.42;
          floatGroup.add(pylon1);

          const pylon2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), chromeMat);
          pylon2.position.set(0, 1.3, zPos);
          floatGroup.add(pylon2);
        });

        floatGroup.position.set(sideX, -2.4, -0.5);
        this.planeGroup.add(floatGroup);
      });

      // 5. 수직 꼬리날개 & 가동 방향타
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 7.5, 4.8), rescueMat);
      finMesh.position.set(0, 4.8, 12.0);
      finMesh.rotation.x = -0.32;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 4.8, 14.4);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.8, 1.6), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.8);
      rudderMesh.rotation.x = -0.32;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 6. 수평 꼬리날개 & 가동 승강타
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 4.2, 12.8);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.32, 3.2), wingMat);
      hStab.castShadow = true;
      hStabGroup.add(hStab);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.5);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.22, 1.2), wingMat);
      elevMesh.position.set(0, 0, 0.6);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;
      this.planeGroup.add(hStabGroup);

      // 7. 수륙양용 바퀴
      makeGear(0, -0.6, -11.5, true, false);
      makeGear(-4.0, -0.6, 1.5, false, false);
      makeGear(4.0, -0.6, 1.5, false, false);
    } else if (type === 'ancestor') {
      // ★ 1903 라이트 클래식 "조상 비행기" (Pioneer Ancestor Biplane)
      // 인류 최초의 비행기 형태를 재현한 복엽 구조, 목재 트러스, 회전 프로펠러 2기
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, metalness: 0.1 });
      const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
      const canvasMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88, side: THREE.DoubleSide });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
      const propMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4, metalness: 0.2 });

      // 1. 복엽 주익 (상부 날개 & 하부 날개)
      const wingSpan = 15.0;
      const wingChord = 2.8;
      const wingThickness = 0.12;

      // 하부 날개 (Lower Wing)
      const lowerWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, wingThickness, wingChord), canvasMat);
      lowerWing.position.set(0, 0.5, 0);
      lowerWing.castShadow = true;
      this.planeGroup.add(lowerWing);

      // 상부 날개 (Upper Wing)
      const upperWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, wingThickness, wingChord), canvasMat);
      upperWing.position.set(0, 3.2, 0);
      upperWing.castShadow = true;
      this.planeGroup.add(upperWing);

      // 날개 사이 12개 목재 스트럿 (Interplane Struts) & 크로스 와이어
      const strutXPositions = [-6.8, -4.2, -1.6, 1.6, 4.2, 6.8];
      strutXPositions.forEach(sx => {
        [-0.9, 0.9].forEach(sz => {
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6), woodMat);
          strut.position.set(sx, 1.85, sz);
          strut.castShadow = true;
          this.planeGroup.add(strut);
        });

        // X자 크로스 브레이싱 와이어
        const wire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.9, 4), ironMat);
        wire1.position.set(sx, 1.85, 0);
        wire1.rotation.x = 0.55;
        this.planeGroup.add(wire1);
        const wire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.9, 4), ironMat);
        wire2.position.set(sx, 1.85, 0);
        wire2.rotation.x = -0.55;
        this.planeGroup.add(wire2);
      });

      // 2. 전방 복엽 승강타 (Front Elevator / Canard)
      const canardBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2), woodMat);
      canardBeamL.position.set(-1.8, 1.2, -2.1);
      canardBeamL.rotation.x = 0.18;
      this.planeGroup.add(canardBeamL);

      const canardBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2), woodMat);
      canardBeamR.position.set(1.8, 1.2, -2.1);
      canardBeamR.rotation.x = 0.18;
      this.planeGroup.add(canardBeamR);

      const canardGroup = new THREE.Group();
      canardGroup.position.set(0, 1.6, -4.2);
      const canardUpper = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.2), canvasMat);
      canardUpper.position.set(0, 0.55, 0);
      canardGroup.add(canardUpper);
      const canardLower = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.2), canvasMat);
      canardLower.position.set(0, -0.55, 0);
      canardGroup.add(canardLower);

      [-2.1, -0.7, 0.7, 2.1].forEach(cx => {
        const cStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), woodMat);
        cStrut.position.set(cx, 0, 0);
        canardGroup.add(cStrut);
      });
      this.controlSurfaces.leftElevator = canardGroup;
      this.controlSurfaces.rightElevator = canardGroup;
      this.planeGroup.add(canardGroup);

      // 3. 후방 트윈 러더 (Twin Vertical Rudders)
      const rudderBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), woodMat);
      rudderBeamL.position.set(-1.4, 1.6, 2.4);
      this.planeGroup.add(rudderBeamL);
      const rudderBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), woodMat);
      rudderBeamR.position.set(1.4, 1.6, 2.4);
      this.planeGroup.add(rudderBeamR);

      const rudderGroup = new THREE.Group();
      rudderGroup.position.set(0, 1.8, 4.8);
      [-0.9, 0.9].forEach(rx => {
        const rBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.3), canvasMat);
        rBlade.position.set(rx, 0, 0);
        rudderGroup.add(rBlade);
      });
      this.controlSurfaces.rudder = rudderGroup;
      this.planeGroup.add(rudderGroup);

      // 4. 중앙 4기통 피스톤 엔진 블록 & 구동 체인
      const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.2), ironMat);
      engineBlock.position.set(0.6, 0.9, 0.2);
      this.planeGroup.add(engineBlock);

      // 배기 파이프
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), darkWoodMat);
      exhaust.position.set(0.8, 1.4, 0.2);
      this.planeGroup.add(exhaust);
      this.engineExhaustPoints.push(new THREE.Vector3(0.8, 1.4, 0.6));

      // 5. ★ 회전하는 트윈 목재 푸셔 프로펠러 (Twin Counter-Rotating Pusher Props)
      [-1.9, 1.9].forEach((px) => {
        const propAssembly = new THREE.Group();
        propAssembly.position.set(px, 1.8, 1.5); // 후방 추진 배치

        const pHub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12), ironMat);
        pHub.rotation.x = Math.PI / 2;
        propAssembly.add(pHub);

        // 2엽 목재 프로펠러 블레이드 (지름 2.4m)
        const bladeGeo = new THREE.BoxGeometry(0.18, 2.4, 0.05);
        const bladeMesh = new THREE.Mesh(bladeGeo, propMat);
        propAssembly.add(bladeMesh);

        this.turbofans.push(propAssembly); // 엔진 스로틀/속도에 따라 고속 회전!
        this.planeGroup.add(propAssembly);
      });

      // 6. 오픈 조종석 & 조상 파일럿 (Pioneer Pilot Figure)
      const pilotGroup = new THREE.Group();
      pilotGroup.position.set(-0.5, 0.75, 0); // 엔진 좌측에 엎드린 자세

      // 몸통 (갈색 가죽 재킷)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 1.1), new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.9 }));
      pilotGroup.add(torso);

      // 머리 & 가죽 비행모 & 고글
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), new THREE.MeshStandardMaterial({ color: 0x7c4a2d }));
      head.position.set(0, 0.18, -0.65);
      pilotGroup.add(head);

      const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.12), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 }));
      goggles.position.set(0, 0.22, -0.80);
      pilotGroup.add(goggles);

      // 조종간 레버
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), ironMat);
      lever.position.set(0.15, 0.3, -0.4);
      pilotGroup.add(lever);

      this.planeGroup.add(pilotGroup);

      // 7. 착륙 기구: 2개의 목재 스키드 (Skids) & 경량 바퀴
      [-1.4, 1.4].forEach(kx => {
        const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), darkWoodMat);
        skid.position.set(kx, -0.35, -0.5);
        this.planeGroup.add(skid);

        const skidCurv = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), darkWoodMat);
        skidCurv.position.set(kx, 0.15, -2.8);
        skidCurv.rotation.x = 0.75;
        this.planeGroup.add(skidCurv);

        // 경량 와이어 휠
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 14), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(kx, -0.35, 0.6);
        this.wheels.push(wheel);
        this.planeGroup.add(wheel);
      });
    }

    if (savedPos && savedQuat) {
      this.planeGroup.position.copy(savedPos);
      this.planeGroup.quaternion.copy(savedQuat);
    } else {
      // 기본 위치 (초기엔 활주로 36L 정렬)
      this.planeGroup.position.set(120, this.groundY, 800);
      this.planeGroup.rotation.set(0, 0, 0);
    }

    // 항공기 정밀 항법등 (좌현 적색, 우현 녹색, 꼬리 백색, 상하부 적색 비콘 스트로브)
    this.attachAircraftNavLights(type);

    this.scene.add(this.planeGroup);
  }

  // ----------------------------------------------------------------
  // 기체 항법등 (Navigation & Anti-Collision Strobe Lights)
  // ----------------------------------------------------------------
  attachAircraftNavLights(type) {
    this.aircraftNavLights = [];
    this.beaconStrobes = [];

    const navLightDefs = {
      dc10: { span: 22.0, wingY: -0.2, wingZ: 0.5, tailY: 7.5, tailZ: 16.5, topY: 3.2, topZ: -2, btmY: -3.1, btmZ: -1 },
      md80: { span: 16.5, wingY: -0.2, wingZ: 0.2, tailY: 6.8, tailZ: 18.5, topY: 2.4, topZ: -2, btmY: -2.4, btmZ: -1 },
      a320: { span: 17.8, wingY: 0.2, wingZ: 0.2, tailY: 6.5, tailZ: 15.5, topY: 2.6, topZ: -2, btmY: -2.6, btmZ: -1 },
      b747: { span: 32.0, wingY: -0.2, wingZ: 1.0, tailY: 10.5, tailZ: 29.5, topY: 5.2, topZ: -5, btmY: -4.5, btmZ: -2 },
      concorde: { span: 13.5, wingY: -0.2, wingZ: 8.5, tailY: 6.2, tailZ: 26.5, topY: 2.4, topZ: -4, btmY: -2.4, btmZ: -2 },
      amphibian: { span: 16.5, wingY: 3.2, wingZ: 0.5, tailY: 5.8, tailZ: 12.5, topY: 4.2, topZ: -1, btmY: -1.8, btmZ: -1 },
      ancestor: { span: 7.5, wingY: 1.8, wingZ: 0.2, tailY: 1.8, tailZ: 4.8, topY: 3.4, topZ: 0, btmY: -0.4, btmZ: 0 }
    };

    const d = navLightDefs[type] || navLightDefs.dc10;
    const isNight = (this.timeOfDay === 'night');

    // 1. 좌현 적색 항법등 (Port Red Nav Light)
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), redMat);
    redLight.position.set(-d.span, d.wingY, d.wingZ);
    this.planeGroup.add(redLight);
    this.aircraftNavLights.push(redLight);

    // 2. 우현 녹색 항법등 (Starboard Green Nav Light)
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), greenMat);
    greenLight.position.set(d.span, d.wingY, d.wingZ);
    this.planeGroup.add(greenLight);
    this.aircraftNavLights.push(greenLight);

    // 3. 후방 꼬리 백색 항법등 (Tail White Nav Light)
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), whiteMat);
    tailLight.position.set(0, d.tailY, d.tailZ);
    this.planeGroup.add(tailLight);
    this.aircraftNavLights.push(tailLight);

    // 4. 상부 & 하부 적색 충돌 방지 회전 점멸등 (Anti-Collision Beacon Strobes)
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), beaconMat);
    topBeacon.position.set(0, d.topY, d.topZ);
    this.planeGroup.add(topBeacon);
    this.aircraftNavLights.push(topBeacon);
    this.beaconStrobes.push(topBeacon);

    const btmBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), beaconMat);
    btmBeacon.position.set(0, d.btmY, d.btmZ);
    this.planeGroup.add(btmBeacon);
    this.aircraftNavLights.push(btmBeacon);
    this.beaconStrobes.push(btmBeacon);

    // 초기 표시 여부 (야간에만 켜짐)
    this.aircraftNavLights.forEach(l => l.visible = isNight);
  }

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
  }

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
  }

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

    // 3. 은은한 터보팬 스풀링 고음
    this.turbineWhine = this.audioCtx.createOscillator();
    this.turbineWhine.type = 'sine';
    this.turbineWhine.frequency.setValueAtTime(260, this.audioCtx.currentTime);

    const turbineGain = this.audioCtx.createGain();
    turbineGain.gain.setValueAtTime(0.012, this.audioCtx.currentTime);
    this.turbineWhine.connect(turbineGain);
    turbineGain.connect(this.audioCtx.destination);
    this.turbineWhine.start();
    this.turbineGainNode = turbineGain;

    // 4. 고속 공기역학 풍절음 (High-Speed Cockpit Wind Rush: 500~800km/h에서 강렬하게 발생)
    const windSrc = this.audioCtx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    const windFilter = this.audioCtx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(750, this.audioCtx.currentTime);
    windFilter.Q.setValueAtTime(1.1, this.audioCtx.currentTime);

    const windGain = this.audioCtx.createGain();
    windGain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.audioCtx.destination);
    windSrc.start();
    this.jetWindSrc = windSrc;
    this.cockpitWindFilter = windFilter;
    this.cockpitWindGain = windGain;
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
    if (this.jetWindSrc) {
      try { this.jetWindSrc.stop(); } catch (e) {}
      this.jetWindSrc = null;
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

  // 유압 모터 및 액추에이터 구동음 (Hydraulic Pump Sound)
  playHydraulicSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.linearRampToValueAtTime(420, now + 1.2);
      filter.frequency.linearRampToValueAtTime(240, now + 2.3);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(110, now);
      osc1.frequency.linearRampToValueAtTime(140, now + 1.0);
      osc1.frequency.linearRampToValueAtTime(95, now + 2.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(220, now);
      osc2.frequency.linearRampToValueAtTime(280, now + 1.2);
      osc2.frequency.linearRampToValueAtTime(190, now + 2.3);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.3);
      gain.gain.setValueAtTime(0.18, now + 2.0);
      gain.gain.linearRampToValueAtTime(0.001, now + 2.35);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.4);
      osc2.stop(now + 2.4);
    } catch (e) {
      console.warn('Hydraulic sound error:', e);
    }
  }

  // 기계식 락 체결음 (Mechanical Gear Lock Sound)
  playGearLockSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    try {
      const now = this.audioCtx.currentTime;
      // 1. 묵직한 베이스 쿵 펀치 (80Hz -> 30Hz)
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(80, now);
      bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
      bassGain.gain.setValueAtTime(0.35, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      bassOsc.connect(bassGain);
      bassGain.connect(this.audioCtx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.28);

      // 2. 금속 래치 체결 클릭 (Metallic Latch Clicks)
      [0.0, 0.08].forEach(delay => {
        const t = now + delay;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(820, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.06);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      });
    } catch (e) {
      console.warn('Gear lock sound error:', e);
    }
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

  // 스틱 셰이커 & 실속 딸깍음 (Stick Shaker Stall Clacker & Horn)
  playStickShakerSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    const now = Date.now();
    if (now - this.lastStickShakerTime < 220) return;
    this.lastStickShakerTime = now;

    // 조종간 스틱 셰이커 기계식 진동음
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

    // 항공기 실속 경고 호른 (Stall Horn Tone: 740Hz 톱니파 호른 경고음)
    try {
      const hornOsc = this.audioCtx.createOscillator();
      const hornGain = this.audioCtx.createGain();
      hornOsc.type = 'sawtooth';
      hornOsc.frequency.setValueAtTime(740, this.audioCtx.currentTime);
      hornGain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      hornGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.16);
      hornOsc.connect(hornGain);
      hornGain.connect(this.audioCtx.destination);
      hornOsc.start(this.audioCtx.currentTime);
      hornOsc.stop(this.audioCtx.currentTime + 0.18);
    } catch (e) {}
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
  }

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
  }

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
  }

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
  }

  // 공항 및 육지 대륙 영역 판정 (바다 vs 육지 지면)
  isOverAirport(x, z) {
    // 1. 출발 초대형 해상 공항 섬: X [-700, 700], Z [-2200, 2200]
    if (x >= -700 && x <= 700 && z >= -2200 && z <= 2200) return true;
    // 2. 목적지 거대 대륙 육지 전체 (Z <= -28000): 드넓은 대륙 평야 및 육지 공항
    if (z <= -28000 && x >= -25000 && x <= 25000) return true;
    return false;
  }

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
  }

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
  }

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
  }

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
  }

  // ----------------------------------------------------------------
  // 랜딩 기어 시퀀서 (도어 개방 ➔ 기어 전개/수납 ➔ 도어 폐쇄 3단계 물리)
  // ----------------------------------------------------------------
  toggleLandingGear() {
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
  }

  startGearRetraction() {
    this.gearPhase = 'RETRACTING';
    this.gearPhaseTimer = 0.0;
    this.gearExtended = false;
    this.updateGearUI('수납 중...', 'gear-transit');
    this.showPopup('✈️ 랜딩 기어 수납 시퀀스 시작 (도어 개방 ➔ 기어 수납 ➔ 도어 폐쇄)');
    this.playHydraulicSound();
  }

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
  }

  updateGearUI(statusText, stateClass) {
    const gearText = document.getElementById('gear-text');
    const gearBtn = document.getElementById('gear-btn');
    if (gearText) {
      gearText.textContent = `기어 ${statusText}`;
    }
    if (gearBtn) {
      gearBtn.className = `icon-btn glass ${stateClass}`;
    }
  }

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
  }

  switchAircraft(type) {
    if (!type) return;
    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: '수륙양용 비행기',
      ancestor: '1903 조상 비행기'
    };
    const nameText = names[type] || type.toUpperCase();

    // 모달 버튼 활성화 상태 즉시 업데이트
    document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`select-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    this.currentPlaneType = type;
    this.groundY = (type === 'ancestor') ? 1.65 : 6.84;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.gearPhaseTimer = 0.0;
    this.updateGearUI('DOWN', 'gear-down');

    // ★ 100% 공식 바이너리 GLB 3D 기체 즉시 로드
    this.loadGLBPreset(type);

    const planeNameEl = document.getElementById('plane-name-text');
    if (planeNameEl) planeNameEl.textContent = nameText;
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
    this.speedTitle = document.getElementById('speed-title');
    this.altBar = document.getElementById('alt-bar');
    this.altVal = document.getElementById('alt-val');
    this.boostBar = document.getElementById('boost-bar');
    this.boostVal = document.getElementById('boost-val');
    this.hullBar = document.getElementById('hull-bar');
    this.hullVal = document.getElementById('hull-val');
    this.popupMsg = document.getElementById('popup-msg');
    this.overlay = document.getElementById('overlay-screen');

    // 플랩, 스포일러, 역추진 버튼 바인딩
    this.flapsBtn = document.getElementById('flaps-btn');
    this.flapsText = document.getElementById('flaps-text');
    this.spoilerBtn = document.getElementById('spoiler-btn');
    this.spoilerText = document.getElementById('spoiler-text');
    this.reverserBtn = document.getElementById('reverser-btn');
    this.reverserText = document.getElementById('reverser-text');

    // 자세계(인공수평의), VSI, 실속 뱃지, GPWS 배너 바인딩
    this.attitudeHorizon = document.getElementById('attitude-horizon');
    this.speedBadge = document.getElementById('speed-status-badge');
    this.vsiVal = document.getElementById('vsi-val');
    this.gpwsBanner = document.getElementById('gpws-banner');
    this.gpwsText = document.getElementById('gpws-text');
    this.gpwsSubtext = document.getElementById('gpws-subtext');
    this.gpwsIcon = document.getElementById('gpws-icon');

    // 승객 하선 액션 컨테이너 및 버튼 바인딩
    this.gateActionContainer = document.getElementById('gate-action-container');
    this.deplaneBtn = document.getElementById('deplane-btn');
    this.deplaneQuickBtn = document.getElementById('deplane-quick-btn');

    this.startBtn = document.getElementById('start-btn');
    this.takeoffDirectBtn = document.getElementById('takeoff-direct-btn');
    this.gearBtn = document.getElementById('gear-btn');
    this.camToggleBtn = document.getElementById('cam-toggle-btn');
    this.camModeText = document.getElementById('cam-mode-text');
    this.soundBtn = document.getElementById('sound-btn');
    this.planeToggleBtn = document.getElementById('plane-toggle-btn');
    this.targetArrow = document.querySelector('.target-indicator .arrow');
    this.targetDist = document.getElementById('target-dist');
    this.emergencyPanel = document.getElementById('emergency-panel');
    this.timeToggleBtn = document.getElementById('time-toggle-btn');
    this.timeModeText = document.getElementById('time-mode-text');
    this.cruiseSpeedBtn = document.getElementById('cruise-speed-btn');
    this.cruiseSpeedText = document.getElementById('cruise-speed-text');
    this.micToggleBtn = document.getElementById('mic-toggle-btn');
    this.engineShutdownBtn = document.getElementById('engine-shutdown-btn');
    this.gateEngineShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
  }

  // ----------------------------------------------------------------
  // 장거리 200km 항로 배속 순항 토글 시스템 (Fast Cruise 1x/2x/4x)
  // ----------------------------------------------------------------
  toggleCruiseSpeed() {
    this.cruiseMultiplier = this.cruiseMultiplier === 1 ? 2 : (this.cruiseMultiplier === 2 ? 4 : 1);
    if (!this.cruiseSpeedText) this.cruiseSpeedText = document.getElementById('cruise-speed-text');
    if (!this.cruiseSpeedBtn) this.cruiseSpeedBtn = document.getElementById('cruise-speed-btn');
    if (this.cruiseSpeedText) {
      this.cruiseSpeedText.textContent = `순항 ${this.cruiseMultiplier}x`;
    }
    if (this.cruiseSpeedBtn) {
      this.cruiseSpeedBtn.className = `icon-btn glass cruise-btn${this.cruiseMultiplier === 2 ? ' fast-2x' : (this.cruiseMultiplier === 4 ? ' fast-4x' : '')}`;
    }
    this.showPopup(this.cruiseMultiplier > 1 
      ? `🚀 [${this.cruiseMultiplier}x 배속 순항 활성화] 200km 대륙 횡단 항로를 ${this.cruiseMultiplier}배 빠른 속도로 순항합니다!`
      : '✈️ [1x 표준 순항 복귀] 일반 속도로 순항합니다.');
  }

  // ----------------------------------------------------------------
  // 낮/밤 시간대 전환 시스템 (Day / Night Switcher)
  // ----------------------------------------------------------------
  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    const isNight = (mode === 'night');

    // 1. 하늘 배경색 및 안개 색상/밀도
    if (this.scene) {
      this.scene.background.setHex(isNight ? 0x050a18 : 0x7ec8e3);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(isNight ? 0x060d1f : 0xa3d5ed);
        this.scene.fog.density = isNight ? 0.000032 : 0.000028;
      }
    }

    // 2. 태양광 & 달빛 조명 조절
    if (this.sunLight) {
      this.sunLight.intensity = isNight ? 0.05 : 1.35;
    }
    if (this.moonLight) {
      this.moonLight.intensity = isNight ? 0.45 : 0.0;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(isNight ? 0x1e293b : 0xffffff);
      this.ambientLight.intensity = isNight ? 0.35 : 0.75;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(isNight ? 0x1e3a8a : 0xdff2fd);
      this.hemiLight.groundColor.setHex(isNight ? 0x020617 : 0x334155);
      this.hemiLight.intensity = isNight ? 0.30 : 0.65;
    }

    // 3. 밤하늘 별무리 (Stars)
    if (this.stars) {
      this.stars.material.opacity = isNight ? 0.95 : 0.0;
    }

    // 4. 바다 재질 야간 색조
    if (this.oceanMaterial) {
      this.oceanMaterial.color.setHex(isNight ? 0x031526 : 0x0284c7);
      this.oceanMaterial.roughness = isNight ? 0.28 : 0.18;
    }

    // 5. 공항 야간 유도등 (Runway & Taxiway Edge Lights)
    const toggleNightGroup = (group) => {
      if (!group) return;
      group.traverse(c => {
        if (c.name === 'airportNightLights') {
          c.visible = isNight;
        }
      });
    };
    toggleNightGroup(this.airportGroup);
    toggleNightGroup(this.destAirportGroup);

    // 6. 비행기 객실 창문 야간 골든 글로우 & 항법등 & 프로시저럴 그래픽 텍스처 업데이트
    if (this.updateFuselageTexture) {
      this.updateFuselageTexture(this.currentPlaneType, isNight);
    }
    if (this.updateWingTexture) {
      this.updateWingTexture(this.currentPlaneType, isNight);
    }
    if (this.cabinWindowMat) {
      if (isNight) {
        this.cabinWindowMat.color.setHex(0xfef08a);
        this.cabinWindowMat.emissive.setHex(0xf59e0b);
        this.cabinWindowMat.emissiveIntensity = 1.35;
      } else {
        this.cabinWindowMat.color.setHex(0x38bdf8);
        this.cabinWindowMat.emissive.setHex(0x0284c7);
        this.cabinWindowMat.emissiveIntensity = 0.4;
      }
    }
    if (this.aircraftNavLights) {
      this.aircraftNavLights.forEach(l => l.visible = isNight);
    }

    // 7. 대륙 고층 아파트 단지 창문 야간 조명 점등
    if (this.cityNightLights) {
      this.cityNightLights.forEach(mat => {
        if (mat.emissive) {
          mat.emissiveIntensity = isNight ? 1.45 : 0.08;
        }
      });
    }

    // 8. UI 버튼 갱신
    if (!this.timeModeText) this.timeModeText = document.getElementById('time-mode-text');
    if (!this.timeToggleBtn) this.timeToggleBtn = document.getElementById('time-toggle-btn');
    if (this.timeModeText) {
      this.timeModeText.textContent = isNight ? '밤' : '낮';
    }
    if (this.timeToggleBtn) {
      this.timeToggleBtn.innerHTML = isNight 
        ? '🌙 <span id="time-mode-text">밤</span>' 
        : '☀️ <span id="time-mode-text">낮</span>';
    }

    this.showPopup(isNight 
      ? '🌙 야간 비행 모드: 밤하늘의 은하수 별빛, 활주로 유도등 및 기체 항법등이 점등되었습니다!' 
      : '☀️ 주간 비행 모드: 맑은 푸른 하늘과 쾌청한 태양광 아래를 비행합니다.');
  }

  toggleTimeOfDay() {
    this.setTimeOfDay(this.timeOfDay === 'day' ? 'night' : 'day');
  }

  // 모드 1: 활주로 즉시 이륙 (Direct Runway Takeoff - 3800m 활주로 중앙 정렬)
  startDirectTakeoff() {
    this.overlay.classList.add('hidden');
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');
    this.hullIntegrity = 100;
    this.passengers = 285;
    this.groundY = (this.currentPlaneType === 'ancestor') ? 1.65 : 6.84;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.gearPhaseTimer = 0.0;
    this.updateGearUI('DOWN', 'gear-down');
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();

    const isFromDest = (this.planeGroup && this.planeGroup.position.z < -25000) || (this.flightPhase === 'MISSION_COMPLETE');
    this.flightPhase = 'TAKEOFF_RUN';
    this.phaseDisplay.textContent = isFromDest ? '대륙 활주로 이륙 활주' : '활주로 이륙 활주 (Takeoff)';

    this.buildAircraft(this.currentPlaneType);
    const startZ = isFromDest ? -43600 : 1400;
    this.planeGroup.position.set(160, this.groundY, startZ);
    this.yaw = 0.0;
    this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.planeGroup.visible = true;

    // 즉시 출력을 85%로 올려 가속 및 플랩 1(이륙 플랩) 설정
    this.throttle = 0.85;
    this.n1 = 85.0;
    this.targetN1 = 85.0;
    this.flapIndex = 1; // 이륙 기본 플랩 1 (Takeoff Flaps 1)
    this.spoilerExtended = false;
    this.reverseThrustActive = false;
    this.groundSpeed = 50.0; // ~180 km/h 활주 초기 가속 속도
    this.velocity.set(0, 0, -50.0);
    this.speed = this.velocity.length() / 77.777;
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.showPopup(isFromDest 
      ? '🛫 대륙 3,800m 메가 활주로 정렬! (플랩 1 전개 완료) 속도 200km/h 도달 시 ↓ 아래 화살표를 당겨 이륙하세요!' 
      : '🛫 3,800m 초대형 활주로 정렬! (플랩 1 전개 완료) 속도 200km/h 도달 시 ↓ 아래 화살표를 당겨 이륙하세요!');
    this.startJetSound();

    // 비행 시작 시 조종석 마이크 상시 청취 자동 활성화
    setTimeout(() => {
      if (!this.isMicActive) this.startMicrophone();
    }, 400);
  }

  // 모드 2: 게이트 탑승 & 유도로 주행 (Full Gate Departure - 1번 게이트 정지선)
  startGateDeparture() {
    this.overlay.classList.add('hidden');
    this.showGateActionPrompt(false);
    this.isPlaying = true;
    this.isDestroyed = false;
    this.isBellySliding = false;
    this.isWaterLanding = false;
    this.waterSuccessShown = false;
    this.currentEmergency = null;
    this.emergencyBonusGiven = false;
    this.isEngineOff = false;
    this.isJetwayDocked = false;
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) engBtn.classList.remove('engine-off-btn');
    this.hullIntegrity = 100;
    this.passengers = 285;
    this.groundY = (this.currentPlaneType === 'ancestor') ? 1.65 : 6.84;
    this.gearExtended = true;
    this.gearPhase = 'DOWN';
    this.gearPhaseTimer = 0.0;
    this.updateGearUI('DOWN', 'gear-down');
    this.startTime = Date.now();
    this.isStalling = false;
    this.clearGPWS();

    const isFromDest = (this.planeGroup && this.planeGroup.position.z < -25000) || (this.flightPhase === 'MISSION_COMPLETE');
    this.flightPhase = 'TAXI_OUT';
    this.phaseDisplay.textContent = isFromDest ? '대륙 공항 유도로 주행' : '유도로 주행 (Taxiway)';

    this.buildAircraft(this.currentPlaneType);
    const startZ = isFromDest ? -45000 : 0;
    this.planeGroup.position.set(-155, this.groundY, startZ);
    this.yaw = Math.PI / 2;
    this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.planeGroup.visible = true;

    this.throttle = 0.2;
    this.n1 = 20.0; // 아이들 20%
    this.targetN1 = 20.0;
    this.flapIndex = 0; // 플랩 UP
    this.spoilerExtended = false;
    this.reverseThrustActive = false;
    this.groundSpeed = 0.0;
    this.velocity.set(0, 0, 0);
    this.speed = 0.0;
    this.updateFlapsUI();
    this.updateSpoilerUI();
    this.updateReverserUI();
    this.showPopup(isFromDest 
      ? '📢 새 승객 285명 탑승 완료! 다음 비행 임무를 시작합니다. 0~9 키로 출력을 올려 이동하세요.' 
      : '📢 승객 285명 탑승 완료! 0~9 키로 출력을 올려 유도로(황색선)로 이동하세요.');
    this.startJetSound();

    // 비행 시작 시 조종석 마이크 상시 청취 자동 활성화
    setTimeout(() => {
      if (!this.isMicActive) this.startMicrophone();
    }, 400);
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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  toggleHOTASThrottleInvert() {
    this.hotasState.invertThrottle = !this.hotasState.invertThrottle;
    this.hotasState.lastThrottleRaw = null;
    const desc = this.hotasState.invertThrottle 
      ? '당기면 100%, 밀면 0% (반전 모드)' 
      : '밀면 100%, 당기면 0% (정방향 기본)';
    this.showPopup(`↕️ [스로틀 방향] ${desc}`);
    this.updateHOTASModalUI();
  }

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

  // ----------------------------------------------------------------
  // 10. 메인 루프 & 공기역학 물리 (이륙 버그 완전 해결)
  // ----------------------------------------------------------------
  animate(now) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // HOTAS 1 & 비행 조이스틱 실시간 폴링
    this.pollHOTAS(dt);

    // 대륙 메트로폴리스 도시 자동차, 버스, 트럭 및 움직이는 사람 시뮬레이션
    if (this.movingVehicles && this.movingVehicles.length > 0) this.updateCityLife(dt);
    if (this.airportBuses && this.airportBuses.length > 0) this.updateAirportBuses(dt);
    if (this.aiAircraftList && this.aiAircraftList.length > 0) this.updateAIAircraft(dt);
    if (this.movingGroundCrew && this.movingGroundCrew.length > 0) this.updateAirportGSE(dt);
    if (this.animatedJetways && this.animatedJetways.length > 0) this.updateAnimatedJetways(dt);

    if (this.isPlaying && !this.isDestroyed) {
      if (this.currentEmergency) this.updateEmergency(dt);
      this.updateFlightPhysics(dt);
      this.updateControlSurfaces(dt);
      this.updateLandingGearAnimation(dt);
      const currentKmh = this.speed * 280;
      this.updateSpeedEffects(dt, currentKmh);
      this.checkObstacleCollisions();
      this.updateHUD();
      this.updateParticles(dt);
      this.createJetExhaustParticles();
      this.createBellySparks();
    } else {
      if (!this.isDestroyed) this.updateLandingGearAnimation(dt);
      this.updateDebrisPhysics(dt);
      this.updateParticles(dt);
    }

    // 제트 엔진 티타늄 터보팬 블레이드 고속 회전 (스로틀 & 속도 연동 실기 회전)
    if (this.turbofans && this.turbofans.length > 0) {
      const fanSpeed = this.isEngineOff ? 0 : (0.22 + this.throttle * 1.15 + (this.isOnGround ? 0 : this.speed * 0.25));
      this.turbofans.forEach(fan => {
        fan.rotation.z += fanSpeed;
      });
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
      const baseInt = (this.timeOfDay === 'night' ? 3.5 : 1.0);
      this.beaconLight.intensity = baseInt + Math.sin(Date.now() * 0.008) * (this.timeOfDay === 'night' ? 3.0 : 1.5);
    }

    // 야간 기체 적색 비콘 스트로브 점멸
    if (this.timeOfDay === 'night' && this.beaconStrobes && this.beaconStrobes.length > 0) {
      const flash = (Math.sin(now * 0.008) > 0.65);
      this.beaconStrobes.forEach(b => b.visible = flash);
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

  // ----------------------------------------------------------------
  // 공항 지상 안내원(마샬러), 순찰 요원 및 토잉카 실시간 애니메이션
  // ----------------------------------------------------------------
  updateAirportGSE(dt) {
    if (!this.planeGroup) return;
    const planePos = this.planeGroup.position;
    const now = performance.now() * 0.001;

    // 1. 마샬러(Marshaller) 유도봉 수신호 애니메이션
    this.marshallerCrew.forEach(m => {
      const dist = m.pos.distanceTo(planePos);
      const mesh = m.mesh;
      if (!mesh || !mesh.leftArm || !mesh.rightArm) return;

      if (dist < 22.0 && this.isOnGround && Math.abs(this.speed) < 0.25) {
        // ★ 비행기가 정지선에 도착 완료: 양팔을 머리 위로 교차하여 'X' (ALL STOP) 정지 신호!
        mesh.leftArm.rotation.set(-2.5, 0, 0.55);
        mesh.rightArm.rotation.set(-2.5, 0, -0.55);
      } else if (dist < 110.0 && this.isOnGround) {
        // ★ 게이트 진입 중: 양팔을 위아래로 젖히며 "앞으로 전진(Come Ahead)" 유도 신호!
        const wave = Math.sin(now * 4.5);
        mesh.leftArm.rotation.set(-1.2 + wave * 0.55, 0, 0.2);
        mesh.rightArm.rotation.set(-1.2 - wave * 0.55, 0, -0.2);
      } else {
        // 대기 상태 (자연스럽게 팔을 아래로 내림)
        mesh.leftArm.rotation.set(0.1, 0, 0.1);
        mesh.rightArm.rotation.set(0.1, 0, -0.1);
      }
    });

    // 2. 계류장 순찰 요원 보행 애니메이션
    this.movingGroundCrew.forEach(crew => {
      crew.z += crew.dir * crew.speed * dt;
      if (crew.dir > 0 && crew.z >= crew.maxZ) {
        crew.dir = -1;
        crew.group.rotation.y = Math.PI;
      } else if (crew.dir < 0 && crew.z <= crew.minZ) {
        crew.dir = 1;
        crew.group.rotation.y = 0;
      }
      crew.group.position.z = crew.z;

      // 발걸음 및 팔 흔들기
      const step = Math.sin((now * 4.0) + crew.walkOffset);
      if (crew.mesh.leftLeg) crew.mesh.leftLeg.rotation.x = step * 0.55;
      if (crew.mesh.rightLeg) crew.mesh.rightLeg.rotation.x = -step * 0.55;
      if (crew.mesh.leftArm) crew.mesh.leftArm.rotation.x = -step * 0.45;
      if (crew.mesh.rightArm) crew.mesh.rightArm.rotation.x = step * 0.45;
    });

    // 3. 계류장 토잉카 주행 및 루프 경광등 점멸
    this.movingTugs.forEach(tug => {
      tug.z += tug.dir * tug.speed * dt;
      if (tug.dir > 0 && tug.z >= tug.maxZ) {
        tug.dir = -1;
        tug.group.rotation.y = Math.PI;
      } else if (tug.dir < 0 && tug.z <= tug.minZ) {
        tug.dir = 1;
        tug.group.rotation.y = 0;
      }
      tug.group.position.z = tug.z;

      // 바퀴 회전
      const wheelRot = tug.speed * dt * 0.8;
      tug.wheels.forEach(w => {
        w.rotation.x += (tug.dir > 0 ? wheelRot : -wheelRot);
      });

      // 주황 비콘 경광등 점멸
      if (tug.beacon) {
        tug.beacon.intensity = 1.0 + Math.sin(now * 8.0 + tug.beaconOffset) * 1.5;
      }
    });
  }

  // ----------------------------------------------------------------
  // 실제 탑승교 실시간 회전 도킹 시스템 (Rotunda Swing Arm Docking)
  // - 평상시에는 실제 공항처럼 옆을 보며 대기
  // - 비행기가 게이트 정지선에 도착하면 비행기 L1 도어로 부드럽게 스윙 회전 연결!
  // ----------------------------------------------------------------
  updateAnimatedJetways(dt) {
    if (!this.planeGroup || !this.animatedJetways) return;
    const planePos = this.planeGroup.position;

    // 가장 가까운 게이트 탑승교 탐색
    let closestJetway = null;
    let minDist = Infinity;

    this.animatedJetways.forEach(j => {
      const dist = Math.hypot(planePos.x - j.stopX, planePos.z - j.stopZ);
      if (dist < minDist) {
        minDist = dist;
        closestJetway = j;
      }
    });

    const isNearGate = (minDist <= 55.0) && this.isOnGround;
    const isPlaneStopped = isNearGate && Math.abs(this.speed) < 0.25;

    // 모든 탑승교 각도 보간 회전
    this.animatedJetways.forEach(j => {
      const isTarget = (j === closestJetway && isPlaneStopped && this.flightPhase !== 'TAKEOFF_RUN' && this.flightPhase !== 'CLIMB_CRUISE');
      j.targetAngle = isTarget ? j.dockedAngle : j.standbyAngle;

      // 부드러운 스윙 회전 보간 (Lerp)
      if (Math.abs(j.currentAngle - j.targetAngle) > 0.005) {
        j.currentAngle = THREE.MathUtils.lerp(j.currentAngle, j.targetAngle, dt * 1.5);
        j.armPivot.rotation.y = j.currentAngle;
      } else {
        j.currentAngle = j.targetAngle;
        j.armPivot.rotation.y = j.targetAngle;
      }

      // 도킹 완료 판정
      if (isTarget && Math.abs(j.currentAngle - j.dockedAngle) < 0.02) {
        if (!j.isDocked) {
          j.isDocked = true;
          this.isJetwayDocked = true;
          this.activeDockingJetway = j;
          this.onJetwayDockComplete(j);
        }
      } else if (!isTarget) {
        j.isDocked = false;
        if (this.activeDockingJetway === j) {
          this.isJetwayDocked = false;
          this.activeDockingJetway = null;
        }
      }
    });
  }

  onJetwayDockComplete(jetway) {
    const dockBadge = document.getElementById('jetway-dock-status');
    if (dockBadge) {
      dockBadge.textContent = '도킹 완료 (L1 Door 연결)';
      dockBadge.className = 'status-val dock-complete';
    }
    this.playCautionChime();
    this.showPopup(`🚪 [${jetway.name}] 탑승교가 회전하여 비행기 도어에 연결되었습니다! 엔진을 끄세요(E키).`);
    this.triggerPassengerReaction('docking');

    const engineShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (engineShutdownBtn && !this.isEngineOff) {
      engineShutdownBtn.classList.remove('hidden');
    }
  }

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

    // 3. 러더 & 노즈 휠: 방향 조향 (손잡이 비틀기 러더 및 에일러론 협조)
    let targetRudder = 0;
    if (Math.abs(rollInput) > 0.06) {
      targetRudder = -rollInput * 0.35;
    }
    if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.25) {
      targetRudder = -this.hotasState.yaw * 0.55;
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
      if (Math.abs(rollInput) > 0.06) steerWheel = -rollInput * 0.42;
      if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.12) {
        steerWheel = -this.hotasState.yaw * 0.55;
      }
      this.controlSurfaces.noseWheelGroup.rotation.y = THREE.MathUtils.lerp(
        this.controlSurfaces.noseWheelGroup.rotation.y,
        steerWheel,
        0.24
      );
    }
  }

  // ----------------------------------------------------------------
  // 공기역학 및 기체 제원 데이터베이스 (Airliner Aerodynamics DB)
  // ----------------------------------------------------------------
  getAircraftSpecs(type) {
    const specs = {
      a320: {
        name: 'Airbus A320',
        mass: 68000,          // kg (자중 42t + 승객/연료 탑재 = 68,000kg)
        wingArea: 122.6,      // m²
        wingSpan: 34.1,       // m
        aspectRatio: 9.5,     // 종횡비 AR
        oswaldEff: 0.82,      // 오스왈드 효율 계수 e
        cd0: 0.020,           // 영양력 유해 항력 계수 C_D0
        cl0: 0.24,            // 받음각 0도 기본 양력 계수 C_L0
        clAlpha: 5.2,         // 양력선 기울기 C_L_alpha (per rad)
        clMaxClean: 1.55,     // 클린 상태 최대 양력 계수
        stallAlphaClean: 0.25,// 클린 실속 받음각 (약 14.3도)
        maxThrust: 240000,    // N (CFM56-5B 트윈 터보팬 ~240 kN)
        vRotateKmh: 260,      // 이륙 로테이션 속도 (~140 kt)
        vStallCleanKmh: 215,  // 클린 실속 속도 (~116 kt)
        pitchAuthority: 0.55,
        rollAuthority: 0.70,
        pitchDamping: 1.8,
        rollDamping: 2.2
      },
      b747: {
        name: 'Boeing 747-400 Jumbo',
        mass: 285000,         // kg (점보 제트기 육중한 관성 질량)
        wingArea: 525.0,      // m²
        wingSpan: 64.4,       // m
        aspectRatio: 7.9,
        oswaldEff: 0.80,
        cd0: 0.022,
        cl0: 0.26,
        clAlpha: 5.0,
        clMaxClean: 1.50,
        stallAlphaClean: 0.26,
        maxThrust: 1120000,   // N (4발 GE CF6-80C2 ~1120 kN)
        vRotateKmh: 295,
        vStallCleanKmh: 245,
        pitchAuthority: 0.38,
        rollAuthority: 0.45,
        pitchDamping: 2.5,
        rollDamping: 2.8
      },
      dc10: {
        name: 'McDonnell Douglas DC-10',
        mass: 165000,         // kg
        wingArea: 367.0,      // m²
        wingSpan: 50.4,       // m
        aspectRatio: 6.9,
        oswaldEff: 0.78,
        cd0: 0.023,
        cl0: 0.25,
        clAlpha: 4.9,
        clMaxClean: 1.52,
        stallAlphaClean: 0.25,
        maxThrust: 690000,    // N (삼발 GE CF6-50 ~690 kN)
        vRotateKmh: 280,
        vStallCleanKmh: 230,
        pitchAuthority: 0.44,
        rollAuthority: 0.52,
        pitchDamping: 2.1,
        rollDamping: 2.4
      },
      md80: {
        name: 'McDonnell Douglas MD-80',
        mass: 64000,          // kg
        wingArea: 112.0,      // m²
        wingSpan: 32.8,       // m
        aspectRatio: 9.6,
        oswaldEff: 0.81,
        cd0: 0.021,
        cl0: 0.23,
        clAlpha: 5.1,
        clMaxClean: 1.54,
        stallAlphaClean: 0.24,
        maxThrust: 192000,    // N (JT8D 후방 쌍발 ~192 kN)
        vRotateKmh: 255,
        vStallCleanKmh: 210,
        pitchAuthority: 0.58,
        rollAuthority: 0.65,
        pitchDamping: 1.9,
        rollDamping: 2.1
      },
      concorde: {
        name: 'Aérospatiale/BAC Concorde',
        mass: 110000,         // kg
        wingArea: 358.0,      // m² (오지브 델타익)
        wingSpan: 25.6,       // m
        aspectRatio: 1.83,
        oswaldEff: 0.65,
        cd0: 0.018,
        cl0: 0.12,
        clAlpha: 3.2,
        clMaxClean: 1.30,
        stallAlphaClean: 0.35,// 와류 양력(Vortex Lift)으로 고받음각 비행
        maxThrust: 680000,    // N (4발 Olympus 593 롤스로이스 터보제트)
        vRotateKmh: 350,
        vStallCleanKmh: 275,
        pitchAuthority: 0.62,
        rollAuthority: 0.75,
        pitchDamping: 1.7,
        rollDamping: 1.8
      },
      amphibian: {
        name: 'Canadair CL-415 Amphibian',
        mass: 19800,          // kg
        wingArea: 100.0,      // m²
        wingSpan: 28.6,       // m
        aspectRatio: 8.2,
        oswaldEff: 0.76,
        cd0: 0.032,
        cl0: 0.32,
        clAlpha: 5.0,
        clMaxClean: 1.70,
        stallAlphaClean: 0.26,
        maxThrust: 70000,     // N (PW123 터보프롭)
        vRotateKmh: 155,
        vStallCleanKmh: 125,
        pitchAuthority: 0.65,
        rollAuthority: 0.68,
        pitchDamping: 1.6,
        rollDamping: 1.8
      },
      ancestor: {
        name: '1903 Wright Flyer',
        mass: 340,            // kg
        wingArea: 47.4,       // m²
        wingSpan: 12.3,       // m
        aspectRatio: 6.4,
        oswaldEff: 0.70,
        cd0: 0.055,
        cl0: 0.40,
        clAlpha: 4.8,
        clMaxClean: 1.45,
        stallAlphaClean: 0.22,
        maxThrust: 800,       // N
        vRotateKmh: 50,
        vStallCleanKmh: 42,
        pitchAuthority: 0.70,
        rollAuthority: 0.50,
        pitchDamping: 1.5,
        rollDamping: 1.4
      }
    };
    return specs[type] || specs.a320;
  }

  // ----------------------------------------------------------------
  // 플랩, 스포일러, 역추진 제어 및 UI / 사운드
  // ----------------------------------------------------------------
  toggleFlaps() {
    this.flapIndex = (this.flapIndex + 1) % this.flaps.length;
    const flapName = this.flaps[this.flapIndex];
    this.playFlapSound();
    this.updateFlapsUI();
    const specs = this.getAircraftSpecs(this.currentPlaneType);
    const stallMult = [1.0, 0.88, 0.78, 0.68][this.flapIndex];
    const vStall = Math.round(specs.vStallCleanKmh * stallMult);
    this.showPopup(`🪽 플랩 설정: FLAPS ${flapName} (실속 속도 V_stall: ${vStall} km/h)`);
  }

  updateFlapsUI() {
    if (this.flapsText) this.flapsText.textContent = `플랩 ${this.flaps[this.flapIndex]}`;
    if (this.flapsBtn) {
      if (this.flapIndex > 0) this.flapsBtn.classList.add('flaps-active');
      else this.flapsBtn.classList.remove('flaps-active');
    }
  }

  playFlapSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(410, now);
    osc.frequency.linearRampToValueAtTime(310, now + 0.60);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, now);
    filter.Q.setValueAtTime(2.0, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  toggleSpoilers() {
    this.spoilerExtended = !this.spoilerExtended;
    this.playSpoilerSound();
    this.updateSpoilerUI();
    this.showPopup(this.spoilerExtended 
      ? '🛑 스피드브레이크 전개 (SPOILER EXT - 항력 급증 & 급강하 제동)' 
      : '🟢 스피드브레이크 수납 (SPOILER RET)');
  }

  updateSpoilerUI() {
    if (this.spoilerText) this.spoilerText.textContent = this.spoilerExtended ? '스포일러 EXT' : '스포일러 RET';
    if (this.spoilerBtn) {
      if (this.spoilerExtended) this.spoilerBtn.classList.add('spoiler-extended');
      else this.spoilerBtn.classList.remove('spoiler-extended');
    }
  }

  playSpoilerSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

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
  }

  updateReverserUI() {
    if (this.reverserText) this.reverserText.textContent = this.reverseThrustActive ? '역추진 ACTIVE' : '역추진 OFF';
    if (this.reverserBtn) {
      if (this.reverseThrustActive) this.reverserBtn.classList.add('reverser-active');
      else this.reverserBtn.classList.remove('reverser-active');
    }
  }

  playReverseThrustSound(active) {
    if (!this.audioCtx || !this.soundEnabled) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    if (active) {
      if (!this.revSoundOsc) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(68, this.audioCtx.currentTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.10, this.audioCtx.currentTime);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        this.revSoundOsc = osc;
        this.revSoundGain = gain;
      }
    } else {
      if (this.revSoundOsc) {
        try {
          this.revSoundGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.35);
          setTimeout(() => {
            if (this.revSoundOsc) {
              this.revSoundOsc.stop();
              this.revSoundOsc.disconnect();
              this.revSoundOsc = null;
              this.revSoundGain = null;
            }
          }, 380);
        } catch (e) {
          this.revSoundOsc = null;
        }
      }
    }
  }

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
    // 고도 상승에 따른 공기 희박으로 인한 제트 엔진 추력 감쇄
    const altThrustFactor = Math.exp(-altM / 14000.0);
    const thrustMagnitude = specs.maxThrust * Math.pow(n1Frac, 2.1) * altThrustFactor;

    // 대기 밀도 (ISA 표준 대기 모델)
    const rho = 1.225 * Math.exp(-altM / 8500.0);

    // 플랩 & 스포일러 계수 산출
    const flapCL = [0.0, 0.38, 0.75, 1.15][this.flapIndex] || 0.0;
    const flapCD = [0.0, 0.012, 0.028, 0.065][this.flapIndex] || 0.0;
    const flapAlphaStall = [0.0, 0.03, 0.05, 0.06][this.flapIndex] || 0.0;
    const spoilerCL = this.spoilerExtended ? -0.22 : 0.0;
    const spoilerCD = this.spoilerExtended ? 0.045 : 0.0;
    const gearCD = this.gearExtended ? 0.018 : 0.0;

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

        // A/D 키 및 HOTAS 사이드스틱 노즈 휠 스티어링
        let steerInput = 0;
        if (this.keys.left) steerInput -= 1;
        if (this.keys.right) steerInput += 1;
        if (this.joystickData && this.joystickData.active) {
          steerInput += this.joystickData.x;
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

          // 이륙 순간 활주로 36L 직선 헤딩(0.0) 고정 (쏠림 100% 방지)
          this.yaw = 0.0;
          this.planeGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0);
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
      this.aoa = Math.atan2(w, Math.max(1.0, u));
      this.sideslip = Math.asin(THREE.MathUtils.clamp(v / airSpeed, -1.0, 1.0));

      // 동압 (Dynamic Pressure q = 0.5 * rho * V²)
      const qDyn = 0.5 * rho * airSpeed * airSpeed;

      // 지면 효과 (Ground Effect Cushion - 착륙 플레어 쿠션)
      const radioAlt = Math.max(0.2, (this.planeGroup.position.y - this.groundY) * 10);
      const hOverB = radioAlt / specs.wingSpan;
      let phiIGE = 1.0;
      let igeLiftMult = 1.0;
      if (hOverB < 1.0) {
        phiIGE = Math.pow(16.0 * hOverB, 2) / (1.0 + Math.pow(16.0 * hOverB, 2));
        phiIGE = Math.max(0.52, Math.min(1.0, phiIGE));
        igeLiftMult = 1.0 + 0.16 * (1.0 - hOverB); // 착륙 직전 지면 쿠션 양력 증대
      }

      // 공기역학 양력선 & 실속 한계 받음각 판정
      const alphaCrit = specs.stallAlphaClean + flapAlphaStall;
      let cL = 0.0;

      if (this.aoa <= alphaCrit) {
        cL = (specs.cl0 + specs.clAlpha * this.aoa + flapCL + spoilerCL) * igeLiftMult;
        this.isStalling = false;
        this.stallSeverity = 0.0;
      } else {
        // ★ 실속(Aerodynamic Stall): 날개 상면 박리로 인한 양력 붕괴 & 기체 떨림
        this.isStalling = true;
        const alphaExcess = this.aoa - alphaCrit;
        this.stallSeverity = Math.min(1.0, Math.max(0.25, alphaExcess / 0.14 + (1.0 - n1Frac) * 0.35));
        const cLPeak = specs.cl0 + specs.clAlpha * alphaCrit + flapCL;
        cL = (cLPeak * Math.cos(Math.min(Math.PI * 0.48, 2.4 * alphaExcess)) + spoilerCL) * igeLiftMult;

        // 실속 진동 버핏팅 (Buffeting)
        const buffetX = (Math.random() - 0.5) * 0.06 * this.stallSeverity;
        const buffetZ = (Math.random() - 0.5) * 0.08 * this.stallSeverity;
        this.planeGroup.rotateX(buffetX);
        this.planeGroup.rotateZ(buffetZ);
        this.screenShake = Math.max(this.screenShake, 0.48 * this.stallSeverity);

        // 공기역학적 기수 급강하 모멘트 (Nose Drop)
        this.planeGroup.rotateX(-0.028 * this.stallSeverity);
        this.playStickShakerSound();
      }
      cL = Math.max(-0.6, cL);

      // 공기역학 항력 (Parasite + Induced + Flaps + Spoilers + Gear + Stall Drag)
      const cDi = (cL * cL) / (Math.PI * specs.aspectRatio * specs.oswaldEff) * phiIGE;
      const cDStall = this.isStalling ? (0.42 * Math.pow(this.aoa - alphaCrit, 1.5)) : 0.0;
      const totalCD = specs.cd0 + flapCD + gearCD + spoilerCD + cDi + cDStall;

      // 3차원 공기역학 벡터 힘 산출
      // 1) 양력: 비행 경로 벡터에 수직인 기체 대칭 평면 상방
      let liftDir = bUp.clone().projectOnPlane(vNorm).normalize();
      if (liftDir.lengthSq() < 0.001) liftDir.copy(bUp);
      const liftForce = liftDir.multiplyScalar(qDyn * specs.wingArea * cL);

      // 2) 항력: 비행 경로 정반대 방향
      const dragForce = vNorm.clone().multiplyScalar(-qDyn * specs.wingArea * totalCD);

      // 3) 추력: 엔진 추진축 방향
      const thrustForce = bFwd.clone().multiplyScalar(thrustMagnitude);

      // 4) 중력: 지구 중심 방향 (-Y)
      const gravityForce = new THREE.Vector3(0, -specs.mass * 9.81, 0);

      // 5) 알짜 힘 합성 & 뉴턴 가속도 a = F / m
      const netForce = new THREE.Vector3().add(liftForce).add(dragForce).add(thrustForce).add(gravityForce);
      const accel = netForce.divideScalar(specs.mass);
      this.acceleration.copy(accel);

      // 속도 적분: V = V + a * dt
      this.velocity.addScaledVector(accel, effectiveDt);

      // ------------------------------------------------------------
      // FBW (Fly-By-Wire) 비행 제어 법칙 (Airbus Normal Law)
      // ------------------------------------------------------------
      let pitchInput = 0;
      let rollInput = 0;
      if (this.keys.up) pitchInput -= 1;   // ↑: 기수 하강 (Pitch Down)
      if (this.keys.down) pitchInput += 1; // ↓: 기수 상승 (Pitch Up)
      if (this.keys.left) rollInput -= 1;  // A: 좌측 롤
      if (this.keys.right) rollInput += 1; // D: 우측 롤

      if (this.joystickData && this.joystickData.active) {
        pitchInput += this.joystickData.y;
        rollInput += this.joystickData.x;
      }
      if (this.hotasState && this.hotasState.connected) {
        if (Math.abs(this.hotasState.pitch) > 0.06) pitchInput = this.hotasState.pitch;
        if (Math.abs(this.hotasState.roll) > 0.07) rollInput = this.hotasState.roll;
      }
      const isRollActive = Math.abs(rollInput) > 0.06;

      // 1) 피치 제어: 동압 연동 조종면 효율 및 에어버스 플레어 법칙
      let pitchRate = pitchInput * 0.026;
      if (this.isStalling && pitchInput > 0) {
        pitchRate *= 0.12; // 실속 시 엘리베이터 무력화
      }
      // 착륙 플레어 법칙 (Flare Law): 지상 15m 미만에서 기수 숙임 모멘트를 주어 파일럿의 부드러운 당김 유도
      if (radioAlt < 15.0 && !this.isOnGround) {
        pitchRate -= 0.0035;
      }
      this.planeGroup.rotateX(pitchRate);

      // 2) 롤 제어 & 뱅크각 유지 (Bank Angle Hold & Auto-Leveling)
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
      const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
      const maxBankTilt = 0.82;

      if (isRollActive) {
        if ((rollInput > 0 && bankTilt > -maxBankTilt) || (rollInput < 0 && bankTilt < maxBankTilt)) {
          this.planeGroup.rotateZ(-rollInput * 0.038);
        }
      } else {
        // 중립 시 수평 자동 복원: 미세 쏠림 원천 차단
        if (Math.abs(bankTilt) > 0.001) {
          this.planeGroup.rotateZ(-bankTilt * 0.12);
        }
      }

      // 3) 협조 선회 (Coordinated Turn): 경사각에 맞춘 원심력 요 회전 (공 0 중앙 유지)
      let turnRate = 0;
      if (isRollActive) {
        turnRate = bankTilt * 0.026 - (rollInput * 0.016);
      }
      // 러더는 조종사가 의도적으로 35% 이상 비틀었을 때만 비상 조향
      if (this.hotasState && this.hotasState.connected && this.hotasState.useTwistRudder && Math.abs(this.hotasState.yaw) > 0.35) {
        turnRate += -this.hotasState.yaw * 0.015;
      }
      if (Math.abs(turnRate) > 0.0001) {
        this.planeGroup.rotateY(turnRate);
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

    // 제트 엔진 및 풍절음 오디오 실시간 부드러운 보간 (실제 N1% 터빈 스풀업 회전수 연동)
    if (this.audioCtx && this.soundEnabled) {
      const n1Norm = Math.min(1.0, Math.max(0, (this.n1 - 20) / 80)); // 0.0 (Idle 20%) ~ 1.0 (TOGA 100%)
      const now = this.audioCtx.currentTime;

      // 1. 공기 분사 제트 노이즈 (저속에서는 낮은 웅웅거림, TOGA에서는 거대한 굉음)
      if (this.jetNoiseFilter && this.jetNoiseGain) {
        const targetCutoff = 320 + n1Norm * 1450; // 320Hz ~ 1770Hz
        const targetNoiseGain = 0.08 + n1Norm * 0.24 + (this.reverseThrustActive ? 0.16 : 0.0);
        this.jetNoiseFilter.frequency.setTargetAtTime(targetCutoff, now, 0.12);
        this.jetNoiseGain.gain.setTargetAtTime(targetNoiseGain, now, 0.12);
      }

      // 2. 터빈 회전 코어 저음
      if (this.jetRumble) {
        const targetRumbleFreq = 54 + n1Norm * 48; // 54Hz ~ 102Hz
        this.jetRumble.frequency.setTargetAtTime(targetRumbleFreq, now, 0.12);
      }

      // 3. 은은한 터빈 휘파람음 (N1 상승 시 선명한 고음 휘파람 상승)
      if (this.turbineWhine) {
        const targetWhineFreq = 260 + n1Norm * 420; // 260Hz ~ 680Hz
        this.turbineWhine.frequency.setTargetAtTime(targetWhineFreq, now, 0.12);
      }

      // 4. 고속 공기역학 풍절음 (High-Speed Cockpit Wind Rush: 400~850 km/h 및 스포일러 전개 난류)
      if (this.cockpitWindFilter && this.cockpitWindGain) {
        const windRatio = Math.min(1.0, Math.max(0, (currentKmh - 300) / 550));
        const spoilerBoost = this.spoilerExtended ? 0.12 : 0.0;
        const targetWindFreq = 600 + windRatio * 1400 + (this.spoilerExtended ? 300 : 0); // 600Hz ~ 2300Hz
        const targetWindGain = windRatio * (this.cameraMode === '1st' ? 0.30 : 0.20) + spoilerBoost;
        this.cockpitWindFilter.frequency.setTargetAtTime(targetWindFreq, now, 0.12);
        this.cockpitWindGain.gain.setTargetAtTime(targetWindGain, now, 0.12);
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

  triggerMovementPassengerReaction(motionType, kmh, alt) {
    const movementDialoguePool = {
      STALL_PANIC: [
        "🚨 [객실 285명 극심한 공포] '꺄아아악! 비행기 속도가 뚝 떨어지더니 아래로 곤두박질쳐요! 실속이다!'",
        "😱 [14A 승객 비명] '양력을 잃었어! 자유낙하하고 있어요! 기장님 제발 스로틀 끝까지 올리고 기수 내려주세요!'",
        "💺 [객실 승무원 긴급 방송] '승객 여러분! 전원 머리를 숙이고 충격 방지 자세(Brace)를 유지하십시오! 실속 급강하 중입니다!'",
        "📉 [22C 승객] '고도계가 미친 듯이 곤두박질친다! 바다가 무섭게 다가와요! 하준 기장님 살려주세요!'",
        "🙏 [가족 승객들 울음] '엔진 파워 최대로 올려주세요! 우리 모두 살고 싶어요!'"
      ],
      WINDSHEAR_PANIC: [
        "🌪️ [객실 285명 절규] '으아아악! 몸이 천장으로 솟구칠 것 같아요! 강력한 하강 기류다!'",
        "😱 [14C 승객] '마이크로버스트다! 비행기가 아래로 뚝뚝 떨어져요! 하준 기장님 파워 올려주세요!'",
        "💺 [객실 승무원] '승객 여러분! 전원 머리를 숙이고 충격 방지 자세(Brace Position)를 취하세요!'",
        "🙏 [가족 승객들] '하준 기장님 믿습니다! 제발 이 난기류 폭풍을 뚫고 올라가 주세요!'",
        "💨 [22A 승객] '풍속계랑 고도계가 미친 듯이 춤춰요! 기수 들어올려라 제발!'"
      ],
      TURBULENCE_SHAKE: [
        "🌊 [객실 승객들] '우당탕탕! 기체가 사정없이 요동치고 있어요! 손잡이 꽉 잡아!'",
        "🥤 [16B 승객] '커피랑 음료수가 공중에 붕 떴어요! 역대급 난기류 터뷸런스다!'",
        "👦 [창가 어린이] '엄마 무서워요! 비행기 날개가 위아래로 심하게 흔들려요!'",
        "💺 [객실 승무원 방송] '기류가 매우 불안정합니다! 좌석 벨트를 단단히 조여 매주시기 바랍니다!'",
        "💼 [09D 승객] '하준 기장님 목소리 듣고 침착하게 버티고 있습니다. 기장님 파이팅!'"
      ],
      ENGINE_FIRE: [
        "🔥 [좌측 11열 승객] '창밖을 봐! 1번 엔진에서 시뻘건 불꽃이 계속 뿜어져 나와요!'",
        "🧯 [승객 일동] '비대칭 추력으로 비행기가 왼쪽으로 기울고 있어! 하준 기장님 균형 잡아주세요!'",
        "😱 [23E 승객] '엔진 하나로 날고 있어! 공항까지 버텨야 해! 하준 기장님 힘내세요!'",
        "👨‍✈️ [객실 승무원] '승객 여러분 침착하십시오! 기장님께서 한쪽 엔진으로 비상착륙 준비 중이십니다!'"
      ],
      BIRD_STRIKE: [
        "🦅 [승객 285명 정적과 공포] '제트 엔진 소리가 아예 안 들려... 무동력으로 활공 중이야!'",
        "🤫 [19B 승객] '허드슨강의 기적처럼... 하준 기장님이라면 바다나 활주로에 살려주실 거야!'",
        "💨 [창가 승객] '바람 가르는 소리만 쉭쉭 나요! 고도가 점점 낮아진다! 하준 기장님 부탁해요!'",
        "🙏 [15A 승객] '글라이더 비행 성공할 수 있습니다! 하준 기장님 조종술을 믿어요!'"
      ],
      GEAR_FAILURE: [
        "🛞 [승객 285명 브레이스] '바퀴 없이 맨땅에 동체 착륙(Belly Landing)한다! 충격에 대비해!'",
        "⚠️ [객실 승무원] '브레이스! 브레이스! 머리를 무릎 사이에 파묻고 발을 바닥에 붙이세요!'",
        "🔥 [28C 승객] '활주로에 닿으면 불꽃이 튈 거야! 하준 기장님 부드럽게 미끄러져 주세요!'",
        "🤝 [승객들 서로 손잡으며] '우리 모두 무사할 수 있을 거야! 하준 기장님 파이팅!'"
      ],
      STEEP_CLIMB: [
        "🚀 [14A 창가 승객] '우와아아! 기수가 하늘로 치솟는다! 몸이 시트에 푹 파묻혀요!'",
        "👦 [24F 어린이] '엄마! 비행기가 롤러코스터처럼 올라가! 구름 뚫고 간다!'",
        "😮 [08C 비즈니스석] '엄청난 제트 추진력! 하준 기장님 피치 업 파워 장난 아닙니다!'",
        "✨ [승객 285명] '오오오~! (엔진 포효와 함께 기립할 듯 짜릿한 상승 각도!)'"
      ],
      STEEP_DIVE: [
        "😱 [객실 승객 일동] '으아악! 떨어진다! 무중력 체험이다! 손잡이 꽉 잡아!'",
        "💺 [객실 승무원] '승객 여러분 당황하지 마시고 안전벨트를 꼭 매주시기 바랍니다!'",
        "🎢 [19E 승객] '바이킹 타는 것처럼 배가 간질간질해요! 기장님 익스트림 기동 대박!'",
        "🌪️ [11B 승객] '급강하 중력 가속이다! 하준 기장님 부드럽게 수평 잡아주세요!'"
      ],
      HARD_BANK_LEFT: [
        "🌊 [좌측 창가 승객들] '창밖으로 바다가 90도로 꺾여 보여요! 좌측 급선회 대박이다!'",
        "🔄 [12B 승객] '몸이 오른쪽으로 쏠린다! 하준 기장님의 짜릿한 코너링!'",
        "📸 [31A 여행객] '날개 끝이 수평선을 찌를 것 같아요! 멋진 선회 비행!'"
      ],
      HARD_BANK_RIGHT: [
        "🌊 [우측 창가 승객들] '우측 날개가 바다를 향해 푹 기울었어요! 스릴 만점!'",
        "🔄 [09D 승객] '몸이 왼쪽으로 기운다! 하준 기장님 선회 실력 예술이네~'",
        "✨ [22C 승객] '마치 전투기를 탄 것 같은 날렵한 뱅크각! 멋집니다 기장님!'"
      ],
      SEA_SKIMMING: [
        "🌊 [창가 어린이] '꺅! 바다에 손 닿을 것 같아요! 물보라가 창문에 튀어요!'",
        "😲 [17D 승객] '영화 탑건 실사판이다! 바다 수면을 스치듯 날아가는 초저고도 비행!'",
        "🐬 [승객 일동] '창밖으로 돌고래도 지나가겠어요! 하준 기장님 조종술 대박!'"
      ],
      SUPER_SPEED: [
        "⚡ [05A 일등석 VIP] '제트 엔진 굉음이 엄청납니다! 음속으로 질주하는 쾌감!'",
        "💨 [22C 승객] '속도계 700km/h 돌파! 창밖 구름이 순식간에 사라져요!'",
        "🔥 [항공 매니아] '트윈 터보팬 엔진 전출력! 하준 항공 스피드 최고다!'"
      ],
      AIR_BRAKE: [
        "🛑 [11C 승객] '몸이 앞으로 확 쏠린다! 스피드 브레이크 전개 소리 들린다!'",
        "💨 [18A 승객] '감속 중력이 제대로 느껴지네요! 기장님 감속 제어 완벽합니다.'"
      ],
      HARD_BRAKING: [
        "🛑 [객실 승객들] '끼이익! 몸이 앞으로 쏠린다! 역추진 브레이크 굉음 웅장하네!'",
        "👏 [28F 승객] '엄청난 제동력! 활주로에 정확하게 멈춰 서고 있어요! 기장님 나이스!'"
      ],
      TAKEOFF_ACCEL: [
        "🛫 [승객 285명] '우와아아! 이륙 가속이다! 활주로를 총알처럼 질주 중!'",
        "🔥 [15D 승객] '몸이 시트에 파묻힌다! 제트 엔진 파워 풀가동!'"
      ],
      STALL_PANIC: [
        "⚠️ [객실 승객들] '어? 비행기가 부들부들 떨려요! 기장님 속도 올려주세요!'",
        "😨 [15B 승객] '스티크 셰이커 진동 온다! 하준 기장님 기수 숙이고 파워 업!'"
      ],
      SMOOTH_CRUISE: [
        "☕ [09B 승객] '구름 위를 미끄러지듯 날아가네요. 커피 한 잔 마시며 힐링 중~'",
        "😴 [가족 승객] '비행이 너무 부드럽고 편안해서 아이가 새근새근 잠들었어요.'",
        "🌤️ [18C 승객] '하준 기장님 비행 실력이 예술이라 흔들림이 1도 없네요. 최고!'"
      ]
    };

    const list = movementDialoguePool[motionType];
    if (!list || list.length === 0) return;

    const chosen = list[Math.floor(Math.random() * list.length)];
    this.displayPassengerDialogue(chosen);
  }

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

  // ----------------------------------------------------------------
  // 12. HUD 계기판 수치 갱신 (Layout Reflow 최적화)
  // ----------------------------------------------------------------
  updateHUD() {
    // 1. 자세계 (인공수평의 PFD) 갱신: 매 프레임 즉각 회전
    if (this.attitudeHorizon) {
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
      const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.planeGroup.quaternion);
      const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
      const bankAngle = Math.asin(bankTilt); // 우측 롤 시 음수 rad
      const pitchPixels = Math.max(-28, Math.min(28, forwardVec.y * 50));
      this.attitudeHorizon.style.transform = `rotate(${bankAngle}rad) translateY(${pitchPixels}px)`;
    }

    // 2. DOM 텍스트 및 게이지 바: 2프레임에 1회 갱신 (브라우저 Layout Reflow/끊김 제거)
    this.hudFrameCount = (this.hudFrameCount || 0) + 1;
    if (this.hudFrameCount % 2 !== 0) return;

    const specs = this.getAircraftSpecs(this.currentPlaneType);
    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeGroup.quaternion);
    const bankTilt = THREE.MathUtils.clamp(localRight.y, -1, 1);
    const bankAngle = Math.abs(Math.asin(bankTilt));
    const loadFactorG = 1.0 / Math.max(0.35, Math.cos(bankAngle));
    const flapMult = [1.0, 0.88, 0.78, 0.68][this.flapIndex] || 1.0;
    const dynamicVStall = Math.round(specs.vStallCleanKmh * flapMult * Math.sqrt(loadFactorG) + (this.gearExtended ? 8 : 0));

    if (this.speedTitle) {
      this.speedTitle.textContent = `SPEED (V_stall: ${dynamicVStall} km/h)`;
    }

    const kmh = Math.round(this.speed * 280);
    const knots = Math.round(kmh / 1.852);
    this.speedVal.textContent = this.isOnGround ? `${kmh} km/h (${knots} kt) [지상 주행]` : `${kmh} km/h (${knots} kt) [비행 IAS]`;
    const speedPercent = Math.min(100, Math.round((kmh / 800) * 100));
    this.speedBar.style.width = `${speedPercent}%`;

    const altitude = Math.max(0, Math.round((this.planeGroup.position.y - this.groundY) * 10));
    const altFt = Math.round(altitude * 3.28084);
    this.altVal.textContent = this.isOnGround ? `0 m (0 ft) [지상]` : `${altitude} m (${altFt} ft) [QNH]`;
    const altPercent = Math.min(100, Math.round((altitude / 2500) * 100));
    this.altBar.style.width = `${altPercent}%`;

    // 2. 수직 승강계 (VSI) 갱신
    if (this.vsiVal) {
      const vsi = (this.verticalSpeed * 10).toFixed(1);
      const vsiFpm = Math.round(this.verticalSpeed * 10 * 196.85);
      this.vsiVal.textContent = (this.verticalSpeed >= 0 ? '+' : '') + vsi + ' m/s (' + (vsiFpm >= 0 ? '+' : '') + vsiFpm + ' fpm)';
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
      } else if (kmh < dynamicVStall + 15 && !this.isOnGround) {
        this.speedBadge.textContent = 'CAUTION';
        this.speedBadge.className = 'badge-status stall';
      } else {
        this.speedBadge.textContent = 'NORMAL';
        this.speedBadge.className = 'badge-status normal';
      }
    }

    const n1Val = Math.round(this.n1);
    const thrPercent = Math.round(this.throttle * 100);
    const revTag = this.reverseThrustActive ? ' [REV]' : '';
    this.boostVal.textContent = `N1: ${n1Val}% (레버 ${thrPercent}%)${revTag}`;
    this.boostBar.style.width = `${n1Val}%`;

    this.hullVal.textContent = `${this.hullIntegrity}% ${this.isNoseDented ? '(기수 찌그러짐)' : (this.isGearCollapsed ? '(기어 파손)' : '(정상)')}`;
    this.hullBar.style.width = `${this.hullIntegrity}%`;
    if (this.hullIntegrity < 40) {
      this.hullBar.className = 'gauge-bar-fill hull-fill danger';
    } else if (this.hullIntegrity < 75) {
      this.hullBar.className = 'gauge-bar-fill hull-fill warning';
    } else {
      this.hullBar.className = 'gauge-bar-fill hull-fill';
    }

    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.paxDisplay) this.paxDisplay.textContent = `${this.passengers}명`;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    this.timeDisplay.textContent = `${m}:${s}`;

    let targetPos = new THREE.Vector3(160, this.groundY, 0);
    let targetLabel = '활주로 36L';

    if (this.flightPhase === 'TAXI_OUT') {
      targetPos = new THREE.Vector3(160, this.groundY, 800);
      targetLabel = '이륙 활주로 36L (150m)';
    } else if (this.flightPhase === 'CLIMB_CRUISE' || this.flightPhase === 'TAKEOFF_RUN') {
      targetPos = new THREE.Vector3(160, this.groundY, -45000);
      // Z = 0 (출발지) ~ Z = -45,000 (인천공항 메인 활주로 16R) 구간을 200.0km 장거리 항로로 정밀 비례 매핑
      const zProgress = Math.min(1.0, Math.max(0, -this.planeGroup.position.z / 45000));
      const remKm = (200.0 * (1.0 - zProgress)).toFixed(1);

      if (zProgress > 0.96) {
        const distM = Math.round(this.planeGroup.position.distanceTo(targetPos) * 2);
        targetLabel = `인천국제공항 16R 착륙 활주로 (${distM}m)`;
      } else {
        const speedTag = (this.cruiseMultiplier > 1) ? ` [${this.cruiseMultiplier}x 배속순항]` : '';
        targetLabel = `인천국제공항 16R (${remKm}km)${speedTag}`;
      }
    } else if (this.flightPhase === 'TAXI_IN' || this.flightPhase === 'DEPLANING' || this.flightPhase === 'MISSION_COMPLETE') {
      targetPos = new THREE.Vector3(-330, this.groundY, -45000);
      const gateDistM = Math.round(this.planeGroup.position.distanceTo(targetPos) * 2);
      targetLabel = `인천공항 T1 탑승교 1번 게이트 (${gateDistM}m)`;
    }
    this.targetDist.textContent = targetLabel;

    const localVec = targetPos.clone();
    this.planeGroup.worldToLocal(localVec);
    const angle = Math.atan2(localVec.x, -localVec.z);
    this.targetArrow.style.transform = `rotate(${angle}rad)`;
  }

  // ----------------------------------------------------------------
  // 13. 비상 상황 시나리오 시스템 (In-Flight Emergency Scenarios)
  // ----------------------------------------------------------------
  toggleEmergencyPanel() {
    if (!this.emergencyPanel) this.emergencyPanel = document.getElementById('emergency-panel');
    if (this.emergencyPanel) {
      this.emergencyPanel.classList.toggle('hidden');
    }
  }

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
    }
  }

  clearEmergency() {
    this.currentEmergency = null;
    this.emergencyTimer = 0;
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
  }

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
  }

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
  }

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
        // 좌측 엔진 화재로 인한 지속적 좌측 요(Yaw) 모멘트 -> 조종사는 D키(우측 러더)로 보정해야 함
        this.planeGroup.rotateY(0.0032);
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
        // 급격한 하강 기류 (10~15 m/s) 및 난기류 롤/피치 진동
        const shearOsc = Math.sin(Date.now() * 0.007);
        const downdraft = (11.0 + shearOsc * 6.0) * dt;
        this.planeGroup.position.y -= downdraft;
        this.planeGroup.rotateZ(shearOsc * 0.005);
        this.planeGroup.rotateX(Math.cos(Date.now() * 0.005) * 0.004);
        this.screenShake = Math.max(this.screenShake, 0.35);
        break;

      case 'gear_failure':
        // 기어가 나오지 않음 보장
        if (this.gearExtended) {
          this.gearExtended = false;
          this.landingGears.forEach(g => g.visible = false);
        }
        break;
    }
  }

  // 영웅적 비상착륙 성공 판정
  checkEmergencyLandingSuccess(landingType) {
    if (!this.currentEmergency || this.emergencyBonusGiven || this.isDestroyed) return;

    this.emergencyBonusGiven = true;
    this.score += 3000;

    const titles = {
      engine_fire: '🔥 1번 엔진 화재 극복 착륙',
      bird_strike: '🦅 버드 스트라이크 무동력 활공 착륙',
      windshear: '🌪️ 마이크로버스트 윈드시어 돌파 착륙',
      gear_failure: '🛞 기어 고장 동체 비상착륙 (Belly Landing)'
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

  // ----------------------------------------------------------------
  // 14. 탑승교 도킹, 엔진 정지(Engine Shutdown) 및 승객 하선(Deplaning) 시스템
  // ----------------------------------------------------------------
  showGateActionPrompt(visible) {
    if (this.gateActionContainer) {
      if (visible) {
        this.gateActionContainer.classList.remove('hidden');

        // 도킹 및 엔진 상태 갱신
        const dockBadge = document.getElementById('jetway-dock-status');
        if (dockBadge) {
          if (this.isJetwayDocked) {
            dockBadge.textContent = '도킹 완료 (L1 Door 연결)';
            dockBadge.className = 'status-val dock-complete';
          } else {
            dockBadge.textContent = '스윙 회전 연결 중...';
            dockBadge.className = 'status-val dock-transit';
          }
        }

        const engBadge = document.getElementById('gate-engine-status');
        const engShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
        const deplaneBtn = document.getElementById('deplane-btn');

        if (engBadge) {
          if (this.isEngineOff) {
            engBadge.textContent = '완전 정지 (OFF)';
            engBadge.className = 'status-val engine-off';
            if (engShutdownBtn) engShutdownBtn.classList.add('hidden');
            if (deplaneBtn) deplaneBtn.classList.remove('hidden');
          } else {
            engBadge.textContent = '가동 중 (ON)';
            engBadge.className = 'status-val engine-running';
            if (engShutdownBtn) engShutdownBtn.classList.remove('hidden');
            if (deplaneBtn) deplaneBtn.classList.add('hidden');
          }
        }
      } else {
        this.gateActionContainer.classList.add('hidden');
      }
    }
    if (this.deplaneQuickBtn) {
      if (visible && this.isEngineOff && this.isJetwayDocked) {
        this.deplaneQuickBtn.classList.remove('hidden');
      } else {
        this.deplaneQuickBtn.classList.add('hidden');
      }
    }
  }

  // 엔진 정지 (Shutdown Engines)
  shutdownEngines() {
    this.isEngineOff = true;
    this.throttle = 0;
    this.stopJetSound();
    this.playCautionChime();

    // 상단 HUD 버튼 갱신
    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 OFF';
    if (engBtn) {
      engBtn.classList.add('engine-off-btn');
      engBtn.title = '엔진 시동 (단축키 E)';
    }

    // 게이트 상태창 갱신
    const gateEngStatus = document.getElementById('gate-engine-status');
    if (gateEngStatus) {
      gateEngStatus.textContent = '완전 정지 (OFF)';
      gateEngStatus.className = 'status-val engine-off';
    }

    const gateShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (gateShutdownBtn) gateShutdownBtn.classList.add('hidden');

    const deplaneBtn = document.getElementById('deplane-btn');
    if (deplaneBtn) deplaneBtn.classList.remove('hidden');

    const deplaneQuickBtn = document.getElementById('deplane-quick-btn');
    if (deplaneQuickBtn) deplaneQuickBtn.classList.remove('hidden');

    this.showPopup('🔴 엔진 셧다운 완료! 터보팬 회전이 멈추고 제트 전원이 차단되었습니다.');
    this.triggerPassengerReaction('engine_shutdown');

    // 탑승교가 도킹되어 있는 상태라면 1.2초 후 자동으로 승객 하선 시작
    if (this.isJetwayDocked && this.flightPhase !== 'DEPLANING' && this.flightPhase !== 'MISSION_COMPLETE') {
      setTimeout(() => {
        if (this.isEngineOff && this.isJetwayDocked && this.flightPhase !== 'DEPLANING') {
          this.startDeplaning();
        }
      }, 1200);
    }
  }

  // 엔진 재시동
  startEngines() {
    this.isEngineOff = false;
    this.throttle = 0.1;
    if (this.soundEnabled) this.startJetSound();
    this.playCautionChime();

    const engBtnText = document.getElementById('engine-status-text');
    const engBtn = document.getElementById('engine-shutdown-btn');
    if (engBtnText) engBtnText.textContent = '엔진 ON';
    if (engBtn) {
      engBtn.classList.remove('engine-off-btn');
      engBtn.title = '엔진 정지 (단축키 E)';
    }

    const gateEngStatus = document.getElementById('gate-engine-status');
    if (gateEngStatus) {
      gateEngStatus.textContent = '가동 중 (ON)';
      gateEngStatus.className = 'status-val engine-running';
    }

    const gateShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (gateShutdownBtn) gateShutdownBtn.classList.remove('hidden');

    this.showPopup('🟢 엔진 시동 완료 (Engine Start)! 스로틀을 올려 택싱 및 이륙할 수 있습니다.');
  }

  toggleEngineShutdown() {
    if (this.isEngineOff) {
      this.startEngines();
    } else {
      this.shutdownEngines();
    }
  }

  startDeplaning() {
    this.showGateActionPrompt(false);
    this.dockAtDestinationGate();
  }

  dockAtDestinationGate() {
    if (this.flightPhase === 'DEPLANING' || this.flightPhase === 'MISSION_COMPLETE') return;

    // 만약 탑승교가 아직 연결 중이면 대기
    if (!this.isJetwayDocked) {
      this.showPopup('⏳ 탑승교가 비행기 도어로 회전 연결 중입니다. 잠시만 기다려주세요!');
      this.showGateActionPrompt(true);
      return;
    }

    // 만약 엔진이 아직 꺼지지 않았으면 대기
    if (!this.isEngineOff) {
      this.showPopup('⚠️ 위험! 엔진이 가동 중입니다. 먼저 엔진을 끄세요 (E 키 또는 빨간 엔진 정지 버튼)!');
      this.showGateActionPrompt(true);
      return;
    }

    this.flightPhase = 'DEPLANING';
    this.showGateActionPrompt(false);
    this.phaseDisplay.textContent = '게이트 1번 도킹 (승객 하기 중)';
    this.speed = 0;
    this.throttle = 0;
    this.stopJetSound();
    this.playCautionChime();
    this.showPopup('🚪 게이트 1번 탑승교 연결 완료! 엔진 정지 확인. 승객 285명이 하선(Deplaning) 중입니다.');
    this.triggerPassengerReaction('deplaning');

    // 승객 하선 애니메이션 카운트다운
    let remainingPax = this.passengers;
    const deplaneInterval = setInterval(() => {
      remainingPax = Math.max(0, remainingPax - 45);
      this.passengers = remainingPax;
      if (this.paxDisplay) this.paxDisplay.textContent = `${this.passengers}명 (하기 중)`;
      if (remainingPax <= 0) {
        clearInterval(deplaneInterval);
        this.completeFlightMission();
      }
    }, 320);
  }

  // ----------------------------------------------------------------
  // 마이크 활성화, 기장 실시간 상시 안내 방송 (Captain PA) & 실시간 AI 승객 반응 시스템
  // ----------------------------------------------------------------
  toggleMicrophone() {
    if (this.isMicActive) {
      this.stopMicrophone();
    } else {
      this.startMicrophone();
    }
  }

  startMicrophone() {
    this.isMicActive = true;
    this.micRestartTimer = null;
    this.micLastRecognizedText = '';
    this.micVoiceTriggerCount = 0;
    this.lastVoiceDetectedTime = 0;
    this.recentAIReponses = [];

    // 브라우저 AudioContext 서스펜드 해제
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const micBtn = document.getElementById('mic-toggle-btn');
    const micText = document.getElementById('mic-status-text');
    const paBanner = document.getElementById('pa-broadcast-banner');
    const paText = document.getElementById('pa-speech-text');

    if (micBtn) {
      micBtn.classList.add('mic-active');
      micBtn.classList.add('active');
    }
    if (micText) micText.textContent = '마이크 LIVE (듣는 중)';
    if (paBanner) paBanner.classList.remove('hidden');
    if (paText) paText.textContent = '"기장님, 지금 말씀하세요! 마이크로 말씀하시거나 아래 방송 칩을 누르면 승객들이 AI로 즉각 반응합니다."';

    this.playPAChime();
    this.showPopup('🎙️ 조종석 마이크 상시 청취 가동! 편하게 말씀하세요.');
    this.triggerPassengerReaction('pa_start');

    // 1. Web Audio API 마이크 볼륨 실시간 분석 (getUserMedia)
    this.initMicrophoneAudioStream();

    // 2. Web Speech Recognition (상시 자동 재연결 지속 청취 루프)
    this.initPersistentSpeechRecognition();
  }

  initMicrophoneAudioStream() {
    const startAudioProcessing = (stream) => {
      if (!this.isMicActive) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.micStream = stream;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.micAudioContext = new AudioContextClass();
        if (this.micAudioContext.state === 'suspended') {
          this.micAudioContext.resume().catch(() => {});
        }
        const source = this.micAudioContext.createMediaStreamSource(stream);
        this.micAnalyser = this.micAudioContext.createAnalyser();
        this.micAnalyser.fftSize = 64;
        this.micAnalyser.smoothingTimeConstant = 0.2;
        source.connect(this.micAnalyser);
        this.micDataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
        this.startVUMeterLoop();
        this.showPopup('✅ 마이크 하드웨어 정상 연결! 기장님 목소리에 즉각 반응합니다.');
      } catch (err) {
        console.warn('AudioContext analyser setup error:', err);
        this.startSimulatedVULoop();
      }
    };

    // 1. 표준 navigator.mediaDevices.getUserMedia 시도
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        startAudioProcessing(stream);
      }).catch(err => {
        console.warn('Microphone permission or hardware error:', err);
        // 권한 거부 시 사용자에게 친절한 안내 제공
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.showPopup('⚠️ 마이크 권한이 차단되어 있습니다. 주소창 설정에서 마이크를 허용하거나 아래 빠른 방송 버튼을 이용하세요!');
        } else {
          this.showPopup('🎙️ 마이크 대기 모드: 마이크로 말씀하시거나 아래 방송 칩을 눌러 승객들과 대화하세요!');
        }
        this.startSimulatedVULoop();
      });
    } else {
      // 2. 레거시 getUserMedia 시도
      const legacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (legacyGetUserMedia) {
        legacyGetUserMedia.call(navigator, { audio: true }, (stream) => {
          startAudioProcessing(stream);
        }, (err) => {
          console.warn('Legacy getUserMedia error:', err);
          this.startSimulatedVULoop();
        });
      } else {
        this.startSimulatedVULoop();
      }
    }
  }

  // 상시 지속 음성 인식 루프 (Auto-Restart Persistent Loop)
  initPersistentSpeechRecognition() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('Web Speech Recognition not supported in this browser environment.');
      return;
    }

    if (!this.isMicActive) return;

    try {
      if (this.speechRecognition) {
        try {
          this.speechRecognition.onstart = null;
          this.speechRecognition.onresult = null;
          this.speechRecognition.onerror = null;
          this.speechRecognition.onend = null;
          this.speechRecognition.abort();
        } catch (e) {}
        this.speechRecognition = null;
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const paText = document.getElementById('pa-speech-text');

      recognition.onstart = () => {
        this.micIsListening = true;
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText && paText) {
          paText.textContent = `"${currentText}"`;
          this.flashSpeakingIndicator(true);
        }

        if (finalTranscript.trim()) {
          this.handleCaptainSpeechAI(finalTranscript.trim());
        } else if (interimTranscript.trim().length >= 3) {
          this.scheduleInterimResponse(interimTranscript.trim());
        }
      };

      recognition.onerror = (e) => {
        console.warn('SpeechRecognition error:', e.error);
        if (e.error === 'not-allowed') {
          this.showPopup('⚠️ 마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요!');
          return;
        }
        // no-speech, aborted, network 등은 정상적인 재연결 루프로 자동 복구
        if (this.isMicActive) {
          this.scheduleRecognitionRestart(120);
        }
      };

      recognition.onend = () => {
        this.micIsListening = false;
        // 브라우저가 침묵으로 인해 자동으로 청취를 종료하더라도, 마이크 활성 상태면 즉시 재시작!
        if (this.isMicActive) {
          this.scheduleRecognitionRestart(80);
        }
      };

      this.speechRecognition = recognition;
      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      if (this.isMicActive) {
        this.scheduleRecognitionRestart(600);
      }
    }
  }

  scheduleRecognitionRestart(delay = 100) {
    if (!this.isMicActive) return;
    if (this.micRestartTimer) clearTimeout(this.micRestartTimer);
    this.micRestartTimer = setTimeout(() => {
      if (!this.isMicActive) return;
      this.initPersistentSpeechRecognition();
    }, delay);
  }

  scheduleInterimResponse(text) {
    if (this.interimDebounceTimer) clearTimeout(this.interimDebounceTimer);
    this.interimDebounceTimer = setTimeout(() => {
      if (this.isMicActive && text && text !== this.micLastRecognizedText) {
        this.handleCaptainSpeechAI(text);
      }
    }, 750);
  }

  flashSpeakingIndicator(active) {
    const micBtn = document.getElementById('mic-toggle-btn');
    const paBanner = document.getElementById('pa-broadcast-banner');
    if (active) {
      if (micBtn) micBtn.classList.add('mic-speaking');
      if (paBanner) paBanner.classList.add('speaking');
    } else {
      if (micBtn) micBtn.classList.remove('mic-speaking');
      if (paBanner) paBanner.classList.remove('speaking');
    }
  }

  stopMicrophone() {
    this.isMicActive = false;
    this.micIsListening = false;
    if (this.micRestartTimer) clearTimeout(this.micRestartTimer);
    if (this.interimDebounceTimer) clearTimeout(this.interimDebounceTimer);

    const micBtn = document.getElementById('mic-toggle-btn');
    const micText = document.getElementById('mic-status-text');
    const paBanner = document.getElementById('pa-broadcast-banner');

    if (micBtn) {
      micBtn.classList.remove('mic-active');
      micBtn.classList.remove('active');
      micBtn.classList.remove('mic-speaking');
    }
    if (micText) micText.textContent = '마이크 ON';
    this.flashSpeakingIndicator(false);

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micAudioContext) {
      this.micAudioContext.close().catch(() => {});
      this.micAudioContext = null;
    }
    if (this.speechRecognition) {
      try {
        this.speechRecognition.onstart = null;
        this.speechRecognition.onresult = null;
        this.speechRecognition.onerror = null;
        this.speechRecognition.onend = null;
        this.speechRecognition.abort();
      } catch (e) {}
      this.speechRecognition = null;
    }

    setTimeout(() => {
      if (!this.isMicActive && paBanner) {
        paBanner.classList.add('hidden');
      }
    }, 1200);

    this.showPopup('🎙️ 조종석 마이크 청취를 종료했습니다.');
  }

  startVUMeterLoop() {
    const vuBars = document.querySelectorAll('#pa-vu-meter .vu-bar');
    const paText = document.getElementById('pa-speech-text');

    const update = () => {
      if (!this.isMicActive) {
        this.flashSpeakingIndicator(false);
        return;
      }

      if (this.micAudioContext && this.micAudioContext.state === 'suspended') {
        this.micAudioContext.resume().catch(() => {});
      }

      if (this.micAnalyser && this.micDataArray) {
        this.micAnalyser.getByteFrequencyData(this.micDataArray);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < this.micDataArray.length; i++) {
          const val = this.micDataArray[i];
          sum += val;
          if (val > peak) peak = val;
        }
        const avg = sum / this.micDataArray.length;

        // 고감도 발화 감지 (작은 목소리나 일반 대화도 즉각 감지)
        const isSpeaking = (avg > 3.0 || peak > 16.0);
        this.flashSpeakingIndicator(isSpeaking);

        if (isSpeaking) {
          const now = Date.now();
          if (now - this.lastVoiceDetectedTime > 1500) {
            this.lastVoiceDetectedTime = now;
            this.micVoiceTriggerCount = (this.micVoiceTriggerCount || 0) + 1;
            if (paText && (!paText.textContent || paText.textContent.includes('편하게 말씀하세요') || paText.textContent.includes('감지 중'))) {
              paText.textContent = '"🎙️ 기장님 말씀 감지 중... 승객들이 경청하고 있습니다!"';
            }
            if (!this.micLastRecognizedText || (now - (this.lastAITriggerTime || 0) > 3000)) {
              this.triggerPassengerReaction('voice_active');
            }
          }
        }

        vuBars.forEach((bar, idx) => {
          const barVal = Math.min(1.0, (avg * (0.9 + idx * 0.25) + (isSpeaking ? Math.random() * 5 : 0)) / 20.0);
          const h = Math.max(3, Math.min(22, barVal * 22));
          bar.style.height = `${h}px`;
          if (barVal > 0.65) {
            bar.style.backgroundColor = '#f97316';
          } else if (barVal > 0.35) {
            bar.style.backgroundColor = '#facc15';
          } else {
            bar.style.backgroundColor = '#34d399';
          }
        });
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  startSimulatedVULoop() {
    const vuBars = document.querySelectorAll('#pa-vu-meter .vu-bar');
    const update = () => {
      if (!this.isMicActive) return;
      const t = Date.now() * 0.008;
      vuBars.forEach((bar, idx) => {
        const h = Math.max(4, Math.min(22, 10 + Math.sin(t + idx * 1.2) * 7));
        bar.style.height = `${h}px`;
        bar.style.backgroundColor = '#38bdf8';
      });
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  cycleSimulatedPA() {
    const phrases = [
      "손님 여러분, 안녕하십니까. 오늘 비행을 맡은 기장 하준입니다. 즐거운 비행 되십시오.",
      "우리 비행기는 곧 이륙하겠습니다. 좌석 벨트를 착용해 주십시오.",
      "현재 순항 고도 3,000미터로 순조롭게 비행 중입니다. 창밖으로 아름다운 바다가 보입니다.",
      "여러분 우리 비행기는 곧 착륙하겠습니다. 좌석 등받이를 세우고 안전벨트를 매 주십시오.",
      "기장입니다. 오늘 날씨가 아주 맑고 쾌청하여 비행이 무척 안정적입니다.",
      "인천공항 정지선에 도착했습니다. 탑승교가 연결되고 엔진이 꺼질 때까지 앉아 계십시오."
    ];
    const phrase = phrases[(this.captainPAIndex || 0) % phrases.length];
    this.captainPAIndex = ((this.captainPAIndex || 0) + 1);

    const paText = document.getElementById('pa-speech-text');
    if (paText) paText.textContent = `"${phrase}"`;
    this.handleCaptainSpeechAI(phrase);
  }

  // ----------------------------------------------------------------
  // 실시간 AI 승객 반응 엔진 (AI Passenger Reaction & Dialogue Engine)
  // - 기장이 마이크로 말한 문장의 의도(Intent), 키워드, 감정을 정밀 분석
  // - 객실 승객 285명이 각자의 개성 있는 캐릭터로 실시간 맞춤 화답 생성
  // ----------------------------------------------------------------
  handleCaptainSpeechAI(rawText) {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();
    this.micLastRecognizedText = text;
    this.lastAITriggerTime = Date.now();

    const paText = document.getElementById('pa-speech-text');
    if (paText) paText.textContent = `"${text}"`;

    // 문장 의도(Intent) 분석
    let intent = 'GENERAL';
    const lower = text.toLowerCase();

    if (lower.includes('이륙') || lower.includes('날아') || lower.includes('떠오') || (lower.includes('비행기') && lower.includes('출발'))) {
      intent = 'TAKEOFF_FLIGHT';
    } else if (lower.includes('착륙') || lower.includes('인천') || lower.includes('도착') || lower.includes('하강') || lower.includes('내려') || lower.includes('다왔') || lower.includes('벨트') || lower.includes('활주로')) {
      intent = 'LANDING_INCHEON';
    } else if (lower.includes('하준') || lower.includes('기장') || lower.includes('안녕') || lower.includes('반갑') || lower.includes('환영') || lower.includes('탑승') || lower.includes('출발')) {
      intent = 'GREETING_HAJUN';
    } else if (lower.includes('순항') || lower.includes('고도') || lower.includes('바다') || lower.includes('날씨') || lower.includes('구름') || lower.includes('하늘') || lower.includes('경치') || lower.includes('풍경') || lower.includes('맑')) {
      intent = 'CRUISE_WEATHER';
    } else if (lower.includes('기내식') || lower.includes('밥') || lower.includes('배고') || lower.includes('음료') || lower.includes('커피') || lower.includes('물') || lower.includes('주스') || lower.includes('간식') || lower.includes('맛있')) {
      intent = 'MEAL_SNACK';
    } else if (lower.includes('윈드시어') || lower.includes('난기류') || lower.includes('터뷸런스') || lower.includes('돌풍') || lower.includes('기류') || lower.includes('흔들') || lower.includes('비상') || lower.includes('엔진') || lower.includes('화재') || lower.includes('불') || lower.includes('버드') || lower.includes('브레이스') || lower.includes('조심') || lower.includes('죄송') || lower.includes('안전') || lower.includes('주의')) {
      intent = 'TURBULENCE_SAFETY';
    } else if (lower.includes('감사') || lower.includes('고마') || lower.includes('최고') || lower.includes('짱') || lower.includes('멋져') || lower.includes('굿') || lower.includes('잘') || lower.includes('대단') || lower.includes('박수') || lower.includes('파이팅') || lower.includes('화이팅')) {
      intent = 'PRAISE_CHEER';
    } else if (lower.includes('조상') || lower.includes('1903') || lower.includes('복엽기') || lower.includes('프로펠러') || lower.includes('나무') || lower.includes('원조')) {
      intent = 'ANCESTOR_1903';
    } else if (lower.includes('어디') || lower.includes('몇 시') || lower.includes('언제') || lower.includes('왜') || lower.includes('뭐')) {
      intent = 'QUESTION_INTERACTION';
    }

    // AI 화답 생성
    this.generateAIPassengerResponse(intent, text);
  }

  generateAIPassengerResponse(intent, spokenText) {
    const aiPassengerDialoguePool = {
      TAKEOFF_FLIGHT: [
        "🛫 [객실 승무원] '승객 여러분, 기장님 말씀대로 우리 비행기는 곧 이륙하오니 좌석 벨트를 매주시기 바랍니다.'",
        "🤩 [14A 창가 승객] '와아! 드디어 하늘로 날아오른다! 하준 기장님 부드러운 이륙 기대돼요!'",
        "👦 [24F 창가 어린이] '엄마! 곧 이륙한대! 엔진 소리 붕붕 난다! 하준 기장님 출발~!'",
        "💼 [08B 비즈니스석] '기장님의 든든한 이륙 안내 방송 덕분에 기분 좋게 여행을 시작합니다.'",
        "👏 [객실 승객 285명] '우와아~! 힘차게 날아올라라 하준 항공! 안전하고 멋진 비행 출발!'"
      ],
      GREETING_HAJUN: [
        "👨‍✈️ [승객 285명 일동] '하준 기장님 안녕하세요! 오늘 안전 비행 부탁드립니다!'",
        "👦 [24F 창가 어린이] '엄마! 하준 기장님이 말씀하신다! 목소리 진짜 멋져요!'",
        "💼 [12A 비즈니스석] '하준 기장님의 신뢰감 있는 목소리 들으니 푹 쉴 수 있겠습니다.'",
        "👩 [18C 여행객] '와! 하준 항공 비행기 타길 정말 잘했다! 기장님 파이팅!'",
        "👴 [05B 은퇴 교수] '기장님의 차분하고 듬직한 인사 방송에 깊은 감명을 받았습니다.'"
      ],
      LANDING_INCHEON: [
        "💺 [객실 승무원] '승객 여러분, 곧 착륙하오니 좌석 등받이를 세우고 안전벨트를 단단히 매주시기 바랍니다.'",
        "🏙️ [28A 창가 승객] '창밖으로 영종도 바다랑 활주로가 보여요! 하준 기장님 곧 착륙하네요!'",
        "👏 [15D 승객] '곧 착륙한다는 기장님 안내 방송 들으니 안심이 됩니다! 부드러운 터치다운 기대할게요!'",
        "🧳 [31F 여행객] '드디어 200km 대륙 횡단 끝! 하준 기장님 덕분에 안전하게 도착하네요.'",
        "👧 [09C 어린이] '우와! 비행기 바퀴가 펴졌나 봐! 땅이 점점 가까워져요!'"
      ],
      CRUISE_WEATHER: [
        "☁️ [14A 창가 승객] '창밖 날씨가 정말 예술이네요! 푸른 바다와 구름이 눈부십니다!'",
        "☕ [07D 승객] '기장님 비행이 너무 안정적이라 커피도 한 방울 안 흔들려요. 최고!'",
        "📸 [22B 승객] '순항 고도에서 바라본 한반도 풍경 사진 찍었어요! 대박입니다!'",
        "✈️ [19E 항공 매니아] '고도 유지와 트림 조종이 완벽합니다. 하준 기장님 솜씨 굿!'",
        "🌊 [11F 승객] '바다 위를 이렇게 시원하게 가로지르다니, 최고의 비행 여행입니다!'"
      ],
      MEAL_SNACK: [
        "🍱 [16B 승객] '기장님 말씀 듣고 나니 기내식 냄새 솔솔 나고 군침이 도네요!'",
        "🥤 [27C 승객] '시원한 오렌지 주스 한 잔 마시면서 방송 들으니 힐링 그 자체입니다!'",
        "😋 [08A 승객] '하준 항공 기내식 비빔밥이랑 디저트 진짜 꿀맛입니다! 서비스 짱!'",
        "👨‍👩‍👦 [가족 승객] '아이들도 간식 먹고 기장님 방송 들으면서 너무 신나 있어요!'"
      ],
      TURBULENCE_SAFETY: [
        "🛡️ [12D 승객] '기류로 기체가 요동쳤지만 기장님이 침착하게 방송해주셔서 안심이 돼요!'",
        "💪 [18A 승객] '윈드시어 난기류도 하준 기장님의 신들린 조종술이면 거뜬히 돌파할 겁니다!'",
        "🔒 [30C 승객] '기장님 지시대로 안전벨트 꽉 매고 브레이스 자세 유지 중입니다. 기장님 파이팅!'",
        "🌪️ [객실 승객 285명] '하준 기장님 힘내세요! 저희 285명은 기장님을 전적으로 믿습니다!'",
        "🙏 [가족 승객들] '기장님 든든한 안내 방송 들으니 불안한 마음이 싹 사라졌어요. 끝까지 힘내주세요!'"
      ],
      PRAISE_CHEER: [
        "🎉 [객실 승객 285명] '짝짝짝! (객실 가득 터져 나오는 환호와 열렬한 박수갈채)'",
        "🌟 [04A 일등석 VIP] '하준 기장님이야말로 대한민국 최고의 파일럿이십니다! 브라보!'",
        "🥰 [21F 승객] '기장님의 따뜻한 말씀에 승객들 모두 환하게 미소 짓고 있어요!'",
        "💯 [15E 승객] '비행 편안함 100점! 안내 방송 100점! 하준 항공 대만족입니다!'"
      ],
      ANCESTOR_1903: [
        "🪵 [역사 마니아 승객] '1903 조상 비행기를 타고 하늘을 날다니! 꿈만 같습니다!'",
        "💨 [모험가 승객] '목재 날개와 프로펠러 소리가 낭만적이네요! 하준 기장님 대단해요!'",
        "🕰️ [승객 285명] '인류 최초 비행의 감동을 그대로 느끼고 있습니다! 멋져요!'"
      ],
      QUESTION_INTERACTION: [
        "🗺️ [승객 285명] '기장님! 저희는 지금 인천국제공항을 향해 힘차게 날아가고 있습니다!'",
        "⌚ [10A 승객] '정시 도착 일정대로 완벽하게 가고 있습니다. 하준 기장님 파이팅!'",
        "💡 [23C 승객] '기장님 질문 방송에 객실 승객들이 다 같이 귀 기울이고 있어요!'"
      ],
      GENERAL: [
        `🎙️ [승객 285명] "기장님이 말씀하신 내용('...${spokenText.slice(0, 18)}...') 다들 잘 들었지?"`,
        `👨‍✈️ [객실 승무원] "하준 기장님 안내 방송 명확하게 수신했습니다. 객실 이상 무!"`,
        `✨ [14C 승객] "기장님 목소리가 기내 스피커로 엄청 선명하게 들려요! 귀 기울여 듣고 있습니다!"`,
        `👏 [20E 승객] "하준 기장님과 함께하는 비행이라 매 순간이 든든하고 즐겁습니다!"`
      ]
    };

    const pool = aiPassengerDialoguePool[intent] || aiPassengerDialoguePool.GENERAL;
    // 이전 대사와 중복 방지
    const filtered = pool.filter(msg => !this.recentAIReponses.includes(msg));
    const finalPool = filtered.length > 0 ? filtered : pool;
    const selected = finalPool[Math.floor(Math.random() * finalPool.length)];

    this.recentAIReponses.push(selected);
    if (this.recentAIReponses.length > 4) this.recentAIReponses.shift();

    this.displayPassengerDialogue(selected);
  }

  displayPassengerDialogue(dialogueText) {
    const box = document.getElementById('passenger-reaction-box');
    const bubble = document.getElementById('pax-bubble');
    if (!box || !bubble) return;

    box.classList.remove('hidden');
    // 통통 튀는 AI 반응 팝업 애니메이션 리트리거
    box.classList.remove('pax-pop');
    void box.offsetWidth; // DOM Reflow
    box.classList.add('pax-pop');

    bubble.textContent = dialogueText;

    if (this.passengerReactionTimer) clearTimeout(this.passengerReactionTimer);
    // 마이크가 켜져 있는 동안에는 대화가 길게 유지되어 상호작용 체감 향상
    const stayTime = this.isMicActive ? 14000 : 8000;
    this.passengerReactionTimer = setTimeout(() => {
      if (this.flightPhase !== 'DEPLANING' && !this.isMicActive) {
        box.classList.add('hidden');
      }
    }, stayTime);
  }

  triggerPassengerReaction(type) {
    const defaultReactions = {
      pa_start: "🎙️ [객실 285명] '어? 기장님 안내 방송 나온다! 다들 조용히 하고 들어보자!'",
      voice_active: "🗣️ [승객들] '쉿! 조종실에서 하준 기장님이 말씀하고 계셔! 집중해봐!'",
      emergency_windshear: "🌪️ [객실 285명 패닉] '꺄아악! 비행기가 아래로 곤두박질쳐요! 기장님 살려주세요! 윈드시어다!'",
      emergency_engine_fire: "🔥 [좌측 창가 승객 비명] '불이야! 1번 엔진에서 시커먼 연기와 불길이 치솟아요! 하준 기장님 도와주세요!'",
      emergency_bird_strike: "🦅 [객실 일동 충격] '쾅! 엔진에 새 떼가 빨려 들어갔어! 엔진 소리가 멈췄다! 글라이더처럼 날아가고 있어!'",
      emergency_gear_failure: "🛞 [승객 285명 긴장] '어? 바퀴가 안 나온대! 동체 비상 착륙이래요! 모두 충격 방지 자세(Brace) 취해!'",
      emergency_cleared: "🌈 [승객 285명 안도의 한숨] '휴우우~! 경보가 꺼졌다! 하준 기장님이 기체를 정상화하셨어! 살았다!'",
      emergency_landing_success: "🏆 [승객 285명 기립 박수 & 눈물] '와아아아!! 하준 기장님이 우리를 구하셨다! 살았어! 기적의 착륙 만세! 짝짝짝!'",
      turbulence: "💺 [객실 승객들] '어어어! 기체가 엄청 흔들려요! 난기류인가 봐! 안전벨트 꽉 매자!'",
      takeoff: "🛫 [승객 285명 일동] '우와아아~! 뜬다 뜬다! 하준 항공 이륙 대성공!'",
      touchdown: "🛬 [승객 285명 기립 박수] '와아아~! 짝짝짝! 기장님 착륙 실력 예술이다!'",
      docking: "🏢 [14B 승객] '탑승교가 비행기 문으로 착 붙었다! 기술 정말 신기하네~'",
      engine_shutdown: "🔴 [20C 승객] '거대한 제트 엔진 소리가 멈췄다! 기장님이 엔진 끄셨대!'",
      deplaning: "🚪 [승객 285명 전원] '차례차례 질서 있게 탑승교로 하선 중~ 하준 기장님 최고!'"
    };

    const text = defaultReactions[type] || "✨ [승객 285명] '하준 기장님 비행 최고입니다!'";
    this.displayPassengerDialogue(text);
  }

  // 기장 안내방송 차임벨 (딩~동~) 사운드 합성
  playPAChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioCtx();
      const now = ctx.currentTime;

      // High Ding (880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Low Dong (587Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, now + 0.35);
      gain2.gain.setValueAtTime(0.26, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 1.2);
    } catch (e) {}
  }

  completeFlightMission() {
    this.flightPhase = 'MISSION_COMPLETE';
    this.phaseDisplay.textContent = '비행 임무 완수 (Mission Complete)';
    this.score += 2000; // 정시 안전 도착 보너스
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.paxDisplay) this.paxDisplay.textContent = '0명 (하선 완료)';
    this.playTouchdownScreech();

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: '수륙양용 비행기',
      ancestor: '1903 조상 비행기'
    };
    const planeName = names[this.currentPlaneType] || '항공기';

    setTimeout(() => {
      const modalTitle = document.getElementById('modal-title');
      const modalDesc = document.getElementById('modal-desc');
      if (modalTitle && modalDesc) {
        modalTitle.textContent = '🏆 FLIGHT MISSION COMPLETED';
        modalDesc.innerHTML = `
          <div style="text-align:left; background:rgba(15,23,42,0.65); padding:14px; border-radius:10px; border:1px solid rgba(56,189,248,0.3); margin-bottom:12px;">
            <div style="font-size:16px; font-weight:800; color:#38bdf8; margin-bottom:8px;">🛫 대륙 횡단 비행 임무 성공!</div>
            <div style="font-size:13px; color:#e2e8f0; line-height:1.7;">
              • <strong>운항 노선:</strong> 하준 해상 국제공항 (RKSI) ➔ 인천국제공항 (Incheon Int'l Airport Hub) [200km 대륙 횡단 정기편]<br>
              • <strong>운항 기종:</strong> ${planeName}<br>
              • <strong>비행 시간:</strong> ${m}분 ${s}초<br>
              • <strong>승객 수송:</strong> <span style="color:#10b981; font-weight:700;">285명 전원 안전 하선 완료 (만족도 100%)</span><br>
              • <strong>최종 운항 점수:</strong> <span style="color:#f59e0b; font-weight:800;">${this.score}점</span> (+2,000점 정시 도착 보너스 포함)
            </div>
          </div>
          <div style="font-size:13px; color:#94a3b8; line-height:1.6;">
            승객들이 탑승교를 통해 모두 터미널로 들어갔습니다.<br>
            새로운 승객 탑승 및 기체 정비를 마치고 <strong>다음 비행 임무</strong>를 시작하세요!
          </div>
        `;
        if (this.startBtn) this.startBtn.textContent = '🛫 다음 비행 임무 준비하기 (새 승객 285명 탑승)';
        if (this.takeoffDirectBtn) this.takeoffDirectBtn.textContent = '대륙 활주로에서 즉시 이륙하기 🛫';
        this.overlay.classList.remove('hidden');
      }
    }, 600);
  }
}

// 전역 헬퍼 함수 및 디바운스 보호 시스템 (모든 버튼 광클 및 이중 발화 100% 원천 차단)
const _actionDebounceTimers = {};
function debounceAction(actionKey, delayMs = 180) {
  const now = Date.now();
  if (_actionDebounceTimers[actionKey] && (now - _actionDebounceTimers[actionKey] < delayMs)) {
    return false; // 광클 또는 중복 발화 무시
  }
  _actionDebounceTimers[actionKey] = now;
  return true;
}

window.switchPlane = function(type) {
  // 1. 모달 버튼 활성화 상태 즉시 업데이트 (UI 즉각 100% 반응)
  document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`select-${type}`);
  if (activeBtn) activeBtn.classList.add('active');

  // 2. 게임 기체 모델 전환
  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      window.airplaneGame.switchAircraft(type);
    }
  } catch (err) {
    console.error('switchPlane error:', err);
  }
};

window.nextPlane = function() {
  if (!debounceAction('nextPlane', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    const aircraftTypes = ['dc10', 'md80', 'a320', 'b747', 'concorde', 'amphibian', 'ancestor'];
    const curIdx = aircraftTypes.indexOf(window.airplaneGame.currentPlaneType);
    const nextIdx = (curIdx + 1) % aircraftTypes.length;
    window.airplaneGame.switchAircraft(aircraftTypes[nextIdx]);
  }
};

window.startDirectTakeoff = function() {
  // 모달 즉시 닫기
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      window.airplaneGame.startDirectTakeoff();
    }
  } catch (err) {
    console.error('startDirectTakeoff error:', err);
  }
};

window.startGateDeparture = function() {
  // 모달 즉시 닫기
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  const gateAction = document.getElementById('gate-action-container');
  if (gateAction) gateAction.classList.add('hidden');

  try {
    if (!window.airplaneGame) initGame();
    if (window.airplaneGame) {
      window.airplaneGame.startGateDeparture();
    }
  } catch (err) {
    console.error('startGateDeparture error:', err);
  }
};

window.toggleEmergencyPanel = function() {
  if (!debounceAction('toggleEmergencyPanel', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleEmergencyPanel();
  } else {
    const p = document.getElementById('emergency-panel');
    if (p) p.classList.toggle('hidden');
  }
};

window.triggerEmergency = function(type) {
  if (!debounceAction('triggerEmergency', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.triggerEmergency(type);
  }
};

window.startDeplaning = function() {
  if (!debounceAction('startDeplaning', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.startDeplaning();
  }
};

window.toggleTimeOfDay = function() {
  if (!debounceAction('toggleTimeOfDay', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleTimeOfDay();
  }
};

window.toggleLandingGear = function() {
  if (!debounceAction('toggleLandingGear', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleLandingGear();
  }
};

window.toggleFlaps = function() {
  if (!debounceAction('toggleFlaps', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleFlaps();
  }
};

window.toggleSpoilers = function() {
  if (!debounceAction('toggleSpoilers', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleSpoilers();
  }
};

window.toggleReverseThrust = function() {
  if (!debounceAction('toggleReverseThrust', 200)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleReverseThrust();
  }
};

window.toggleCruiseSpeed = function() {
  if (!debounceAction('toggleCruiseSpeed', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleCruiseSpeed();
  }
};

window.toggleMicrophone = function() {
  if (!debounceAction('toggleMicrophone', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleMicrophone();
  }
};

window.toggleCamera = function() {
  if (!debounceAction('toggleCamera', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleCamera();
  }
};

window.toggleSound = function() {
  if (!debounceAction('toggleSound', 180)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.soundEnabled = !window.airplaneGame.soundEnabled;
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
      soundBtn.textContent = window.airplaneGame.soundEnabled ? '🔊' : '🔇';
    }
    if (window.airplaneGame.showPopup) {
      window.airplaneGame.showPopup(window.airplaneGame.soundEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF');
    }
  }
};

window.openHelp = function() {
  const overlay = document.getElementById('overlay-screen');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
  }
};

window.speakCaptainPreset = function(phrase) {
  if (!debounceAction('speakCaptainPreset', 300)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    if (!window.airplaneGame.isMicActive) {
      window.airplaneGame.startMicrophone();
    }
    window.airplaneGame.playPAChime();
    window.airplaneGame.handleCaptainSpeechAI(phrase);
  }
};

window.toggleEngineShutdown = function() {
  if (!debounceAction('toggleEngineShutdown', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.toggleEngineShutdown();
  }
};

window.shutdownEngines = function() {
  if (!debounceAction('shutdownEngines', 250)) return;
  if (!window.airplaneGame) initGame();
  if (window.airplaneGame) {
    window.airplaneGame.shutdownEngines();
  }
};

// -------------------------------------------------------------
// GLB 3D Pipeline Global UI Handlers
// -------------------------------------------------------------
window.closeGLBMenu = function() {
  const modal = document.getElementById('glb-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.toggleGLBMenu = function() {
  const modal = document.getElementById('glb-modal');
  if (modal) {
    const isHidden = modal.classList.contains('hidden') || modal.style.display === 'none';
    if (isHidden) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
    } else {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
};

window.triggerGLBFileSelect = function(targetType = 'plane') {
  window.glbSelectTargetType = targetType;
  const input = document.getElementById('glb-file-input');
  if (input) {
    input.click();
  }
};

window.handleGLBFileSelect = function(event) {
  const file = event.target.files && event.target.files[0];
  if (file && window.airplaneGame) {
    window.airplaneGame.loadGLBFile(file, file.name, window.glbSelectTargetType || 'plane');
    window.closeGLBMenu();
    const overlay = document.getElementById('overlay-screen');
    if (overlay) overlay.style.display = 'none';
  }
  event.target.value = '';
};

window.loadGLBPreset = function(type) {
  if (window.airplaneGame) {
    window.airplaneGame.loadGLBPreset(type);
  }
  window.closeGLBMenu();
};

window.exportCurrentPlaneToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportCurrentPlaneToGLB();
  }
};

window.exportAirportToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportAirportToGLB();
  }
};

window.exportIncheonAirportToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportIncheonAirportToGLB();
  }
};

window.exportTerrainToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportTerrainToGLB();
  }
};

window.exportCityBeachToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportCityBeachToGLB();
  }
};

window.exportFullWorldToGLB = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.exportFullWorldToGLB();
  }
};

window.reloadGLBPlane = function() {
  window.closeGLBMenu();
  if (window.airplaneGame) {
    window.airplaneGame.reloadGLBPlane();
  }
};

// -------------------------------------------------------------
// HOTAS 1 & Airbus Sidestick Global UI Handlers
// -------------------------------------------------------------
window.toggleHOTASModal = function() {
  const modal = document.getElementById('hotas-modal');
  if (modal) {
    const isHidden = modal.classList.contains('hidden') || modal.style.display === 'none';
    if (isHidden) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
      if (window.airplaneGame) window.airplaneGame.updateHOTASModalUI();
    } else {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
};

window.closeHOTASModal = function() {
  const modal = document.getElementById('hotas-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.toggleHOTASAxisMode = function() {
  if (window.airplaneGame) {
    window.airplaneGame.toggleHOTASAxisMode();
  }
};

window.toggleHOTASThrottleInvert = function() {
  if (window.airplaneGame) {
    window.airplaneGame.toggleHOTASThrottleInvert();
  }
};

window.calibrateHOTAS = function() {
  if (window.airplaneGame) {
    window.airplaneGame.calibrateHOTAS();
  }
};

window.toggleTwistRudder = function() {
  if (window.airplaneGame) {
    window.airplaneGame.toggleTwistRudder();
  }
};

// 브라우저 및 웹뷰(Flutter) 즉각 로딩 및 버튼 먹통 방지 초기화
function initGame() {
  if (!window.airplaneGame) {
    try {
      window.airplaneGame = new AirplaneGame();
    } catch (err) {
      console.error('AirplaneGame init error:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
window.addEventListener('load', initGame);
