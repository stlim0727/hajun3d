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
    this.screenPaused = false;
    this.cameraMode = '3rd';
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
    this.soundEnabled = true;

    // 기체 내구도 및 파손 상태 (Damage System)
    this.hullIntegrity = 100;
    this.isDestroyed = false;
    this.isNoseDented = false;
    this.isGearCollapsed = false;
    this.isBellySliding = false;
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
    this.isWaterLanding = false; // 바다 비상착수 수면 활주/부유 상태
    this.waterBobPhase = 0.0;
    this.hasTakeoffTailstrike = false; // 이륙 중 테일스트라이크 발생 여부
    this.tailFinDetached = false;      // 고고도 압력 격벽 파열로 수직꼬리날개 이탈 여부
    this.tailBulkheadTriggerAltM = 1600;
    this._detachedTailNodes = [];

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

    // 모바일 조이스틱 & 터치 제어 상태
    this.joystickData = { x: 0, y: 0, active: false, rawX: 0, rawY: 0 };
    this.smoothedTouchStick = { x: 0, y: 0 };
    this.isTouchStickReleasing = false;
    this.isTouchRudderReleasing = false;
    this.touchRudder = 0.0;

    // 기기 기울기(틸트 / 자이로 센서) 제어 상태 (Flight3d 표준: 737 감도 25°/30°)
    this.gyroEnabled = true;       // 기본 활성화 (기본 지원)
    this.gyroActive = false;
    this.gyroCalibration = null;   // { pitch, roll } 영점 기준각
    this.gyroNormPitch = 0.0;      // [-1.0, 1.0] (737 엘리베이터 기준 ±25° 트래블)
    this.gyroNormRoll = 0.0;       // [-1.0, 1.0] (737 에일러론 기준 ±30° 트래블)
    this.gyroScreen = { angle: 0, type: 'landscape' };
    this.stickNormPitch = 0.0;
    this.stickNormRoll = 0.0;
    this.isStickActive = false;
    this.stickCurrentX = 0;
    this.stickCurrentY = 0;
    this.stickRadius = 50;

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
    this.speedEffectIntensity = this.loadSpeedEffectIntensity ? this.loadSpeedEffectIntensity() : 0.35;
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
    this.jejuAirportGroup = null;
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
      if (typeof this.applyGeodeticPlacement === 'function') this.applyGeodeticPlacement();
      if (this.geoLayer) {
        ['terrainGroup', 'islandsGroup', 'mountainsGroup', 'treesGroup'].forEach(name => {
          if (this[name]) this[name].visible = false;
        });
      }
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

    // Opt-in streamed terrain layer (?geoTiles=1&ionToken=...).
    // Disabled by default: the offline file:// WebView path is unchanged.
    const geoParams = new URLSearchParams(window.location.search);
    const hosted = location.protocol === 'https:' && /stlim0727\.github\.io/.test(location.hostname);
    const geoEnabled = (hosted || geoParams.get('geoTiles') === '1')
      && Boolean(window.GEO_ION_TOKEN || geoParams.get('ionToken'))
      && Boolean(window.HajunGeoTiles);
    const baseAnchor = window.GEO_ANCHOR || { lat: 35.165199279785156, lon: 128.93899536132812, headingDeg: 353.9, height: 33.25 };
    this.geoAnchor = {
      lat: Number(geoParams.get('geoLat') ?? baseAnchor.lat),
      lon: Number(geoParams.get('geoLon') ?? baseAnchor.lon),
      headingDeg: Number(geoParams.get('geoHeading') ?? baseAnchor.headingDeg),
      height: Number(geoParams.get('geoHeight') ?? baseAnchor.height ?? 0)
    };
    this.defaultGeoAnchor = { ...this.geoAnchor };
    this.geoAzimuth = Number(geoParams.get('geoAzimuth') ?? ((this.geoAnchor.headingDeg + 180) % 360));
    this.floatingOrigin = window.FloatingOrigin ? window.FloatingOrigin.create() : null;
    this.renderOrigin = new THREE.Vector3();
    this.renderOriginApplied = new THREE.Vector3();
    this.geoSimAnchorBase = { x: 160, y: 0, z: 0 };
    this.geoRenderSimAnchor = null;
    this.geoFocusBases = null;
    this.geoRenderFocusAnchors = null;
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

    if (geoEnabled) this.enableGeoTiles(geoParams.get('ionToken') || window.GEO_ION_TOKEN || '');

    // PMREM sky environment map for realistic water/sky reflections
    const skyScene = new THREE.Scene();
    const skyGeo = new THREE.SphereGeometry(500, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x7ec8e3, side: THREE.BackSide });
    skyScene.add(new THREE.Mesh(skyGeo, skyMat));
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(skyScene, 0, 0.1, 1000, { size: 256 }).texture;
    pmrem.dispose();
    this.scene.environment = envTex;

    // 비행기 최상위 3D 그룹 초기화 & 씬 추가
    this.planeGroup = new THREE.Group();
    this.scene.add(this.planeGroup);

    if (window.LandmarkPins && typeof window.LandmarkPins.init === 'function') {
      window.LandmarkPins.init(this);
    }
  }

  applyAirfieldMinimalism() {
    const hideMatching = (group, patterns) => {
      if (!group) return;
      group.traverse(object => {
        if (patterns.some(pattern => pattern.test(object.name || ''))) object.visible = false;
      });
    };
    hideMatching(this.airportGroup, [/^DepartureAirfieldGLB$/, /^RunwayShoulder$/]);
    const pavement = this.airportGroup?.getObjectByName('RunwayPavement');
    if (pavement) pavement.scale.x = 60 / pavement.geometry.parameters.width;

    if (this.obstacles) {
      this.obstacles = this.obstacles.filter(o =>
        !['제1여객터미널', '항공정비 격납고', '관제탑'].includes(o.name)
      );
    }
  }

  applyGeodeticPlacement() {
    if (!window.geoLocalDelta || !window.GEO_POINTS) return;
    const haeundae = window.geoLocalDelta(window.GEO_POINTS.haeundae);
    if (this.cityGroup) this.cityGroup.position.set(haeundae.x, haeundae.y, haeundae.z);
  }

  // Physics ground height from Terrarium elevation tiles (visual layer is 3D Tiles only).
  // Falls back to the legacy flat model while tiles load or if they fail.
  enableTerrainProvider(options = {}) {
    const TP = window.TerrainProvider;
    if (!TP || (this.terrainProvider && !options.force)) return false;
    const simOffset = options.simOffset || { x: 160, z: 1600 };
    const contractPoints = [[simOffset.x, simOffset.z], [simOffset.x, simOffset.z - 8000]];
    if (options.provider !== undefined) {
      TP.assertTerrainProviderContract(options.provider, contractPoints);
      this.terrainProvider = options.provider;
      return true;
    }
    const geo = window.Geodesy;
    if (!geo || typeof geo.gameToWgs84 !== 'function') {
      throw new Error('enableTerrainProvider requires geodesy.js');
    }
    const anchor = this.geoAnchor;
    const flatZones = options.flatZones ?? [
      { minX: -900, maxX: 900, minZ: -2600, maxZ: 2600, height: 0, blendMargin: 500 },
      { minX: -2400, maxX: 2200, minZ: -49500, maxZ: -40500, height: 0, blendMargin: 1400 }
    ];
    const provider = TP.createTerrariumProvider({
      anchor,
      simOffset,
      loadTile: TP.createBrowserTileLoader(),
      flatZones,
      toWgs84: (x, z) => geo.gameToWgs84(x - simOffset.x, z - simOffset.z, anchor),
    });
    TP.assertTerrainProviderContract(provider, contractPoints);
    this.terrainProvider = provider;
    return true;
  }

  enableGeoTiles(ionToken) {
    if (this.geoLayer || !ionToken || !window.HajunGeoTiles || !this.scene) return false;
    this.geoIonToken = ionToken;
    const jejuFocus = typeof this.getJejuLocalPosition === 'function' ? this.getJejuLocalPosition() : null;
    const worldSimAnchor = { x: 160, y: 0, z: 1600 };
    const renderSimAnchor = { ...worldSimAnchor };
    // Keep Korea-wide tiles clamped to nearAnchorMaxDepth (17) at all flight altitudes
    // so 3d-tiles-renderer does not unload valid depth-17 parent tiles beneath the aircraft
    // when climbing above 600 m (Google 3D Tiles lacks depth 18+ over Korea).
    const focusBase = [
      { x: worldSimAnchor.x, y: 0, z: worldSimAnchor.z, radius: 500000, maxAltitude: 25000 }
    ];
    if (jejuFocus) {
      focusBase.push({ x: jejuFocus.x, y: 0, z: jejuFocus.z, radius: 12000, maxAltitude: 2000 });
    }
    this.geoSimAnchorBase = { ...worldSimAnchor };
    this.geoRenderSimAnchor = renderSimAnchor;
    if (typeof window !== 'undefined') {
      window.GEO_SIM_ANCHOR = { x: worldSimAnchor.x, z: worldSimAnchor.z };
    }
    this.geoFocusBases = focusBase.map(anchor => ({ ...anchor }));
    const renderFocusAnchors = focusBase.map(anchor => ({ ...anchor }));
    this.geoRenderFocusAnchors = renderFocusAnchors;
    const prevSceneChildren = Array.isArray(this.scene.children) ? this.scene.children.length : 0;
    this.geoLayer = window.HajunGeoTiles.create({
      ionToken,
      lat: this.geoAnchor.lat,
      lon: this.geoAnchor.lon,
      height: this.geoAnchor.height,
      azimuth: this.geoAzimuth,
      simAnchor: worldSimAnchor,
      worldAnchor: worldSimAnchor,
      simAnchorBase: this.geoSimAnchorBase,
      simAnchorRender: renderSimAnchor,
      // Deeper tiles around Gimhae leave holes and intersect the runway.
      nearAnchorMaxDepth: 17,
      focusAnchors: focusBase,
      focusAnchorsRender: renderFocusAnchors,
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      container: this.container
    });
    if (this.geoLayer) {
      this._captureGeoTilesGroup(prevSceneChildren);
      this.enableTerrainProvider();
      ['terrainGroup', 'islandsGroup', 'mountainsGroup', 'treesGroup'].forEach(name => {
        if (this[name]) this[name].visible = false;
      });
      this.applyAirfieldMinimalism();
    }
    return Boolean(this.geoLayer);
  }

  _captureGeoTilesGroup(prevChildCount) {
    this._geoTilesGroup = null;
    if (!this.scene || !Array.isArray(this.scene.children)) return null;
    for (let i = prevChildCount; i < this.scene.children.length; i++) {
      const child = this.scene.children[i];
      if (!child) continue;
      if (child.name === 'GeoFallbackGround' || child.name === 'GeoFallbackWater') {
        this._curveGeoFallbackPlane(child);
        continue;
      }
      if (!this._geoTilesGroup) this._geoTilesGroup = child;
    }
    return this._geoTilesGroup;
  }

  // Curve the GeoFallbackGround / GeoFallbackWater backing planes downward with Earth's
  // WGS84 radius so they never float above and bury curved 3D Tiles at 20-300+ km from anchor.
  _curveGeoFallbackPlane(mesh) {
    if (!mesh || !mesh.geometry || typeof THREE === 'undefined' || typeof THREE.PlaneGeometry !== 'function') return;
    const width = (mesh.geometry.parameters && mesh.geometry.parameters.width) || 1200000;
    const height = (mesh.geometry.parameters && mesh.geometry.parameters.height) || 1200000;
    const curvedGeo = new THREE.PlaneGeometry(width, height, 64, 64);
    const pos = curvedGeo.attributes && curvedGeo.attributes.position;
    if (pos) {
      const twoR = 2 * 6371000;
      const baseDrop = mesh.name === 'GeoFallbackWater' ? 45 : 35;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const drop = (vx * vx + vy * vy) / twoR + baseDrop;
        // Plane is rotated -PI/2 around X, so local +Z maps to world +Y.
        pos.setZ(i, -drop);
      }
      pos.needsUpdate = true;
      if (typeof curvedGeo.computeVertexNormals === 'function') curvedGeo.computeVertexNormals();
    }
    if (typeof mesh.geometry.dispose === 'function') mesh.geometry.dispose();
    mesh.geometry = curvedGeo;
  }

  // GPU vertex-shader flatten for streamed 3D Tiles over Gimhae & Incheon Airport + approach corridor
  // so real-world mountain tiles never poke through the airport aprons, runways, or final approach.
  applyGeoTilesFlattenZones() {
    if (!this._geoTilesGroup || typeof THREE === 'undefined') return;
    if (!this._geoFlattenUniforms) {
      this._geoFlattenUniforms = {
        uSceneOffset: { value: new THREE.Vector3() }
      };
    }
    if (this.scene && this.scene.position) {
      this._geoFlattenUniforms.uSceneOffset.value.copy(this.scene.position);
    }

    this._geoFlattenFrame = (this._geoFlattenFrame || 0) + 1;
    if (this._geoFlattenFrame % 10 !== 1) return;

    const uniformsRef = this._geoFlattenUniforms;
    const patchMaterial = (mat) => {
      if (!mat || !mat.userData || mat.userData._geoFlattenPatched) return;
      const prevCompile = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer) => {
        if (typeof prevCompile === 'function') prevCompile(shader, renderer);
        shader.uniforms.uGeoFlattenSceneOffset = uniformsRef.uSceneOffset;
        shader.vertexShader =
          'uniform vec3 uGeoFlattenSceneOffset;\n' +
          shader.vertexShader.replace(
            '#include <project_vertex>',
            `vec4 wpGeoFlat = modelMatrix * vec4( transformed, 1.0 );
            vec3 simPosGeoFlat = wpGeoFlat.xyz - uGeoFlattenSceneOffset;
            // Incheon Airport + 2.5km approach corridor (x: -2400..2200, z: -49500..-40500)
            float icnDx = max(max(-2400.0 - simPosGeoFlat.x, simPosGeoFlat.x - 2200.0), 0.0);
            float icnDz = max(max(-49500.0 - simPosGeoFlat.z, simPosGeoFlat.z - (-40500.0)), 0.0);
            float icnFactor = 1.0 - smoothstep(0.0, 1400.0, length(vec2(icnDx, icnDz)));
            if (icnFactor > 0.0) {
              float targetWorldY = -1.5 + uGeoFlattenSceneOffset.y;
              wpGeoFlat.y = mix(wpGeoFlat.y, min(wpGeoFlat.y, targetWorldY), icnFactor);
            }
            // Gimhae Airport runway corridor (x: -900..900, z: -2600..2600)
            float pusDx = max(max(-900.0 - simPosGeoFlat.x, simPosGeoFlat.x - 900.0), 0.0);
            float pusDz = max(max(-2600.0 - simPosGeoFlat.z, simPosGeoFlat.z - 2600.0), 0.0);
            float pusFactor = 1.0 - smoothstep(0.0, 500.0, length(vec2(pusDx, pusDz)));
            if (pusFactor > 0.0) {
              float targetWorldY = -1.2 + uGeoFlattenSceneOffset.y;
              wpGeoFlat.y = mix(wpGeoFlat.y, min(wpGeoFlat.y, targetWorldY), pusFactor);
            }
            vec4 mvPosition = viewMatrix * wpGeoFlat;
            gl_Position = projectionMatrix * mvPosition;`
          );
      };
      mat.userData._geoFlattenPatched = true;
      mat.needsUpdate = true;
    };

    if (typeof this._geoTilesGroup.traverse === 'function') {
      this._geoTilesGroup.traverse((obj) => {
        if (!obj || !obj.isMesh || !obj.material) return;
        if (Array.isArray(obj.material)) obj.material.forEach(patchMaterial);
        else patchMaterial(obj.material);
      });
    }
  }

  // Re-anchor streamed tiles and terrain physics to an arbitrary place spawn.
  // Legacy GLB scenery keeps its original coordinates; at 70 km far clipping
  // it stays outside the new local view.
  retargetGeo(anchor, options = {}) {
    const token = options.ionToken || this.geoIonToken || window.GEO_ION_TOKEN || '';
    if (!token || !window.HajunGeoTiles || !this.scene) return false;
    const next = {
      lat: Number(anchor && anchor.lat),
      lon: Number(anchor && anchor.lon),
      headingDeg: Number.isFinite(anchor && anchor.headingDeg)
        ? anchor.headingDeg : this.geoAnchor.headingDeg,
      height: Number.isFinite(anchor && anchor.height)
        ? anchor.height : (Number(anchor && anchor.elevationM) || 0)
    };
    if (![next.lat, next.lon, next.headingDeg, next.height].every(Number.isFinite)) return false;

    const pos = this.planeGroup && this.planeGroup.position;
    const worldSimAnchor = options.simAnchor || { x: pos ? pos.x : 0, y: 0, z: pos ? pos.z : 0 };
    const renderSimAnchor = { ...worldSimAnchor };
    this.geoSimAnchorBase = { ...worldSimAnchor };
    this.geoRenderSimAnchor = renderSimAnchor;
    if (typeof window !== 'undefined') {
      window.GEO_SIM_ANCHOR = { x: worldSimAnchor.x, z: worldSimAnchor.z };
    }

    if (this.geoLayer && typeof this.geoLayer.dispose === 'function') this.geoLayer.dispose();
    this.geoLayer = null;
    if (this.terrainProvider && typeof this.terrainProvider.dispose === 'function') {
      this.terrainProvider.dispose();
    }
    this.terrainProvider = null;

    Object.assign(this.geoAnchor, next);
    if (window.GEO_ANCHOR) Object.assign(window.GEO_ANCHOR, next);
    else window.GEO_ANCHOR = { ...next };
    this.geoAzimuth = (next.headingDeg + 180) % 360;
    this.geoIonToken = token;

    const jejuFocus = typeof this.getJejuLocalPosition === 'function' ? this.getJejuLocalPosition() : null;
    const isKoreaRegion = next.lat >= 32 && next.lat <= 39 && next.lon >= 124 && next.lon <= 132;
    const defaultFocus = [];
    if (isKoreaRegion) {
      defaultFocus.push({ x: worldSimAnchor.x, y: 0, z: worldSimAnchor.z, radius: 500000, maxAltitude: 25000 });
    }
    if (jejuFocus) {
      defaultFocus.push({ x: jejuFocus.x, y: 0, z: jejuFocus.z, radius: 12000, maxAltitude: 2000 });
    }
    const focusSource = Array.isArray(options.focusAnchors) && options.focusAnchors.length
      ? options.focusAnchors
      : defaultFocus;
    const focusBase = focusSource.map(anchor => ({ ...anchor }));
    this.geoFocusBases = focusBase.map(anchor => ({ ...anchor }));
    const renderFocusAnchors = focusBase.map(anchor => ({ ...anchor }));
    this.geoRenderFocusAnchors = renderFocusAnchors;
    const prevSceneChildren = Array.isArray(this.scene.children) ? this.scene.children.length : 0;
    this.geoLayer = window.HajunGeoTiles.create({
      ionToken: token,
      lat: next.lat,
      lon: next.lon,
      height: next.height,
      azimuth: this.geoAzimuth,
      simAnchor: worldSimAnchor,
      worldAnchor: worldSimAnchor,
      simAnchorBase: this.geoSimAnchorBase,
      simAnchorRender: renderSimAnchor,
      nearAnchorMaxDepth: 17,
      focusAnchors: focusBase,
      focusAnchorsRender: renderFocusAnchors,
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      container: this.container
    });
    if (!this.geoLayer) return false;
    this._captureGeoTilesGroup(prevSceneChildren);

    const flatZones = options.flatZones !== undefined
      ? options.flatZones
      : ((this.defaultGeoAnchor && Math.abs(next.lat - this.defaultGeoAnchor.lat) < 1e-4 && Math.abs(next.lon - this.defaultGeoAnchor.lon) < 1e-4)
          ? undefined
          : []);
    this.enableTerrainProvider({ simOffset: worldSimAnchor, flatZones });
    ['terrainGroup', 'islandsGroup', 'mountainsGroup', 'treesGroup'].forEach(name => {
      if (this[name]) this[name].visible = false;
    });
    this.applyAirfieldMinimalism();
    return true;
  }

  // Translate the scene/camera into a camera-relative render frame while all
  // simulation, provider and HUD math keeps using world metres.
  applyFloatingOrigin() {
    if (!this.renderOrigin || !this.planeGroup) return;
    if (this.camera && this.renderOriginApplied) this.camera.position.add(this.renderOriginApplied);
    this.renderOrigin.copy(this.planeGroup.position);
    if (this.scene) this.scene.position.set(-this.renderOrigin.x, -this.renderOrigin.y, -this.renderOrigin.z);
    if (this.camera && this.renderOriginApplied) {
      this.camera.position.sub(this.renderOrigin);
      this.renderOriginApplied.copy(this.renderOrigin);
    }
    if (this.geoSimAnchorBase && this.geoRenderSimAnchor) {
      this.geoRenderSimAnchor.x = this.geoSimAnchorBase.x - this.renderOrigin.x;
      this.geoRenderSimAnchor.y = this.geoSimAnchorBase.y - this.renderOrigin.y;
      this.geoRenderSimAnchor.z = this.geoSimAnchorBase.z - this.renderOrigin.z;
    }
    if (this.geoFocusBases && this.geoRenderFocusAnchors) {
      for (let i = 0; i < this.geoFocusBases.length; i++) {
        const base = this.geoFocusBases[i];
        const render = this.geoRenderFocusAnchors[i];
        render.x = base.x - this.renderOrigin.x;
        render.z = base.z - this.renderOrigin.z;
      }
    }
    // Sync scene & camera world matrices immediately after floating-origin shift.
    // updateCameraFromPhysics() calls camera.lookAt() in world space, which bakes
    // world-space coordinates into camera.matrixWorld / matrixWorldInverse; without
    // refreshing here, TilesRenderer.prepareForTraversal() sees a 2x-shifted frustum
    // and culls foreground 3D tiles prematurely.
    if (this.scene && typeof this.scene.updateMatrixWorld === 'function') {
      this.scene.updateMatrixWorld();
    }
    if (this.camera && typeof this.camera.updateMatrixWorld === 'function') {
      this.camera.updateMatrixWorld();
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

    // 오디오 시스템 실시간 보간 및 신디사이저 갱신
    if (this.audioCtx && typeof this.updateAudio === 'function') {
      this.updateAudio(dt);
    }

    if (this.isPlaying && !this.isDestroyed && !this.screenPaused) {
      if (this.currentEmergency) this.updateEmergency(dt);
      this.updateFlightPhysics(dt);
      this.updateControlSurfaces(dt);
      this.updateLandingGearAnimation(dt);
      const currentKmh = this.speed * 280;
      this.updateSpeedEffects(dt, currentKmh);
      if (typeof this.updateProximitySurfaceEffects === 'function') {
        this.updateProximitySurfaceEffects(dt, currentKmh);
      }
      this.checkObstacleCollisions();
      this.updateHUD();
      this.updateParticles(dt);
      this.createJetExhaustParticles();
      this.createBellySparks();
      if (typeof this.updatePartialDamageEffects === 'function') {
        this.updatePartialDamageEffects(dt);
      }
    } else {
      if (!this.isDestroyed) this.updateLandingGearAnimation(dt);
      this.updateDebrisPhysics(dt);
      this.updateParticles(dt);
    }

    if (typeof this.updateSunShadowTarget === 'function') {
      this.updateSunShadowTarget();
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

    if (this.floatingOrigin && this.planeGroup && typeof window.geoLocalToLatLon === 'function') {
      const anchorBase = this.geoSimAnchorBase || (typeof window !== 'undefined' && window.GEO_SIM_ANCHOR) || { x: 160, z: 0 };
      const camLatLon = window.geoLocalToLatLon(
        this.planeGroup.position.x - anchorBase.x,
        this.planeGroup.position.z - (anchorBase.z || 0)
      );
      this.floatingOrigin.rebase(camLatLon.lat, camLatLon.lon);
    }
    this.applyFloatingOrigin();
    if (this.geoLayer) {
      this.geoLayer.update();
      this.applyGeoTilesFlattenZones();
    }
    if (this.terrainProvider && this.planeGroup) this.terrainProvider.update(this.planeGroup.position);
    if (window.LandmarkPins && typeof window.LandmarkPins.update === 'function') {
      window.LandmarkPins.update();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

