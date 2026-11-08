/**
 * Sky Jet Explorer 3D - Core Game Engine
 * Manages main loop, class definition, Three.js instance, and core properties.
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
}

