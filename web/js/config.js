/**
 * Sky Jet Explorer 3D - Aircraft Specifications and Flight Config Constants
 * Subsystem: config (2 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 공기역학 및 기체 제원 데이터베이스 (Real-World Airliner Aerodynamics DB)
  // ----------------------------------------------------------------
  getAircraftSpecs(type) {
    const specs = {
      a320: {
        name: 'Airbus A320-200',
        emptyWeightKg: 42600, // OEW (kg)
        mtowKg: 77000,        // MTOW (kg)
        mass: 68000,          // Typical Takeoff Mass (kg)
        fuelCapacityKg: 19000,// Standard usable fuel ~24,209 L (kg)
        wingArea: 122.6,      // m²
        wingSpan: 35.80,      // m (with wingtip fences / sharklets)
        meanChord: 4.19,      // m (MAC)
        wingLoadingKgM2: 554.6, // 68,000 / 122.6 kg/m² (MTOW: 628.1)
        aspectRatio: 10.45,   // b² / S
        oswaldEff: 0.83,
        cd0: 0.0195,
        cl0: 0.24,
        clAlpha: 5.45,
        clMaxClean: 1.55,
        clFlapBoostMax: 0.95,
        stallAlphaClean: 0.255, // ~14.6°
        numEngines: 2,
        maxThrust: 240000,    // N (2 × CFM56-5B4 @ 120 kN / 27,000 lbf)
        vRotateKmh: 260,      // ~140 kt
        vStallCleanKmh: 215,  // ~116 kt
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
        emptyWeightKg: 41413, // OEW (kg)
        mtowKg: 79010,        // MTOW (kg)
        mass: 66000,          // Typical Takeoff Mass (kg)
        fuelCapacityKg: 14200,// Standard mission fuel (kg)
        wingArea: 124.6,      // m²
        wingSpan: 35.80,      // m
        meanChord: 3.99,      // m (MAC)
        wingLoadingKgM2: 529.7, // 66,000 / 124.6 kg/m² (MTOW: 634.1)
        aspectRatio: 10.29,   // b² / S (flight3d B738 standard)
        oswaldEff: 0.82,
        cd0: 0.0185,
        cl0: 0.22,
        clAlpha: 5.65,
        clMaxClean: 1.55,
        clFlapBoostMax: 0.95,
        stallAlphaClean: 0.27,// ~15.5°
        numEngines: 2,
        maxThrust: 242000,    // N (2 × CFM56-7B26 @ 121 kN / 27,000 lbf)
        vRotateKmh: 270,      // ~146 kt
        vStallCleanKmh: 220,  // ~119 kt
        pitchAuthority: 0.55,
        rollAuthority: 0.70,
        pitchDamping: 1.8,
        rollDamping: 2.2,
        yawAuthority: 0.45,
        yawDamping: 2.0,
        transonicMachBuffet: 0.78
      },
      b738: {
        name: 'Boeing 737-800',
        emptyWeightKg: 41413,
        mtowKg: 79010,
        mass: 66000,
        fuelCapacityKg: 14200,
        wingArea: 124.6,
        wingSpan: 35.80,
        meanChord: 3.99,
        wingLoadingKgM2: 529.7,
        aspectRatio: 10.29,
        oswaldEff: 0.82,
        cd0: 0.0185,
        cl0: 0.22,
        clAlpha: 5.65,
        clMaxClean: 1.55,
        clFlapBoostMax: 0.95,
        stallAlphaClean: 0.27,
        numEngines: 2,
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
        name: 'Boeing 747-400',
        emptyWeightKg: 179014,// OEW 394,150 lb
        mtowKg: 396893,       // MTOW 875,000 lb
        mass: 320000,         // Typical Long-Haul Takeoff Mass (kg)
        fuelCapacityKg: 173480,// 216,840 L usable fuel
        wingArea: 525.0,      // m² (w/ winglet footprint)
        wingSpan: 64.44,      // m (211 ft 5 in)
        meanChord: 8.32,      // m (MAC 27.3 ft)
        wingLoadingKgM2: 609.5, // 320,000 / 525.0 kg/m² (MTOW: 756.0)
        aspectRatio: 7.91,
        oswaldEff: 0.80,
        cd0: 0.0215,
        cl0: 0.26,
        clAlpha: 5.05,
        clMaxClean: 1.50,
        clFlapBoostMax: 0.95,
        stallAlphaClean: 0.26,
        numEngines: 4,
        maxThrust: 1104000,   // N (4 × GE CF6-80C2B5F @ 276 kN / 62,100 lbf)
        vRotateKmh: 300,      // ~162 kt
        vStallCleanKmh: 250,  // ~135 kt
        pitchAuthority: 0.38,
        rollAuthority: 0.45,
        pitchDamping: 2.5,
        rollDamping: 2.8,
        yawAuthority: 0.40,
        yawDamping: 2.3,
        transonicMachBuffet: 0.82
      },
      dc10: {
        name: 'McDonnell Douglas DC-10-30',
        emptyWeightKg: 121563,// OEW 267,990 lb
        mtowKg: 259460,       // MTOW 572,000 lb
        mass: 215000,         // Typical Takeoff Mass (kg)
        fuelCapacityKg: 111100,// ~138,904 L
        wingArea: 367.7,      // m²
        wingSpan: 50.40,      // m (165 ft 4 in)
        meanChord: 7.50,      // m
        wingLoadingKgM2: 584.7, // 215,000 / 367.7 kg/m² (MTOW: 705.6)
        aspectRatio: 6.91,
        oswaldEff: 0.78,
        cd0: 0.0225,
        cl0: 0.25,
        clAlpha: 4.95,
        clMaxClean: 1.52,
        clFlapBoostMax: 0.90,
        stallAlphaClean: 0.255,
        numEngines: 3,
        maxThrust: 700500,    // N (3 × GE CF6-50C2 @ 233.5 kN / 52,500 lbf)
        vRotateKmh: 285,      // ~154 kt
        vStallCleanKmh: 235,  // ~127 kt
        pitchAuthority: 0.44,
        rollAuthority: 0.52,
        pitchDamping: 2.1,
        rollDamping: 2.4,
        yawAuthority: 0.42,
        yawDamping: 2.1,
        transonicMachBuffet: 0.80
      },
      md80: {
        name: 'McDonnell Douglas MD-82',
        emptyWeightKg: 37300, // OEW ~82,200 lb
        mtowKg: 67812,        // MTOW 149,500 lb
        mass: 58000,          // Typical Takeoff Mass (kg)
        fuelCapacityKg: 18944,// 22,104 L (41,765 lb)
        wingArea: 112.3,      // m²
        wingSpan: 32.82,      // m (107 ft 8 in)
        meanChord: 3.62,      // m
        wingLoadingKgM2: 516.5, // 58,000 / 112.3 kg/m² (MTOW: 603.8)
        aspectRatio: 9.59,
        oswaldEff: 0.81,
        cd0: 0.0205,
        cl0: 0.23,
        clAlpha: 5.15,
        clMaxClean: 1.54,
        clFlapBoostMax: 0.92,
        stallAlphaClean: 0.245,
        numEngines: 2,
        maxThrust: 186000,    // N (2 × P&W JT8D-217C @ 93 kN / 20,890 lbf)
        vRotateKmh: 255,      // ~138 kt
        vStallCleanKmh: 210,  // ~113 kt
        pitchAuthority: 0.58,
        rollAuthority: 0.65,
        pitchDamping: 1.9,
        rollDamping: 2.1,
        yawAuthority: 0.46,
        yawDamping: 2.0,
        transonicMachBuffet: 0.78
      },
      concorde: {
        name: 'Aérospatiale/BAC Concorde',
        emptyWeightKg: 78700, // OEW 173,500 lb
        mtowKg: 185070,       // MTOW 408,000 lb
        mass: 150000,         // Typical Takeoff Mass (kg)
        fuelCapacityKg: 95680,// 119,500 L
        wingArea: 358.25,     // m² (ogival delta)
        wingSpan: 25.60,      // m (84 ft)
        meanChord: 15.50,     // m
        wingLoadingKgM2: 418.7, // 150,000 / 358.25 kg/m² (MTOW: 516.6)
        aspectRatio: 1.83,
        oswaldEff: 0.65,
        cd0: 0.0175,
        cl0: 0.12,
        clAlpha: 3.2,
        clMaxClean: 1.30,
        clFlapBoostMax: 0.0,  // No flaps (vortex lift delta)
        stallAlphaClean: 0.36,// Vortex lift high-alpha capability
        numEngines: 4,
        maxThrust: 677200,    // N (4 × Olympus 593 Mk 610 @ 169.3 kN reheat)
        vRotateKmh: 365,      // ~197 kt
        vStallCleanKmh: 280,  // ~151 kt
        pitchAuthority: 0.62,
        rollAuthority: 0.75,
        pitchDamping: 1.7,
        rollDamping: 1.8,
        yawAuthority: 0.48,
        yawDamping: 1.9,
        transonicMachBuffet: 1.15
      },
      amphibian: {
        name: 'Canadair CL-215 Amphibian',
        emptyWeightKg: 12220, // OEW 26,941 lb
        mtowKg: 19731,        // Land MTOW 43,500 lb (Water: 17,100 kg / 37,700 lb)
        mass: 17100,          // Typical Operating Mass (kg)
        fuelCapacityKg: 4250, // ~5,900 L Avgas 100LL
        wingArea: 100.33,     // m² (1,080 sq ft)
        wingSpan: 28.60,      // m (93 ft 10 in)
        meanChord: 3.54,      // m
        wingLoadingKgM2: 170.4, // 17,100 / 100.33 kg/m² (Land MTOW: 196.7)
        aspectRatio: 8.15,
        oswaldEff: 0.75,
        cd0: 0.034,
        cl0: 0.32,
        clAlpha: 5.0,
        clMaxClean: 1.65,
        clFlapBoostMax: 0.85,
        stallAlphaClean: 0.26,
        numEngines: 2,
        maxThrust: 62000,     // N (2 × Pratt & Whitney R-2800-83AM 2,100 hp / 1,566 kW radial pistons)
        vRotateKmh: 148,      // ~80 kt
        vStallCleanKmh: 122,  // ~66 kt
        pitchAuthority: 0.65,
        rollAuthority: 0.68,
        pitchDamping: 1.6,
        rollDamping: 1.8,
        yawAuthority: 0.50,
        yawDamping: 1.7,
        transonicMachBuffet: 0.50
      },
      ancestor: {
        name: '1903 Wright Flyer',
        emptyWeightKg: 274,   // 605 lb empty without pilot
        mtowKg: 340,          // ~750 lb gross with pilot
        mass: 338,            // 745 lb loaded weight
        fuelCapacityKg: 2.0,  // ~1.5 L fuel tank
        wingArea: 47.4,       // m² (510 sq ft)
        wingSpan: 12.29,      // m (40 ft 4 in)
        meanChord: 1.98,      // m (6 ft 6 in biplane chord)
        wingLoadingKgM2: 7.13,// 338 / 47.4 kg/m²
        aspectRatio: 6.4,
        oswaldEff: 0.70,
        cd0: 0.055,
        cl0: 0.40,
        clAlpha: 4.8,
        clMaxClean: 1.45,
        clFlapBoostMax: 0.0,
        stallAlphaClean: 0.22,
        numEngines: 1,
        maxThrust: 450,       // N (~100 lbf from 12 hp inline-4 twin chain-driven props)
        vRotateKmh: 48,       // ~30 mph
        vStallCleanKmh: 40,
        pitchAuthority: 0.70,
        rollAuthority: 0.50,
        pitchDamping: 1.5,
        rollDamping: 1.4,
        yawAuthority: 0.45,
        yawDamping: 1.4,
        transonicMachBuffet: 0.30
      }
    };
    return specs[type] || specs.a320;
  },

  /**
   * Convert hajun3d aircraft type into a full stlim0727/flight3d AircraftConfig
   * schema for FlightPhysicsCore / Aerodynamics / EngineModel / LandingGear.
   */
  getFlight3dConfig(type) {
    const f3d = globalThis.FlightSimCore || globalThis.Flight3dPhysics;
    const key = (type || 'b738').toLowerCase();
    const typeMap = {
      b737: 'B738',
      b738: 'B738',
      a320: 'A320',
      b747: 'B747',
      dc10: 'DC10',
      dc10_decimated: 'DC10',
      md80: 'MD80',
      concorde: 'CONCORDE',
      amphibian: 'CL215',
      cl215: 'CL215',
    };
    const mappedId = typeMap[key] || (type || 'b738').toUpperCase();

    // 1순위: FlightSimCore.AIRCRAFT_REGISTRY에 사전 등록된 6-DOF 기체 모델 반환
    if (f3d?.AIRCRAFT_REGISTRY?.[mappedId]) {
      const config = f3d.AIRCRAFT_REGISTRY[mappedId];
      if (mappedId === 'B738') {
        // Hajun3d takeoff rotation calibration: ensure adequate elevator authority and main gear lever arm
        config.aerodynamics.cmDe = -1.45;
        if (config.landingGear?.contacts) {
          for (const c of config.landingGear.contacts) {
            if (c.id === 'mainLeft' || c.id === 'mainRight') {
              c.localPos.z = 0.9;
            }
          }
        }
      }
      return config;
    }

    if ((type === 'b737' || type === 'b738') && f3d && f3d.BOEING_737_800) {
      const b738 = f3d.BOEING_737_800;
      // Hajun3d takeoff rotation calibration: ensure adequate elevator authority and main gear lever arm
      b738.aerodynamics.cmDe = -1.45;
      if (b738.landingGear?.contacts) {
        for (const c of b738.landingGear.contacts) {
          if (c.id === 'mainLeft' || c.id === 'mainRight') {
            c.localPos.z = 0.9;
          }
        }
      }
      return b738;
    }

    const s = this.getAircraftSpecs(type);
    const refB738 = f3d && f3d.BOEING_737_800;
    const mass = s.mass || 66000;
    const emptyWeight = s.emptyWeightKg || Math.round(mass * 0.625);
    const maxTakeoffWeight = s.mtowKg || Math.round(mass * 1.2);
    const fuelCapacity = s.fuelCapacityKg || Math.max(2, Math.round(mass * 0.215));
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

    const numEngines = s.numEngines || 2;
    const maxThrustTotal = s.maxThrust || 242000;
    const maxThrustPerEngine = maxThrustTotal / numEngines;

    const initialFuelKg = Math.min(fuelCapacity, Math.max(0.5, Math.round((mass - emptyWeight) * 0.55)));
    const initialPayloadKg = Math.max(0, mass - emptyWeight - initialFuelKg);
    const referenceMassKg = Math.min(maxTakeoffWeight, Math.max(mass, emptyWeight + fuelCapacity + Math.round(initialPayloadKg * 0.3)));

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
      isAmphibious: type === 'amphibian',
      massProperties: {
        emptyWeightKg: emptyWeight,
        maxTakeoffWeightKg: maxTakeoffWeight,
        currentMassKg: mass,
        Ixx,
        Iyy,
        Izz,
      },
      massDistribution: {
        referenceMassKg,
        initialFuelKg,
        initialPayloadKg,
        tanks: [
          { id: 'main', capacityKg: fuelCapacity, priority: 0, position: { x: 0, y: 0, z: 0 } }
        ],
        stations: [
          { id: 'payload', capacityKg: maxTakeoffWeight, position: { x: 0, y: 0, z: 0 } }
        ],
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
        // Do not attenuate cmDe below 1.0x for heavy airliners: Iyy already scales with mass * len^2,
        // so scaling cmDe down double-penalizes elevator authority during takeoff rotation.
        cmDe: -1.45 * Math.max(1.0, s.pitchAuthority ? s.pitchAuthority / 0.55 : 1.0),
        cmQ: -26.0 * (s.pitchDamping ? s.pitchDamping / 1.8 : 1.0),
        clBeta: -0.14,
        clDa: 0.18 * (s.rollAuthority ? s.rollAuthority / 0.70 : 1.0),
        clP: -0.65 * (s.rollDamping ? s.rollDamping / 2.2 : 1.0),
        cnBeta: -0.22,
        cnDr: -0.12 * (s.yawAuthority ? s.yawAuthority / 0.45 : 1.0),
        cnR: -0.32 * (s.yawDamping ? s.yawDamping / 2.0 : 1.0),
        adverseYaw: -0.025,
        flapAngles: (type === 'ancestor' || type === 'concorde') ? [0, 0, 0, 0] : [0, 10, 25, 40],
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
        bodySupportPoints: type === 'amphibian'
          ? [
              ['belly', [0, -1.8, -4.8], 1 / 3],
              ['belly', [0, -1.8, 0.0], 1 / 3],
              ['belly', [0, -1.6, 4.8], 1 / 3],
              ['nose', [0, -1.5, -8.8], 1],
              ['tail', [0, -0.8, 10.5], 1],
              ['wingL', [-13.5, -1.0, 0.5], 1],
              ['wingR', [13.5, -1.0, 0.5], 1],
            ].map(([id, position, weight], index) => ({ id, key: `${id}:${index}`, position, weight }))
          : undefined,
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
            localPos: { x: -3.2 * gearScale, y: mainGearY, z: 0.9 * gearScale },
            wheelRadius: 0.48 * Math.max(0.5, gearScale),
            restLength: 0.9 * Math.max(0.5, gearScale),
            kSpring: kMain,
            cDamper: cMain,
            isSteerable: false,
          },
          {
            id: 'mainRight',
            name: 'Right Main Gear',
            localPos: { x: 3.2 * gearScale, y: mainGearY, z: 0.9 * gearScale },
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
