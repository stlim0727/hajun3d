/**
 * Sky Jet Explorer 3D - Aircraft Specifications and Flight Config Constants
 * Subsystem: config (1 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
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
        meanChord: 4.19,      // m (MAC)
        aspectRatio: 9.5,     // 종횡비 AR
        oswaldEff: 0.82,      // 오스왈드 효율 계수 e
        cd0: 0.020,           // 영양력 유해 항력 계수 C_D0
        cl0: 0.24,            // 받음각 0도 기본 양력 계수 C_L0
        clAlpha: 5.2,         // 양력선 기울기 C_L_alpha (per rad)
        clMaxClean: 1.55,     // 클린 상태 최대 양력 계수
        clFlapBoostMax: 0.95, // 풀 플랩 양력 증강 계수
        stallAlphaClean: 0.25,// 클린 실속 받음각 (약 14.3도)
        maxThrust: 240000,    // N (CFM56-5B 트윈 터보팬 ~240 kN)
        vRotateKmh: 260,      // 이륙 로테이션 속도 (~140 kt)
        vStallCleanKmh: 215,  // 클린 실속 속도 (~116 kt)
        pitchAuthority: 0.55,
        rollAuthority: 0.70,
        pitchDamping: 1.8,
        rollDamping: 2.2,
        yawAuthority: 0.45,
        yawDamping: 2.0,
        transonicMachBuffet: 0.78
      },
      b737: {
        name: 'Boeing 737-800',
        mass: 66000,          // kg (자중 41.4t + 승객/연료 탑재 = 66,000kg)
        wingArea: 124.6,      // m²
        wingSpan: 35.8,       // m
        meanChord: 3.99,      // m (MAC)
        aspectRatio: 9.45,    // 종횡비 AR
        oswaldEff: 0.82,      // 오스왈드 효율 계수 e
        cd0: 0.0185,          // 영양력 유해 항력 계수 C_D0
        cl0: 0.22,            // 받음각 0도 기본 양력 계수 C_L0
        clAlpha: 5.65,        // 양력선 기울기 C_L_alpha (per rad)
        clMaxClean: 1.55,     // 클린 상태 최대 양력 계수
        clFlapBoostMax: 0.95, // 풀 플랩 양력 증강 계수
        stallAlphaClean: 0.27,// 클린 실속 받음각 (~15.5도)
        maxThrust: 242000,    // N (CFM56-7B26 트윈 터보팬 ~242 kN)
        vRotateKmh: 270,      // 이륙 로테이션 속도 (~146 kt)
        vStallCleanKmh: 220,  // 클린 실속 속도 (~119 kt)
        pitchAuthority: 0.55, // 737 엘리베이터 피치 조종 권한
        rollAuthority: 0.70,  // 737 에일러론 롤 조종 권한
        pitchDamping: 1.8,    // 737 피치 레이트 댐핑
        rollDamping: 2.2,     // 737 롤 레이트 댐핑
        yawAuthority: 0.45,
        yawDamping: 2.0,
        transonicMachBuffet: 0.78
      },
      b738: {
        name: 'Boeing 737-800',
        mass: 66000,
        wingArea: 124.6,
        wingSpan: 35.8,
        meanChord: 3.99,
        aspectRatio: 9.45,
        oswaldEff: 0.82,
        cd0: 0.0185,
        cl0: 0.22,
        clAlpha: 5.65,
        clMaxClean: 1.55,
        clFlapBoostMax: 0.95,
        stallAlphaClean: 0.27,
        maxThrust: 242000,
        vRotateKmh: 270,
        vStallCleanKmh: 220,
        pitchAuthority: 0.55,
        rollAuthority: 0.70,
        pitchDamping: 1.8,
        rollDamping: 2.2,
        yawAuthority: 0.45,
        yawDamping: 2.0,
        transonicMachBuffet: 0.78
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
  },

  /**
   * Convert hajun3d aircraft type into a full stlim0727/flight3d AircraftConfig
   * schema for FlightPhysicsCore / Aerodynamics / EngineModel / LandingGear.
   */
  getFlight3dConfig(type) {
    const f3d = globalThis.Flight3dPhysics;
    if ((type === 'b737' || type === 'b738') && f3d && f3d.BOEING_737_800) {
      return f3d.BOEING_737_800;
    }

    const s = this.getAircraftSpecs(type);
    const refB738 = f3d && f3d.BOEING_737_800;
    const mass = s.mass || 66000;
    const span = s.wingSpan || 35.8;
    const area = s.wingArea || 124.6;
    const chord = s.meanChord || (area / Math.max(1, span));
    const massRatio = mass / 66000;
    const spanRatio = span / 35.8;
    const lenRatio = Math.sqrt(massRatio);

    // Scale diagonal moments of inertia consistently with mass and geometry
    const Ixx = Math.max(120, 1650000 * massRatio * spanRatio * spanRatio);
    const Iyy = Math.max(200, 3450000 * massRatio * lenRatio * lenRatio);
    const Izz = Math.max(280, 4850000 * massRatio * ((spanRatio * spanRatio + lenRatio * lenRatio) * 0.5));

    const numEngines = (type === 'b747' || type === 'concorde') ? 4 : (type === 'dc10' ? 3 : (type === 'ancestor' ? 1 : 2));
    const maxThrustTotal = s.maxThrust || 242000;
    const maxThrustPerEngine = maxThrustTotal / numEngines;
    const fuelCapacity = Math.max(20, Math.round(mass * 0.215));
    const emptyWeight = Math.max(150, Math.round(mass * 0.625));
    const maxTakeoffWeight = Math.round(mass * 1.2);

    const kNose = Math.max(4000, 420000 * massRatio);
    const cNose = Math.max(600, 48000 * Math.sqrt(massRatio));
    const kMain = Math.max(8000, 850000 * massRatio);
    const cMain = Math.max(900, 72000 * Math.sqrt(massRatio));

    const baseGear = refB738?.landingGear;
    const gearScale = Math.max(0.32, Math.min(1.6, spanRatio));
    const gearY = (type === 'ancestor') ? -1.45 : -3.27;
    const mainGearY = (type === 'ancestor') ? -1.48 : -3.30;

    return {
      id: (type || 'a320').toUpperCase(),
      name: s.name,
      massProperties: {
        emptyWeightKg: emptyWeight,
        maxTakeoffWeightKg: maxTakeoffWeight,
        currentMassKg: mass,
        Ixx,
        Iyy,
        Izz,
      },
      aerodynamics: {
        wingspanM: span,
        wingAreaM2: area,
        meanChordM: chord,
        tailArmM: 12 * lenRatio,
        tailAreaM2: 32 * (area / 124.6),
        tailInducedFactor: 0.10,
        oswaldEfficiency: s.oswaldEff || 0.82,
        cl0Clean: s.cl0 ?? 0.22,
        claPerRad: s.clAlpha ?? 5.65,
        alphaStallDeg: ((s.stallAlphaClean ?? 0.27) * 180) / Math.PI,
        clFlapBoostMax: s.clFlapBoostMax ?? 0.95,
        spoilerLiftDump: 0.38,
        cd0Clean: s.cd0 ?? 0.0185,
        gearDrag: type === 'ancestor' ? 0.01 : 0.024,
        spoilerDrag: 0.075,
        transonicMachBuffet: s.transonicMachBuffet ?? 0.78,
        cm0: -0.02,
        cma: -0.90,
        cmDe: -1.25 * (s.pitchAuthority ? s.pitchAuthority / 0.55 : 1.0),
        cmQ: -26.0 * (s.pitchDamping ? s.pitchDamping / 1.8 : 1.0),
        clBeta: -0.14,
        clDa: 0.18 * (s.rollAuthority ? s.rollAuthority / 0.70 : 1.0),
        clP: -0.65 * (s.rollDamping ? s.rollDamping / 2.2 : 1.0),
        cnBeta: -0.22,
        cnDr: -0.12 * (s.yawAuthority ? s.yawAuthority / 0.45 : 1.0),
        cnR: -0.32 * (s.yawDamping ? s.yawDamping / 2.0 : 1.0),
        adverseYaw: -0.025,
        flapAngles: type === 'ancestor' ? [0, 0, 0, 0] : [0, 10, 25, 40],
      },
      stallWarning: { type: 'stickShaker', marginDeg: 2.0 },
      propulsion: {
        numEngines,
        engineName: s.name + ' Propulsion',
        maxStaticThrustPerEngineN: maxThrustPerEngine,
        idleN1Percent: type === 'ancestor' ? 15.0 : 22.0,
        togaN1Percent: 100.0,
        spoolUpTimeSec: type === 'ancestor' ? 1.2 : 3.2,
        spoolDownTimeSec: type === 'ancestor' ? 1.0 : 2.4,
        reverseThrustEfficiency: (type === 'ancestor' || type === 'concorde') ? 0.25 : 0.45,
        baseFuelFlowKgPerHour: 350.0 * massRatio,
        maxFuelFlowKgPerHour: 2500.0 * massRatio,
        fuelCapacityKg: fuelCapacity,
      },
      landingGear: {
        isFixed: type === 'ancestor' || type === 'amphibian',
        cgGroundHeightM: type === 'ancestor' ? 1.65 : 3.5,
        gearTransitTimeSec: baseGear?.gearTransitTimeSec ?? 8.0,
        contacts: [
          {
            id: 'nose',
            name: 'Nose Gear',
            localPos: { x: 0.0, y: gearY, z: -12.5 * gearScale },
            wheelRadius: 0.38 * Math.max(0.5, gearScale),
            restLength: 0.9 * Math.max(0.5, gearScale),
            kSpring: kNose,
            cDamper: cNose,
            isSteerable: true,
            maxSteeringDeg: 55.0,
          },
          {
            id: 'mainLeft',
            name: 'Left Main Gear',
            localPos: { x: -3.2 * gearScale, y: mainGearY, z: 1.8 * gearScale },
            wheelRadius: 0.48 * Math.max(0.5, gearScale),
            restLength: 0.9 * Math.max(0.5, gearScale),
            kSpring: kMain,
            cDamper: cMain,
            isSteerable: false,
          },
          {
            id: 'mainRight',
            name: 'Right Main Gear',
            localPos: { x: 3.2 * gearScale, y: mainGearY, z: 1.8 * gearScale },
            wheelRadius: 0.48 * Math.max(0.5, gearScale),
            restLength: 0.9 * Math.max(0.5, gearScale),
            kSpring: kMain,
            cDamper: cMain,
            isSteerable: false,
          },
        ],
        rollingFriction: 0.02,
        maxBrakingFriction: 0.45,
        tireLateralFriction: 0.75,
      },
    };
  }

  });
})();

