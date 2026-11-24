(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // three-global:three
  var require_three = __commonJS({
    "three-global:three"(exports, module) {
      module.exports = globalThis.THREE;
    }
  });

  // node_modules/@stlim0727/flightsim-core/src/index.js
  var src_exports = {};
  __export(src_exports, {
    AIRBUS_A320: () => AIRBUS_A320,
    AIRCRAFT_REGISTRY: () => AIRCRAFT_REGISTRY,
    AIRCRAFT_SPECS: () => AIRCRAFT_SPECS,
    AMPHIBIAN_WATER_LIMITS: () => AMPHIBIAN_WATER_LIMITS,
    Aerodynamics: () => Aerodynamics,
    AircraftSpecs: () => AircraftSpecs,
    Atmosphere: () => Atmosphere,
    AutopilotController: () => AutopilotController,
    BOEING_737_800: () => BOEING_737_800,
    BOEING_747_400: () => BOEING_747_400,
    CANADAIR_CL215: () => CANADAIR_CL215,
    CESSNA_172: () => CESSNA_172,
    CONCORDE: () => CONCORDE,
    DC10_30: () => DC10_30,
    DEFAULT_AIRCRAFT_ID: () => DEFAULT_AIRCRAFT_ID,
    EngineModel: () => EngineModel,
    F16_FALCON: () => F16_FALCON,
    FlightControlLaws: () => FlightControlLaws,
    FlightPhysicsCore: () => FlightPhysicsCore,
    FlightWarningsCore: () => FlightWarningsCore,
    LandingGear: () => LandingGear,
    MD82: () => MD82,
    MassProperties: () => MassProperties,
    PROFILES: () => PROFILES,
    WATER_DITCHING_LIMITS: () => WATER_DITCHING_LIMITS,
    WGS84_A: () => WGS84_A,
    WGS84_B: () => WGS84_B,
    WGS84_E2: () => WGS84_E2,
    WGS84_E2_PRIME: () => WGS84_E2_PRIME,
    WaterDitching: () => WaterDitching,
    analyticTerrainProvider: () => analyticTerrainProvider,
    angleDelta: () => angleDelta,
    applyDeadzone: () => applyDeadzone,
    approachDeviation: () => approachDeviation,
    assertTerrainProviderConformance: () => assertTerrainProviderConformance,
    assertTerrainProviderContract: () => assertTerrainProviderContract,
    asymmetricThrustYawMoment: () => asymmetricThrustYawMoment,
    autopilotState: () => autopilotState,
    classifyLanding: () => classifyLanding,
    createAeroResult: () => createAeroResult,
    createAnchorFrame: () => createAnchorFrame,
    createGroundHeightQuery: () => createGroundHeightQuery,
    createGroundSurfaceQueries: () => createGroundSurfaceQueries,
    createTerrariumProvider: () => createTerrariumProvider,
    createTileScheduler: () => createTileScheduler,
    decodeTerrarium: () => decodeTerrarium,
    degrees: () => degrees,
    ecefToWgs84: () => ecefToWgs84,
    enuToWgs84: () => enuToWgs84,
    getAircraftSpecs: () => getAircraftSpecs,
    isGyroSupportedDevice: () => isGyroSupportedDevice,
    lonLatToTilePixel: () => lonLatToTilePixel,
    nextGpwsCallout: () => nextGpwsCallout,
    readGyroScreen: () => readGyroScreen,
    resolveGroundHeight: () => resolveGroundHeight,
    screenTilt: () => screenTilt,
    shapeTouchStick: () => shapeTouchStick,
    solveTrim: () => solveTrim,
    surfaceNormal: () => surfaceNormal,
    terrainConflictSeconds: () => terrainConflictSeconds,
    terrainProviderConformanceFailures: () => terrainProviderConformanceFailures,
    thrustFactorToN1: () => thrustFactorToN1,
    tilePixelToLonLat: () => tilePixelToLonLat,
    toNormalVector3: () => toNormalVector3,
    wgs84ToEcef: () => wgs84ToEcef,
    wgs84ToEnu: () => wgs84ToEnu,
    wrapHeading: () => wrapHeading
  });

  // node_modules/@stlim0727/flightsim-core/src/physics/configurationOverspeed.js
  var excessPressure = (iasKnots, limit) => Math.max(0, (iasKnots / limit) ** 2 - 1);
  var accumulateDamage = (damage, load, dt) => Math.min(1, damage + 0.5 * load * load * dt);
  function flapLoad(angle, iasKnots, angles, limits) {
    if (angle < 0.1) return 0;
    const upper = angles.findIndex((detent) => detent >= angle);
    if (upper < 1 || !limits[upper]) return 0;
    const lower = upper - 1;
    const progress = (angle - angles[lower]) / (angles[upper] - angles[lower]);
    const lowerLimit = limits[lower] || limits[upper];
    const limit = lowerLimit + (limits[upper] - lowerLimit) * progress;
    return excessPressure(iasKnots, limit);
  }
  function advanceConfigurationOverspeed(aero, gear, limits, iasKnots, dt) {
    const offset2 = aero.flapAngleOffset ?? 0;
    const left = flapLoad(aero.currentFlapAngle - offset2, iasKnots, aero.flapAngles, limits.flap);
    const right = flapLoad(aero.currentFlapAngle + offset2, iasKnots, aero.flapAngles, limits.flap);
    const bias = Math.max(-0.3, Math.min(0.3, aero.beta ?? 0));
    aero.leftFlapDamage = accumulateDamage(aero.leftFlapDamage ?? 0, left * (1 - bias), dt);
    aero.rightFlapDamage = accumulateDamage(aero.rightFlapDamage ?? 0, right * (1 + bias), dt);
    let gearLoad = 0;
    if (!gear.isFixed && limits.gearOperating && limits.gearExtended) {
      const moving = Math.abs(gear.targetGearState - gear.gearState) > 1e-3;
      const exposed = Math.max(gear.gearState, moving ? 0.05 : 0);
      const limit = moving ? limits.gearOperating : limits.gearExtended;
      gearLoad = exposed > 0 ? excessPressure(iasKnots, limit) : 0;
      gear.overspeedDamage = accumulateDamage(gear.overspeedDamage ?? 0, gearLoad * exposed, dt);
    }
    const selectedFlapLimit = limits.flap[aero.flapsIndex];
    return {
      flap: left > 0 || right > 0 || Boolean(selectedFlapLimit && iasKnots > selectedFlapLimit),
      gear: gearLoad > 0
    };
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/FlightPhysicsCore.js
  var THREE8 = __toESM(require_three(), 1);

  // node_modules/@stlim0727/flightsim-core/src/physics/Aerodynamics.js
  var THREE2 = __toESM(require_three(), 1);

  // node_modules/@stlim0727/flightsim-core/src/physics/Atmosphere.js
  var Atmosphere = class _Atmosphere {
    static R = 287.05;
    // Specific gas constant for dry air (J/(kg·K))
    static GAMMA = 1.4;
    // Ratio of specific heats for air
    static G0 = 9.80665;
    // Standard gravity (m/s^2)
    static T0 = 288.15;
    // Sea level standard temperature (K) (15°C)
    static P0 = 101325;
    // Sea level standard pressure (Pa)
    static RHO0 = 1.225;
    // Sea level standard density (kg/m^3)
    static LAPSE_RATE = 65e-4;
    // Temperature lapse rate in troposphere (K/m)
    static TROPOPAUSE_ALT = 11e3;
    // Altitude of tropopause (m)
    /**
     * Get atmospheric conditions at altitude (meters above sea level)
     * @param {number} altitudeMeters
     * @returns {{ temperature: number, pressure: number, density: number, speedOfSound: number, densityRatio: number }}
     */
    static getConditions(altitudeMeters) {
      const h = Math.max(-500, Math.min(altitudeMeters, 25e3));
      let temperature, pressure;
      if (h <= _Atmosphere.TROPOPAUSE_ALT) {
        temperature = _Atmosphere.T0 - _Atmosphere.LAPSE_RATE * h;
        pressure = _Atmosphere.P0 * Math.pow(temperature / _Atmosphere.T0, _Atmosphere.G0 / (_Atmosphere.LAPSE_RATE * _Atmosphere.R));
      } else {
        const tTropo = _Atmosphere.T0 - _Atmosphere.LAPSE_RATE * _Atmosphere.TROPOPAUSE_ALT;
        const pTropo = _Atmosphere.P0 * Math.pow(tTropo / _Atmosphere.T0, _Atmosphere.G0 / (_Atmosphere.LAPSE_RATE * _Atmosphere.R));
        temperature = tTropo;
        const dh = h - _Atmosphere.TROPOPAUSE_ALT;
        pressure = pTropo * Math.exp(-_Atmosphere.G0 * dh / (_Atmosphere.R * tTropo));
      }
      const density = pressure / (_Atmosphere.R * temperature);
      const speedOfSound = Math.sqrt(_Atmosphere.GAMMA * _Atmosphere.R * temperature);
      const densityRatio = density / _Atmosphere.RHO0;
      return {
        temperature,
        pressure,
        density,
        speedOfSound,
        densityRatio
      };
    }
    /**
     * Convert True Airspeed (TAS) to Indicated Airspeed (IAS) in m/s
     */
    static tasToIas(tas, densityRatio) {
      return tas * Math.sqrt(Math.max(1e-3, densityRatio));
    }
    /**
     * Convert Indicated Airspeed (IAS) to True Airspeed (TAS) in m/s
     */
    static iasToTas(ias, densityRatio) {
      return ias / Math.sqrt(Math.max(1e-3, densityRatio));
    }
    /**
     * Convert m/s to Knots (nautical miles per hour)
     */
    static msToKnots(ms) {
      return ms * 1.94384;
    }
    /**
     * Convert Knots to m/s
     */
    static knotsToMs(knots) {
      return knots / 1.94384;
    }
    /**
     * Convert meters to feet
     */
    static metersToFeet(m) {
      return m * 3.28084;
    }
    /**
     * Convert feet to meters
     */
    static feetToMeters(ft) {
      return ft / 3.28084;
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/config/massDistributions.js
  var p = (x, y, z) => ({ x, y, z });
  var B738_MASS_DISTRIBUTION = {
    referenceMassKg: 66e3,
    tanks: [
      { id: "center", capacityKg: 7200, priority: 0, position: p(0, 0, -1) },
      { id: "left", capacityKg: 3500, priority: 1, position: p(-7, 0, 1) },
      { id: "right", capacityKg: 3500, priority: 1, position: p(7, 0, 1) }
    ],
    stations: [
      { id: "forward", capacityKg: 15e3, position: p(0, 0, -6) },
      { id: "aft", capacityKg: 15e3, position: p(0, 0, 6) }
    ],
    parts: [
      { control: "gear", massKg: 1e3, stowed: p(0, -1, 0), deployed: p(0, -2, 0.3) },
      { control: "flap", massKg: 300, stowed: p(0, 0, 1), deployed: p(0, -0.1, 1.3) }
    ]
  };
  var C172_MASS_DISTRIBUTION = {
    referenceMassKg: 1050,
    tanks: [
      { id: "left", capacityKg: 72, priority: 0, position: p(-2.5, 0, 0) },
      { id: "right", capacityKg: 72, priority: 0, position: p(2.5, 0, 0) }
    ],
    stations: [
      { id: "forward", capacityKg: 200, position: p(0, 0, -0.5) },
      { id: "aft", capacityKg: 150, position: p(0, 0, 0.5) }
    ],
    parts: [{ control: "flap", massKg: 8, stowed: p(0, 0, 0.4), deployed: p(0, -0.05, 0.5) }]
  };
  var F16_MASS_DISTRIBUTION = {
    referenceMassKg: 12e3,
    tanks: [{ id: "internal", capacityKg: 3200, priority: 0, position: p(0, 0, 0) }],
    stations: [{ id: "payload", capacityKg: 6e3, position: p(0, 0, 0) }],
    parts: [{ control: "gear", massKg: 150, stowed: p(0, -0.3, 0), deployed: p(0, -0.8, 0.1) }]
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/groundContacts.js
  var BODY_CONTACTS = Object.freeze([
    { id: "engineL", position: [-5.06, -2.98, -5.4] },
    { id: "engineR", position: [5.06, -2.98, -5.4] },
    { id: "belly", position: [0, -2.3, 0] },
    { id: "nose", position: [0, -2.27, -13] },
    { id: "tail", position: [0, -0.76, 14.34] },
    { id: "wingL", position: [-16.85, -0.06, 4.9] },
    { id: "wingR", position: [16.85, -0.06, 4.9] }
  ]);
  var patches = {
    engineL: [[-5.4, -2.94, -5.4], [-5.4, -2.94, -3.1], [-5.06, -2.99, -3.1], [-6.14, -2.26, -5.4], [-6.14, -2.26, -3.1]],
    engineR: [[5.4, -2.94, -5.4], [5.4, -2.94, -3.1], [5.06, -2.99, -3.1], [6.14, -2.26, -5.4], [6.14, -2.26, -3.1]],
    belly: [[0, -2.27, -10.94], [0, -2.3, -4.55], [0, -2.27, 7.12], [0, -1.94, 9.46]],
    nose: [[0, -2.1, -15.72], [0, -2.21, -14.5], [0, -1.81, -17], [0, -1.39, -18.28]],
    tail: [[0, -1.44, 11.95], [0, 0.48, 18.25]],
    wingL: [[-17.13, 0.05, 5], [-17.13, 0.07, 6.14], [-16.85, -0.01, 6.03], [-8.68, -0.84, 2.83]],
    wingR: [[17.13, 0.05, 5], [17.13, 0.07, 6.14], [16.85, -0.01, 6.03], [8.68, -0.84, 2.83]]
  };
  var BODY_SUPPORT_POINTS = Object.freeze(BODY_CONTACTS.flatMap((p2) => [p2.position, ...patches[p2.id]].map((position, index, points) => ({ id: p2.id, key: `${p2.id}:${index}`, position, weight: 1 / points.length }))));
  var FALLBACK_BODY_SUPPORT_POINTS = Object.freeze([
    ["engineL", [-5.06, -2.95, -5.22]],
    ["engineR", [5.06, -2.95, -5.22]],
    ["belly", [0, -1.89, -11.9]],
    ["belly", [0, -1.89, 0]],
    ["belly", [0, -1.89, 11.9]],
    ["nose", [0, -1.81, -12]],
    ["nose", [0, -0.53, -17.4]],
    ["tail", [0, -0.7, 15.75]],
    ["tail", [0, 0.1, 19.5]],
    ["wingL", [-18.5, 0.5, 0]],
    ["wingL", [-18.5, 0.5, 2.3]],
    ["wingR", [18.5, 0.5, 0]],
    ["wingR", [18.5, 0.5, 2.3]]
  ].map(([id, position], index, points) => ({ id, key: `${id}:${index}`, position, weight: 1 / points.filter((p2) => p2[0] === id).length })));
  var C172_BODY_SUPPORT_POINTS = Object.freeze([
    ["engineL", [0, 0.15, -2.2]],
    ["engineR", [0, 0.15, -2.2]],
    ["belly", [0, -0.45, 0]],
    ["nose", [0, -0.4, -1.8]],
    ["tail", [0, 0.35, 3.8]],
    ["wingL", [-5.5, 0.92, -0.3]],
    ["wingR", [5.5, 0.92, -0.3]]
  ].map(([id, position], index, points) => ({ id, key: `${id}:${index}`, position, weight: 1 / points.filter((p2) => p2[0] === id).length })));

  // node_modules/@stlim0727/flightsim-core/src/config/aircraftConfigs.js
  var BOEING_737_800 = {
    configurationLimits: { flap: [0, 250, 250, 200, 195, 175, 162], gearOperating: 235, gearExtended: 320 },
    id: "B738",
    massDistribution: B738_MASS_DISTRIBUTION,
    name: "Boeing 737-800",
    description: "Twin-engine narrow-body jet airliner with CFM56-7B high-bypass turbofans",
    // 1. Mass & Inertial Properties
    massProperties: {
      emptyWeightKg: 41413,
      maxTakeoffWeightKg: 79010,
      currentMassKg: 66e3,
      // Principal moments of inertia (kg·m^2) for heavy twin-jet airliner
      Ixx: 165e4,
      // Roll inertia (heavy fuel wings)
      Iyy: 345e4,
      // Pitch inertia (long heavy passenger fuselage)
      Izz: 485e4
      // Yaw inertia
    },
    // 2. Aerodynamic Geometry & Stability Derivatives
    aerodynamics: {
      wingspanM: 35.8,
      // Span b (m)
      wingAreaM2: 124.6,
      // Area S (m^2)
      meanChordM: 3.99,
      // MAC c_bar (m)
      // Calibrated game tail estimates, not manufacturer performance data.
      tailArmM: 12,
      tailAreaM2: 32,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.82,
      // Span efficiency factor e
      // Lift parameters
      cl0Clean: 0.22,
      // Zero-AoA clean lift
      claPerRad: 5.65,
      // Lift slope dCL/dAlpha
      alphaStallDeg: 15.5,
      // Clean stall angle of attack
      clFlapBoostMax: 0.95,
      // Max lift boost at full flaps (40 deg)
      spoilerLiftDump: 0.38,
      // Lift dump with flight spoilers deployed
      // Drag parameters
      cd0Clean: 0.0185,
      // Parasitic zero-lift drag
      gearDrag: 0.024,
      // Additional parasitic drag with gear down
      spoilerDrag: 0.075,
      // Additional drag with speedbrakes extended
      transonicMachBuffet: 0.78,
      // Mach threshold for compressibility drag
      // Longitudinal (Pitch) Stability Derivatives
      cm0: -0.02,
      // Trim pitching moment at zero AoA
      cma: -0.9,
      // Static pitch stability (dCm/dAlpha < 0)
      cmDe: -1.25,
      // Elevator pitch control authority (dCm/dDe per rad)
      cmQ: -26,
      // Heavy transport pitch rate damping derivative
      // Lateral-Directional (Roll & Yaw) Stability Derivatives
      clBeta: -0.14,
      // Dihedral effect / sweepback roll (dCl/dBeta)
      clDa: 0.18,
      // Aileron roll control authority (dCl/dDa per rad)
      clP: -0.65,
      // Roll rate damping derivative
      cnBeta: -0.22,
      // Directional weathercock stability (dCn/dBeta < 0 in Three.js Y-up)
      cnDr: -0.12,
      // Rudder yaw control authority (dCn/dDr per rad)
      cnR: -0.32,
      // Yaw rate damping derivative
      adverseYaw: -0.025,
      // Adverse yaw coupling from aileron deflection
      // Flap detents (degrees)
      flapAngles: [0, 1, 5, 15, 20, 30, 40]
    },
    // See docs/development/stall-warning.md for sources and approximation limits.
    stallWarning: { type: "stickShaker", marginDeg: 2 },
    // 3. Propulsion System (Twin Turbofans)
    propulsion: {
      numEngines: 2,
      engineName: "CFM56-7B26",
      maxStaticThrustPerEngineN: 121e3,
      // ~27,000 lbf each
      idleN1Percent: 22,
      togaN1Percent: 100,
      spoolUpTimeSec: 3.2,
      // Idle to TOGA response lag
      spoolDownTimeSec: 2.4,
      // TOGA to Idle lag
      reverseThrustEfficiency: 0.45,
      // 45% reverse thrust deflection
      baseFuelFlowKgPerHour: 350,
      maxFuelFlowKgPerHour: 2500,
      fuelCapacityKg: 14200
    },
    // 4. Landing Gear & Ground Interaction
    landingGear: {
      isFixed: false,
      cgGroundHeightM: 3.5,
      gearTransitTimeSec: 8,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -3.27, z: -12.5 },
          wheelRadius: 0.38,
          restLength: 0.9,
          kSpring: 42e4,
          // N/m
          cDamper: 48e3,
          // N/(m/s)
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -3.2, y: -3.3, z: 1.8 },
          wheelRadius: 0.48,
          restLength: 0.9,
          kSpring: 85e4,
          cDamper: 72e3,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 3.2, y: -3.3, z: 1.8 },
          wheelRadius: 0.48,
          restLength: 0.9,
          kSpring: 85e4,
          cDamper: 72e3,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    // 5. Cockpit Camera & Instrument Layout
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.303, y: 0.88, z: -12.35 },
      portraitEyeX: -0.303,
      portraitEyeY: 0.88,
      defaultLookPitchRad: -0.08,
      // -4.6° forward look showing runway, horizon & MCP without excess dashboard dominance
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 55,
      chaseHeight: 10.5,
      droneDistance: 38,
      droneHeight: 11.5,
      gearCamOffset: { x: 2.2, y: -2.4, z: 6.2 },
      gearLookTarget: { x: -0.5, y: -1.9, z: -2.5 }
    }
  };
  var F16_FALCON = {
    configurationLimits: { flap: [0, 250], gearOperating: 300, gearExtended: 300 },
    id: "F16",
    flightControls: { gLimiter: true },
    massDistribution: F16_MASS_DISTRIBUTION,
    name: "F-16 Fighting Falcon",
    description: "Single-engine supersonic multirole fighter aircraft with afterburning turbofan",
    // 1. Mass & Inertial Properties
    massProperties: {
      emptyWeightKg: 8570,
      maxTakeoffWeightKg: 19200,
      currentMassKg: 12e3,
      Ixx: 12800,
      Iyy: 75e3,
      Izz: 82e3
    },
    // 2. Aerodynamic Geometry & Stability Derivatives
    aerodynamics: {
      wingspanM: 9.96,
      wingAreaM2: 27.87,
      meanChordM: 3.45,
      // Calibrated game tail estimates, not manufacturer performance data.
      tailArmM: 4,
      tailAreaM2: 6,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.75,
      cl0Clean: 0.05,
      claPerRad: 4.2,
      alphaStallDeg: 28,
      clFlapBoostMax: 0.35,
      spoilerLiftDump: 0.25,
      cd0Clean: 0.015,
      gearDrag: 0.03,
      spoilerDrag: 0.08,
      transonicMachBuffet: 0.95,
      cm0: 0,
      cma: -0.45,
      cmDe: -1.8,
      cmQ: -12,
      clBeta: -0.08,
      clDa: 0.35,
      clP: -0.45,
      cnBeta: -0.18,
      cnDr: -0.15,
      cnR: -0.25,
      adverseYaw: -0.01,
      flapAngles: [0, 20]
    },
    stallWarning: { type: "lowSpeed", marginDeg: 2, gearDownAlphaDeg: 15 },
    // 3. Propulsion System (Single Afterburning Turbofan)
    propulsion: {
      numEngines: 1,
      engineName: "F110-GE-129",
      // Centerline engine: no reference-origin thrust pitch moment. CG shifts
      // are accounted for separately by the longitudinal force model.
      pitchMomentArmMeters: 0,
      maxStaticThrustPerEngineN: 131e3,
      idleN1Percent: 60,
      togaN1Percent: 100,
      spoolUpTimeSec: 1.2,
      spoolDownTimeSec: 1.5,
      reverseThrustEfficiency: 0,
      baseFuelFlowKgPerHour: 600,
      maxFuelFlowKgPerHour: 4500,
      fuelCapacityKg: 3200,
      momentArmMeters: 0
    },
    // 4. Landing Gear & Ground Interaction
    landingGear: {
      isFixed: false,
      bodySupportPoints: [
        ["belly", [0, -0.9, 0]],
        ["nose", [0, 0, -7.8]],
        ["tail", [0, 0, 8]],
        ["wingL", [-4.98, 0, 1.8]],
        ["wingR", [4.98, 0, 1.8]],
        ["engineL", [0, -0.7, 7.5]]
      ].map(([id, position], index) => ({ id, key: `${id}:${index}`, position, weight: 1 })),
      cgGroundHeightM: 1.85,
      gearTransitTimeSec: 5,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -1.65, z: -2.35 },
          wheelRadius: 0.25,
          restLength: 0.8,
          kSpring: 35e4,
          cDamper: 32e3,
          isSteerable: true,
          maxSteeringDeg: 35
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -1.1, y: -1.65, z: 1.65 },
          wheelRadius: 0.35,
          restLength: 0.8,
          kSpring: 45e4,
          cDamper: 4e4,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 1.1, y: -1.65, z: 1.65 },
          wheelRadius: 0.35,
          restLength: 0.8,
          kSpring: 45e4,
          cDamper: 4e4,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.55,
      tireLateralFriction: 0.8
    },
    // 5. Cockpit Camera & Instrument Layout
    cockpit: {
      hasPhotoCockpit: false,
      captainEyePos: { x: 0, y: 0.94, z: -3.6 },
      portraitEyeX: 0,
      // Single seat stays centered in narrow viewports too.
      portraitEyeY: 0.94,
      defaultLookPitchRad: -0.04,
      // -2.3° boresight level with HUD optical center
      defaultFov: 75,
      exteriorFov: 60,
      chaseDistance: 18,
      chaseHeight: 4.5,
      droneDistance: 14,
      droneHeight: 4.8,
      gearCamOffset: { x: 3, y: -3, z: 5 },
      gearLookTarget: { x: 0, y: -1, z: -0.3 }
    }
  };
  var CESSNA_172 = {
    configurationLimits: { flap: [0, 110, 85, 85] },
    id: "C172",
    massDistribution: C172_MASS_DISTRIBUTION,
    name: "Cessna 172 Skyhawk",
    description: "Single-engine four-seat high-wing general aviation aircraft with piston engine",
    // 1. Mass & Inertial Properties
    massProperties: {
      emptyWeightKg: 767,
      maxTakeoffWeightKg: 1157,
      currentMassKg: 1050,
      Ixx: 1285,
      Iyy: 1825,
      Izz: 2667
    },
    // 2. Aerodynamic Geometry & Stability Derivatives
    aerodynamics: {
      wingspanM: 11,
      wingAreaM2: 16.2,
      meanChordM: 1.47,
      // Calibrated game tail estimates, not manufacturer performance data.
      tailArmM: 4,
      tailAreaM2: 4,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.8,
      cl0Clean: 0.35,
      claPerRad: 5.1,
      alphaStallDeg: 14,
      clFlapBoostMax: 0.65,
      spoilerLiftDump: 0,
      cd0Clean: 0.027,
      gearDrag: 0.015,
      spoilerDrag: 0,
      transonicMachBuffet: 0.6,
      cm0: -0.04,
      cma: -0.75,
      cmDe: -1.35,
      cmQ: -14,
      clBeta: -0.09,
      clDa: 0.22,
      clP: -0.5,
      cnBeta: 0.12,
      cnDr: -0.09,
      cnR: -0.18,
      adverseYaw: -0.02,
      flapAngles: [0, 10, 20, 30]
    },
    stallWarning: { type: "pneumaticHorn", referenceMarginKnots: 7.5 },
    // 3. Propulsion System (Single Piston Engine)
    propulsion: {
      numEngines: 1,
      engineName: "Lycoming IO-360-L2A",
      maxStaticThrustPerEngineN: 3200,
      idleN1Percent: 25,
      togaN1Percent: 100,
      spoolUpTimeSec: 0.8,
      spoolDownTimeSec: 0.8,
      reverseThrustEfficiency: 0,
      baseFuelFlowKgPerHour: 28,
      maxFuelFlowKgPerHour: 48,
      fuelCapacityKg: 144,
      momentArmMeters: 0
    },
    // Synthesized piston/propeller sound tuning. RPM is estimated from the
    // current normalized engine telemetry, rather than treated as turbine N1.
    audio: {
      engineType: "piston",
      idleRpm: 700,
      maxRpm: 2700,
      cylinders: 4,
      propellerBlades: 2
    },
    // 4. Landing Gear & Ground Interaction (Fixed Tricycle Gear)
    landingGear: {
      isFixed: true,
      cgGroundHeightM: 1.35,
      gearTransitTimeSec: 0.1,
      bodySupportPoints: C172_BODY_SUPPORT_POINTS,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -1.1, z: -1.5 },
          wheelRadius: 0.2,
          restLength: 0.5,
          kSpring: 12e4,
          cDamper: 15e3,
          isSteerable: true,
          maxSteeringDeg: 30
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -1.05, y: -1.15, z: 0.4 },
          wheelRadius: 0.25,
          restLength: 0.5,
          kSpring: 18e4,
          cDamper: 2e4,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 1.05, y: -1.15, z: 0.4 },
          wheelRadius: 0.25,
          restLength: 0.5,
          kSpring: 18e4,
          cDamper: 2e4,
          isSteerable: false
        }
      ],
      rollingFriction: 0.025,
      maxBrakingFriction: 0.4,
      tireLateralFriction: 0.7
    },
    // 5. Cockpit Camera & Instrument Layout
    cockpit: {
      hasPhotoCockpit: false,
      captainEyePos: { x: -0.22, y: 0.72, z: -1.18 },
      defaultLookPitchRad: -0.05,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 14,
      chaseHeight: 3.2,
      droneDistance: 12,
      droneHeight: 3.5,
      gearCamOffset: { x: 0.8, y: -0.6, z: 1.2 },
      gearLookTarget: { x: 0, y: -0.8, z: -0.2 }
    }
  };
  var AIRBUS_A320 = {
    configurationLimits: { flap: [0, 230, 200, 177], gearOperating: 250, gearExtended: 280 },
    id: "A320",
    name: "Airbus A320-200",
    description: "Twin-engine narrow-body jet airliner with CFM56-5B high-bypass turbofans",
    massProperties: {
      emptyWeightKg: 42600,
      maxTakeoffWeightKg: 77e3,
      currentMassKg: 68e3,
      Ixx: 17e5,
      Iyy: 366e4,
      Izz: 507e4
    },
    massDistribution: {
      referenceMassKg: 68e3,
      initialFuelKg: 13970,
      initialPayloadKg: 11430,
      tanks: [
        { id: "main", capacityKg: 19e3, priority: 0, position: { x: 0, y: 0, z: 0 } }
      ],
      stations: [
        { id: "payload", capacityKg: 77e3, position: { x: 0, y: 0, z: 0 } }
      ]
    },
    aerodynamics: {
      wingspanM: 35.8,
      wingAreaM2: 122.6,
      meanChordM: 4.19,
      tailArmM: 12.18,
      tailAreaM2: 31.48,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.83,
      cl0Clean: 0.24,
      claPerRad: 5.45,
      alphaStallDeg: 14.6,
      clFlapBoostMax: 0.95,
      spoilerLiftDump: 0.38,
      cd0Clean: 0.0195,
      gearDrag: 0.024,
      spoilerDrag: 0.075,
      transonicMachBuffet: 0.78,
      cm0: -0.02,
      cma: -0.9,
      cmDe: -1.45,
      cmQ: -26,
      clBeta: -0.14,
      clDa: 0.18,
      clP: -0.65,
      cnBeta: -0.22,
      cnDr: -0.12,
      cnR: -0.32,
      adverseYaw: -0.025,
      flapAngles: [0, 10, 25, 40]
    },
    stallWarning: { type: "stickShaker", marginDeg: 2 },
    propulsion: {
      numEngines: 2,
      engineName: "CFM56-5B4 Turbofans",
      maxStaticThrustPerEngineN: 12e4,
      idleN1Percent: 22,
      togaN1Percent: 100,
      spoolUpTimeSec: 3.2,
      spoolDownTimeSec: 2.4,
      reverseThrustEfficiency: 0.45,
      baseFuelFlowKgPerHour: 360,
      maxFuelFlowKgPerHour: 2575,
      fuelCapacityKg: 19e3
    },
    landingGear: {
      isFixed: false,
      cgGroundHeightM: 3.5,
      gearTransitTimeSec: 8,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -3.27, z: -12.5 },
          wheelRadius: 0.38,
          restLength: 0.9,
          kSpring: 432700,
          cDamper: 48700,
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -3.2, y: -3.3, z: 0.9 },
          wheelRadius: 0.48,
          restLength: 0.9,
          kSpring: 875700,
          cDamper: 73100,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 3.2, y: -3.3, z: 0.9 },
          wheelRadius: 0.48,
          restLength: 0.9,
          kSpring: 875700,
          cDamper: 73100,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.303, y: 0.88, z: -12.35 },
      portraitEyeX: -0.303,
      portraitEyeY: 0.88,
      defaultLookPitchRad: -0.08,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 55,
      chaseHeight: 10.5,
      droneDistance: 38,
      droneHeight: 11.5,
      gearCamOffset: { x: 2.2, y: -2.4, z: 6.2 },
      gearLookTarget: { x: -0.5, y: -1.9, z: -2.5 }
    }
  };
  var BOEING_747_400 = {
    configurationLimits: { flap: [0, 250, 205, 180], gearOperating: 235, gearExtended: 320 },
    id: "B747",
    name: "Boeing 747-400",
    description: "Four-engine wide-body commercial airliner with GE CF6-80C2 high-bypass turbofans",
    massProperties: {
      emptyWeightKg: 179014,
      maxTakeoffWeightKg: 396893,
      currentMassKg: 32e4,
      Ixx: 2592e4,
      Iyy: 8106e4,
      Izz: 9508e4
    },
    massDistribution: {
      referenceMassKg: 396893,
      initialFuelKg: 77542,
      initialPayloadKg: 63444,
      tanks: [
        { id: "main", capacityKg: 173480, priority: 0, position: { x: 0, y: 0, z: 0 } }
      ],
      stations: [
        { id: "payload", capacityKg: 396893, position: { x: 0, y: 0, z: 0 } }
      ]
    },
    aerodynamics: {
      wingspanM: 64.44,
      wingAreaM2: 525,
      meanChordM: 8.32,
      tailArmM: 26.4,
      tailAreaM2: 134.8,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.8,
      cl0Clean: 0.26,
      claPerRad: 5.05,
      alphaStallDeg: 14.9,
      clFlapBoostMax: 0.95,
      spoilerLiftDump: 0.38,
      cd0Clean: 0.0215,
      gearDrag: 0.024,
      spoilerDrag: 0.075,
      transonicMachBuffet: 0.82,
      cm0: -0.02,
      cma: -0.9,
      cmDe: -1.45,
      cmQ: -36.1,
      clBeta: -0.14,
      clDa: 0.116,
      clP: -0.827,
      cnBeta: -0.22,
      cnDr: -0.107,
      cnR: -0.368,
      adverseYaw: -0.025,
      flapAngles: [0, 10, 25, 40]
    },
    stallWarning: { type: "stickShaker", marginDeg: 2 },
    propulsion: {
      numEngines: 4,
      engineName: "GE CF6-80C2B5F Turbofans",
      maxStaticThrustPerEngineN: 276e3,
      idleN1Percent: 22,
      togaN1Percent: 100,
      spoolUpTimeSec: 3.5,
      spoolDownTimeSec: 2.6,
      reverseThrustEfficiency: 0.45,
      baseFuelFlowKgPerHour: 1696,
      maxFuelFlowKgPerHour: 12120,
      fuelCapacityKg: 173480
    },
    landingGear: {
      isFixed: false,
      cgGroundHeightM: 4.8,
      gearTransitTimeSec: 10,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -4.5, z: -20 },
          wheelRadius: 0.61,
          restLength: 1.44,
          kSpring: 2036e3,
          cDamper: 105600,
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -5.12, y: -4.55, z: 1.44 },
          wheelRadius: 0.77,
          restLength: 1.44,
          kSpring: 412e4,
          cDamper: 158400,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 5.12, y: -4.55, z: 1.44 },
          wheelRadius: 0.77,
          restLength: 1.44,
          kSpring: 412e4,
          cDamper: 158400,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.42, y: 2.8, z: -24.5 },
      portraitEyeX: -0.42,
      portraitEyeY: 2.8,
      defaultLookPitchRad: -0.08,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 85,
      chaseHeight: 16,
      droneDistance: 60,
      droneHeight: 18,
      gearCamOffset: { x: 3.5, y: -3.5, z: 10 },
      gearLookTarget: { x: -0.5, y: -2.5, z: -4 }
    }
  };
  var DC10_30 = {
    configurationLimits: { flap: [0, 250, 205, 180], gearOperating: 235, gearExtended: 270 },
    id: "DC10",
    name: "McDonnell Douglas DC-10-30",
    description: "Three-engine wide-body jet airliner with two underwing turbofans and one tail-mounted engine",
    massProperties: {
      emptyWeightKg: 121563,
      maxTakeoffWeightKg: 259460,
      currentMassKg: 215e3,
      Ixx: 1065e4,
      Iyy: 366e5,
      Izz: 414e5
    },
    massDistribution: {
      referenceMassKg: 259460,
      initialFuelKg: 51390,
      initialPayloadKg: 42047,
      tanks: [
        { id: "main", capacityKg: 111100, priority: 0, position: { x: 0, y: 0, z: 0 } }
      ],
      stations: [
        { id: "payload", capacityKg: 259460, position: { x: 0, y: 0, z: 0 } }
      ]
    },
    aerodynamics: {
      wingspanM: 50.4,
      wingAreaM2: 367.7,
      meanChordM: 7.5,
      tailArmM: 21.6,
      tailAreaM2: 94.4,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.78,
      cl0Clean: 0.25,
      claPerRad: 4.95,
      alphaStallDeg: 14.6,
      clFlapBoostMax: 0.9,
      spoilerLiftDump: 0.38,
      cd0Clean: 0.0225,
      gearDrag: 0.024,
      spoilerDrag: 0.075,
      transonicMachBuffet: 0.8,
      cm0: -0.02,
      cma: -0.9,
      cmDe: -1.45,
      cmQ: -30.3,
      clBeta: -0.14,
      clDa: 0.134,
      clP: -0.709,
      cnBeta: -0.22,
      cnDr: -0.112,
      cnR: -0.336,
      adverseYaw: -0.025,
      flapAngles: [0, 10, 25, 40]
    },
    stallWarning: { type: "stickShaker", marginDeg: 2 },
    propulsion: {
      numEngines: 3,
      engineName: "GE CF6-50C2 Turbofans",
      maxStaticThrustPerEngineN: 233500,
      idleN1Percent: 22,
      togaN1Percent: 100,
      spoolUpTimeSec: 3.4,
      spoolDownTimeSec: 2.5,
      reverseThrustEfficiency: 0.45,
      baseFuelFlowKgPerHour: 1140,
      maxFuelFlowKgPerHour: 8145,
      fuelCapacityKg: 111100
    },
    landingGear: {
      isFixed: false,
      cgGroundHeightM: 4.2,
      gearTransitTimeSec: 9,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -3.8, z: -17.6 },
          wheelRadius: 0.53,
          restLength: 1.27,
          kSpring: 1368e3,
          cDamper: 86600,
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -4.5, y: -3.85, z: 1.27 },
          wheelRadius: 0.67,
          restLength: 1.27,
          kSpring: 277e4,
          cDamper: 13e4,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 4.5, y: -3.85, z: 1.27 },
          wheelRadius: 0.67,
          restLength: 1.27,
          kSpring: 277e4,
          cDamper: 13e4,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.38, y: 1.9, z: -19.2 },
      portraitEyeX: -0.38,
      portraitEyeY: 1.9,
      defaultLookPitchRad: -0.08,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 70,
      chaseHeight: 13,
      droneDistance: 48,
      droneHeight: 14.5,
      gearCamOffset: { x: 2.8, y: -3, z: 8 },
      gearLookTarget: { x: -0.5, y: -2, z: -3 }
    }
  };
  var MD82 = {
    configurationLimits: { flap: [0, 240, 195, 180], gearOperating: 210, gearExtended: 250 },
    id: "MD80",
    name: "McDonnell Douglas MD-82",
    description: "Twin-engine narrow-body airliner with aft fuselage-mounted JT8D turbofans and T-tail",
    massProperties: {
      emptyWeightKg: 37300,
      maxTakeoffWeightKg: 67812,
      currentMassKg: 58e3,
      Ixx: 122e4,
      Iyy: 266e4,
      Izz: 366e4
    },
    massDistribution: {
      referenceMassKg: 58e3,
      initialFuelKg: 11385,
      initialPayloadKg: 9315,
      tanks: [
        { id: "main", capacityKg: 18944, priority: 0, position: { x: 0, y: 0, z: 0 } }
      ],
      stations: [
        { id: "payload", capacityKg: 67812, position: { x: 0, y: 0, z: 0 } }
      ]
    },
    aerodynamics: {
      wingspanM: 32.82,
      wingAreaM2: 112.3,
      meanChordM: 3.62,
      tailArmM: 11.25,
      tailAreaM2: 28.84,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.81,
      cl0Clean: 0.23,
      claPerRad: 5.15,
      alphaStallDeg: 14,
      clFlapBoostMax: 0.92,
      spoilerLiftDump: 0.38,
      cd0Clean: 0.0205,
      gearDrag: 0.024,
      spoilerDrag: 0.075,
      transonicMachBuffet: 0.78,
      cm0: -0.02,
      cma: -0.9,
      cmDe: -1.53,
      cmQ: -27.4,
      clBeta: -0.14,
      clDa: 0.167,
      clP: -0.62,
      cnBeta: -0.22,
      cnDr: -0.123,
      cnR: -0.32,
      adverseYaw: -0.025,
      flapAngles: [0, 10, 25, 40]
    },
    stallWarning: { type: "stickShaker", marginDeg: 2 },
    propulsion: {
      numEngines: 2,
      engineName: "P&W JT8D-217C Turbofans",
      maxStaticThrustPerEngineN: 93e3,
      idleN1Percent: 22,
      togaN1Percent: 100,
      spoolUpTimeSec: 3.1,
      spoolDownTimeSec: 2.3,
      reverseThrustEfficiency: 0.45,
      baseFuelFlowKgPerHour: 307,
      maxFuelFlowKgPerHour: 2195,
      fuelCapacityKg: 18944
    },
    landingGear: {
      isFixed: false,
      cgGroundHeightM: 3.2,
      gearTransitTimeSec: 7.5,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -3, z: -11.5 },
          wheelRadius: 0.35,
          restLength: 0.82,
          kSpring: 369e3,
          cDamper: 45e3,
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -2.93, y: -3.05, z: 0.82 },
          wheelRadius: 0.44,
          restLength: 0.82,
          kSpring: 747e3,
          cDamper: 67500,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 2.93, y: -3.05, z: 0.82 },
          wheelRadius: 0.44,
          restLength: 0.82,
          kSpring: 747e3,
          cDamper: 67500,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.29, y: 0.82, z: -11.8 },
      portraitEyeX: -0.29,
      portraitEyeY: 0.82,
      defaultLookPitchRad: -0.08,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 50,
      chaseHeight: 9.8,
      droneDistance: 36,
      droneHeight: 10.8,
      gearCamOffset: { x: 2, y: -2.2, z: 5.8 },
      gearLookTarget: { x: -0.5, y: -1.8, z: -2.2 }
    }
  };
  var CONCORDE = {
    configurationLimits: { flap: [], gearOperating: 270, gearExtended: 270 },
    id: "CONCORDE",
    name: "A\xE9rospatiale/BAC Concorde",
    description: "Supersonic passenger airliner featuring ogival delta wing and four Rolls-Royce/Snecma Olympus 593 turbojets with reheat",
    massProperties: {
      emptyWeightKg: 78700,
      maxTakeoffWeightKg: 185070,
      currentMassKg: 15e4,
      Ixx: 1916e3,
      Iyy: 1783e4,
      Izz: 1535e4
    },
    massDistribution: {
      referenceMassKg: 185070,
      initialFuelKg: 39215,
      initialPayloadKg: 32085,
      tanks: [
        { id: "main", capacityKg: 95680, priority: 0, position: { x: 0, y: 0, z: 0 } }
      ],
      stations: [
        { id: "payload", capacityKg: 185070, position: { x: 0, y: 0, z: 0 } }
      ]
    },
    aerodynamics: {
      wingspanM: 25.6,
      wingAreaM2: 358.25,
      meanChordM: 15.5,
      tailArmM: 18.1,
      tailAreaM2: 92,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.65,
      cl0Clean: 0.12,
      claPerRad: 3.2,
      alphaStallDeg: 20.6,
      clFlapBoostMax: 0,
      spoilerLiftDump: 0.25,
      cd0Clean: 0.0175,
      gearDrag: 0.024,
      spoilerDrag: 0.075,
      transonicMachBuffet: 1.15,
      cm0: -0.02,
      cma: -0.9,
      cmDe: -1.63,
      cmQ: -24.5,
      clBeta: -0.14,
      clDa: 0.193,
      clP: -0.53,
      cnBeta: -0.22,
      cnDr: -0.128,
      cnR: -0.304,
      adverseYaw: -0.025,
      flapAngles: [0, 0, 0, 0]
    },
    stallWarning: { type: "stickShaker", marginDeg: 3 },
    propulsion: {
      numEngines: 4,
      engineName: "Olympus 593 Mk 610 Turbojets",
      maxStaticThrustPerEngineN: 169300,
      idleN1Percent: 22,
      togaN1Percent: 100,
      spoolUpTimeSec: 3,
      spoolDownTimeSec: 2.2,
      reverseThrustEfficiency: 0.25,
      baseFuelFlowKgPerHour: 795,
      maxFuelFlowKgPerHour: 5680,
      fuelCapacityKg: 95680
    },
    landingGear: {
      isFixed: false,
      cgGroundHeightM: 3.8,
      gearTransitTimeSec: 8.5,
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -3.5, z: -15.5 },
          wheelRadius: 0.45,
          restLength: 1,
          kSpring: 954e3,
          cDamper: 72400,
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -3.8, y: -3.55, z: 1.1 },
          wheelRadius: 0.58,
          restLength: 1,
          kSpring: 193e4,
          cDamper: 108600,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 3.8, y: -3.55, z: 1.1 },
          wheelRadius: 0.58,
          restLength: 1,
          kSpring: 193e4,
          cDamper: 108600,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.32, y: 1.2, z: -20.5 },
      portraitEyeX: -0.32,
      portraitEyeY: 1.2,
      defaultLookPitchRad: -0.08,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 65,
      chaseHeight: 11.5,
      droneDistance: 45,
      droneHeight: 12.5,
      gearCamOffset: { x: 2.5, y: -2.6, z: 7.2 },
      gearLookTarget: { x: -0.5, y: -1.9, z: -2.8 }
    }
  };
  var CANADAIR_CL215 = {
    configurationLimits: { flap: [0, 140, 120, 105] },
    id: "CL215",
    name: "Canadair CL-215 Amphibian",
    description: "Twin-engine amphibious flying boat designed for aerial firefighting and water landings",
    isAmphibious: true,
    massProperties: {
      emptyWeightKg: 12220,
      maxTakeoffWeightKg: 19731,
      currentMassKg: 17100,
      Ixx: 273e3,
      Iyy: 231e3,
      Izz: 565e3
    },
    massDistribution: {
      referenceMassKg: 17100,
      initialFuelKg: 2684,
      initialPayloadKg: 2196,
      tanks: [
        { id: "main", capacityKg: 4250, priority: 0, position: { x: 0, y: 0, z: 0 } }
      ],
      stations: [
        { id: "payload", capacityKg: 19731, position: { x: 0, y: 0, z: 0 } }
      ]
    },
    aerodynamics: {
      wingspanM: 28.6,
      wingAreaM2: 100.33,
      meanChordM: 3.54,
      tailArmM: 6.1,
      tailAreaM2: 25.8,
      tailInducedFactor: 0.1,
      oswaldEfficiency: 0.75,
      cl0Clean: 0.32,
      claPerRad: 5,
      alphaStallDeg: 14.9,
      clFlapBoostMax: 0.85,
      spoilerLiftDump: 0.3,
      cd0Clean: 0.034,
      gearDrag: 0.024,
      spoilerDrag: 0.075,
      transonicMachBuffet: 0.5,
      cm0: -0.02,
      cma: -0.9,
      cmDe: -1.71,
      cmQ: -23.1,
      clBeta: -0.14,
      clDa: 0.175,
      clP: -0.53,
      cnBeta: -0.22,
      cnDr: -0.133,
      cnR: -0.272,
      adverseYaw: -0.025,
      flapAngles: [0, 10, 25, 40]
    },
    stallWarning: { type: "stickShaker", marginDeg: 2 },
    propulsion: {
      numEngines: 2,
      engineName: "Pratt & Whitney R-2800-83AM Radials",
      maxStaticThrustPerEngineN: 31e3,
      idleN1Percent: 18,
      togaN1Percent: 100,
      spoolUpTimeSec: 2,
      spoolDownTimeSec: 1.6,
      reverseThrustEfficiency: 0.35,
      baseFuelFlowKgPerHour: 90,
      maxFuelFlowKgPerHour: 647,
      fuelCapacityKg: 4250
    },
    landingGear: {
      isFixed: true,
      cgGroundHeightM: 2.8,
      gearTransitTimeSec: 0.1,
      bodySupportPoints: [
        { id: "belly", key: "belly:0", position: [0, -1.8, -4.8], weight: 1 / 3 },
        { id: "belly", key: "belly:1", position: [0, -1.8, 0], weight: 1 / 3 },
        { id: "belly", key: "belly:2", position: [0, -1.6, 4.8], weight: 1 / 3 },
        { id: "nose", key: "nose:3", position: [0, -1.5, -8.8], weight: 1 },
        { id: "tail", key: "tail:4", position: [0, -0.8, 10.5], weight: 1 },
        { id: "wingL", key: "wingL:5", position: [-13.5, -1, 0.5], weight: 1 },
        { id: "wingR", key: "wingR:6", position: [13.5, -1, 0.5], weight: 1 }
      ],
      contacts: [
        {
          id: "nose",
          name: "Nose Gear",
          localPos: { x: 0, y: -2.6, z: -10 },
          wheelRadius: 0.3,
          restLength: 0.72,
          kSpring: 108800,
          cDamper: 24400,
          isSteerable: true,
          maxSteeringDeg: 55
        },
        {
          id: "mainLeft",
          name: "Left Main Gear",
          localPos: { x: -2.56, y: -2.65, z: 0.72 },
          wheelRadius: 0.38,
          restLength: 0.72,
          kSpring: 22e4,
          cDamper: 36600,
          isSteerable: false
        },
        {
          id: "mainRight",
          name: "Right Main Gear",
          localPos: { x: 2.56, y: -2.65, z: 0.72 },
          wheelRadius: 0.38,
          restLength: 0.72,
          kSpring: 22e4,
          cDamper: 36600,
          isSteerable: false
        }
      ],
      rollingFriction: 0.02,
      maxBrakingFriction: 0.45,
      tireLateralFriction: 0.75
    },
    cockpit: {
      hasPhotoCockpit: true,
      captainEyePos: { x: -0.32, y: 0.9, z: -6.5 },
      portraitEyeX: -0.32,
      portraitEyeY: 0.9,
      defaultLookPitchRad: -0.08,
      defaultFov: 68,
      exteriorFov: 55,
      chaseDistance: 45,
      chaseHeight: 8.5,
      droneDistance: 32,
      droneHeight: 9.5,
      gearCamOffset: { x: 1.8, y: -1.8, z: 4.8 },
      gearLookTarget: { x: -0.5, y: -1.5, z: -1.8 }
    }
  };
  var AIRCRAFT_REGISTRY = {
    B738: BOEING_737_800,
    F16: F16_FALCON,
    C172: CESSNA_172,
    A320: AIRBUS_A320,
    B747: BOEING_747_400,
    DC10: DC10_30,
    MD80: MD82,
    CONCORDE,
    CL215: CANADAIR_CL215,
    AMPHIBIAN: CANADAIR_CL215
  };
  var DEFAULT_AIRCRAFT_ID = "B738";
  var AIRCRAFT_SPECS = Object.freeze({
    B738: Object.freeze({
      id: "B738",
      name: "Boeing 737-800",
      type: "airliner",
      // Structural flight limits: Flaps UP: -1.0G ~ +2.5G, Flaps DOWN: 0.0G ~ +2.0G
      limitLoad: Object.freeze({ min: -1, max: 2.5, flapsDownMin: 0, flapsDownMax: 2 }),
      // Ultimate load (1.5x limit factor)
      ultimateLoad: Object.freeze({ min: -1.5, max: 3.75, flapsDownMin: 0, flapsDownMax: 3 }),
      oleoStrokeM: 0.4,
      // 35-45 cm cushion travel
      hardLandingGThreshold: 1.55,
      crashGThreshold: 2.1,
      landingRatings: Object.freeze([
        { id: "butter", maxG: 1.25, maxSinkFpm: 150, labelKey: "debrief.rating.butter" },
        { id: "normal", maxG: 1.55, maxSinkFpm: 300, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 1.8, maxSinkFpm: 500, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.1, maxSinkFpm: 600, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.1, minSinkFpm: 600, labelKey: "debrief.rating.damage" }
      ])
    }),
    F16: Object.freeze({
      id: "F16",
      name: "F-16 Fighting Falcon",
      type: "fighter",
      // Structural flight limits: -3.0G ~ +9.0G (FBW G-limiter)
      limitLoad: Object.freeze({ min: -3, max: 9 }),
      // Ultimate load (1.5x limit factor)
      ultimateLoad: Object.freeze({ min: -4.5, max: 13.5 }),
      oleoStrokeM: 0.3,
      hardLandingGThreshold: 2.2,
      crashGThreshold: 3.5,
      landingRatings: Object.freeze([
        { id: "soft", maxG: 1.5, maxSinkFpm: 300, labelKey: "debrief.rating.soft" },
        { id: "normal", maxG: 2.2, maxSinkFpm: 600, labelKey: "debrief.rating.normalMilitary" },
        { id: "firm", maxG: 3, maxSinkFpm: 900, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 3.5, maxSinkFpm: 1200, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 3.5, minSinkFpm: 1200, labelKey: "debrief.rating.damage" }
      ])
    }),
    C172: Object.freeze({
      id: "C172",
      name: "Cessna 172 Skyhawk",
      type: "generalAviation",
      // Structural flight limits: Normal: -1.52G ~ +3.8G, Utility: +4.4G
      limitLoad: Object.freeze({ min: -1.52, max: 3.8, utilityMax: 4.4 }),
      // Ultimate load (1.5x limit factor)
      ultimateLoad: Object.freeze({ min: -2.28, max: 5.7, utilityMax: 6.6 }),
      oleoStrokeM: 0.15,
      // Spring-steel leaf gear
      hardLandingGThreshold: 1.7,
      crashGThreshold: 2.5,
      landingRatings: Object.freeze([
        { id: "smooth", maxG: 1.3, maxSinkFpm: 200, labelKey: "debrief.rating.smooth" },
        { id: "normal", maxG: 1.7, maxSinkFpm: 400, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 2.2, maxSinkFpm: 600, labelKey: "debrief.rating.firmBouncing" },
        { id: "severeHard", maxG: 2.5, maxSinkFpm: 800, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.5, minSinkFpm: 800, labelKey: "debrief.rating.damage" }
      ])
    }),
    A320: Object.freeze({
      id: "A320",
      name: "Airbus A320-200",
      type: "airliner",
      limitLoad: Object.freeze({ min: -1, max: 2.5, flapsDownMin: 0, flapsDownMax: 2 }),
      ultimateLoad: Object.freeze({ min: -1.5, max: 3.75, flapsDownMin: 0, flapsDownMax: 3 }),
      oleoStrokeM: 0.4,
      hardLandingGThreshold: 1.55,
      crashGThreshold: 2.1,
      landingRatings: Object.freeze([
        { id: "butter", maxG: 1.25, maxSinkFpm: 150, labelKey: "debrief.rating.butter" },
        { id: "normal", maxG: 1.55, maxSinkFpm: 300, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 1.8, maxSinkFpm: 500, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.1, maxSinkFpm: 600, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.1, minSinkFpm: 600, labelKey: "debrief.rating.damage" }
      ])
    }),
    B747: Object.freeze({
      id: "B747",
      name: "Boeing 747-400",
      type: "airliner",
      limitLoad: Object.freeze({ min: -1, max: 2.5, flapsDownMin: 0, flapsDownMax: 2 }),
      ultimateLoad: Object.freeze({ min: -1.5, max: 3.75, flapsDownMin: 0, flapsDownMax: 3 }),
      oleoStrokeM: 0.5,
      hardLandingGThreshold: 1.55,
      crashGThreshold: 2.1,
      landingRatings: Object.freeze([
        { id: "butter", maxG: 1.25, maxSinkFpm: 150, labelKey: "debrief.rating.butter" },
        { id: "normal", maxG: 1.55, maxSinkFpm: 300, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 1.8, maxSinkFpm: 500, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.1, maxSinkFpm: 600, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.1, minSinkFpm: 600, labelKey: "debrief.rating.damage" }
      ])
    }),
    DC10: Object.freeze({
      id: "DC10",
      name: "McDonnell Douglas DC-10-30",
      type: "airliner",
      limitLoad: Object.freeze({ min: -1, max: 2.5, flapsDownMin: 0, flapsDownMax: 2 }),
      ultimateLoad: Object.freeze({ min: -1.5, max: 3.75, flapsDownMin: 0, flapsDownMax: 3 }),
      oleoStrokeM: 0.45,
      hardLandingGThreshold: 1.55,
      crashGThreshold: 2.1,
      landingRatings: Object.freeze([
        { id: "butter", maxG: 1.25, maxSinkFpm: 150, labelKey: "debrief.rating.butter" },
        { id: "normal", maxG: 1.55, maxSinkFpm: 300, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 1.8, maxSinkFpm: 500, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.1, maxSinkFpm: 600, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.1, minSinkFpm: 600, labelKey: "debrief.rating.damage" }
      ])
    }),
    MD80: Object.freeze({
      id: "MD80",
      name: "McDonnell Douglas MD-82",
      type: "airliner",
      limitLoad: Object.freeze({ min: -1, max: 2.5, flapsDownMin: 0, flapsDownMax: 2 }),
      ultimateLoad: Object.freeze({ min: -1.5, max: 3.75, flapsDownMin: 0, flapsDownMax: 3 }),
      oleoStrokeM: 0.38,
      hardLandingGThreshold: 1.55,
      crashGThreshold: 2.1,
      landingRatings: Object.freeze([
        { id: "butter", maxG: 1.25, maxSinkFpm: 150, labelKey: "debrief.rating.butter" },
        { id: "normal", maxG: 1.55, maxSinkFpm: 300, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 1.8, maxSinkFpm: 500, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.1, maxSinkFpm: 600, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.1, minSinkFpm: 600, labelKey: "debrief.rating.damage" }
      ])
    }),
    CONCORDE: Object.freeze({
      id: "CONCORDE",
      name: "A\xE9rospatiale/BAC Concorde",
      type: "supersonicAirliner",
      limitLoad: Object.freeze({ min: -1, max: 2.5, flapsDownMin: -1, flapsDownMax: 2.5 }),
      ultimateLoad: Object.freeze({ min: -1.5, max: 3.75, flapsDownMin: -1.5, flapsDownMax: 3.75 }),
      oleoStrokeM: 0.42,
      hardLandingGThreshold: 1.65,
      crashGThreshold: 2.25,
      landingRatings: Object.freeze([
        { id: "butter", maxG: 1.25, maxSinkFpm: 150, labelKey: "debrief.rating.butter" },
        { id: "normal", maxG: 1.65, maxSinkFpm: 350, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 1.95, maxSinkFpm: 550, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.25, maxSinkFpm: 700, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.25, minSinkFpm: 700, labelKey: "debrief.rating.damage" }
      ])
    }),
    CL215: Object.freeze({
      id: "CL215",
      name: "Canadair CL-215 Amphibian",
      type: "amphibian",
      limitLoad: Object.freeze({ min: -1, max: 3.25, flapsDownMin: 0, flapsDownMax: 2.2 }),
      ultimateLoad: Object.freeze({ min: -1.5, max: 4.87, flapsDownMin: 0, flapsDownMax: 3.3 }),
      oleoStrokeM: 0.35,
      hardLandingGThreshold: 1.7,
      crashGThreshold: 2.4,
      landingRatings: Object.freeze([
        { id: "smooth", maxG: 1.3, maxSinkFpm: 180, labelKey: "debrief.rating.smooth" },
        { id: "normal", maxG: 1.7, maxSinkFpm: 380, labelKey: "debrief.rating.normal" },
        { id: "firm", maxG: 2.1, maxSinkFpm: 580, labelKey: "debrief.rating.firm" },
        { id: "severeHard", maxG: 2.4, maxSinkFpm: 750, labelKey: "debrief.rating.severeHard" },
        { id: "crash", minG: 2.4, minSinkFpm: 750, labelKey: "debrief.rating.damage" }
      ])
    })
  });
  var AircraftSpecs = AIRCRAFT_SPECS;
  BOEING_737_800.specs = AIRCRAFT_SPECS.B738;
  BOEING_737_800.hardLandingGThreshold = AIRCRAFT_SPECS.B738.hardLandingGThreshold;
  BOEING_737_800.crashGThreshold = AIRCRAFT_SPECS.B738.crashGThreshold;
  F16_FALCON.specs = AIRCRAFT_SPECS.F16;
  F16_FALCON.hardLandingGThreshold = AIRCRAFT_SPECS.F16.hardLandingGThreshold;
  F16_FALCON.crashGThreshold = AIRCRAFT_SPECS.F16.crashGThreshold;
  CESSNA_172.specs = AIRCRAFT_SPECS.C172;
  CESSNA_172.hardLandingGThreshold = AIRCRAFT_SPECS.C172.hardLandingGThreshold;
  CESSNA_172.crashGThreshold = AIRCRAFT_SPECS.C172.crashGThreshold;
  AIRBUS_A320.specs = AIRCRAFT_SPECS.A320;
  AIRBUS_A320.hardLandingGThreshold = AIRCRAFT_SPECS.A320.hardLandingGThreshold;
  AIRBUS_A320.crashGThreshold = AIRCRAFT_SPECS.A320.crashGThreshold;
  BOEING_747_400.specs = AIRCRAFT_SPECS.B747;
  BOEING_747_400.hardLandingGThreshold = AIRCRAFT_SPECS.B747.hardLandingGThreshold;
  BOEING_747_400.crashGThreshold = AIRCRAFT_SPECS.B747.crashGThreshold;
  DC10_30.specs = AIRCRAFT_SPECS.DC10;
  DC10_30.hardLandingGThreshold = AIRCRAFT_SPECS.DC10.hardLandingGThreshold;
  DC10_30.crashGThreshold = AIRCRAFT_SPECS.DC10.crashGThreshold;
  MD82.specs = AIRCRAFT_SPECS.MD80;
  MD82.hardLandingGThreshold = AIRCRAFT_SPECS.MD80.hardLandingGThreshold;
  MD82.crashGThreshold = AIRCRAFT_SPECS.MD80.crashGThreshold;
  CONCORDE.specs = AIRCRAFT_SPECS.CONCORDE;
  CONCORDE.hardLandingGThreshold = AIRCRAFT_SPECS.CONCORDE.hardLandingGThreshold;
  CONCORDE.crashGThreshold = AIRCRAFT_SPECS.CONCORDE.crashGThreshold;
  CANADAIR_CL215.specs = AIRCRAFT_SPECS.CL215;
  CANADAIR_CL215.hardLandingGThreshold = AIRCRAFT_SPECS.CL215.hardLandingGThreshold;
  CANADAIR_CL215.crashGThreshold = AIRCRAFT_SPECS.CL215.crashGThreshold;
  function getAircraftSpecs(aircraftId) {
    return AIRCRAFT_SPECS[aircraftId] || AIRCRAFT_SPECS.B738;
  }
  function classifyLanding(aircraftId, contactG, sinkRateFpm = 0) {
    const specs = getAircraftSpecs(aircraftId);
    const gVal = Number.isFinite(contactG) ? contactG : 1;
    const fpm = Number.isFinite(sinkRateFpm) ? sinkRateFpm : 0;
    if (aircraftId === "B738" || aircraftId === "A320" || aircraftId === "B747" || aircraftId === "DC10" || aircraftId === "MD80" || aircraftId === "CONCORDE") {
      if (gVal > specs.crashGThreshold || fpm > 600) {
        return { rating: "crash", labelKey: "debrief.rating.damage", isHard: true, isCrash: true };
      }
      if (gVal > 1.8 || fpm > 500) {
        return { rating: "severeHard", labelKey: "debrief.rating.severeHard", isHard: true, isCrash: false };
      }
      if (gVal > specs.hardLandingGThreshold || fpm > 300) {
        return { rating: "firm", labelKey: "debrief.rating.firm", isHard: true, isCrash: false };
      }
      if (gVal > 1.25 || fpm >= 150) {
        return { rating: "normal", labelKey: "debrief.rating.normal", isHard: false, isCrash: false };
      }
      return { rating: "butter", labelKey: "debrief.rating.butter", isHard: false, isCrash: false };
    }
    if (aircraftId === "CL215" || aircraftId === "AMPHIBIAN") {
      if (gVal > specs.crashGThreshold || fpm > 700) {
        return { rating: "crash", labelKey: "debrief.rating.damage", isHard: true, isCrash: true };
      }
      if (gVal > 2 || fpm > 550) {
        return { rating: "severeHard", labelKey: "debrief.rating.severeHard", isHard: true, isCrash: false };
      }
      if (gVal > specs.hardLandingGThreshold || fpm > 350) {
        return { rating: "firm", labelKey: "debrief.rating.firm", isHard: true, isCrash: false };
      }
      if (gVal > 1.3 || fpm >= 180) {
        return { rating: "normal", labelKey: "debrief.rating.normal", isHard: false, isCrash: false };
      }
      return { rating: "smooth", labelKey: "debrief.rating.smooth", isHard: false, isCrash: false };
    }
    if (aircraftId === "F16") {
      if (gVal > specs.crashGThreshold) {
        return { rating: "crash", labelKey: "debrief.rating.damage", isHard: true, isCrash: true };
      }
      if (gVal > 3) {
        return { rating: "severeHard", labelKey: "debrief.rating.severeHard", isHard: true, isCrash: false };
      }
      if (gVal > specs.hardLandingGThreshold) {
        return { rating: "firm", labelKey: "debrief.rating.firm", isHard: true, isCrash: false };
      }
      if (gVal > 1.5) {
        return { rating: "normal", labelKey: "debrief.rating.normalMilitary", isHard: false, isCrash: false };
      }
      return { rating: "soft", labelKey: "debrief.rating.soft", isHard: false, isCrash: false };
    }
    if (aircraftId === "C172") {
      if (gVal > specs.crashGThreshold) {
        return { rating: "crash", labelKey: "debrief.rating.damage", isHard: true, isCrash: true };
      }
      if (gVal > 2.2) {
        return { rating: "severeHard", labelKey: "debrief.rating.severeHard", isHard: true, isCrash: false };
      }
      if (gVal > specs.hardLandingGThreshold) {
        return { rating: "firm", labelKey: "debrief.rating.firmBouncing", isHard: true, isCrash: false };
      }
      if (gVal > 1.3) {
        return { rating: "normal", labelKey: "debrief.rating.normal", isHard: false, isCrash: false };
      }
      return { rating: "smooth", labelKey: "debrief.rating.smooth", isHard: false, isCrash: false };
    }
    const isCrash = gVal > specs.crashGThreshold;
    const isHard = gVal > specs.hardLandingGThreshold;
    return {
      rating: isCrash ? "crash" : isHard ? "firm" : "normal",
      labelKey: isCrash ? "debrief.rating.damage" : isHard ? "debrief.rating.firm" : "debrief.rating.normal",
      isHard,
      isCrash
    };
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/trimWheel.js
  var TRIM_WHEEL_AUTHORITY = 1;

  // node_modules/@stlim0727/flightsim-core/src/physics/MassProperties.js
  var vec = (x = 0, y = 0, z = 0) => ({ x, y, z });
  var AXES = ["x", "y", "z"];
  function bounded(value, max, label) {
    if (!Number.isFinite(value) || value < 0 || value > max) throw new RangeError(label);
    return value;
  }
  function addPoint(I, m, p2) {
    I.x += m * (p2.y * p2.y + p2.z * p2.z);
    I.y += m * (p2.x * p2.x + p2.z * p2.z);
    I.z += m * (p2.x * p2.x + p2.y * p2.y);
  }
  var MassProperties = class {
    constructor(config) {
      const m = config.massProperties || {};
      const d = config.massDistribution || {};
      this.maxMassKg = m.maxTakeoffWeightKg ?? Infinity;
      const referenceMass = d.referenceMassKg ?? m.currentMassKg ?? 66e3;
      this.emptyMassKg = m.emptyWeightKg ?? referenceMass - (config.propulsion?.fuelCapacityKg ?? 14200);
      this.tanks = (d.tanks ?? [{ id: "main", capacityKg: config.propulsion?.fuelCapacityKg ?? 14200, position: vec(), priority: 0 }]).map((t) => ({ ...t, position: { ...t.position }, massKg: t.capacityKg }));
      this.capacityKg = this.tanks.reduce((s, t) => s + t.capacityKg, 0);
      this.stations = (d.stations ?? [{ id: "payload", position: vec(), capacityKg: this.maxMassKg }]).map((s) => ({ ...s, position: { ...s.position }, massKg: 0 }));
      this.parts = (d.parts ?? []).map((p2) => ({ ...p2, position: { ...p2.stowed } }));
      const ids = /* @__PURE__ */ new Set();
      for (const item of [...this.tanks, ...this.stations]) {
        if (!item.id || ids.has(item.id)) throw new RangeError("unique loading IDs required");
        ids.add(item.id);
        if (!(item.capacityKg > 0)) throw new RangeError("positive capacity required");
        if (!AXES.every((a) => Number.isFinite(item.position[a]))) throw new RangeError("finite position required");
      }
      for (const t of this.tanks) if (t.priority !== 0 && t.priority !== 1) throw new RangeError("tank priority must be 0 or 1");
      for (const p2 of this.parts) {
        bounded(p2.massKg, this.emptyMassKg, "moving part mass");
        if (!["gear", "flap"].includes(p2.control) || !AXES.every((a) => Number.isFinite(p2.stowed[a]) && Number.isFinite(p2.deployed[a]))) {
          throw new RangeError("moving part configuration");
        }
      }
      this.structureMass = this.emptyMassKg - this.parts.reduce((s, p2) => s + p2.massKg, 0);
      if (!(this.structureMass > 0)) throw new RangeError("empty structure mass");
      const referencePayload = referenceMass - this.emptyMassKg - this.capacityKg;
      bounded(referencePayload, this.maxMassKg, "reference payload");
      this.stations.forEach((s) => {
        s.massKg = referencePayload / this.stations.length;
      });
      this.gear = 1;
      this.flap = 0;
      for (const p2 of this.parts) Object.assign(p2.position, p2.control === "gear" ? p2.deployed : p2.stowed);
      this.dryCg = vec();
      for (const p2 of [...this.tanks, ...this.stations, ...this.parts]) {
        for (const axis of AXES) this.dryCg[axis] -= p2.massKg * p2.position[axis] / this.structureMass;
      }
      this.dryInertia = vec(m.Iyy ?? 265e4, m.Izz ?? 39e5, m.Ixx ?? 138e4);
      const pointInertia = vec();
      for (const p2 of [...this.tanks, ...this.stations, ...this.parts]) addPoint(pointInertia, p2.massKg, p2.position);
      addPoint(pointInertia, this.structureMass, this.dryCg);
      for (const a of AXES) {
        this.dryInertia[a] -= pointInertia[a];
        if (!(this.dryInertia[a] > 0)) throw new RangeError(`invalid dry inertia ${a}`);
      }
      this.cg = vec();
      this.inertia = vec();
      this.inverseInertia = vec();
      this.revision = 0;
      this.initialFuelKg = d.initialFuelKg ?? this.capacityKg;
      this.initialPayloadKg = d.initialPayloadKg ?? referencePayload;
      this.reset();
    }
    reset() {
      const payload = Object.fromEntries(this.stations.map((s) => [s.id, this.initialPayloadKg / this.stations.length]));
      this.setLoading({ fuelKg: this.initialFuelKg, payloadKg: payload });
    }
    /** Validate the whole LMC before committing any field. Omitted fields stay put. */
    setLoading({ fuelKg = this.fuelKg, payloadKg = {} } = {}) {
      bounded(fuelKg, this.capacityKg, "fuel capacity");
      for (const key of Object.keys(payloadKg)) {
        if (!this.stations.some((s) => s.id === key)) throw new RangeError(`unknown station ${key}`);
      }
      let total = this.emptyMassKg + fuelKg;
      for (const s of this.stations) total += bounded(payloadKg[s.id] ?? s.massKg, s.capacityKg, `payload ${s.id}`);
      bounded(total, this.maxMassKg, "gross mass");
      for (const s of this.stations) s.massKg = payloadKg[s.id] ?? s.massKg;
      let remaining = fuelKg;
      const priorities = [...new Set(this.tanks.map((t) => t.priority))].sort((a, b) => b - a);
      for (const priority of priorities) {
        const group = this.tanks.filter((t) => t.priority === priority);
        const capacity = group.reduce((s, t) => s + t.capacityKg, 0);
        const fill = Math.min(remaining, capacity);
        for (const t of group) t.massKg = fill * t.capacityKg / capacity;
        remaining -= fill;
      }
      this.recompute();
    }
    /** Shared-feed approximation; all engines can draw from all tanks. */
    consume(requestKg) {
      bounded(requestKg, Infinity, "fuel demand");
      const supplied = Math.min(requestKg, this.fuelKg);
      let remaining = supplied;
      for (let priority = 0; priority <= 1 && remaining > 0; priority++) {
        let available = 0;
        for (const t of this.tanks) if (t.priority === priority) available += t.massKg;
        const take = Math.min(remaining, available);
        if (available > 0) for (const t of this.tanks) {
          if (t.priority === priority) t.massKg = Math.max(0, t.massKg * (1 - take / available));
        }
        remaining -= take;
      }
      if (supplied > 0) this.recompute();
      return supplied;
    }
    setConfiguration(gear, flap) {
      bounded(gear, 1, "gear deployment");
      bounded(flap, 1, "flap deployment");
      if (gear === this.gear && flap === this.flap) return;
      this.gear = gear;
      this.flap = flap;
      for (const p2 of this.parts) {
        const fraction = p2.control === "gear" ? gear : flap;
        for (const a of AXES) p2.position[a] = p2.stowed[a] + fraction * (p2.deployed[a] - p2.stowed[a]);
      }
      this.recompute();
    }
    recompute() {
      this.fuelKg = 0;
      this.zeroFuelMassKg = this.emptyMassKg;
      for (const t of this.tanks) this.fuelKg += t.massKg;
      for (const s of this.stations) this.zeroFuelMassKg += s.massKg;
      this.massKg = this.zeroFuelMassKg + this.fuelKg;
      for (const a of AXES) {
        this.cg[a] = this.structureMass * this.dryCg[a];
        this.inertia[a] = this.dryInertia[a];
      }
      this.accumulate(this.tanks);
      this.accumulate(this.stations);
      this.accumulate(this.parts);
      addPoint(this.inertia, this.structureMass, this.dryCg);
      for (const a of AXES) this.cg[a] /= this.massKg;
      addPoint(this.inertia, -this.massKg, this.cg);
      for (const a of AXES) {
        if (!(this.inertia[a] > 0)) throw new RangeError(`invalid inertia ${a}`);
        this.inverseInertia[a] = 1 / this.inertia[a];
      }
      this.revision++;
    }
    accumulate(items) {
      for (const p2 of items) {
        this.cg.x += p2.massKg * p2.position.x;
        this.cg.y += p2.massKg * p2.position.y;
        this.cg.z += p2.massKg * p2.position.z;
        addPoint(this.inertia, p2.massKg, p2.position);
      }
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/longitudinalForces.js
  function longitudinalForces(aero, qDyn, alpha, cl, cd, elevatorEffective, thrust, out) {
    const qS = qDyn * aero.wingArea;
    const qSc = qS * aero.meanChord;
    const baseCm = aero.Cm0 + aero.Cma * alpha;
    const controlCm = -aero.Cm_de * elevatorEffective;
    const arm2 = aero.tailArmM;
    const sin = Math.sin(alpha), cos = Math.cos(alpha);
    const projectedArm = arm2 * Math.max(0.2, cos);
    const tailReference = arm2 > 0 ? qSc * baseCm / projectedArm : 0;
    const tailActual = arm2 > 0 ? -qSc * controlCm / projectedArm : 0;
    const tailDelta = tailActual - tailReference;
    const tailDragDelta = arm2 > 0 && qDyn > 0 ? (tailActual ** 2 - tailReference ** 2) * aero.tailInducedFactor / (qDyn * aero.tailAreaM2) : 0;
    const lift = qS * cl + tailDelta;
    const drag = Math.max(0, qS * cd + tailDragDelta);
    out.y = lift * cos + drag * sin;
    out.z = drag * cos - lift * sin;
    const c = aero.cg;
    out.pitch = qSc * (baseCm + controlCm) + thrust * aero.thrustPitchArmM + c.z * out.y - c.y * (out.z - thrust);
    out.lift = lift;
    out.drag = drag;
    out.tailForce = tailActual;
    out.tailDragDelta = tailDragDelta;
    return out;
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/gLimiter.js
  function limitedPitchMoment({
    requestedMoment,
    inertia,
    pitchRate,
    alphaRate,
    normalG,
    gPerAlpha,
    limits
  }) {
    const bandwidth = 6;
    const margin = 0.35;
    const lowerAcceleration = bandwidth ** 2 * (limits.min + margin - normalG) / gPerAlpha - 2 * bandwidth * alphaRate;
    const upperAcceleration = bandwidth ** 2 * (limits.max - margin - normalG) / gPerAlpha - 2 * bandwidth * alphaRate;
    const damping = 0.35 * pitchRate;
    return Math.max(
      (lowerAcceleration + damping) * inertia,
      Math.min((upperAcceleration + damping) * inertia, requestedMoment)
    );
  }
  function incidenceRate(u, v, w, omega, aY, aZ) {
    return omega.x + (-u * aY + w * aZ + v * (u * omega.z + w * omega.y)) / Math.max(100, u * u + w * w);
  }
  function loadSlope(aero, qDyn, alpha) {
    return Math.max(0.1, qDyn * aero.wingArea * aero.CLa * Math.cos(alpha) * aero.tuning.liftMultiplier / (aero.mass * Atmosphere.G0));
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/combatDamage.js
  var THREE = __toESM(require_three(), 1);
  var COMBAT_DAMAGE_LIMITS = Object.freeze({
    // A bandit drone is a generic light airframe. Its destruction threshold is
    // separate from the aircraft body/gear damage budgets in bodyDamage.js.
    banditIntegrity: 1
  });
  var COMBAT_DAMAGE_ZONES = Object.freeze([
    "nose",
    "fuselage",
    "wingL",
    "wingR",
    "tail",
    "engine"
  ]);
  var ZONE_LOCAL_CENTERS = Object.freeze({
    nose: Object.freeze({ x: 0, y: 0, z: -4.5 }),
    fuselage: Object.freeze({ x: 0, y: 0, z: 0 }),
    wingL: Object.freeze({ x: -3, y: 0, z: 0.6 }),
    wingR: Object.freeze({ x: 3, y: 0, z: 0.6 }),
    tail: Object.freeze({ x: 0, y: 1, z: 4.8 }),
    engine: Object.freeze({ x: 0, y: 0, z: 4.2 })
  });
  var _offset = new THREE.Vector3();
  var _invQuat = new THREE.Quaternion();
  var _velQuat = new THREE.Quaternion();
  var _velDir = new THREE.Vector3();
  var _forward = new THREE.Vector3(0, 0, -1);
  function computeAeroDamageEffects(damageZones, out = {}) {
    const nose = Math.min(1, Math.max(0, damageZones?.nose ?? 0));
    const fuselage = Math.min(1, Math.max(0, damageZones?.fuselage ?? damageZones?.belly ?? 0));
    const wingL = Math.min(1, Math.max(0, damageZones?.wingL ?? 0));
    const wingR = Math.min(1, Math.max(0, damageZones?.wingR ?? 0));
    const tail = Math.min(1, Math.max(0, damageZones?.tail ?? 0));
    const engine = Math.min(1, Math.max(0, damageZones?.engine ?? Math.max(damageZones?.engineL ?? 0, damageZones?.engineR ?? 0)));
    out.liftScale = Math.max(0.45, 1 - 0.14 * (wingL + wingR));
    out.parasiticDragDelta = 0.032 * (wingL + wingR) + 0.022 * fuselage + 0.014 * nose + 0.018 * tail;
    out.rollAsymmetry = (wingL - wingR) * 0.14;
    out.yawAsymmetry = (wingL - wingR) * 0.03;
    out.aileronAuthority = Math.max(0.25, 1 - 0.55 * Math.max(wingL, wingR));
    out.elevatorAuthority = Math.max(0.25, 1 - 0.6 * tail);
    out.rudderAuthority = Math.max(0.25, 1 - 0.6 * tail);
    out.stabilityScale = Math.max(0.35, 1 - 0.45 * tail);
    out.avionicsScale = Math.max(0.25, 1 - 0.6 * nose);
    out.engineDamage = engine;
    return out;
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/Aerodynamics.js
  function createAeroResult() {
    return { forceWorld: new THREE2.Vector3(), momentBody: new THREE2.Vector3() };
  }
  var Aerodynamics = class {
    constructor(config = BOEING_737_800) {
      this._longitudinal = {};
      this._limiterNeutral = {};
      this._limiterProbe = {};
      this._limiterGravity = new THREE2.Vector3();
      this._limiterForceDelta = new THREE2.Vector3();
      this._damageEffects = {};
      this.damageZones = null;
      this.loadConfig(config);
      this.tuning = {
        elevatorSensitivity: 1,
        aileronSensitivity: 1,
        rudderSensitivity: 1,
        stallAngleMultiplier: 1,
        groundEffectMultiplier: 1,
        liftMultiplier: 1,
        dragMultiplier: 1
      };
      this.elevator = 0;
      this.aileron = 0;
      this.rudder = 0;
      this.pitchTrim = 0;
      this.flapsIndex = 0;
      this.flapAngles = config.aerodynamics?.flapAngles || [0, 1, 5, 15, 20, 30, 40];
      this.currentFlapAngle = 0;
      this.spoilers = 0;
      this.alpha = 0;
      this.beta = 0;
      this.tas = 0;
      this.ias = 0;
      this.mach = 0;
      this.qDyn = 0;
      this.separation = 0;
      this.isStalled = false;
      this.isPreStall = false;
      this.stallSeverity = 0;
      this.buffetVibration = 0;
      this.lift = 0;
      this.drag = 0;
      this.sideForce = 0;
      this.gForce = 1;
      this.windWorld = new THREE2.Vector3(0, 0, 0);
      this.windLeftWorld = new THREE2.Vector3();
      this.windRightWorld = new THREE2.Vector3();
      this._wingWindDifference = new THREE2.Vector3();
      this._airVelocity = new THREE2.Vector3();
      this._bodyVelocity = new THREE2.Vector3();
      this._inverseQuaternion = new THREE2.Quaternion();
    }
    loadConfig(config) {
      this.gLimiterLimits = config.flightControls?.gLimiter ? config.specs.limitLoad : null;
      const aero = config.aerodynamics || {};
      const mass = config.massProperties || {};
      this.mass = mass.currentMassKg || 66e3;
      this.massBaselineKg = this.mass;
      this.massProperties = new MassProperties(config);
      this.cg = this.massProperties.cg;
      this.tailArmM = aero.tailArmM ?? 0;
      this.tailAreaM2 = aero.tailAreaM2 ?? 1;
      this.tailInducedFactor = aero.tailInducedFactor ?? 0.1;
      this.wingspan = aero.wingspanM || 35.8;
      this.wingArea = aero.wingAreaM2 || 124.6;
      this.meanChord = aero.meanChordM || 3.99;
      this.aspectRatio = this.wingspan * this.wingspan / this.wingArea;
      this.oswaldEfficiency = aero.oswaldEfficiency || 0.82;
      this.Ixx = mass.Ixx || 138e4;
      this.Iyy = mass.Iyy || 265e4;
      this.Izz = mass.Izz || 39e5;
      this.invIxx = 1 / this.Ixx;
      this.invIyy = 1 / this.Iyy;
      this.invIzz = 1 / this.Izz;
      this.syncMassProperties();
      this.massBaselineKg = this.mass;
      this.CL0_clean = aero.cl0Clean || 0.22;
      this.CLa = aero.claPerRad || 5.65;
      this.alphaStallClean = THREE2.MathUtils.degToRad(aero.alphaStallDeg || 15.5);
      this.CD0 = aero.cd0Clean || 0.0185;
      this.stallWarningConfig = config.stallWarning || { marginDeg: 2 };
      this.warningReferenceMass = mass.maxTakeoffWeightKg || this.mass;
      this.isStallWarning = false;
      this.gearHandleDown = void 0;
      this.Cm0 = aero.cm0 ?? -0.02;
      this.thrustPitchArmM = config.propulsion?.pitchMomentArmMeters ?? 0.32;
      this.Cma = aero.cma || -0.85;
      this.Cm_de = aero.cmDe || -1.35;
      this.Cmq = aero.cmQ || -15.5;
      this.Cl_b = aero.clBeta || -0.14;
      this.Cl_da = aero.clDa || 0.19;
      this.Cl_p = aero.clP || -0.52;
      this.Cn_b = -Math.abs(aero.cnBeta !== void 0 ? aero.cnBeta : 0.22);
      this.Cn_dr = aero.cnDr || -0.12;
      this.Cn_r = aero.cnR || -0.32;
      this.gearDrag = aero.gearDrag ?? 0.024;
      this.spoilerDrag = aero.spoilerDrag ?? 0.075;
      this.transonicMachBuffet = aero.transonicMachBuffet ?? 0.78;
      if (aero.flapAngles && Array.isArray(aero.flapAngles) && aero.flapAngles.length > 0) {
        this.flapAngles = [...aero.flapAngles];
      } else {
        this.flapAngles = [0, 1, 5, 15, 20, 30, 40];
      }
      this.flapsIndex = Math.max(0, Math.min(this.flapAngles.length - 1, this.flapsIndex ?? 0));
      this.currentFlapAngle = this.flapAngles[this.flapsIndex];
      this.resetFlapDamage();
    }
    resetFlapDamage() {
      this.flapAngleOffset = 0;
      this.leftFlapDamage = 0;
      this.rightFlapDamage = 0;
    }
    advanceFlaps(dt) {
      const target = this.flapAngles[this.flapsIndex];
      const travel = Math.min(1, dt * 0.4);
      const offset2 = this.flapAngleOffset ?? 0;
      const left = this.currentFlapAngle - offset2;
      const right = this.currentFlapAngle + offset2;
      const nextLeft = left + (target - left) * travel * (1 - (this.leftFlapDamage ?? 0));
      const nextRight = right + (target - right) * travel * (1 - (this.rightFlapDamage ?? 0));
      this.currentFlapAngle = (nextLeft + nextRight) * 0.5;
      this.flapAngleOffset = (nextRight - nextLeft) * 0.5;
    }
    syncMassProperties() {
      const state = this.massProperties;
      this.mass = state.massKg;
      this.Ixx = state.inertia.z;
      this.Iyy = state.inertia.x;
      this.Izz = state.inertia.y;
      this.invIxx = state.inverseInertia.z;
      this.invIyy = state.inverseInertia.x;
      this.invIzz = state.inverseInertia.y;
    }
    setFlapPosition(index) {
      this.flapsIndex = Math.max(0, Math.min(this.flapAngles.length - 1, index));
    }
    cycleFlaps(increment) {
      this.setFlapPosition(this.flapsIndex + increment);
    }
    toggleSpoilers() {
      this.spoilers = this.spoilers > 0.1 ? 0 : 1;
    }
    setTrim(delta2) {
      this.pitchTrim = Math.max(-5, Math.min(12, this.pitchTrim + delta2));
    }
    /**
     * Compute aerodynamic forces and moments
     * @param {number} dt
     * @param {THREE.Object3D} aircraftMesh
     * @param {THREE.Vector3} linearVelocityWorld (m/s)
     * @param {THREE.Vector3} angularVelocityBody (rad/s) [p, q, r]
     * @param {number} altitudeMeters
     * @param {number} heightAboveGround
     * @param {number} engineThrustTotal (Newtons)
     * @param {number} gearState (0.0 to 1.0)
     */
    computeAero(dt, aircraftMesh, linearVelocityWorld, angularVelocityBody, altitudeMeters, heightAboveGround, engineThrustTotal, gearState, result = createAeroResult(), configurationAdvanced = false) {
      if (!configurationAdvanced) this.advanceFlaps(dt);
      const atmos = Atmosphere.getConditions(altitudeMeters);
      const vAirWorld = this._airVelocity.copy(linearVelocityWorld).sub(this.windWorld);
      const invQuat = this._inverseQuaternion.copy(aircraftMesh.quaternion).invert();
      const vBody = this._bodyVelocity.copy(vAirWorld).applyQuaternion(invQuat);
      const u = -vBody.z;
      const v = vBody.x;
      const w = -vBody.y;
      const tas = Math.sqrt(u * u + v * v + w * w);
      this.tas = tas;
      this.ias = Atmosphere.tasToIas(tas, atmos.densityRatio);
      this.mach = tas / atmos.speedOfSound;
      if (tas > 1.5) {
        this.alpha = Math.atan2(w, Math.max(0.5, u));
        this.beta = Math.asin(Math.max(-1, Math.min(1, v / tas)));
      } else {
        this.alpha = 0;
        this.beta = 0;
      }
      const qDyn = 0.5 * atmos.density * (tas * tas);
      this.qDyn = qDyn;
      const flapFraction = this.currentFlapAngle / 40;
      const cl0 = this.CL0_clean + 0.95 * flapFraction;
      const alphaStall = this.alphaStallClean + THREE2.MathUtils.degToRad(2 * flapFraction);
      const absAlpha = Math.abs(this.alpha);
      const separationWeight = THREE2.MathUtils.clamp((tas - 2) / 13, 0, 1);
      const separationTarget = THREE2.MathUtils.clamp(
        (absAlpha - alphaStall) / THREE2.MathUtils.degToRad(12),
        0,
        1
      ) * separationWeight;
      const reattachMix = 1 - Math.exp(-dt / 0.5);
      this.separation = Math.max(separationTarget, this.separation * (1 - reattachMix));
      this.stallSeverity = this.separation;
      const stallAnnunciationValid = tas > 15;
      this.isStalled = stallAnnunciationValid && this.separation > 0.1;
      const warning = this.stallWarningConfig;
      let warningAlpha = alphaStall - THREE2.MathUtils.degToRad(warning.marginDeg ?? 2);
      if (warning.type === "pneumaticHorn") {
        const clMax = cl0 + this.CLa * alphaStall;
        const referenceVs = Math.sqrt(2 * this.warningReferenceMass * Atmosphere.G0 / (1.225 * this.wingArea * clMax));
        const speedRatio = referenceVs / (referenceVs + warning.referenceMarginKnots / 1.94384);
        warningAlpha = (clMax * speedRatio * speedRatio - cl0) / this.CLa;
      } else if (warning.type === "lowSpeed" && (this.gearHandleDown ?? gearState > 0.5)) {
        warningAlpha = THREE2.MathUtils.degToRad(warning.gearDownAlphaDeg);
      }
      this.stallWarningAlphaDeg = THREE2.MathUtils.radToDeg(warningAlpha);
      this.isStallWarning = stallAnnunciationValid && this.alpha > warningAlpha;
      this.isPreStall = this.isStallWarning && !this.isStalled;
      const clCapped = cl0 + this.CLa * Math.sign(this.alpha) * Math.min(absAlpha, alphaStall);
      const clFlatPlate = 2 * Math.sin(this.alpha) * Math.cos(this.alpha);
      const brk = 1 - Math.exp(-this.separation / 0.01);
      const W = Math.pow(this.separation, 1.3);
      let cl = (1 - W) * (1 - 0.28 * brk) * clCapped + W * clFlatPlate;
      const qBuffetScale = Math.min(1, qDyn / 500);
      this.buffetVibration = Math.min(1, this.separation * 1.5) * qBuffetScale;
      cl -= 0.38 * this.spoilers;
      const dmg = this.damageZones ? computeAeroDamageEffects(this.damageZones, this._damageEffects) : null;
      if (dmg) cl *= dmg.liftScale;
      let geFactor = 1;
      if (heightAboveGround < this.wingspan * 1.2) {
        const h_b = Math.max(0.08, heightAboveGround / this.wingspan);
        geFactor = 16 * h_b * h_b / (1 + 16 * h_b * h_b);
        if (h_b < 0.5) {
          cl *= 1 + 0.12 * (0.5 - h_b);
        }
      }
      let cdParasitic = this.CD0;
      cdParasitic += 12e-4 * this.currentFlapAngle + 45e-6 * (this.currentFlapAngle ** 2 + this.flapAngleOffset ** 2);
      cdParasitic += this.gearDrag * gearState;
      cdParasitic += this.spoilerDrag * this.spoilers;
      if (this.mach > this.transonicMachBuffet) {
        cdParasitic += Math.pow(this.mach - this.transonicMachBuffet, 3.5) * 8;
      }
      if (dmg) cdParasitic += dmg.parasiticDragDelta;
      const cdInduced = cl * cl / (Math.PI * this.aspectRatio * this.oswaldEfficiency) * geFactor;
      const cdStall = this.separation * 1.8 * Math.pow(Math.sin(this.alpha), 2);
      const cd = cdParasitic + cdInduced + cdStall;
      const cy = -0.75 * this.beta + 0.18 * this.rudder;
      const sideForce = qDyn * this.wingArea * cy;
      this.sideForce = sideForce;
      const q = angularVelocityBody.x;
      const r = angularVelocityBody.y;
      const p2 = angularVelocityBody.z;
      const vRef = Math.max(10, tas);
      const qHat = q * this.meanChord / (2 * vRef);
      const pHat = p2 * this.wingspan / (2 * vRef);
      const rHat = r * this.wingspan / (2 * vRef);
      const maxElevatorRad = THREE2.MathUtils.degToRad(20);
      const maxAileronRad = THREE2.MathUtils.degToRad(20);
      const maxRudderRad = THREE2.MathUtils.degToRad(26);
      const elevatorRad = this.elevator * maxElevatorRad * this.tuning.elevatorSensitivity;
      const trimRad = THREE2.MathUtils.degToRad(this.pitchTrim) * TRIM_WHEEL_AUTHORITY;
      const elevatorEffectiveness = (1 - 0.8 * this.separation) * (dmg ? dmg.elevatorAuthority : 1);
      let elevatorEffective = (elevatorRad + trimRad) * elevatorEffectiveness;
      const stabilityScale = dmg ? dmg.stabilityScale : 1;
      let cm = this.Cm0 + this.Cma * stabilityScale * this.alpha - this.Cm_de * elevatorEffective + this.Cmq * qHat;
      cm -= 0.55 * this.separation * (1 + 0.9 * this.separation) * Math.sign(this.alpha);
      const thrustPitchMoment = engineThrustTotal * this.thrustPitchArmM;
      const aileronRad = this.aileron * maxAileronRad * this.tuning.aileronSensitivity * (dmg ? dmg.aileronAuthority : 1);
      const spoilerRoll = aileronRad > 0.02 ? aileronRad * 0.05 : aileronRad < -0.02 ? aileronRad * 0.05 : 0;
      const stallRollDivergence = this.separation * 0.8 * this.beta;
      const cl_roll = this.Cl_b * this.beta + this.Cl_da * (aileronRad + spoilerRoll) + Math.abs(this.Cl_p) * pHat + stallRollDivergence;
      const rudderRad = this.rudder * maxRudderRad * this.tuning.rudderSensitivity * (dmg ? dmg.rudderAuthority : 1);
      const adverseYaw = 0.025 * aileronRad;
      const cn = this.Cn_b * stabilityScale * this.beta + this.Cn_dr * rudderRad + this.Cn_r * rHat + adverseYaw;
      const pitchMoment = qDyn * this.wingArea * this.meanChord * cm + thrustPitchMoment;
      const rollAsymmetry = (dmg ? dmg.rollAsymmetry * cl : 0) + 0.2 * (1 - W) * (1 - 0.28 * brk) * 0.95 * this.flapAngleOffset / 40;
      const yawAsymmetry = (dmg ? dmg.yawAsymmetry : 0) - 0.2 * this.flapAngleOffset * (12e-4 + 9e-5 * this.currentFlapAngle);
      const rollMoment = -(qDyn * this.wingArea * this.wingspan * cl_roll) + qDyn * this.wingArea * this.wingspan * rollAsymmetry;
      const yawMoment = qDyn * this.wingArea * this.wingspan * (cn + yawAsymmetry);
      result.momentBody.set(
        pitchMoment,
        // Rotation around X (Pitch: positive pitch up)
        yawMoment,
        // Rotation around Y (Yaw: negative yaw right)
        rollMoment
        // Rotation around Z (Roll: negative roll right)
      );
      const longitudinal = longitudinalForces(
        this,
        qDyn,
        this.alpha,
        cl,
        cd,
        elevatorEffective,
        engineThrustTotal,
        this._longitudinal
      );
      result.forceWorld.set(sideForce, longitudinal.y, longitudinal.z).applyQuaternion(aircraftMesh.quaternion);
      result.momentBody.x += longitudinal.pitch - (qDyn * this.wingArea * this.meanChord * (this.Cm0 + this.Cma * this.alpha - this.Cm_de * elevatorEffective) + thrustPitchMoment);
      result.momentBody.y += this.cg.x * (longitudinal.z - engineThrustTotal) - this.cg.z * sideForce;
      result.momentBody.z += this.cg.y * sideForce - this.cg.x * longitudinal.y;
      if (this.gLimiterLimits && u > 30) {
        const neutral = longitudinalForces(
          this,
          qDyn,
          this.alpha,
          cl,
          cd,
          0,
          engineThrustTotal,
          this._limiterNeutral
        );
        const gravityBody = this._limiterGravity.set(0, -Atmosphere.G0, 0).applyQuaternion(invQuat);
        const alphaRate = incidenceRate(
          u,
          v,
          w,
          angularVelocityBody,
          neutral.y / this.mass + gravityBody.y,
          (neutral.z - engineThrustTotal) / this.mass + gravityBody.z
        );
        const permittedMoment = limitedPitchMoment({
          requestedMoment: result.momentBody.x,
          inertia: this.Iyy,
          pitchRate: angularVelocityBody.x,
          alphaRate,
          normalG: neutral.y / (this.mass * Atmosphere.G0),
          gPerAlpha: loadSlope(this, qDyn, this.alpha),
          limits: this.gLimiterLimits
        });
        const probe = longitudinalForces(
          this,
          qDyn,
          this.alpha,
          cl,
          cd,
          elevatorEffective + 1e-3,
          engineThrustTotal,
          this._limiterProbe
        );
        const momentPerRadian = (probe.pitch - longitudinal.pitch) / 1e-3;
        if (momentPerRadian > 1 && permittedMoment !== result.momentBody.x) {
          const limited = THREE2.MathUtils.clamp(
            elevatorEffective + (permittedMoment - result.momentBody.x) / momentPerRadian,
            -maxElevatorRad * elevatorEffectiveness,
            maxElevatorRad * elevatorEffectiveness
          );
          const previousY = longitudinal.y, previousZ = longitudinal.z, previousPitch = longitudinal.pitch;
          longitudinalForces(this, qDyn, this.alpha, cl, cd, limited, engineThrustTotal, longitudinal);
          result.forceWorld.add(this._limiterForceDelta.set(
            0,
            longitudinal.y - previousY,
            longitudinal.z - previousZ
          ).applyQuaternion(aircraftMesh.quaternion));
          result.momentBody.x += longitudinal.pitch - previousPitch;
          result.momentBody.y += this.cg.x * (longitudinal.z - previousZ);
          result.momentBody.z -= this.cg.x * (longitudinal.y - previousY);
          elevatorEffective = limited;
        }
      }
      result.elevatorEffective = elevatorEffective;
      const wingWind = this._wingWindDifference.subVectors(this.windRightWorld, this.windLeftWorld).applyQuaternion(invQuat);
      const deltaAlpha = (u * wingWind.y - w * wingWind.z) / Math.max(100, u * u + w * w);
      const deltaLift = qDyn * (this.wingArea / 2) * this.CLa * deltaAlpha * (1 - this.separation) * this.tuning.liftMultiplier;
      const wingGustRollMoment = this.wingspan / 4 * deltaLift * Math.cos(this.alpha);
      result.momentBody.z += wingGustRollMoment;
      result.wingGustRollMoment = wingGustRollMoment;
      this.lift = longitudinal.lift;
      this.drag = longitudinal.drag;
      this.gForce = longitudinal.y / (this.mass * Atmosphere.G0);
      result.tailForce = longitudinal.tailForce;
      result.tailDragDelta = longitudinal.tailDragDelta;
      result.alphaDeg = THREE2.MathUtils.radToDeg(this.alpha);
      result.betaDeg = THREE2.MathUtils.radToDeg(this.beta);
      result.iasKnots = Atmosphere.msToKnots(this.ias);
      result.tasKnots = Atmosphere.msToKnots(this.tas);
      result.mach = this.mach;
      result.qDyn = this.qDyn;
      result.cl = cl;
      result.cd = cd;
      result.lift = this.lift;
      result.drag = this.drag;
      result.isStalled = this.isStalled;
      result.isPreStall = this.isPreStall;
      result.stallSeverity = this.stallSeverity;
      result.isStallWarning = this.isStallWarning;
      result.stallWarningAlphaDeg = this.stallWarningAlphaDeg;
      result.separation = this.separation;
      result.buffetVibration = this.buffetVibration;
      result.gForce = this.gForce;
      return result;
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/EngineModel.js
  function asymmetricThrustYawMoment(thrustLeft, thrustRight, armMeters = 4.5) {
    if (thrustLeft === void 0 || thrustRight === void 0 || armMeters === 0) return 0;
    return armMeters * (thrustRight - thrustLeft);
  }
  function n1ToThrustFactor(n1, idleN1 = 22, togaN1 = 100) {
    const thrustIdleFloor = Math.max(0, idleN1 - 2);
    const thrustN1Range = Math.max(1, togaN1 - thrustIdleFloor);
    const n1Norm = Math.max(0, (n1 - thrustIdleFloor) / thrustN1Range);
    return Math.pow(n1Norm, 2.1);
  }
  function thrustFactorToN1(thrustFactor, idleN1 = 22, togaN1 = 100) {
    const thrustIdleFloor = Math.max(0, idleN1 - 2);
    const thrustN1Range = Math.max(1, togaN1 - thrustIdleFloor);
    const n1Norm = Math.pow(Math.max(0, thrustFactor), 1 / 2.1);
    return thrustIdleFloor + thrustN1Range * n1Norm;
  }
  var EngineModel = class {
    constructor(config = null) {
      this.throttleCommand = 0;
      this.reverserActive = false;
      this.reverserDeployment = 0;
      this.loadConfig(config);
    }
    loadConfig(config = null) {
      const propulsion = config?.propulsion || config || {};
      this.numEngines = propulsion.numEngines ?? 2;
      this.maxStaticThrustPerEngine = propulsion.maxStaticThrustPerEngineN ?? propulsion.maxStaticThrustPerEngine ?? 121e3;
      this.idleN1 = propulsion.idleN1Percent ?? 22;
      this.togaN1 = propulsion.togaN1Percent ?? 100;
      this.spoolUpTime = propulsion.spoolUpTimeSec ?? propulsion.spoolUpTime ?? 3.2;
      this.spoolDownTime = propulsion.spoolDownTimeSec ?? propulsion.spoolDownTime ?? 2.4;
      this.reverseThrustEfficiency = propulsion.reverseThrustEfficiency ?? 0.45;
      this.fuelCapacityKg = propulsion.fuelCapacityKg ?? 14200;
      this.massProperties = null;
      this._fuelKg = this.fuelCapacityKg;
      this.windmillingN1 = propulsion.windmillingN1 ?? 9;
      this.momentArmMeters = propulsion.momentArmMeters ?? (this.numEngines > 1 ? 4.5 : 0);
      this.baseFuelFlowKgPerHour = propulsion.baseFuelFlowKgPerHour ?? 350;
      this.maxFuelFlowKgPerHour = propulsion.maxFuelFlowKgPerHour ?? this.baseFuelFlowKgPerHour * 7.14;
      this.n1 = new Array(this.numEngines).fill(this.idleN1);
      this.targetN1 = new Array(this.numEngines).fill(this.idleN1);
      this.n2 = new Array(this.numEngines).fill(62);
      this.egt = new Array(this.numEngines).fill(420);
      this.fuelFlow = new Array(this.numEngines).fill(this.baseFuelFlowKgPerHour);
      this.thrust = new Array(this.numEngines).fill(0);
      this.contactDamage = new Array(this.numEngines).fill(0);
      this.failed = new Array(this.numEngines).fill(false);
    }
    setThrottle(val) {
      this.throttleCommand = Math.max(0, Math.min(1, val));
    }
    get fuelKg() {
      return this.massProperties?.fuelKg ?? this._fuelKg;
    }
    set fuelKg(value) {
      if (!Number.isFinite(value) || value < 0 || value > this.fuelCapacityKg) throw new RangeError("fuel load");
      if (this.massProperties) this.massProperties.setLoading({ fuelKg: value });
      else this._fuelKg = value;
    }
    bindMassProperties(model) {
      this.massProperties = model;
      this.fuelCapacityKg = model.capacityKg;
    }
    /** A preset restores its own initial loading, not necessarily full tanks. */
    refuel(aero) {
      this.bindMassProperties(aero.massProperties);
      this.massProperties.reset();
      aero.syncMassProperties();
    }
    setEngineFailure(index, on) {
      if (index < 0 || index >= this.numEngines) return false;
      this.failed[index] = !!on;
      return this.failed[index];
    }
    toggleReverser(onGround) {
      if (onGround) {
        this.reverserActive = !this.reverserActive;
      } else {
        this.reverserActive = false;
      }
      return this.reverserActive;
    }
    setReverser(active, onGround) {
      this.reverserActive = onGround && active;
    }
    /** Fan speed a steady throttle command converges to, reverser schedule included. */
    commandedN1() {
      if (this.reverserDeployment > 0.5 && this.reverseThrustEfficiency > 0) {
        return this.idleN1 + (this.throttleCommand > 0.1 ? this.throttleCommand : 0.65) * (this.togaN1 - this.idleN1) * 0.7;
      }
      return this.idleN1 + this.throttleCommand * (this.togaN1 - this.idleN1);
    }
    /** Fan speed engine `index` converges to for the current command and health. */
    fanTarget(index) {
      const out = this.failed[index] || this.fuelKg <= 0;
      const commanded = this.commandedN1();
      return out ? this.windmillingN1 : this.windmillingN1 + (commanded - this.windmillingN1) * (1 - this.contactDamage[index]);
    }
    /**
     * Bring the fan speed to what the commanded throttle holds in steady state.
     * A preset declares a flight state, and N1 is part of that state: leaving it
     * at idle makes the first seconds of every airborne spawn a spool transient
     * instead of the balance the preset describes.
     */
    settleSpool() {
      for (let i = 0; i < this.numEngines; i++) this.n1[i] = this.targetN1[i] = this.fanTarget(i);
    }
    update(dt, altitudeMeters, tas, densityRatio) {
      const reverserTarget = this.reverserActive ? 1 : 0;
      this.reverserDeployment += (reverserTarget - this.reverserDeployment) * Math.min(1, dt * 2.5);
      const altitudeLapse = Math.pow(Math.max(0.1, densityRatio), 0.75);
      const ramLapse = Math.max(0.7, 1 - tas / 300 * 0.25);
      const fuelStarved = this.fuelKg <= 0;
      let totalThrust = 0;
      for (let i = 0; i < this.numEngines; i++) {
        const out = this.failed[i] || fuelStarved;
        const integrity = 1 - this.contactDamage[i];
        this.targetN1[i] = this.fanTarget(i);
        const diff = this.targetN1[i] - this.n1[i];
        const rate = diff > 0 ? 2.5 / this.spoolUpTime : 2.2 / this.spoolDownTime;
        this.n1[i] += diff * Math.min(1, dt * rate * (0.8 + 0.4 * (this.n1[i] / 100)));
        const runningN2 = 60 + (this.n1[i] - 22) * (38 / 78);
        const targetN2 = out ? this.n1[i] * 0.4 : this.n1[i] * 0.4 + (runningN2 - this.n1[i] * 0.4) * integrity;
        this.n2[i] += (targetN2 - this.n2[i]) * Math.min(1, dt * 1.5);
        const n1NormEgt = Math.max(0, (this.n1[i] - 20) / 80);
        const targetEgt = out ? 15 : 15 + (385 + Math.pow(n1NormEgt, 1.4) * 450) * integrity;
        this.egt[i] += (targetEgt - this.egt[i]) * Math.min(1, dt * 1.8);
        const n1Range = Math.max(1, this.togaN1 - this.idleN1);
        const n1Fraction = Math.max(0, Math.min(1, (this.n1[i] - this.idleN1) / n1Range));
        const maxAdditionalFF = Math.max(0, this.maxFuelFlowKgPerHour - this.baseFuelFlowKgPerHour);
        const runningFuelFlow = this.baseFuelFlowKgPerHour + Math.pow(n1Fraction, 2.5) * maxAdditionalFF * altitudeLapse;
        const targetFF = out ? 0 : runningFuelFlow * integrity;
        this.fuelFlow[i] += (targetFF - this.fuelFlow[i]) * Math.min(1, dt * (out ? 2 : 12));
        const thrustFactor = n1ToThrustFactor(this.n1[i], this.idleN1, this.togaN1);
        let grossThrust = this.maxStaticThrustPerEngine * thrustFactor * altitudeLapse * ramLapse;
        if (this.reverserDeployment > 0.05 && this.reverseThrustEfficiency > 0) {
          grossThrust = -grossThrust * this.reverseThrustEfficiency * this.reverserDeployment;
        }
        this.thrust[i] = grossThrust * integrity;
        totalThrust += this.thrust[i];
      }
      let stepFuelBurn = 0;
      for (let i = 0; i < this.numEngines; i++) {
        stepFuelBurn += this.fuelFlow[i];
      }
      const demand = stepFuelBurn * dt / 3600;
      const supplied = this.massProperties ? this.massProperties.consume(demand) : Math.min(this._fuelKg, demand);
      if (!this.massProperties) this._fuelKg -= supplied;
      const supplyFraction = demand > 0 ? supplied / demand : fuelStarved ? 0 : 1;
      totalThrust = 0;
      for (let i = 0; i < this.numEngines; i++) {
        this.thrust[i] *= this.failed[i] ? 0 : supplyFraction;
        this.fuelFlow[i] *= supplyFraction;
        totalThrust += this.thrust[i];
      }
      const makeEngineState = (idx) => {
        if (idx >= this.numEngines) {
          return {
            n1: 0,
            n2: 0,
            egt: 15,
            fuelFlow: 0,
            thrust: 0,
            failed: true
          };
        }
        return {
          n1: this.n1[idx],
          n2: this.n2[idx],
          egt: this.egt[idx],
          fuelFlow: this.fuelFlow[idx],
          thrust: this.thrust[idx],
          failed: this.failed[idx] || this.fuelKg <= 0 || this.contactDamage[idx] >= 1
        };
      };
      return {
        totalThrust,
        fuelKg: this.fuelKg,
        engine1: makeEngineState(0),
        engine2: makeEngineState(1),
        engines: Array.from({ length: this.numEngines }, (_, i) => makeEngineState(i)),
        reverserActive: this.reverserActive,
        reverserDeployment: this.reverserDeployment
      };
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/LandingGear.js
  var THREE3 = __toESM(require_three(), 1);

  // node_modules/@stlim0727/flightsim-core/src/physics/gearDamage.js
  var GEAR_DAMAGE_LIMITS = Object.freeze({
    nose: Object.freeze({ vertical: 9e5, lateral: 45e4, longitudinal: 65e4, impact: 2.8, collapseImpact: 8 }),
    main: Object.freeze({ vertical: 18e5, lateral: 9e5, longitudinal: 13e5, impact: 3.8, collapseImpact: 10 })
  });
  function updateGearDamage(contact, demand, dt, limits) {
    if (contact.damageState === "collapsed") return;
    const { sinkRate, firstContact, normalLoad, lateralLoad, longitudinalLoad, overtravel, locked } = demand;
    const ratio = Math.hypot(
      normalLoad / limits.vertical,
      lateralLoad / limits.lateral,
      longitudinalLoad / limits.longitudinal
    );
    let increment = Math.max(0, ratio - 1) ** 2 * dt * 2;
    if (firstContact && sinkRate > limits.impact) {
      increment += 0.35 + 0.65 * (sinkRate - limits.impact) / (limits.collapseImpact - limits.impact);
    }
    if (overtravel > 0.08) {
      if (firstContact) contact.damage = Math.max(0.3, contact.damage);
      increment += (overtravel - 0.08) * dt * 2;
    }
    if (!locked && normalLoad > 5e4) increment += normalLoad / limits.vertical * dt * 8;
    contact.damage = Math.min(1, contact.damage + increment);
    contact.damageState = contact.damage >= 1 ? "collapsed" : contact.damage >= 0.3 ? "damaged" : "normal";
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/contactCompliance.js
  function compliantNormalForce(depth, speed, stiffness, damping, inverseEffectiveMass, dt) {
    return Math.max(0, (stiffness * depth - (damping + dt * stiffness) * speed) / (1 + dt * (damping + dt * stiffness) * inverseEffectiveMass));
  }
  function inverseContactMass(arm2, normal2, mass, inverseInertia) {
    const x = arm2.y * normal2.z - arm2.z * normal2.y;
    const y = arm2.z * normal2.x - arm2.x * normal2.z;
    const z = arm2.x * normal2.y - arm2.y * normal2.x;
    return 1 / mass + x * x * inverseInertia.x + y * y * inverseInertia.y + z * z * inverseInertia.z;
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/bodyDamage.js
  var BODY_DAMAGE_LIMITS = Object.freeze({
    engineL: { impact: 2, fatalImpact: 10, abrasionEnergy: 45e6 },
    engineR: { impact: 2, fatalImpact: 10, abrasionEnergy: 45e6 },
    belly: { impact: 3, fatalImpact: 12.5, abrasionEnergy: 3e8 },
    nose: { impact: 3, fatalImpact: 10, abrasionEnergy: 18e7 },
    tail: { impact: 2, fatalImpact: 8, abrasionEnergy: 1e8 },
    wingL: { impact: 2, fatalImpact: 8, abrasionEnergy: 1e8 },
    wingR: { impact: 2, fatalImpact: 8, abrasionEnergy: 1e8 }
  });
  var bodyDamageState = (damage) => damage >= 1 ? "failed" : damage >= 0.3 ? "damaged" : "normal";
  function updateBodyDamage(damage, { sinkRate, firstContact, frictionWork }, limits) {
    const impact = firstContact ? Math.max(0, sinkRate * sinkRate - limits.impact ** 2) / (limits.fatalImpact ** 2 - limits.impact ** 2) : 0;
    return Math.min(1, damage + impact + Math.max(0, frictionWork) / limits.abrasionEnergy);
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/LandingGear.js
  var OLEO_REBOUND_DAMPING = 3;
  var SOIL_RSA_TARGET = 0.45;
  var SOIL_TAU_LOAD = 0.3;
  var SOIL_TAU_UNLOAD = 0.5;
  var SOIL_ROLLING_MU = 0.4;
  var SOIL_SHOCK_WEIGHT = 1.6;
  var SLIDE_MU_PAVED = 0.45;
  var SLIDE_MU_SOIL = 0.4;
  var PLOW_DRAG_PER_MS = 9e3;
  var PLOW_LOAD_CAP = 0.8;
  var SOIL_ABRASION_GAIN = 2;
  var scratchInvQuat = new THREE3.Quaternion();
  var scratchHubWorld = new THREE3.Vector3();
  var scratchGroundNormal = new THREE3.Vector3();
  var scratchRWorld = new THREE3.Vector3();
  var scratchAngVelWorld = new THREE3.Vector3();
  var scratchContactVel = new THREE3.Vector3();
  var scratchWheelForward = new THREE3.Vector3();
  var scratchWheelLateral = new THREE3.Vector3();
  var scratchFWheelWorld = new THREE3.Vector3();
  var scratchFWheelBody = new THREE3.Vector3();
  var scratchMoment = new THREE3.Vector3();
  var scratchCgWorld = new THREE3.Vector3();
  var DEFAULT_BODY_DYNAMICS = Object.freeze({
    mass: 66e3,
    inverseInertia: Object.freeze({ x: 1 / 345e4, y: 1 / 485e4, z: 1 / 165e4 })
  });
  var ZERO_CG = Object.freeze({ x: 0, y: 0, z: 0 });
  var scratchBcLocal = new THREE3.Vector3();
  var scratchBcPoint = new THREE3.Vector3();
  var scratchBcNormal = new THREE3.Vector3();
  var scratchBcArm = new THREE3.Vector3();
  var scratchBcVelocity = new THREE3.Vector3();
  var scratchBcTangent = new THREE3.Vector3();
  var scratchBcForce = new THREE3.Vector3();
  var AXIS_Z_UP = new THREE3.Vector3(0, 1, 0);
  var AXIS_FWD = new THREE3.Vector3(0, 0, -1);
  var LandingGear = class {
    constructor(config = null) {
      this.bodySupportPoints ??= BODY_SUPPORT_POINTS;
      this.bodyDynamics = DEFAULT_BODY_DYNAMICS;
      this.failure = null;
      this.maxImpactSpeed = 0;
      this.lastMomentBody = new THREE3.Vector3();
      this.isFixed = false;
      this.cgGroundHeightM = 3.5;
      this.gearState = 1;
      this.targetGearState = 1;
      this.gearTransitSpeed = 0.12;
      this.isTransit = false;
      this.rollingFriction = 0.02;
      this.maxBrakingFriction = 0.58;
      this.tireLateralFriction = 0.75;
      this.contacts = [
        {
          id: "nose",
          localPos: new THREE3.Vector3(0, -3.27, -12.5),
          // Front steerable
          wheelRadius: 0.38,
          restLength: 0.9,
          kSpring: 42e4,
          // N/m
          cDamper: 48e3,
          // N/(m/s)
          isSteerable: true,
          compression: 0,
          isGrounded: false,
          touchdownThisFrame: false,
          worldPos: new THREE3.Vector3(),
          prevWorldPos: new THREE3.Vector3()
        },
        {
          id: "mainLeft",
          localPos: new THREE3.Vector3(-3.2, -3.3, 1.8),
          // Left main
          wheelRadius: 0.48,
          restLength: 0.9,
          kSpring: 85e4,
          cDamper: 72e3,
          isSteerable: false,
          compression: 0,
          isGrounded: false,
          touchdownThisFrame: false,
          worldPos: new THREE3.Vector3(),
          prevWorldPos: new THREE3.Vector3()
        },
        {
          id: "mainRight",
          localPos: new THREE3.Vector3(3.2, -3.3, 1.8),
          // Right main
          wheelRadius: 0.48,
          restLength: 0.9,
          kSpring: 85e4,
          cDamper: 72e3,
          isSteerable: false,
          compression: 0,
          isGrounded: false,
          touchdownThisFrame: false,
          worldPos: new THREE3.Vector3(),
          prevWorldPos: new THREE3.Vector3()
        }
      ];
      if (config) {
        this.loadConfig(config);
      } else {
        this.resetDamage();
      }
      this.brakes = 0;
      this.steerAngle = 0;
      this.onGround = false;
      this.totalWeightOnWheels = 0;
      this.touchdownEvent = false;
    }
    loadConfig(config = {}) {
      const gear = config?.landingGear || config || {};
      const properties = config.massProperties;
      if (properties) this.bodyDynamics = {
        mass: properties.currentMassKg,
        inverseInertia: { x: 1 / properties.Iyy, y: 1 / properties.Izz, z: 1 / properties.Ixx }
      };
      if (gear.gearTransitTimeSec !== void 0) {
        this.gearTransitSpeed = 1 / Math.max(0.1, gear.gearTransitTimeSec);
      }
      this.isFixed = Boolean(gear.isFixed);
      this.cgGroundHeightM = gear.cgGroundHeightM ?? 3.5;
      if (this.isFixed) {
        this.gearState = 1;
        this.targetGearState = 1;
        this.isTransit = false;
      }
      if (gear.contacts && Array.isArray(gear.contacts) && gear.contacts.length > 0) {
        this.contacts = gear.contacts.map((c) => ({
          id: c.id,
          name: c.name || c.id,
          localPos: c.localPos instanceof THREE3.Vector3 ? c.localPos.clone() : new THREE3.Vector3(c.localPos.x, c.localPos.y, c.localPos.z),
          wheelRadius: c.wheelRadius ?? (c.id === "nose" ? 0.38 : 0.48),
          restLength: c.restLength ?? 0.9,
          kSpring: c.kSpring ?? (c.id === "nose" ? 42e4 : 85e4),
          cDamper: c.cDamper ?? (c.id === "nose" ? 48e3 : 72e3),
          isSteerable: Boolean(c.isSteerable),
          maxSteeringDeg: c.maxSteeringDeg ?? 55,
          compression: 0,
          isGrounded: false,
          touchdownThisFrame: false,
          worldPos: new THREE3.Vector3(),
          prevWorldPos: new THREE3.Vector3()
        }));
      }
      if (gear.bodySupportPoints) {
        this.bodySupportPoints = gear.bodySupportPoints;
      }
      if (gear.rollingFriction !== void 0) this.rollingFriction = gear.rollingFriction;
      if (gear.maxBrakingFriction !== void 0) this.maxBrakingFriction = gear.maxBrakingFriction;
      if (gear.tireLateralFriction !== void 0) this.tireLateralFriction = gear.tireLateralFriction;
      this.resetDamage();
    }
    resetContacts() {
      this.resetDamage();
    }
    resetDamage() {
      this.overspeedDamage = 0;
      this.failure = null;
      this.maxImpactSpeed = 0;
      this.lastMomentBody.set(0, 0, 0);
      for (const c of this.contacts) {
        c.damage = 0;
        c.damageState = "normal";
        c.isGrounded = false;
        c.compression = 0;
        c.touchdownThisFrame = false;
        c.sinkRateMs = 0;
        c.turfEngagement = 0;
        c.soilEngagement = 0;
      }
      this.bodySoilEngagement = 0;
      this.bodyGrounded = /* @__PURE__ */ new Set();
      this.structuralDamage = 0;
      this.bodyDamage = Object.fromEntries(BODY_CONTACTS.map((p2) => [p2.id, 0]));
      this.onGround = false;
      this.totalWeightOnWheels = 0;
      this.touchdownEvent = false;
    }
    // A nacelle that has ground through its abrasion budget crushes away and stops
    // supporting the airframe; the hull then settles onto the belly patches and the
    // slide escalates from engine failure to structural wear.
    get supportedBodyPoints() {
      return this.bodySupportPoints.filter((p2) => !(p2.id.startsWith("engine") && this.bodyDamage[p2.id] >= 1));
    }
    toggleGear() {
      if (this.isFixed) return;
      if (this.targetGearState > 0.5) {
        this.targetGearState = 0;
      } else {
        this.targetGearState = 1;
      }
    }
    setGearTarget(down) {
      if (this.isFixed) {
        this.targetGearState = 1;
        this.gearState = 1;
        this.isTransit = false;
        return;
      }
      this.targetGearState = down ? 1 : 0;
    }
    setBrakes(val) {
      this.brakes = Math.max(0, Math.min(1, val));
    }
    setSteering(rudderInput, groundSpeedMs) {
      const speedRatio = Math.max(0.15, 1 - Math.min(1, groundSpeedMs / 35) * 0.82);
      const maxTiller = THREE3.MathUtils.degToRad(55);
      this.steerAngle = -rudderInput * maxTiller * speedRatio;
    }
    /**
     * Update landing gear forces and ground physics
     * @param {number} dt
     * @param {THREE.Object3D} aircraftMesh
     * @param {THREE.Vector3} linearVelocity (world m/s)
     * @param {THREE.Vector3} angularVelocity (body rad/s)
     * @param {Function} getTerrainHeight (x, z) => height in meters
     * @param {Function} [getTerrainNormal=null] (x, z) => THREE.Vector3 surface normal
     * @returns {{ forces: THREE.Vector3, moments: THREE.Vector3, onGround: boolean, touchdown: boolean }}
     */
    advanceConfiguration(dt) {
      if (this.isFixed) {
        this.targetGearState = 1;
        this.gearState = 1;
        this.isTransit = false;
      } else if (this.overspeedDamage >= 1) {
        this.isTransit = false;
      } else if (Math.abs(this.targetGearState - this.gearState) > 1e-3) {
        this.isTransit = true;
        const remaining = this.targetGearState - this.gearState;
        const travel = this.gearTransitSpeed * (1 - (this.overspeedDamage ?? 0)) * dt;
        this.gearState += Math.sign(remaining) * Math.min(Math.abs(remaining), travel);
      } else {
        this.isTransit = false;
        this.gearState = this.targetGearState;
      }
    }
    update(dt, aircraftMesh, linearVelocity, angularVelocity, getTerrainHeight, getTerrainNormal = null, sampleIsOnRunway = null, cg = ZERO_CG, configurationAdvanced = false, sampleIsInSafetyArea = null, dynamics = null) {
      if (!configurationAdvanced) this.advanceConfiguration(dt);
      const netForceWorld = new THREE3.Vector3(0, 0, 0);
      const netMomentBody = new THREE3.Vector3(0, 0, 0);
      this.onGround = false;
      this.touchdownEvent = false;
      this.totalWeightOnWheels = 0;
      const gearDeploy = this.gearState;
      const damageEvents = [];
      const bodyContacts = [];
      const bodyDamageEvents = [];
      let catastrophicImpact = false;
      const worldQuat = aircraftMesh.quaternion;
      const cgWorld = scratchCgWorld.copy(cg).applyQuaternion(worldQuat).add(aircraftMesh.position);
      const invWorldQuat = scratchInvQuat.copy(worldQuat).invert();
      const touchdownContacts = [];
      for (const c of this.contacts) {
        c.touchdownThisFrame = false;
        c.sinkRateMs = 0;
        if (gearDeploy < 0.1 || c.damageState === "collapsed") {
          c.isGrounded = false;
          c.compression = 0;
          continue;
        }
        const hubWorld = scratchHubWorld.copy(c.localPos);
        hubWorld.y *= gearDeploy;
        hubWorld.applyMatrix4(aircraftMesh.matrixWorld);
        const groundH = getTerrainHeight(hubWorld.x, hubWorld.z);
        const wheelRadius = c.wheelRadius !== void 0 ? c.wheelRadius : 0.48;
        const contactY = groundH + wheelRadius;
        c.worldPos.copy(hubWorld);
        c.worldPos.y = groundH;
        const penetration = contactY - hubWorld.y;
        if (penetration > 0) {
          const wasGrounded = c.isGrounded;
          c.isGrounded = true;
          this.onGround = true;
          c.compression = Math.min(c.restLength, penetration);
          const groundNormal = scratchGroundNormal.set(0, 1, 0);
          if (typeof getTerrainNormal === "function") {
            const norm = getTerrainNormal(hubWorld.x, hubWorld.z);
            if (norm && norm.isVector3 && norm.lengthSq() > 1e-4) {
              groundNormal.copy(norm).normalize();
            }
          }
          const normalPenetration = penetration * groundNormal.y;
          c.compression = Math.min(c.restLength, normalPenetration);
          const rWorld = scratchRWorld.copy(c.worldPos).sub(cgWorld);
          const angVelWorld = scratchAngVelWorld.copy(angularVelocity).applyQuaternion(worldQuat);
          const contactVel = scratchContactVel.copy(linearVelocity).add(angVelWorld.cross(rWorld));
          const groundSpeed = Math.sqrt(linearVelocity.x * linearVelocity.x + linearVelocity.z * linearVelocity.z);
          const sinkRate = Math.max(0, -contactVel.dot(groundNormal));
          c.sinkRateMs = sinkRate;
          if (!wasGrounded) this.maxImpactSpeed = Math.max(this.maxImpactSpeed, sinkRate);
          if (!wasGrounded && sinkRate > 0.25) {
            c.touchdownThisFrame = true;
            this.touchdownEvent = true;
            touchdownContacts.push({
              id: c.id,
              worldPos: c.worldPos.clone(),
              groundSpeed,
              sinkRate,
              compression: c.compression
            });
          } else {
            c.touchdownThisFrame = false;
          }
          const vNormal = contactVel.dot(groundNormal);
          let normalForceMag = c.kSpring * c.compression - c.cDamper * (vNormal > 0 ? OLEO_REBOUND_DAMPING : 1) * vNormal;
          if (normalForceMag < 0) normalForceMag = 0;
          const wheelForwardWorld = scratchWheelForward.copy(AXIS_FWD);
          if (c.isSteerable && c.damageState === "normal") {
            wheelForwardWorld.applyAxisAngle(AXIS_Z_UP, this.steerAngle);
          }
          wheelForwardWorld.applyQuaternion(worldQuat);
          wheelForwardWorld.addScaledVector(groundNormal, -wheelForwardWorld.dot(groundNormal));
          if (wheelForwardWorld.lengthSq() > 1e-4) {
            wheelForwardWorld.normalize();
          } else {
            wheelForwardWorld.set(0, 0, -1);
          }
          const wheelLateralWorld = scratchWheelLateral.copy(wheelForwardWorld).cross(groundNormal).normalize();
          const vForward = contactVel.dot(wheelForwardWorld);
          const vLateral = contactVel.dot(wheelLateralWorld);
          const onRunway = sampleIsOnRunway ? sampleIsOnRunway(c.worldPos.x, c.worldPos.z) : true;
          const targetTurf = onRunway ? 0 : 1;
          const tauTurf = targetTurf > (c.turfEngagement || 0) ? 0.25 : 0.4;
          c.turfEngagement = (c.turfEngagement || 0) + (targetTurf - (c.turfEngagement || 0)) * Math.min(1, dt / tauTurf);
          const inSafetyArea = onRunway || !sampleIsInSafetyArea || sampleIsInSafetyArea(c.worldPos.x, c.worldPos.z);
          const targetSoil = onRunway ? 0 : inSafetyArea ? SOIL_RSA_TARGET : 1;
          const tauSoil = targetSoil > (c.soilEngagement || 0) ? SOIL_TAU_LOAD : SOIL_TAU_UNLOAD;
          c.soilEngagement = (c.soilEngagement || 0) + (targetSoil - (c.soilEngagement || 0)) * Math.min(1, dt / tauSoil);
          const baseRolling = this.rollingFriction ?? 0.02;
          const muRolling = THREE3.MathUtils.lerp(baseRolling, 0.18, c.turfEngagement) + SOIL_ROLLING_MU * c.soilEngagement;
          let muBrake = muRolling;
          if (this.brakes > 0.01) {
            muBrake += this.brakes * (this.maxBrakingFriction ?? 0.58);
          }
          const stoppingGain = this.brakes > 0.5 ? normalForceMag / (9.80665 * Math.max(dt, 1e-3)) : 25e3;
          const fForwardMag = -Math.sign(vForward) * Math.min(Math.abs(vForward) * stoppingGain, normalForceMag * muBrake);
          const muLateral = this.tireLateralFriction ?? 0.75;
          const fLateralMag = -Math.sign(vLateral) * Math.min(Math.abs(vLateral) * 35e3, normalForceMag * muLateral);
          let dynamicNormalLoad = normalForceMag;
          let dynamicLateralLoad = Math.abs(fLateralMag);
          let dynamicLongitudinalLoad = Math.abs(fForwardMag);
          const limits = GEAR_DAMAGE_LIMITS[c.id === "nose" ? "nose" : "main"];
          const roughness = c.turfEngagement + SOIL_SHOCK_WEIGHT * c.soilEngagement;
          if (roughness > 0.01 && Math.abs(vForward) > 10) {
            const excessSpeed = Math.abs(vForward) - 10;
            const shockRatio = excessSpeed / 20 * roughness;
            dynamicNormalLoad += limits.vertical * shockRatio;
            dynamicLateralLoad += limits.lateral * 0.5 * shockRatio;
            dynamicLongitudinalLoad += limits.longitudinal * 0.5 * shockRatio;
          }
          const locked = gearDeploy >= 0.99 && this.targetGearState === 1 && !(this.overspeedDamage >= 1);
          const stateBefore = c.damageState;
          updateGearDamage(c, {
            sinkRate,
            firstContact: !wasGrounded,
            normalLoad: dynamicNormalLoad,
            lateralLoad: dynamicLateralLoad,
            longitudinalLoad: dynamicLongitudinalLoad,
            overtravel: Math.max(0, normalPenetration - c.restLength),
            locked
          }, dt, limits);
          if (stateBefore !== c.damageState) {
            this.failure ??= {
              contact: c.id,
              sinkRate,
              penetration,
              reason: sinkRate > limits.impact ? "impact" : normalPenetration > c.restLength + 0.08 ? "bottom-out" : c.turfEngagement > 0.5 ? "excursion" : !locked ? "unlocked" : "overload"
            };
            damageEvents.push({ id: c.id, state: c.damageState, damage: c.damage });
          }
          if (c.damageState === "collapsed") {
            c.isGrounded = false;
            c.touchdownThisFrame = false;
            c.compression = 0;
            continue;
          }
          const damageScale = c.damageState === "damaged" ? 0.65 : 1;
          normalForceMag *= damageScale;
          this.totalWeightOnWheels += normalForceMag;
          const fWheelWorld = scratchFWheelWorld.copy(groundNormal).multiplyScalar(normalForceMag);
          fWheelWorld.addScaledVector(wheelForwardWorld, fForwardMag * damageScale);
          fWheelWorld.addScaledVector(wheelLateralWorld, fLateralMag * damageScale);
          netForceWorld.add(fWheelWorld);
          const fWheelBody = scratchFWheelBody.copy(fWheelWorld).applyQuaternion(invWorldQuat);
          const momentBody = scratchMoment.copy(rWorld).applyQuaternion(invWorldQuat).cross(fWheelBody);
          netMomentBody.add(momentBody);
        } else {
          c.isGrounded = false;
          c.compression = 0;
          c.touchdownThisFrame = false;
        }
      }
      const bodyDynamics = dynamics ?? this.bodyDynamics;
      const groundedNow = /* @__PURE__ */ new Set();
      const demands = /* @__PURE__ */ new Map();
      let bodySoilTargetSum = 0;
      let bodySoilTargetCount = 0;
      for (const probe of this.supportedBodyPoints) {
        const local = scratchBcLocal.set(...probe.position);
        const point2 = scratchBcPoint.copy(local).applyMatrix4(aircraftMesh.matrixWorld);
        const groundH = getTerrainHeight(point2.x, point2.z);
        const normal2 = scratchBcNormal.set(0, 1, 0);
        const terrainNormal = getTerrainNormal?.(point2.x, point2.z);
        if (terrainNormal && terrainNormal.lengthSq() >= 1e-4) {
          normal2.copy(terrainNormal).normalize();
        }
        const depth = (groundH - point2.y) * normal2.y;
        const arm2 = scratchBcArm.copy(point2).sub(cgWorld);
        const velocity2 = scratchBcVelocity.copy(angularVelocity).applyQuaternion(worldQuat).cross(arm2).add(linearVelocity);
        const vNormal = velocity2.dot(normal2);
        if (depth < -5e-3 && depth - vNormal * dt <= 0) continue;
        const patchOnRunway = sampleIsOnRunway ? sampleIsOnRunway(point2.x, point2.z) : true;
        const patchInSafetyArea = patchOnRunway || !sampleIsInSafetyArea || sampleIsInSafetyArea(point2.x, point2.z);
        bodySoilTargetSum += patchOnRunway ? 0 : patchInSafetyArea ? SOIL_RSA_TARGET : 1;
        bodySoilTargetCount++;
        const tangent = scratchBcTangent.copy(velocity2).addScaledVector(normal2, -vNormal);
        const speed = tangent.length();
        const { mass, inverseInertia } = bodyDynamics;
        const normalBody2 = scratchFWheelBody.copy(normal2).applyQuaternion(invWorldQuat);
        const localArm2 = scratchMoment.copy(local).sub(cg);
        const invMass = inverseContactMass(localArm2, normalBody2, mass, inverseInertia);
        const load = compliantNormalForce(
          Math.min(depth, 0.04),
          vNormal,
          18e6 * probe.weight,
          4e5 * probe.weight,
          invMass,
          dt
        );
        const force = scratchBcForce.copy(normal2).multiplyScalar(load);
        const muSlide = SLIDE_MU_PAVED + SLIDE_MU_SOIL * this.bodySoilEngagement;
        const plow = Math.min(this.bodySoilEngagement * speed * PLOW_DRAG_PER_MS, load * PLOW_LOAD_CAP * this.bodySoilEngagement);
        const friction = Math.min(speed * 18e3, load * muSlide) + plow;
        if (speed > 0) force.addScaledVector(tangent, -friction / speed);
        netForceWorld.add(force);
        netMomentBody.add(scratchMoment.copy(local).sub(cg).cross(scratchFWheelBody.copy(force).applyQuaternion(invWorldQuat)));
        groundedNow.add(probe.key);
        this.onGround = true;
        const firstContact = !this.bodyGrounded.has(probe.key);
        if (firstContact && -vNormal > 12.5) catastrophicImpact = true;
        const demand = demands.get(probe.id) || { firstContact: false, sinkRate: 0, frictionWork: 0 };
        demand.firstContact ||= firstContact;
        if (firstContact) demand.sinkRate = Math.max(demand.sinkRate, -vNormal);
        demand.frictionWork += friction * speed * dt * (1 + SOIL_ABRASION_GAIN * this.bodySoilEngagement);
        demands.set(probe.id, demand);
        bodyContacts.push({
          id: probe.id,
          worldPos: point2.clone(),
          sinkRate: -vNormal,
          speed,
          load,
          depth,
          frictionWork: friction * speed * dt
        });
      }
      const bodySoilTarget = bodySoilTargetCount > 0 ? bodySoilTargetSum / bodySoilTargetCount : 0;
      const tauBodySoil = bodySoilTarget > this.bodySoilEngagement ? SOIL_TAU_LOAD : SOIL_TAU_UNLOAD;
      this.bodySoilEngagement += (bodySoilTarget - this.bodySoilEngagement) * Math.min(1, dt / tauBodySoil);
      for (const [id, demand] of demands) {
        const previous = this.bodyDamage[id];
        this.bodyDamage[id] = updateBodyDamage(previous, demand, BODY_DAMAGE_LIMITS[id]);
        const state = bodyDamageState(this.bodyDamage[id]);
        if (state !== bodyDamageState(previous)) bodyDamageEvents.push({ id, state });
      }
      this.bodyGrounded = groundedNow;
      this.structuralDamage = Math.max(...Object.entries(this.bodyDamage).filter(([id]) => !id.startsWith("engine")).map(([, damage]) => damage));
      catastrophicImpact ||= this.structuralDamage >= 1;
      this.onGround = bodyContacts.length > 0 || this.contacts.some((c) => c.isGrounded);
      const supportedTouchdowns = touchdownContacts.filter((event) => this.contacts.find((c) => c.id === event.id).damageState !== "collapsed");
      this.touchdownEvent = supportedTouchdowns.length > 0;
      this.lastMomentBody.copy(netMomentBody);
      return {
        failure: this.failure,
        maxImpactSpeed: this.maxImpactSpeed,
        forces: netForceWorld,
        moments: netMomentBody,
        onGround: this.onGround,
        touchdown: this.touchdownEvent,
        gearState: this.gearState,
        isTransit: this.isTransit,
        weightOnWheels: this.totalWeightOnWheels,
        damageEvents,
        gearDamage: Object.fromEntries(this.contacts.map((c) => [c.id, c.damageState])),
        bodyContacts,
        structuralDamage: this.structuralDamage,
        groundRoughness: Math.max(this.bodySoilEngagement, ...this.contacts.map((c) => c.soilEngagement || 0)),
        bodyDamage: { ...this.bodyDamage },
        bodyDamageEvents,
        catastrophicImpact,
        touchdownContacts: supportedTouchdowns,
        contacts: this.contacts,
        compressions: {
          nose: this.contacts[0].compression,
          mainLeft: this.contacts[1].compression,
          mainRight: this.contacts[2].compression
        }
      };
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/WaterDitching.js
  var THREE4 = __toESM(require_three(), 1);
  var scratchArm = new THREE4.Vector3();
  var scratchPoint = new THREE4.Vector3();
  var scratchPointVel = new THREE4.Vector3();
  var scratchAngVelWorld2 = new THREE4.Vector3();
  var scratchNetForce = new THREE4.Vector3();
  var scratchNetMoment = new THREE4.Vector3();
  var scratchPointForce = new THREE4.Vector3();
  var scratchHorizVel = new THREE4.Vector3();
  var scratchMomentBody = new THREE4.Vector3();
  var scratchInvQuat2 = new THREE4.Quaternion();
  var ZERO_CG2 = Object.freeze({ x: 0, y: 0, z: 0 });
  var WATER_DITCHING_LIMITS = Object.freeze({
    maxSinkRate: 4.5,
    // m/s (~900 fpm) - harder impact causes violent structural breakup
    minPitchDeg: -4,
    // deg - nose-down dive causes nose plow and violent pitch-over/flip
    maxPitchDeg: 20,
    // deg - extreme stall attitude
    maxRollDeg: 16,
    // deg - wingtip strike at speed cartwheels the airframe
    maxSpeedMs: 115
    // m/s (~225 kt) - excessive kinetic energy destroys hull on contact
  });
  var AMPHIBIAN_WATER_LIMITS = Object.freeze({
    maxSinkRate: 5.5,
    // m/s (~1,080 fpm) - V-bottom boat hull absorbs firmer wave contact
    minPitchDeg: -5,
    // deg - nose-down dive still plows bow and flips hull
    maxPitchDeg: 22,
    // deg - extreme tail-strike / stall attitude
    maxRollDeg: 18,
    // deg - wingtip float clears moderate bank; steep roll cartwheels
    maxSpeedMs: 85
    // m/s (~165 kt) - excessive impact speed breaks hull
  });
  var WaterDitching = class {
    constructor() {
      this.reset();
    }
    reset() {
      this.flooding = 0;
      this.timeOnWater = 0;
      this.ditchingContact = false;
      this.catastrophic = false;
      this.onWater = false;
      this.submerged = false;
      this.timeSinceSubmerged = 0;
      this.touchdownVsi = 0;
      this.submersion = 0;
      this.sprayIntensity = 0;
      this.contactPoints = [];
      this.waterLevel = 0;
    }
    /**
     * Derive the discrete annunciation phase from continuous physical state
     */
    get ditchingPhase() {
      if (!this.onWater && !this.ditchingContact) return "airborne";
      if (this.submerged) return "submerged";
      if (this.flooding >= 0.2) return "sinking";
      if (this.timeOnWater > 0.5 && this.sprayIntensity < 0.25) return "floating";
      return "planing";
    }
    /**
     * Update hydrodynamic forces, moments, flooding ingress, and sinking progression.
     *
     * @param {number} dt Timestep in seconds
     * @param {THREE.Object3D} aircraftMesh Aircraft root group
     * @param {THREE.Vector3} linearVelocity World linear velocity (m/s)
     * @param {THREE.Vector3} angularVelocity Body angular velocity (rad/s)
     * @param {Object} terrain Terrain query object with getHeight and optional getWaterLevel
     * @param {Object} aero Aero properties (mass, inertia, cg)
     * @param {Array} bodySupportPoints Contact patch definitions
     * @param {number} gearState Landing gear deployment state [0, 1]
     * @param {number} pitchDeg Pitch angle in degrees
     * @param {number} rollDeg Roll angle in degrees
     * @param {Object} dynamics Optional mass and inertia overrides
     * @returns {{ forces: THREE.Vector3, moments: THREE.Vector3, onWater: boolean, ditchingContact: boolean, flooding: number, ditchingPhase: string, sprayIntensity: number, submerged: boolean, catastrophic: boolean, contactPoints: Array<THREE.Vector3> }}
     */
    update(dt, aircraftMesh, linearVelocity, angularVelocity, terrain, aero, bodySupportPoints, gearState = 0, pitchDeg = 0, rollDeg = 0, dynamics = null, isAmphibious = false) {
      scratchNetForce.set(0, 0, 0);
      scratchNetMoment.set(0, 0, 0);
      this.contactPoints = [];
      const aircraftPos = aircraftMesh.position;
      const worldQuat = aircraftMesh.quaternion;
      scratchInvQuat2.copy(worldQuat).invert();
      const mass = dynamics?.mass ?? aero?.mass ?? 66e3;
      const inverseInertia = dynamics?.inverseInertia ?? {
        x: aero?.invIyy ?? 1 / 345e4,
        y: aero?.invIzz ?? 1 / 485e4,
        z: aero?.invIxx ?? 1 / 165e4
      };
      const cg = aero?.cg ?? ZERO_CG2;
      const waterLevel = terrain?.getWaterLevel?.(aircraftPos.x, aircraftPos.z) ?? 0;
      this.waterLevel = waterLevel;
      const terrainH = terrain?.getHeight?.(aircraftPos.x, aircraftPos.z) ?? -45;
      const hasWater = terrainH <= waterLevel + 1.5;
      if (!hasWater) {
        if (!this.ditchingContact) {
          this.onWater = false;
          this.submersion = 0;
          this.sprayIntensity = 0;
        }
        return {
          forces: scratchNetForce,
          moments: scratchNetMoment,
          onWater: this.onWater,
          ditchingContact: this.ditchingContact,
          flooding: this.flooding,
          ditchingPhase: this.ditchingPhase,
          sprayIntensity: this.sprayIntensity,
          submerged: this.submerged,
          catastrophic: this.catastrophic,
          contactPoints: this.contactPoints
        };
      }
      const points = bodySupportPoints || [];
      let submergedCount = 0;
      let maxDepth = 0;
      const submergedPoints = [];
      const cgWorld = scratchArm.copy(cg).applyQuaternion(worldQuat).add(aircraftPos);
      scratchAngVelWorld2.copy(angularVelocity).applyQuaternion(worldQuat);
      let maxDepthAll = -999;
      for (const probe of points) {
        const probePosLocal = new THREE4.Vector3(...probe.position);
        const probeWorld = probePosLocal.clone().applyMatrix4(aircraftMesh.matrixWorld);
        const patchFloor = terrain?.getHeight?.(probeWorld.x, probeWorld.z) ?? terrainH;
        const patchWaterLevel = terrain?.getWaterLevel?.(probeWorld.x, probeWorld.z) ?? waterLevel;
        const depth = patchWaterLevel - probeWorld.y;
        maxDepthAll = Math.max(maxDepthAll, depth);
        if (depth > -0.05) {
          submergedCount++;
          maxDepth = Math.max(maxDepth, depth);
          submergedPoints.push({
            probe,
            probePosLocal,
            probeWorld,
            depth,
            patchFloor,
            patchWaterLevel
          });
          if (depth > 0) {
            this.contactPoints.push(probeWorld);
          }
        }
      }
      this.submersion = maxDepth;
      this.onWater = submergedCount > 0;
      if (!this.onWater && this.ditchingContact && !this.catastrophic && maxDepthAll < -0.6) {
        this.ditchingContact = false;
        this.timeOnWater = 0;
        this.sprayIntensity = 0;
      }
      const speedMs = linearVelocity.length();
      const sinkRate = -linearVelocity.y;
      if (this.onWater && !this.ditchingContact && !this.catastrophic) {
        const limits = isAmphibious ? AMPHIBIAN_WATER_LIMITS : WATER_DITCHING_LIMITS;
        const isFatal = sinkRate > limits.maxSinkRate || pitchDeg < limits.minPitchDeg || pitchDeg > limits.maxPitchDeg || Math.abs(rollDeg) > limits.maxRollDeg || speedMs > limits.maxSpeedMs;
        if (isFatal) {
          this.catastrophic = true;
          return {
            forces: scratchNetForce,
            moments: scratchNetMoment,
            onWater: this.onWater,
            ditchingContact: false,
            flooding: this.flooding,
            ditchingPhase: "airborne",
            sprayIntensity: 1,
            submerged: false,
            catastrophic: true,
            contactPoints: this.contactPoints
          };
        }
        this.ditchingContact = true;
        this.touchdownVsi = sinkRate;
      }
      if (!this.ditchingContact) {
        return {
          forces: scratchNetForce,
          moments: scratchNetMoment,
          onWater: this.onWater,
          ditchingContact: false,
          flooding: this.flooding,
          ditchingPhase: this.ditchingPhase,
          sprayIntensity: 0,
          submerged: false,
          catastrophic: false,
          contactPoints: this.contactPoints
        };
      }
      this.timeOnWater += dt;
      const horizSpeed = Math.hypot(linearVelocity.x, linearVelocity.z);
      if (!isAmphibious && horizSpeed < 25) {
        const floodingRate = 0.045;
        this.flooding = Math.min(1, this.flooding + dt * floodingRate);
      }
      const sinkSettlingDepth = this.flooding * 5;
      const nominalDraft = 0.85;
      const totalBuoyancyStiffness = mass * 9.80665 / nominalDraft;
      for (const item of submergedPoints) {
        const { probe, probePosLocal, probeWorld, depth, patchFloor } = item;
        const weight = probe.weight || 1 / (submergedPoints.length || 1);
        const effectiveDepth = depth - sinkSettlingDepth;
        const armWorld = scratchArm.copy(probeWorld).sub(cgWorld);
        const pointVel = scratchPointVel.copy(linearVelocity).add(scratchAngVelWorld2.clone().cross(armWorld));
        const vNormal = pointVel.y;
        const normalBody2 = new THREE4.Vector3(0, 1, 0).applyQuaternion(scratchInvQuat2);
        const localArm2 = probePosLocal.clone().sub(cg);
        const invMass = inverseContactMass(localArm2, normalBody2, mass, inverseInertia);
        const kPatch = totalBuoyancyStiffness * weight;
        const cPatch = 2 * Math.sqrt(kPatch * (mass * weight)) * 0.85;
        let normalLoad = 0;
        if (effectiveDepth > 0) {
          normalLoad = compliantNormalForce(
            effectiveDepth,
            vNormal,
            kPatch,
            cPatch,
            invMass,
            dt
          );
        }
        const seabedPenetration = patchFloor + 0.2 - probeWorld.y;
        if (seabedPenetration > 0) {
          const seabedLoad = compliantNormalForce(
            seabedPenetration,
            vNormal,
            kPatch * 2.5,
            cPatch * 2,
            invMass,
            dt
          );
          normalLoad += seabedLoad;
        }
        scratchHorizVel.set(pointVel.x, 0, pointVel.z);
        const patchSpeed = scratchHorizVel.length();
        let dragMag = 0;
        if (patchSpeed > 0.05 && depth > 0) {
          const immersionRatio = THREE4.MathUtils.clamp(depth / 1.5, 0.1, 1);
          const waveCd = isAmphibious ? 5e-3 : 0.08;
          const dynamicPlaning = Math.min(mass * 9.80665 * 1.5 * weight, 0.5 * 1e3 * waveCd * immersionRatio * (patchSpeed * patchSpeed) * weight);
          const frictionCoeff = isAmphibious ? patchSpeed > 15 ? 0.025 : 0.06 : 0.35 + (gearState > 0.5 ? 0.25 : 0);
          const frictionDrag = normalLoad * frictionCoeff;
          dragMag = dynamicPlaning + frictionDrag;
          const maxStoppingDrag = patchSpeed * mass * weight / Math.max(dt, 1e-3);
          dragMag = Math.min(dragMag, maxStoppingDrag);
        }
        scratchPointForce.set(0, normalLoad, 0);
        if (patchSpeed > 0.05 && dragMag > 0) {
          scratchPointForce.addScaledVector(scratchHorizVel, -dragMag / patchSpeed);
        }
        scratchNetForce.add(scratchPointForce);
        const forceBody = scratchPointForce.clone().applyQuaternion(scratchInvQuat2);
        const momentBody = scratchMomentBody.copy(localArm2).cross(forceBody);
        scratchNetMoment.add(momentBody);
      }
      if (this.onWater) {
        const immersion = THREE4.MathUtils.clamp(maxDepth / 2, 0, 1);
        scratchNetMoment.x -= angularVelocity.x * (mass * 18) * immersion;
        scratchNetMoment.y -= angularVelocity.y * (mass * 24) * immersion;
        scratchNetMoment.z -= angularVelocity.z * (mass * 18) * immersion;
      }
      this.sprayIntensity = THREE4.MathUtils.clamp(horizSpeed / 35 * Math.min(1, maxDepth / 0.8), 0, 1);
      if (this.flooding >= 0.95 && horizSpeed < 1) {
        this.submerged = true;
        this.timeSinceSubmerged += dt;
      }
      return {
        forces: scratchNetForce,
        moments: scratchNetMoment,
        onWater: this.onWater,
        ditchingContact: this.ditchingContact,
        flooding: this.flooding,
        ditchingPhase: this.ditchingPhase,
        sprayIntensity: this.sprayIntensity,
        submerged: this.submerged,
        catastrophic: this.catastrophic,
        contactPoints: this.contactPoints
      };
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/PilotPhysiology.js
  var clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  var PilotPhysiology = class {
    constructor() {
      this.reset();
    }
    reset() {
      this.gZ = 1;
      this.consciousness = 1;
      this.negativeGExposure = 0;
      this.isGLOC = false;
      this.glocTimer = 0;
      this.stuporTimer = 0;
      this.effectiveElevator = 0;
      this.effectiveAileron = 0;
      this.effectiveRudder = 0;
      this.responsiveness = 1;
      this.glocIncidents = 0;
      this.gFatigueAccumulator = 0;
      this.elapsedTime = 0;
    }
    /**
     * Advance the physiological simulation by one timestep.
     *
     * @param {number} dt Simulation timestep in seconds (e.g. 1/120s)
     * @param {number} gZ Vertical load factor along body vertical axis (+1.0 G in level flight)
     * @param {{ elevator: number, aileron: number, rudder: number }} rawInputs Commanded inputs (-1..1)
     * @param {number} [simTime=null] Optional continuous simulation time (defaults to internal dt accumulator)
     */
    update(dt, gZ, rawInputs = {}, simTime = null) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      this.elapsedTime += dt;
      this.gZ = Number.isFinite(gZ) ? gZ : 1;
      const continuousTime = Number.isFinite(simTime) ? simTime : this.elapsedTime;
      const rawElevator = Number.isFinite(rawInputs.elevator) ? rawInputs.elevator : 0;
      const rawAileron = Number.isFinite(rawInputs.aileron) ? rawInputs.aileron : 0;
      const rawRudder = Number.isFinite(rawInputs.rudder) ? rawInputs.rudder : 0;
      if (this.gZ < -1.8) {
        this.negativeGExposure = clamp(this.negativeGExposure + (-1.8 - this.gZ) * dt / 5.1, 0, 1);
      } else {
        this.negativeGExposure = Math.max(0, this.negativeGExposure - dt / 2);
      }
      if (this.gZ > 5.5) {
        const drainRate = (this.gZ - 5.5) / (3.5 * 6);
        this.consciousness = Math.max(0, this.consciousness - drainRate * dt);
      } else if (!this.isGLOC) {
        this.consciousness = Math.min(1, this.consciousness + dt / 1.5);
      }
      if (this.consciousness < 0.8) {
        this.gFatigueAccumulator += dt;
      }
      if (this.consciousness <= 0 && !this.isGLOC) {
        this.isGLOC = true;
        this.glocTimer = 2.5;
        this.glocIncidents++;
      }
      if (this.isGLOC) {
        this.consciousness = 0;
        this.glocTimer -= dt;
        if (this.glocTimer <= 0 && this.gZ >= -1.8 && this.gZ <= 5.5) {
          this.isGLOC = false;
          this.stuporTimer = 1.5;
        }
      }
      let stuporFactor = 1;
      if (this.stuporTimer > 0) {
        this.stuporTimer = Math.max(0, this.stuporTimer - dt);
        stuporFactor = 0.5 + 0.5 * (1 - this.stuporTimer / 1.5);
      }
      if (this.consciousness >= 0.999 && Math.abs(this.gZ) <= 5.5 && !this.isGLOC && this.stuporTimer <= 0) {
        this.effectiveElevator = rawElevator;
        this.effectiveAileron = rawAileron;
        this.effectiveRudder = rawRudder;
        this.responsiveness = 1;
        return;
      }
      if (this.isGLOC) {
        const springRate = 1 / 1.5;
        this.effectiveElevator += Math.sign(-this.effectiveElevator) * Math.min(Math.abs(this.effectiveElevator), springRate * dt);
        this.effectiveAileron += Math.sign(-this.effectiveAileron) * Math.min(Math.abs(this.effectiveAileron), springRate * dt);
        this.effectiveRudder += Math.sign(-this.effectiveRudder) * Math.min(Math.abs(this.effectiveRudder), springRate * dt);
        this.responsiveness = 0;
      } else {
        const targetElevator = rawElevator * stuporFactor;
        const targetAileron = rawAileron * stuporFactor;
        const targetRudder = rawRudder * stuporFactor;
        const tauBase = 0.05;
        const tauEffective = tauBase + (1 - this.consciousness) * 0.6;
        const tauPitch = 1.5 * tauEffective;
        const tauRoll = tauEffective;
        const tauYaw = tauEffective;
        const alphaPitch = Math.min(1, dt / Math.max(1e-3, tauPitch));
        const alphaRoll = Math.min(1, dt / Math.max(1e-3, tauRoll));
        const alphaYaw = Math.min(1, dt / Math.max(1e-3, tauYaw));
        this.effectiveElevator += (targetElevator - this.effectiveElevator) * alphaPitch;
        this.effectiveAileron += (targetAileron - this.effectiveAileron) * alphaRoll;
        this.effectiveRudder += (targetRudder - this.effectiveRudder) * alphaYaw;
        const maxAuthority = clamp(this.consciousness + 0.3, 0.2, 1) * stuporFactor;
        this.effectiveElevator = clamp(this.effectiveElevator, -maxAuthority, maxAuthority);
        this.effectiveAileron = clamp(this.effectiveAileron, -maxAuthority, maxAuthority);
        this.effectiveRudder = clamp(this.effectiveRudder, -maxAuthority, maxAuthority);
        if (Math.abs(this.gZ) > 5.5 && this.consciousness > 0) {
          const jitter = Math.sin(continuousTime * 35) * (Math.abs(this.gZ) - 5.5) * 0.02;
          this.effectiveElevator = clamp(this.effectiveElevator + jitter, -maxAuthority, maxAuthority);
          this.effectiveAileron = clamp(this.effectiveAileron + jitter, -maxAuthority, maxAuthority);
        }
        this.responsiveness = clamp(maxAuthority * (tauBase / tauEffective), 0, 1);
      }
    }
    // Visual FX Factors
    get blackout() {
      if (this.isGLOC) return 1;
      if (this.consciousness >= 0.25) return 0;
      return clamp((0.25 - this.consciousness) / 0.25, 0, 1);
    }
    get grayout() {
      if (this.consciousness >= 0.8) return 0;
      return clamp((0.8 - this.consciousness) / 0.5, 0, 1);
    }
    get tunnelVision() {
      if (this.consciousness >= 1) return 0;
      return clamp((1 - this.consciousness) * 1.4, 0, 1);
    }
    get redout() {
      return this.negativeGExposure;
    }
    get blur() {
      return this.redout * 0.8;
    }
    getSnapshot() {
      return {
        gZ: this.gZ,
        consciousness: this.consciousness,
        responsiveness: this.responsiveness,
        isGLOC: this.isGLOC,
        blackout: this.blackout,
        redout: this.redout,
        tunnelVision: this.tunnelVision,
        grayout: this.grayout,
        blur: this.blur,
        glocIncidents: this.glocIncidents,
        gFatigueSeconds: this.gFatigueAccumulator
      };
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/loadFactor.js
  var THREE5 = __toESM(require_three(), 1);
  var specificForce = new THREE5.Vector3();
  var cabinUp = new THREE5.Vector3();
  var midpoint = new THREE5.Quaternion();
  function normalLoadFactor(beforeVelocity, afterVelocity, beforeRotation, afterRotation, dt) {
    specificForce.copy(afterVelocity).sub(beforeVelocity).divideScalar(dt);
    specificForce.y += Atmosphere.G0;
    midpoint.copy(beforeRotation).slerp(afterRotation, 0.5);
    cabinUp.set(0, 1, 0).applyQuaternion(midpoint);
    return specificForce.dot(cabinUp) / Atmosphere.G0;
  }
  function filterGForce(rawGz, prevFilteredGz, dt, cutoffHz = 8) {
    if (!Number.isFinite(rawGz)) return prevFilteredGz ?? 1;
    if (!Number.isFinite(prevFilteredGz)) return rawGz;
    if (!Number.isFinite(dt) || dt <= 0) return prevFilteredGz;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const alpha = dt / (rc + dt);
    return prevFilteredGz + (rawGz - prevFilteredGz) * alpha;
  }
  var GForceFilter = class {
    constructor(cutoffHz = 8) {
      this.cutoffHz = cutoffHz;
      this.filteredGz = null;
    }
    reset(initialG = null) {
      this.filteredGz = Number.isFinite(initialG) ? initialG : null;
    }
    update(rawGz, dt) {
      this.filteredGz = filterGForce(rawGz, this.filteredGz, dt, this.cutoffHz);
      return this.filteredGz;
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/physics/bodyContactConstraint.js
  var THREE6 = __toESM(require_three(), 1);
  var BODY_PENETRATION_LIMIT = 0.04;
  var point = new THREE6.Vector3();
  var arm = new THREE6.Vector3();
  var normal = new THREE6.Vector3();
  var normalBody = new THREE6.Vector3();
  var torque = new THREE6.Vector3();
  var inverse = new THREE6.Quaternion();
  var velocity = new THREE6.Vector3();
  var localArm = new THREE6.Vector3();
  var ZERO_CG3 = Object.freeze({ x: 0, y: 0, z: 0 });
  function constrainBodyContact(position, quaternion, linearVelocity, angularVelocity, mass, inverseInertia, height, terrainNormal, points = BODY_SUPPORT_POINTS, cg = ZERO_CG3) {
    inverse.copy(quaternion).invert();
    let totalCorrectionM = 0;
    const maxCorrectionM = 8;
    for (let iteration = 0; iteration < 4; iteration++) {
      let corrected = false;
      for (const probe of points) {
        arm.set(...probe.position).applyQuaternion(quaternion);
        point.copy(position).add(arm);
        localArm.set(...probe.position).sub(cg);
        arm.copy(localArm).applyQuaternion(quaternion);
        const penetration = height(point.x, point.z) - point.y;
        if (penetration <= BODY_PENETRATION_LIMIT) continue;
        corrected = true;
        normal.copy(terrainNormal?.(point.x, point.z) || new THREE6.Vector3(0, 1, 0)).normalize();
        if (normal.y < 0.1) normal.set(0, 1, 0);
        const neededDelta = (penetration - BODY_PENETRATION_LIMIT) * normal.y;
        const normalDelta = Math.min(neededDelta, Math.max(0, maxCorrectionM - totalCorrectionM));
        if (normalDelta > 0) {
          position.addScaledVector(normal, normalDelta);
          totalCorrectionM += normalDelta;
        }
        velocity.copy(angularVelocity).applyQuaternion(quaternion).cross(arm).add(linearVelocity);
        const closing = velocity.dot(normal);
        if (closing >= 0) continue;
        normalBody.copy(normal).applyQuaternion(inverse);
        torque.copy(localArm).cross(normalBody);
        const denominator = 1 / mass + torque.x ** 2 * inverseInertia.x + torque.y ** 2 * inverseInertia.y + torque.z ** 2 * inverseInertia.z;
        const impulse = -closing / denominator;
        linearVelocity.addScaledVector(normal, impulse / mass);
        angularVelocity.x += torque.x * inverseInertia.x * impulse;
        angularVelocity.y += torque.y * inverseInertia.y * impulse;
        angularVelocity.z += torque.z * inverseInertia.z * impulse;
      }
      if (!corrected || totalCorrectionM >= maxCorrectionM) break;
    }
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/massKinematics.js
  var THREE7 = __toESM(require_three(), 1);
  var offset = new THREE7.Vector3();
  var delta = new THREE7.Vector3();
  function rebaseCgVelocity(velocity2, omegaBody, quaternion, oldCg, newCg) {
    delta.set(newCg.x - oldCg.x, newCg.y - oldCg.y, newCg.z - oldCg.z);
    offset.copy(omegaBody).cross(delta).applyQuaternion(quaternion);
    velocity2.add(offset);
  }
  function translateModelOrigin(position, velocityCg, oldQuaternion, newQuaternion, cg, dt) {
    position.addScaledVector(velocityCg, dt);
    offset.copy(cg).applyQuaternion(oldQuaternion);
    position.add(offset);
    offset.copy(cg).applyQuaternion(newQuaternion);
    position.sub(offset);
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/stallSpeedEstimate.js
  function stallSpeedEstimate(aero, gear = 0) {
    const flap = aero.currentFlapAngle;
    const alpha = aero.alphaStallClean + 2 * Math.PI / 180 * flap / 40;
    const cl = aero.CL0_clean + 0.95 * flap / 40 - 0.38 * aero.spoilers + aero.CLa * alpha;
    const cd = aero.CD0 + 12e-4 * flap + 45e-6 * flap * flap + aero.gearDrag * gear + aero.spoilerDrag * aero.spoilers + cl * cl / (Math.PI * aero.aspectRatio * aero.oswaldEfficiency);
    const result = {}, trial = {};
    let elevator = (aero.Cm0 + aero.Cma * alpha) / aero.Cm_de;
    for (let i = 0; i < 12; i++) {
      longitudinalForces(aero, 1, alpha, cl, cd, elevator, 0, result);
      if (Math.abs(result.pitch) < 1e-8) break;
      longitudinalForces(aero, 1, alpha, cl, cd, elevator + 1e-5, 0, trial);
      const derivative = (trial.pitch - result.pitch) / 1e-5;
      if (Math.abs(derivative) < 1e-9) return null;
      elevator -= result.pitch / derivative;
    }
    longitudinalForces(aero, 1, alpha, cl, cd, elevator, 0, result);
    if (Math.abs(result.pitch) > 1e-5 || !(result.lift > 0)) return null;
    return Atmosphere.msToKnots(Math.sqrt(2 * aero.mass * Atmosphere.G0 / (1.225 * result.lift)));
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/TrimSolver.js
  var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  var MAX_ELEVATOR_RAD = Math.PI / 9;
  function solveLinear(a, b) {
    const rows = a.map((r, i) => [...r, b[i]]);
    for (let k = 0; k < 3; k++) {
      let pivot = k;
      for (let i = k + 1; i < 3; i++) if (Math.abs(rows[i][k]) > Math.abs(rows[pivot][k])) pivot = i;
      [rows[k], rows[pivot]] = [rows[pivot], rows[k]];
      if (Math.abs(rows[k][k]) < 1e-12) return null;
      const divisor = rows[k][k];
      for (let j = k; j < 4; j++) rows[k][j] /= divisor;
      for (let i = 0; i < 3; i++) if (i !== k) {
        const f = rows[i][k];
        for (let j = k; j < 4; j++) rows[i][j] -= f * rows[k][j];
      }
    }
    return rows.map((r) => r[3]);
  }
  function solveTrim(aero, engines, state = {}) {
    const mass = state.massKg ?? aero.mass;
    const atmos = Atmosphere.getConditions(state.altitudeMeters ?? 0);
    const tas = Atmosphere.iasToTas(Atmosphere.knotsToMs(state.iasKnots ?? 0), atmos.densityRatio);
    const reject = (reason) => ({
      feasible: false,
      handsOffFeasible: false,
      reason,
      elevator: 0,
      pitchTrimDeg: 0,
      throttle: 0,
      tas
    });
    if (!(tas > 1) || !(mass > 0) || !Number.isFinite(tas + mass)) return reject("airspeed");
    const gamma = (state.flightPathAngleDeg ?? 0) * Math.PI / 180;
    const flapIndex = clamp2(Math.round(state.flapsIndex ?? aero.flapsIndex ?? 0), 0, aero.flapAngles.length - 1);
    const flap = state.flapAngle ?? aero.flapAngles[flapIndex];
    const gear = state.gearState ?? 0, spoilers = state.spoilers ?? 0;
    const q = 0.5 * atmos.density * tas * tas, qS = q * aero.wingArea;
    const weight = mass * Atmosphere.G0;
    const cl0 = aero.CL0_clean + 0.95 * flap / 40 - 0.38 * spoilers;
    const alphaStall = aero.alphaStallClean + 2 * Math.PI / 180 * flap / 40;
    const clMax = cl0 + aero.CLa * alphaStall;
    const mach = tas / atmos.speedOfSound;
    const cd0 = aero.CD0 + 12e-4 * flap + 45e-6 * flap * flap + aero.gearDrag * gear + aero.spoilerDrag * spoilers + (mach > aero.transonicMachBuffet ? (mach - aero.transonicMachBuffet) ** 3.5 * 8 : 0);
    const proxy = state.cgBody ? Object.assign(Object.create(aero), { cg: state.cgBody }) : aero;
    const result = {};
    function residual(x2) {
      const [alpha2, elevator2, thrustRatio2] = x2;
      const cl2 = cl0 + aero.CLa * alpha2;
      const cd = cd0 + cl2 * cl2 / (Math.PI * aero.aspectRatio * aero.oswaldEfficiency);
      const thrust = thrustRatio2 * qS;
      longitudinalForces(proxy, q, alpha2, cl2, cd, elevator2, thrust, result);
      const sin = Math.sin(alpha2), cos = Math.cos(alpha2);
      return [
        (result.y * cos - result.z * sin + thrust * sin - weight * Math.cos(gamma)) / qS,
        (-result.y * sin - result.z * cos + thrust * cos - weight * Math.sin(gamma)) / qS,
        result.pitch / (qS * aero.meanChord)
      ];
    }
    const alpha0 = (weight * Math.cos(gamma) / qS - cl0) / aero.CLa;
    let x = [
      alpha0,
      (aero.Cm0 + aero.Cma * alpha0) / aero.Cm_de,
      cd0 + (weight / qS) ** 2 / (Math.PI * aero.aspectRatio * aero.oswaldEfficiency) + weight * Math.sin(gamma) / qS
    ];
    let error;
    for (let i = 0; i < 24; i++) {
      error = residual(x);
      if (Math.max(...error.map(Math.abs)) < 1e-9) break;
      const jac = [[], [], []];
      for (let j = 0; j < 3; j++) {
        const trial = [...x];
        trial[j] += 1e-5;
        const shifted = residual(trial);
        for (let k = 0; k < 3; k++) jac[k][j] = (shifted[k] - error[k]) / 1e-5;
      }
      const step = solveLinear(jac, error.map((v) => -v));
      if (!step) return reject("convergence");
      x = x.map((v, j) => v + clamp2(step[j], -0.5, 0.5));
    }
    error = residual(x);
    if (!x.every(Number.isFinite) || Math.max(...error.map(Math.abs)) > 1e-6) return reject("convergence");
    const [alpha, elevatorEffective, thrustRatio] = x;
    const cl = cl0 + aero.CLa * alpha;
    if (alpha >= alphaStall || cl >= 0.95 * clMax || alpha <= -alphaStall) return reject("stall");
    const thrustRequired = thrustRatio * qS;
    const scale = Math.max(1, engines.numEngines ?? 2) * engines.maxStaticThrustPerEngine * Math.max(0.1, atmos.densityRatio) ** 0.75 * Math.max(0.7, 1 - tas / 300 * 0.25);
    const idleN1 = engines.idleN1 ?? 22, maxN1 = engines.togaN1 ?? 100;
    const thrustFactor = Math.max(0, thrustRequired) / scale;
    const n1 = thrustFactorToN1(thrustFactor, idleN1, maxN1);
    const rawThrottle = (n1 - idleN1) / (maxN1 - idleN1);
    if (rawThrottle > 1) return { ...reject("thrust"), throttle: 1, thrustRequiredN: thrustRequired };
    const sensitivity = aero.tuning?.elevatorSensitivity ?? 1;
    const elevator = clamp2(elevatorEffective / (MAX_ELEVATOR_RAD * sensitivity), -1, 1);
    const pitchTrimDeg = (elevatorEffective - elevator * MAX_ELEVATOR_RAD * sensitivity) / TRIM_WHEEL_AUTHORITY * 180 / Math.PI;
    const handsOffTrimDegRaw = elevatorEffective / TRIM_WHEEL_AUTHORITY * 180 / Math.PI;
    const surfaceLimited = Math.abs(elevatorEffective) > MAX_ELEVATOR_RAD * sensitivity;
    return {
      feasible: true,
      reason: rawThrottle < 0 ? "idle" : void 0,
      alphaDeg: alpha * 180 / Math.PI,
      cl,
      clMax,
      cd: result.drag / qS,
      elevator,
      pitchTrimDeg: clamp2(pitchTrimDeg, -5, 12),
      handsOffTrimDegRaw,
      handsOffTrimDeg: clamp2(handsOffTrimDegRaw, -5, 12),
      handsOffFeasible: handsOffTrimDegRaw >= -5 && handsOffTrimDegRaw <= 12 && !surfaceLimited && rawThrottle >= 0,
      surfaceLimited,
      throttle: clamp2(rawThrottle, 0, 1),
      thrustN: Math.max(0, thrustRequired),
      tas,
      mach,
      qDyn: q,
      residual: error,
      tailForce: result.tailForce,
      tailDragDelta: result.tailDragDelta
    };
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/TakeoffPerformance.js
  function takeoffPerformance(aero, engines, state = {}) {
    const mass = aero.massProperties;
    const common = {
      revision: mass.revision,
      massKg: mass.massKg,
      zeroFuelMassKg: mass.zeroFuelMassKg,
      fuelKg: mass.fuelKg,
      cg: { ...mass.cg },
      v1: null,
      vr: null,
      v2: null,
      status: "unavailable"
    };
    if (engines.failed.some(Boolean) || engines.contactDamage.some((d) => d > 0) || mass.fuelKg <= 0 || engines.reverserActive || mass.gear < 0.99) return common;
    let lo = 10, hi = 400;
    const trial = (speed) => solveTrim(aero, engines, { ...state, gearState: 1, iasKnots: speed });
    let found = false;
    for (let v = 15; v <= hi; v += 5) {
      const t = trial(v);
      if (t.feasible && t.handsOffFeasible) {
        hi = v;
        found = true;
        break;
      }
      lo = v;
    }
    if (!found) return common;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2, t = trial(mid);
      if (t.feasible && t.handsOffFeasible) hi = mid;
      else lo = mid;
    }
    const vr = hi * 1.05, v2 = hi * 1.15;
    if (![vr, v2].every((v) => {
      const t = trial(v);
      return t.feasible && t.handsOffFeasible;
    })) return common;
    return { ...common, status: "estimate", trimBoundaryKnots: hi, vr, v2 };
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/FlightPhysicsCore.js
  var ONE_SCALE = new THREE8.Vector3(1, 1, 1);
  var DEFAULT_PHYSICS_HZ = 120;
  var DEFAULT_MAX_FRAME_DELTA = 0.05;
  function createPoseTransform(position, quaternion) {
    const matrixWorld = new THREE8.Matrix4();
    return {
      position,
      quaternion,
      matrixWorld,
      updateWorldMatrix() {
        matrixWorld.compose(this.position, this.quaternion, ONE_SCALE);
      }
    };
  }
  function defaultGroundHeight() {
    return 0;
  }
  function defaultGroundNormal() {
    return null;
  }
  function defaultRunwayCheck() {
    return true;
  }
  function defaultWaterLevel() {
    return 0;
  }
  var FlightPhysicsCore = class {
    constructor(options = {}) {
      const config = options.config ?? BOEING_737_800;
      this.config = config;
      this.physicsHz = options.physicsHz ?? DEFAULT_PHYSICS_HZ;
      this.physicsDt = 1 / this.physicsHz;
      this.maxFrameDelta = options.maxFrameDelta ?? DEFAULT_MAX_FRAME_DELTA;
      this.physicsAccumulator = 0;
      this.position = options.position ?? new THREE8.Vector3();
      this.quaternion = options.quaternion ?? new THREE8.Quaternion();
      this.linearVelocity = options.linearVelocity ?? new THREE8.Vector3();
      this.angularVelocity = options.angularVelocity ?? new THREE8.Vector3();
      this.aero = options.aero ?? new Aerodynamics(config);
      this.engines = options.engines ?? new EngineModel(config);
      this.gear = options.gear ?? new LandingGear(config);
      if (!options.gear && this.gear.bodySupportPoints === void 0) {
        this.gear.bodySupportPoints = config?.landingGear?.bodySupportPoints ?? BODY_SUPPORT_POINTS;
      }
      this.waterDitching = options.waterDitching ?? new WaterDitching();
      this.pilotPhysiology = options.pilotPhysiology ?? new PilotPhysiology();
      this.gForceFilter = options.gForceFilter ?? new GForceFilter(8);
      this.transform = createPoseTransform(this.position, this.quaternion);
      this.isCrashed = Boolean(options.isCrashed);
      this.windTimeSeconds = options.windTimeSeconds ?? 0;
      this.airborneTime = options.airborneTime ?? 0;
      this.hasTouchedDownThisFlight = Boolean(options.hasTouchedDownThisFlight);
      this.lastOnGround = options.lastOnGround ?? true;
      this.lastGearTarget = options.lastGearTarget ?? this.gear.targetGearState > 0.5;
      this.actualTakeoffMassKg = options.actualTakeoffMassKg ?? null;
      this.stallSpeedKnots = options.stallSpeedKnots;
      this.takeoff = options.takeoff ?? null;
      this._hasGroundContact = Boolean(options._hasGroundContact);
      this._performanceClock = options._performanceClock ?? 0;
      this.landingIncident = Boolean(options.landingIncident);
      this.landingRestTime = options.landingRestTime ?? 0;
      this.landingStopped = Boolean(options.landingStopped);
      this.waterDitchingNoticed = Boolean(options.waterDitchingNoticed);
      this.waterSinkingNoticed = Boolean(options.waterSinkingNoticed);
      this.waterSubmergedNoticed = Boolean(options.waterSubmergedNoticed);
      this.excursionAnnounced = Boolean(options.excursionAnnounced);
      this.bodyContactStarted = Boolean(options.bodyContactStarted);
      this.bodyContactNotices = options.bodyContactNotices ?? /* @__PURE__ */ new Set();
      this.telemetry = options.telemetry ?? {
        iasKnots: 0,
        tasKnots: 0,
        groundSpeedKnots: 0,
        altitudeFt: 0,
        radioAltFt: 0,
        vsiFpm: 0,
        pitchDeg: 0,
        rollDeg: 0,
        headingDeg: 0,
        trackDeg: 0,
        gForce: 1,
        rawGForce: 1,
        gearState: this.gear.gearState ?? 1,
        onGround: true,
        touchdown: false
      };
      this._cgBefore = new THREE8.Vector3();
      this._rotationBefore = new THREE8.Quaternion();
      this._gVelocityBefore = new THREE8.Vector3();
      this._gRotationBefore = new THREE8.Quaternion();
      this._intThrust = new THREE8.Vector3();
      this._intGravity = new THREE8.Vector3();
      this._intNetForce = new THREE8.Vector3();
      this._intNetMoment = new THREE8.Vector3();
      this._intAngAcc = new THREE8.Vector3();
      this._intDeltaRot = new THREE8.Quaternion();
      this._intEuler = new THREE8.Euler();
      this._intForward = new THREE8.Vector3();
      this._aeroResult = options.aeroResult ?? createAeroResult();
      this._waterTerrainProxy = {
        getHeight: defaultGroundHeight,
        getWaterLevel: defaultWaterLevel
      };
    }
    /**
     * Reset transient flight/incident state (e.g. on preset spawn or repair).
     */
    reset() {
      this.physicsAccumulator = 0;
      this.isCrashed = false;
      this.windTimeSeconds = 0;
      this.airborneTime = 0;
      this.hasTouchedDownThisFlight = false;
      this.lastOnGround = true;
      this.lastGearTarget = this.gear.targetGearState > 0.5;
      this.actualTakeoffMassKg = null;
      this._hasGroundContact = false;
      this._performanceClock = 0;
      this.landingIncident = false;
      this.landingRestTime = 0;
      this.landingStopped = false;
      this.waterDitchingNoticed = false;
      this.waterSinkingNoticed = false;
      this.waterSubmergedNoticed = false;
      this.excursionAnnounced = false;
      this.bodyContactStarted = false;
      this.bodyContactNotices.clear();
      this.waterDitching?.reset?.();
      this.pilotPhysiology?.reset?.();
      this.gForceFilter?.reset?.();
      this.aero.resetFlapDamage?.();
      this.gear.overspeedDamage = 0;
      this.telemetry.configurationOverspeed = void 0;
      this.telemetry.configurationDamage = void 0;
    }
    /**
     * Resolve body support-point penetration against the ground callback.
     */
    resolveBodyPenetration(getGroundHeight = defaultGroundHeight, getGroundNormal = defaultGroundNormal) {
      constrainBodyContact(
        this.position,
        this.quaternion,
        this.linearVelocity,
        this.angularVelocity,
        this.aero.mass,
        { x: this.aero.invIyy, y: this.aero.invIzz, z: this.aero.invIxx },
        getGroundHeight,
        getGroundNormal,
        this.gear.supportedBodyPoints,
        this.aero.cg
      );
    }
    /**
     * Advance the simulation by `dt` seconds using fixed 120 Hz substeps.
     * Returns the latest physics state, telemetry, and all events emitted across substeps.
     */
    step(dt, inputs = {}, environment = {}) {
      const clampedDt = Number.isFinite(dt) ? Math.max(0, Math.min(this.maxFrameDelta, dt)) : 0;
      this.physicsAccumulator += clampedDt;
      const events = [];
      let substeps = 0;
      let lastResult = null;
      while (this.physicsAccumulator >= this.physicsDt) {
        lastResult = this.integrateSubstep(this.physicsDt, inputs, environment);
        if (lastResult.events.length) events.push(...lastResult.events);
        this.physicsAccumulator -= this.physicsDt;
        substeps++;
      }
      return {
        position: this.position,
        quaternion: this.quaternion,
        linearVelocity: this.linearVelocity,
        angularVelocity: this.angularVelocity,
        telemetry: this.telemetry,
        events,
        substeps,
        lastSubstep: lastResult
      };
    }
    /**
     * Execute a single physics integration substep of `dt` seconds (typically 1/120 s).
     */
    integrateSubstep(dt, inputs = {}, environment = {}) {
      const getGroundHeight = environment.getGroundHeight ?? defaultGroundHeight;
      const getGroundNormal = environment.getGroundNormal ?? defaultGroundNormal;
      const isOnRunway = environment.isOnRunway ?? defaultRunwayCheck;
      const isRunwaySafetyArea = environment.isRunwaySafetyArea ?? defaultRunwayCheck;
      const getWaterLevel = environment.getWaterLevel ?? defaultWaterLevel;
      const getWindWorld = environment.getWindWorld ?? null;
      const events = [];
      this.transform.position.copy(this.position);
      this.transform.quaternion.copy(this.quaternion);
      if (this.isCrashed) {
        this._gVelocityBefore.copy(this.linearVelocity);
        this._gRotationBefore.copy(this.quaternion);
        this.linearVelocity.multiplyScalar(Math.max(0, 1 - dt * 2.8));
        this.angularVelocity.multiplyScalar(Math.max(0, 1 - dt * 3.5));
        this.position.addScaledVector(this.linearVelocity, dt);
        this.resolveBodyPenetration(getGroundHeight, getGroundNormal);
        this.transform.position.copy(this.position);
        const rawGForce2 = normalLoadFactor(
          this._gVelocityBefore,
          this.linearVelocity,
          this._gRotationBefore,
          this.quaternion,
          dt
        );
        const measuredGForce2 = this.gForceFilter.update(rawGForce2, dt);
        if (this.telemetry) {
          const groundSpeed2 = Math.hypot(this.linearVelocity.x, this.linearVelocity.z);
          const groundHeight2 = getGroundHeight(this.position.x, this.position.z);
          const wind = this.aero?.windWorld;
          const tas2 = wind ? Math.hypot(this.linearVelocity.x - wind.x, this.linearVelocity.y - wind.y, this.linearVelocity.z - wind.z) : this.linearVelocity.length();
          const densityRatio = Atmosphere.getConditions(this.position.y).densityRatio;
          this.telemetry.gForce = measuredGForce2;
          this.telemetry.rawGForce = rawGForce2;
          this.telemetry.altitudeFt = Atmosphere.metersToFeet(this.position.y);
          this.telemetry.radioAltFt = Atmosphere.metersToFeet(Math.max(0, this.position.y - groundHeight2));
          this.telemetry.groundSpeedKnots = Atmosphere.msToKnots(groundSpeed2);
          this.telemetry.iasKnots = Atmosphere.msToKnots(tas2 * Math.sqrt(Math.max(0, densityRatio)));
          this.telemetry.vsiFpm = Atmosphere.metersToFeet(this.linearVelocity.y) * 60;
        }
        return {
          position: this.position,
          quaternion: this.quaternion,
          linearVelocity: this.linearVelocity,
          angularVelocity: this.angularVelocity,
          telemetry: this.telemetry,
          events
        };
      }
      if (getWindWorld) {
        getWindWorld(this.position, this.windTimeSeconds, this.aero.windWorld);
        if (this.aero.windLeftWorld && this.aero.windRightWorld) {
          const arm2 = this.aero.wingspan / 4;
          for (const [target, sign] of [[this.aero.windLeftWorld, -1], [this.aero.windRightWorld, 1]]) {
            target.set(sign * arm2, 0, 0).applyQuaternion(this.quaternion).add(this.position);
            getWindWorld(target, this.windTimeSeconds, target);
          }
        }
        this.windTimeSeconds += dt;
      }
      const rawElevator = inputs.elevator ?? 0;
      const rawAileron = inputs.aileron ?? 0;
      const rawRudder = inputs.rudder ?? 0;
      const rawThrottle = inputs.throttle ?? 0;
      const rawBrakes = inputs.brakes ?? 0;
      const bypassPhysiology = Boolean(inputs.bypassPilotPhysiology);
      if (!bypassPhysiology) {
        this.pilotPhysiology.update(dt, this.telemetry?.gForce ?? 1, {
          elevator: rawElevator,
          aileron: rawAileron,
          rudder: rawRudder
        });
        this.aero.elevator = this.pilotPhysiology.effectiveElevator;
        this.aero.aileron = this.pilotPhysiology.effectiveAileron;
        this.aero.rudder = this.pilotPhysiology.effectiveRudder;
      } else {
        this.pilotPhysiology.reset();
        this.pilotPhysiology.effectiveElevator = rawElevator;
        this.pilotPhysiology.effectiveAileron = rawAileron;
        this.pilotPhysiology.effectiveRudder = rawRudder;
        this.aero.elevator = rawElevator;
        this.aero.aileron = rawAileron;
        this.aero.rudder = rawRudder;
      }
      if (inputs.pitchTrim !== void 0) {
        this.aero.pitchTrim = inputs.pitchTrim;
      }
      if (inputs.autopilotElevator !== void 0) {
        this.aero.elevator = inputs.autopilotElevator;
      }
      if (inputs.autopilotAileron !== void 0) {
        this.aero.aileron = inputs.autopilotAileron;
      }
      if (inputs.flapsIndex !== void 0 && typeof this.aero.setFlapPosition === "function") {
        this.aero.setFlapPosition(inputs.flapsIndex);
      }
      if (inputs.spoilers !== void 0) {
        this.aero.spoilers = Math.max(0, Math.min(1, inputs.spoilers));
      }
      if (inputs.gearHandleDown !== void 0 && typeof this.gear.setGearTarget === "function") {
        this.gear.setGearTarget(Boolean(inputs.gearHandleDown));
      }
      if (inputs.reverserActive !== void 0 && typeof this.engines.setReverser === "function") {
        this.engines.setReverser(Boolean(inputs.reverserActive), this.lastOnGround);
      }
      const groundSpeed = Math.hypot(this.linearVelocity.x, this.linearVelocity.z);
      const steeringRudder = bypassPhysiology ? rawRudder : this.pilotPhysiology.effectiveRudder;
      this.gear.setSteering(steeringRudder, groundSpeed);
      this.gear.setBrakes(rawBrakes);
      this.engines.setThrottle(rawThrottle);
      const altitudeMeters = this.position.y;
      const atmos = Atmosphere.getConditions(altitudeMeters);
      const tas = Math.hypot(
        this.linearVelocity.x - this.aero.windWorld.x,
        this.linearVelocity.y - this.aero.windWorld.y,
        this.linearVelocity.z - this.aero.windWorld.z
      );
      if (this.gear.bodyDamage?.engineL !== void 0) {
        this.engines.contactDamage[0] = this.gear.bodyDamage.engineL;
      }
      if (this.engines.numEngines > 1 && this.gear.bodyDamage?.engineR !== void 0) {
        this.engines.contactDamage[1] = this.gear.bodyDamage.engineR;
      }
      if (this.gear.bodyDamage) {
        this.aero.damageZones = this.gear.bodyDamage;
      }
      this._cgBefore.copy(this.aero.cg);
      this.engines.bindMassProperties(this.aero.massProperties);
      const configurationOverspeed = this.config.configurationLimits && advanceConfigurationOverspeed(
        this.aero,
        this.gear,
        this.config.configurationLimits,
        Atmosphere.msToKnots(tas * Math.sqrt(atmos.densityRatio)),
        dt
      );
      this.gear.advanceConfiguration(dt);
      this.aero.advanceFlaps(dt);
      const engineData = this.engines.update(dt, altitudeMeters, tas, atmos.densityRatio);
      this.aero.massProperties.setConfiguration(
        this.gear.gearState,
        this.aero.currentFlapAngle / (this.aero.flapAngles.at(-1) || 1)
      );
      this.aero.syncMassProperties();
      rebaseCgVelocity(this.linearVelocity, this.angularVelocity, this.quaternion, this._cgBefore, this.aero.cg);
      this._gVelocityBefore.copy(this.linearVelocity);
      this._gRotationBefore.copy(this.quaternion);
      const groundHeight = getGroundHeight(this.position.x, this.position.z);
      const heightAboveGround = Math.max(0, this.position.y - groundHeight);
      this.transform.updateWorldMatrix();
      const dynamics = {
        mass: this.aero.mass,
        inverseInertia: { x: this.aero.invIyy, y: this.aero.invIzz, z: this.aero.invIxx }
      };
      const gearResult = this.gear.update(
        dt,
        this.transform,
        this.linearVelocity,
        this.angularVelocity,
        getGroundHeight,
        getGroundNormal,
        isOnRunway,
        this.aero.cg,
        true,
        isRunwaySafetyArea,
        dynamics
      );
      const stepEuler = this._intEuler.setFromQuaternion(this.quaternion, "YXZ");
      const stepPitchDeg = THREE8.MathUtils.radToDeg(stepEuler.x);
      const stepRollDeg = THREE8.MathUtils.radToDeg(-stepEuler.z);
      const isAmphibious = Boolean(this.config?.isAmphibious);
      this._waterTerrainProxy.getHeight = getGroundHeight;
      this._waterTerrainProxy.getWaterLevel = getWaterLevel;
      const waterResult = this.waterDitching.update(
        dt,
        this.transform,
        this.linearVelocity,
        this.angularVelocity,
        this._waterTerrainProxy,
        this.aero,
        this.gear.supportedBodyPoints,
        gearResult.gearState,
        stepPitchDeg,
        stepRollDeg,
        dynamics,
        isAmphibious
      );
      gearResult.waterDitching = this.waterDitching;
      gearResult.waterResult = waterResult;
      if (waterResult.catastrophic && !this.isCrashed) {
        this.isCrashed = true;
        this.landingIncident = true;
        this.engines.setThrottle(0);
        events.push({
          type: "waterCrash",
          sinkRate: Math.max(0, -this.linearVelocity.y),
          speedMs: this.linearVelocity.length(),
          pitchDeg: stepPitchDeg,
          rollDeg: stepRollDeg,
          isAmphibious
        });
      }
      if (waterResult.onWater && waterResult.ditchingContact) {
        if (!this.waterDitchingNoticed) {
          this.waterDitchingNoticed = true;
          if (isAmphibious) {
            events.push({ type: "amphibianWaterTouchdown", sinkRate: waterResult.touchdownVsi });
          } else {
            this.landingIncident = true;
            this.engines.setThrottle(0);
            events.push({ type: "waterDitching" });
          }
        }
        if (!isAmphibious && waterResult.ditchingPhase === "sinking" && !this.waterSinkingNoticed) {
          this.waterSinkingNoticed = true;
          events.push({ type: "waterSinking" });
        }
        if (!isAmphibious && waterResult.submerged && !this.waterSubmergedNoticed) {
          this.waterSubmergedNoticed = true;
          events.push({ type: "waterSubmerged" });
        }
      } else if (isAmphibious && !waterResult.onWater && !waterResult.ditchingContact) {
        this.waterDitchingNoticed = false;
      }
      if (gearResult.damageEvents.length || gearResult.bodyContacts.length && !this.bodyContactStarted) {
        this.landingIncident = true;
        for (const event of gearResult.damageEvents) {
          events.push({ type: "gearDamage", id: event.id, state: event.state, reason: event.reason });
        }
      }
      const newContacts = [...new Map(gearResult.bodyContacts.map((c) => [c.id, c])).values()].filter((c) => !this.bodyContactNotices.has(c.id));
      for (const contact of newContacts) this.bodyContactNotices.add(contact.id);
      if (newContacts.length) {
        this.bodyContactStarted = true;
        events.push({ type: "bodyContact", contacts: newContacts });
      }
      for (const event of gearResult.bodyDamageEvents) {
        events.push({ type: "bodyDamage", id: event.id, state: event.state });
      }
      const groundRoughness = gearResult.groundRoughness || 0;
      if (groundRoughness > 0.5 && !this.excursionAnnounced) {
        this.excursionAnnounced = true;
        events.push({ type: "excursion", groundRoughness });
      } else if (groundRoughness < 0.2) {
        this.excursionAnnounced = false;
      }
      const resting = (gearResult.onGround || waterResult.onWater && waterResult.ditchingContact) && this.linearVelocity.length() < 0.5 && this.angularVelocity.length() < 0.02;
      this.landingRestTime = resting ? this.landingRestTime + dt : 0;
      if (!resting) this.landingStopped = false;
      if (this.landingIncident && !this.landingStopped && this.landingRestTime >= 1) {
        this.landingStopped = true;
        events.push({ type: "landingStopped" });
      }
      this.aero.gearHandleDown = this.gear.targetGearState > 0.5;
      const aeroResult = this.aero.computeAero(
        dt,
        this.transform,
        this.linearVelocity,
        this.angularVelocity,
        altitudeMeters,
        heightAboveGround,
        engineData.totalThrust,
        gearResult.gearState,
        this._aeroResult,
        true
      );
      aeroResult.momentBody.y += asymmetricThrustYawMoment(
        engineData.engine1.thrust,
        engineData.engine2.thrust,
        this.engines.momentArmMeters
      );
      const thrustWorld = this._intThrust.set(0, 0, -engineData.totalThrust).applyQuaternion(this.quaternion);
      const gravityWorld = this._intGravity.set(0, -this.aero.mass * Atmosphere.G0, 0);
      const netForceWorld = this._intNetForce.set(0, 0, 0).add(gravityWorld).add(thrustWorld).add(aeroResult.forceWorld).add(gearResult.forces).add(waterResult.forces);
      if (inputs.externalForceWorld) {
        netForceWorld.add(inputs.externalForceWorld);
      }
      const accelerationWorld = netForceWorld.divideScalar(this.aero.mass);
      this.linearVelocity.addScaledVector(accelerationWorld, dt);
      let parkingBrakeEngaged = false;
      if (gearResult.onGround && rawBrakes > 0.5 && this.linearVelocity.length() < 0.4 && rawThrottle < 0.1) {
        this.linearVelocity.set(0, 0, 0);
        parkingBrakeEngaged = true;
      }
      this._rotationBefore.copy(this.quaternion);
      const netMomentBody = this._intNetMoment.set(0, 0, 0).add(aeroResult.momentBody).add(gearResult.moments).add(waterResult.moments);
      if (inputs.externalMomentBody) {
        netMomentBody.add(inputs.externalMomentBody);
      }
      const angAccBody = this._intAngAcc.set(
        netMomentBody.x * this.aero.invIyy,
        netMomentBody.y * this.aero.invIzz,
        netMomentBody.z * this.aero.invIxx
      );
      this.angularVelocity.addScaledVector(angAccBody, dt);
      this.angularVelocity.multiplyScalar(Math.max(0, 1 - dt * 0.35));
      const deltaRot = this._intDeltaRot.set(
        this.angularVelocity.x * dt * 0.5,
        this.angularVelocity.y * dt * 0.5,
        this.angularVelocity.z * dt * 0.5,
        1
      ).normalize();
      this.quaternion.multiply(deltaRot).normalize();
      translateModelOrigin(this.position, this.linearVelocity, this._rotationBefore, this.quaternion, this.aero.cg, dt);
      const collisionPosition = this.position.clone();
      const collisionVelocity = this.linearVelocity.clone();
      this.resolveBodyPenetration(getGroundHeight, getGroundNormal);
      this.transform.position.copy(this.position);
      this.transform.quaternion.copy(this.quaternion);
      const euler = this._intEuler.setFromQuaternion(this.quaternion, "YXZ");
      const pitchDeg = THREE8.MathUtils.radToDeg(euler.x);
      const rollDeg = THREE8.MathUtils.radToDeg(-euler.z);
      const forwardVec = this._intForward.set(0, 0, -1).applyQuaternion(this.quaternion);
      const headingDeg = (THREE8.MathUtils.radToDeg(Math.atan2(forwardVec.x, -forwardVec.z)) + 360) % 360;
      const trackDeg = (THREE8.MathUtils.radToDeg(Math.atan2(this.linearVelocity.x, -this.linearVelocity.z)) + 360) % 360;
      const rawGForce = normalLoadFactor(
        this._gVelocityBefore,
        this.linearVelocity,
        this._gRotationBefore,
        this.quaternion,
        dt
      );
      const measuredGForce = this.gForceFilter.update(rawGForce, dt);
      if (this.pilotPhysiology) this.pilotPhysiology.gZ = measuredGForce;
      if (this._hasGroundContact && this.lastOnGround && !gearResult.onGround && this.actualTakeoffMassKg === null) {
        this.actualTakeoffMassKg = this.aero.mass;
        this.stallSpeedKnots = stallSpeedEstimate(this.aero, this.gear.gearState);
        this.takeoff = takeoffPerformance(this.aero, this.engines, {
          altitudeMeters: this.position.y,
          flapsIndex: this.aero.flapsIndex,
          flapAngle: this.aero.currentFlapAngle
        });
      }
      this._hasGroundContact ||= gearResult.onGround;
      this._performanceClock += dt;
      if (this._performanceClock >= 1 || this.stallSpeedKnots === void 0) {
        if (gearResult.onGround) {
          this.stallSpeedKnots = stallSpeedEstimate(this.aero, this.gear.gearState);
          this.takeoff = takeoffPerformance(this.aero, this.engines, {
            altitudeMeters: this.position.y,
            flapsIndex: this.aero.flapsIndex,
            flapAngle: this.aero.currentFlapAngle
          });
        } else {
          this.stallSpeedKnots = stallSpeedEstimate(this.aero, gearResult.gearState);
        }
        this._performanceClock = 0;
      }
      const touchdownSinkRate = Math.max(
        0,
        ...gearResult.touchdownContacts.map((contact) => contact.sinkRate),
        waterResult.ditchingContact ? waterResult.touchdownVsi : 0
      );
      this.telemetry = {
        massRevision: this.aero.massProperties.revision,
        massKg: this.aero.mass,
        zeroFuelMassKg: this.aero.massProperties.zeroFuelMassKg,
        cgBody: { ...this.aero.cg },
        inertiaBody: { ...this.aero.massProperties.inertia },
        takeoff: this.takeoff,
        actualTakeoffMassKg: this.actualTakeoffMassKg,
        stallSpeedKnots: this.stallSpeedKnots,
        pitchDeg,
        rollDeg,
        headingDeg,
        trackDeg,
        altitudeFt: Atmosphere.metersToFeet(this.position.y),
        radioAltFt: Atmosphere.metersToFeet(heightAboveGround),
        iasKnots: aeroResult.iasKnots,
        tasKnots: aeroResult.tasKnots,
        groundSpeedKnots: Atmosphere.msToKnots(groundSpeed),
        vsiFpm: Atmosphere.metersToFeet(this.linearVelocity.y) * 60,
        mach: aeroResult.mach,
        gForce: measuredGForce,
        rawGForce,
        wow: Boolean(gearResult.contacts?.slice(1).some((c) => c.isGrounded)),
        isStalled: aeroResult.isStalled,
        isPreStall: aeroResult.isPreStall,
        isStallWarning: aeroResult.isStallWarning,
        stallSeverity: aeroResult.stallSeverity,
        buffetVibration: aeroResult.buffetVibration,
        engine1: engineData.engine1,
        engine2: engineData.engine2,
        reverserActive: engineData.reverserActive,
        fuelKg: engineData.fuelKg,
        gearState: gearResult.gearState,
        isTransit: gearResult.isTransit,
        compressions: gearResult.compressions,
        gearDamage: gearResult.gearDamage,
        bodyContacts: [...new Set(gearResult.bodyContacts.map((c) => c.id))],
        structuralDamage: gearResult.structuralDamage,
        groundRoughness,
        bodyDamage: gearResult.bodyDamage,
        configurationOverspeed,
        configurationDamage: {
          flapLeft: this.aero.leftFlapDamage ?? 0,
          flapRight: this.aero.rightFlapDamage ?? 0,
          gear: this.gear.overspeedDamage ?? 0
        },
        flapDegree: this.aero.currentFlapAngle,
        flapIndex: this.aero.flapsIndex,
        spoilers: this.aero.spoilers,
        onWater: Boolean(waterResult.onWater),
        ditchingPhase: waterResult.ditchingPhase,
        flooding: waterResult.flooding,
        touchdown: gearResult.touchdown || waterResult.onWater && waterResult.ditchingContact,
        touchdownSinkRate,
        onGround: gearResult.onGround || waterResult.onWater && waterResult.ditchingContact,
        rawElevator,
        rawAileron,
        rawRudder,
        elevator: bypassPhysiology ? rawElevator : this.pilotPhysiology.effectiveElevator,
        aileron: bypassPhysiology ? rawAileron : this.pilotPhysiology.effectiveAileron,
        rudder: bypassPhysiology ? rawRudder : this.pilotPhysiology.effectiveRudder,
        throttle: rawThrottle,
        pitchTrim: this.aero.pitchTrim,
        pilot: this.pilotPhysiology.getSnapshot(),
        x: this.position.x,
        z: this.position.z,
        parkBrake: Boolean(rawBrakes > 0.8 && Atmosphere.msToKnots(groundSpeed) < 1)
      };
      const gsKnots = Atmosphere.msToKnots(groundSpeed);
      let genuineLandingTouchdown = false;
      if (!gearResult.onGround) {
        this.airborneTime += dt;
        if (this.airborneTime > 2) {
          this.hasTouchedDownThisFlight = false;
        }
      } else {
        const isGenuineTouchdown = this.airborneTime >= 1.5 && gsKnots > 45 && !this.hasTouchedDownThisFlight;
        if (isGenuineTouchdown && (gearResult.touchdown || !this.lastOnGround)) {
          genuineLandingTouchdown = true;
          this.hasTouchedDownThisFlight = true;
          const contactsToSmoke = gearResult.touchdownContacts && gearResult.touchdownContacts.length > 0 ? gearResult.touchdownContacts : this.gear.contacts.filter((c) => c.id !== "nose");
          events.push({ type: "touchdown", contacts: contactsToSmoke, sinkRate: touchdownSinkRate });
        }
        this.airborneTime = 0;
      }
      if (this.lastOnGround && !gearResult.onGround && gsKnots > 75) {
        events.push({ type: "liftoff", groundSpeedKnots: gsKnots });
      }
      const currentGearTarget = this.gear.targetGearState > 0.5;
      if (this.lastGearTarget !== currentGearTarget) {
        events.push({ type: "gearTransit", extending: currentGearTarget });
        this.lastGearTarget = currentGearTarget;
      }
      this.lastOnGround = gearResult.onGround;
      return {
        position: this.position,
        quaternion: this.quaternion,
        linearVelocity: this.linearVelocity,
        angularVelocity: this.angularVelocity,
        telemetry: this.telemetry,
        events,
        gearResult,
        waterResult,
        aeroResult,
        engineData,
        collisionPosition,
        collisionVelocity,
        pitchDeg,
        rollDeg,
        headingDeg,
        groundSpeed,
        genuineLandingTouchdown,
        parkingBrakeEngaged
      };
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/controls/FlightControlLaws.js
  function applyDeadzone(value, deadzone = 0.04) {
    if (value === void 0 || value === null || Number.isNaN(value)) return 0;
    if (Math.abs(value) <= deadzone) return 0;
    const sign = Math.sign(value);
    const scaled = (Math.abs(value) - deadzone) / (1 - deadzone);
    return sign * Math.min(1, Math.max(0, scaled));
  }
  var FlightControlLaws = class {
    constructor(options = {}) {
      this.deadzoneStick = options.deadzoneStick ?? 0;
      this.deadzoneRudder = options.deadzoneRudder ?? 0;
      this.precisionCurve = options.precisionCurve ?? false;
      this.flapCount = options.flapCount ?? null;
      this.elevator = 0;
      this.aileron = 0;
      this.rudder = 0;
      this.throttle = 0;
      this.pitchTrim = 2;
      this.pitchTrimRate = 0;
      this.brakes = 0;
      this.parkingBrake = false;
      this.mouseControl = false;
      this.virtualElevator = null;
      this.virtualAileron = null;
      this.virtualRudder = null;
      this.virtualBrakes = null;
      this.touchElevator = 0;
      this.touchAileron = 0;
      this.touchPitchReturning = false;
      this.touchRollReturning = false;
      this.keyboardPitchReturning = false;
      this.keyboardRollReturning = false;
      this.keyboardAircraftId = null;
      this.touchRudder = 0;
      this.touchBrakes = 0;
      this.hotasElevator = this.hotasAileron = this.hotasRudder = this.hotasBrakes = 0;
      this.keys = {};
      this.mouseX = this.mouseY = 0;
      this.aircraftControlsDisabled = false;
      this.flapsIndex = 0;
      this.spoilers = 0;
      this.gearHandleDown = true;
      this.reverserActive = false;
    }
    update(raw = {}, dt = 0, iasKnots = 140, aircraftId = "B738") {
      const shape = (value) => {
        const axis = applyDeadzone(value ?? 0, this.deadzoneStick);
        return this.precisionCurve && (aircraftId === "F16" || aircraftId === "C172") ? 0.35 * axis + 0.65 * axis ** 3 : axis;
      };
      this.virtualElevator = shape(raw.pitch);
      this.virtualAileron = shape(raw.roll);
      this.virtualRudder = applyDeadzone(raw.yaw ?? 0, this.deadzoneRudder);
      this.virtualBrakes = raw.brakes ?? 0;
      if (raw.throttle !== void 0) this.throttle = Math.max(0, Math.min(1, raw.throttle));
      this.throttle = Math.max(0, Math.min(1, this.throttle + (raw.throttleRate ?? 0) * dt * 0.35));
      this.keys = {};
      this.flapsIndex = Math.max(0, Math.min(
        (this.flapCount ?? ({ B738: 7, F16: 2, C172: 4 }[aircraftId] ?? 1)) - 1,
        this.flapsIndex + (raw.flapsDelta ?? 0)
      ));
      if (raw.gearToggle) this.gearHandleDown = !this.gearHandleDown;
      if (raw.reverserToggle) this.reverserActive = !this.reverserActive;
      if (raw.spoilers !== void 0) this.spoilers = raw.spoilers;
      this.updateSources(dt, iasKnots, aircraftId);
      this.pitchTrimRate = raw.pitchTrim ?? 0;
      this.pitchTrim += this.pitchTrimRate * dt * 1.5;
      return {
        elevator: this.elevator,
        aileron: this.aileron,
        rudder: this.rudder,
        throttle: this.throttle,
        brakes: this.brakes,
        pitchTrim: this.pitchTrim,
        flapsIndex: this.flapsIndex,
        spoilers: this.spoilers,
        gearHandleDown: this.gearHandleDown,
        reverserActive: this.reverserActive
      };
    }
    updateSources(dt, iasKnots = 140, aircraftId = "B738") {
      if (this.aircraftControlsDisabled) {
        let targetElevator2 = this.virtualElevator !== null ? this.virtualElevator : 0;
        let targetAileron2 = this.virtualAileron !== null ? this.virtualAileron : 0;
        let targetRudder2 = this.virtualRudder !== null ? this.virtualRudder : 0;
        const stiffness2 = Math.max(0.4, 1 - Math.max(0, (iasKnots - 140) / 220) * 0.55);
        targetElevator2 *= stiffness2;
        targetAileron2 *= stiffness2;
        targetRudder2 *= stiffness2;
        const maxElevatorRate2 = 0.55;
        const maxAileronRate2 = 0.85;
        const maxRudderRate2 = 0.6;
        const elevDelta2 = targetElevator2 - this.elevator;
        const aileronDelta2 = targetAileron2 - this.aileron;
        const rudderDelta2 = targetRudder2 - this.rudder;
        this.elevator += Math.sign(elevDelta2) * Math.min(Math.abs(elevDelta2), maxElevatorRate2 * dt);
        this.aileron += Math.sign(aileronDelta2) * Math.min(Math.abs(aileronDelta2), maxAileronRate2 * dt);
        this.rudder += Math.sign(rudderDelta2) * Math.min(Math.abs(rudderDelta2), maxRudderRate2 * dt);
        this.pitchTrimRate = 0;
        if (this.virtualBrakes !== null && this.virtualBrakes !== void 0) {
          this.brakes = this.virtualBrakes;
        } else if (this.parkingBrake) {
          this.brakes = 1;
        } else {
          this.brakes = 0;
        }
        return;
      }
      if (this.keys["Equal"]) {
        this.throttle = Math.min(1, this.throttle + dt * 0.35);
      }
      if (this.keys["Minus"]) {
        this.throttle = Math.max(0, this.throttle - dt * 0.35);
      }
      const precisionStick = (value) => 0.35 * value + 0.65 * value ** 3;
      const precisionHotas = aircraftId === "F16" || aircraftId === "C172";
      const keyboardReturnEnabled = precisionHotas || aircraftId === "B738";
      const sameKeyboardAircraft = this.keyboardAircraftId === aircraftId;
      this.keyboardAircraftId = aircraftId;
      const hotasPitch = precisionHotas ? precisionStick(this.hotasElevator) : this.hotasElevator;
      const hotasRoll = precisionHotas ? precisionStick(this.hotasAileron) : this.hotasAileron;
      let targetElevator = this.virtualElevator !== null ? this.virtualElevator : this.touchElevator + hotasPitch;
      if (this.keys["KeyS"] || this.keys["ArrowDown"]) {
        targetElevator += 1;
      }
      if (this.keys["KeyW"] || this.keys["ArrowUp"]) {
        targetElevator -= 1;
      }
      targetElevator = Math.max(-1, Math.min(1, targetElevator));
      let targetAileron = this.virtualAileron !== null ? this.virtualAileron : this.touchAileron + hotasRoll;
      if (this.keys["KeyD"] || this.keys["ArrowRight"]) {
        targetAileron += 1;
      }
      if (this.keys["KeyA"] || this.keys["ArrowLeft"]) {
        targetAileron -= 1;
      }
      targetAileron = Math.max(-1, Math.min(1, targetAileron));
      if (this.mouseControl) {
        targetElevator = Math.max(-1, Math.min(1, this.mouseY * 1.5));
        targetAileron = Math.max(-1, Math.min(1, this.mouseX * 1.5));
      }
      let targetRudder = this.virtualRudder !== null ? this.virtualRudder : this.touchRudder + this.hotasRudder;
      if (this.keys["KeyE"]) {
        targetRudder += 1;
      }
      if (this.keys["KeyQ"]) {
        targetRudder -= 1;
      }
      targetRudder = Math.max(-1, Math.min(1, targetRudder));
      const stiffness = Math.max(0.4, 1 - Math.max(0, (iasKnots - 140) / 220) * 0.55);
      targetElevator *= stiffness;
      targetAileron *= stiffness;
      targetRudder *= stiffness;
      const isFighter = aircraftId === "F16";
      const maxElevatorRate = 0.55;
      const maxAileronRate = isFighter ? 4 : 0.85;
      const maxRudderRate = isFighter ? 2.5 : 0.6;
      const elevDelta = targetElevator - this.elevator;
      const aileronDelta = targetAileron - this.aileron;
      const rudderDelta = targetRudder - this.rudder;
      if (targetElevator !== 0 || this.virtualElevator !== null || this.mouseControl || this.keys["KeyS"] || this.keys["ArrowDown"] || this.keys["KeyW"] || this.keys["ArrowUp"]) {
        this.touchPitchReturning = false;
      }
      if (targetAileron !== 0 || this.virtualAileron !== null || this.mouseControl || this.keys["KeyD"] || this.keys["ArrowRight"] || this.keys["KeyA"] || this.keys["ArrowLeft"]) {
        this.touchRollReturning = false;
      }
      const pitchKeyHeld = this.keys.KeyS || this.keys.ArrowDown || this.keys.KeyW || this.keys.ArrowUp;
      const rollKeyHeld = this.keys.KeyD || this.keys.ArrowRight || this.keys.KeyA || this.keys.ArrowLeft;
      this.keyboardPitchReturning = Boolean(keyboardReturnEnabled && (pitchKeyHeld || sameKeyboardAircraft && this.keyboardPitchReturning && targetElevator === 0 && this.elevator !== 0));
      this.keyboardRollReturning = Boolean(keyboardReturnEnabled && (rollKeyHeld || sameKeyboardAircraft && this.keyboardRollReturning && targetAileron === 0 && this.aileron !== 0));
      const keyboardPitchReturn = this.keyboardPitchReturning && !pitchKeyHeld && targetElevator === 0 && this.virtualElevator === null && !this.mouseControl;
      const keyboardRollReturn = this.keyboardRollReturning && !rollKeyHeld && targetAileron === 0 && this.virtualAileron === null && !this.mouseControl;
      const elevatorRate = this.touchPitchReturning || keyboardPitchReturn ? 4 : maxElevatorRate;
      const aileronRate = this.touchRollReturning || keyboardRollReturn ? 4 : maxAileronRate;
      this.elevator += Math.sign(elevDelta) * Math.min(Math.abs(elevDelta), elevatorRate * dt);
      this.aileron += Math.sign(aileronDelta) * Math.min(Math.abs(aileronDelta), aileronRate * dt);
      if (this.elevator === 0) this.touchPitchReturning = false;
      if (this.aileron === 0) this.touchRollReturning = false;
      this.rudder += Math.sign(rudderDelta) * Math.min(Math.abs(rudderDelta), maxRudderRate * dt);
      this.pitchTrimRate = 0;
      if (this.keys["KeyY"]) {
        this.pitchTrim += dt * 1.5;
        this.pitchTrimRate = 1;
      }
      if (this.keys["KeyT"]) {
        this.pitchTrim -= dt * 1.5;
        this.pitchTrimRate = -1;
      }
      if (this.parkingBrake && this.throttle > 0.25) {
        this.parkingBrake = false;
      }
      if (this.keys["Space"]) {
        this.brakes = 1;
      } else if (this.virtualBrakes !== null && this.virtualBrakes !== void 0) {
        this.brakes = this.virtualBrakes;
      } else if (this.touchBrakes > 0) {
        this.brakes = this.touchBrakes;
      } else if (this.hotasBrakes > 0) {
        this.brakes = this.hotasBrakes;
      } else if (this.parkingBrake) {
        this.brakes = 1;
      } else {
        this.brakes = 0;
      }
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/controls/gyroOrientation.js
  var degrees = (radians) => radians * 180 / Math.PI;
  var angleDelta = (angle, zero) => (angle - zero + 540) % 360 - 180;
  function screenTilt(beta, gamma, angle) {
    const b = beta * Math.PI / 180;
    const g = gamma * Math.PI / 180;
    const a = angle * Math.PI / 180;
    const x = Math.cos(b) * Math.sin(g);
    const y = Math.sin(b);
    const z = Math.cos(b) * Math.cos(g);
    const right = x * Math.cos(a) + y * Math.sin(a);
    const up = y * Math.cos(a) - x * Math.sin(a);
    return {
      pitch: degrees(Math.atan2(up, z)),
      roll: degrees(Math.atan2(right, Math.hypot(up, z)))
    };
  }
  function readGyroScreen(win = typeof window !== "undefined" ? window : globalThis) {
    const orientation = win?.screen?.orientation;
    const rawAngle = orientation?.angle ?? win?.orientation;
    const angle = Number.isFinite(rawAngle) ? (rawAngle % 360 + 360) % 360 : 0;
    const type = orientation?.type?.startsWith("landscape") ? "landscape" : orientation?.type?.startsWith("portrait") ? "portrait" : (win?.innerWidth || 0) > (win?.innerHeight || 0) ? "landscape" : "portrait";
    return { angle, type };
  }
  function isGyroSupportedDevice(win = typeof window !== "undefined" ? window : globalThis, nav = typeof navigator !== "undefined" ? navigator : globalThis?.navigator) {
    if (typeof win === "undefined" || !win || !win.DeviceOrientationEvent) return false;
    if (win.isSecureContext === false) return false;
    const ua = nav?.userAgent || "";
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || /Macintosh/i.test(ua) && (nav?.maxTouchPoints || 0) > 1;
    const isMobileClient = Boolean(nav?.userAgentData?.mobile);
    const hasTouch = Boolean("ontouchstart" in win || (nav?.maxTouchPoints ?? 0) > 0);
    return (isMobileUA || isMobileClient) && hasTouch;
  }
  function shapeTouchStick(pitch, roll, { deadzone = 0.06, linearWeight = 0.35, cubicWeight = 0.65 } = {}) {
    const magnitude = Math.hypot(pitch, roll);
    if (magnitude <= deadzone) return [0, 0];
    const travel = (Math.min(1, magnitude) - deadzone) / (1 - deadzone);
    const response = linearWeight * travel + cubicWeight * Math.pow(travel, 3);
    return [pitch / magnitude * response, roll / magnitude * response];
  }

  // node_modules/@stlim0727/flightsim-core/src/physics/Autopilot.js
  function wrapHeading(deltaDeg) {
    const wrapped = ((deltaDeg + 180) % 360 + 360) % 360 - 180;
    return wrapped === -180 && deltaDeg >= 180 ? 180 : wrapped;
  }
  function clamp3(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function autopilotState(input, out = {}) {
    if (!input.telemetry) return input;
    for (const key of Object.keys(out)) delete out[key];
    Object.assign(out, input.telemetry);
    const { position: p2, quaternion: q, linearVelocity: v } = input;
    if (p2) {
      out.x = p2.x;
      out.z = p2.z;
      out.altitudeFt = p2.y / 0.3048;
    }
    if (v) out.vsiFpm = v.y / 0.3048 * 60;
    if (q) {
      const { x, y, z, w } = q;
      const m23 = 2 * (y * z - w * x);
      out.pitchDeg = Math.asin(-clamp3(m23, -1, 1)) * 180 / Math.PI;
      out.rollDeg = Math.abs(m23) < 0.9999999 ? -Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z)) * 180 / Math.PI : 0;
      const forwardX = w * (-2 * y) - z * (2 * x);
      const forwardZ = -1 + x * (2 * x) - y * (-2 * y);
      out.headingDeg = (Math.atan2(forwardX, -forwardZ) * 180 / Math.PI + 360) % 360;
    }
    return out;
  }
  var AutopilotController = class {
    constructor(options = {}) {
      this.approachDeviation = options.approachDeviation ?? (() => null);
      this._snapshot = {};
      this.master = false;
      this.lateralMode = null;
      this.verticalMode = null;
      this.speedMode = false;
      this.appArmed = false;
      this.targets = {
        headingDeg: 0,
        altitudeFt: 0,
        pitchDeg: 0,
        vsFpm: 0,
        iasKnots: 0
      };
      this.trimSolver = options.trimSolver || null;
      this.trim = { elevator: 0, throttle: 0 };
      this._trimThrottlePending = false;
      this.maxBankDeg = 30;
      this.hdgDegPerDegError = 1;
      this.aileronPerDegBankError = 0.06;
      this.aileronBankDamping = 0.02;
      this.elevatorPerFtAlt = 12e-4;
      this.elevatorPerFpmDamp = 12e-5;
      this.elevatorPerDegPitch = 0.08;
      this.elevatorPerFpmVs = 35e-5;
      this.gsElevatorPerFt = 15e-4;
      this.gsElevatorPerFpmDamp = 15e-5;
      this.throttlePerKtPerSec = 0.15;
      this.appCaptureFt = 300;
      this.appMaxCrossTrackM = 1200;
      this.appMaxRangeM = 12e3;
      this.pitchLimitsDeg = { min: -5, max: 20 };
      this.output = { aileron: 0, elevator: 0, throttle: 0 };
    }
    /** @param {'MASTER'|'HDG'|'ALT'|'VS'|'SPD'|'APP'} mode */
    engage(mode, telemetry) {
      telemetry = autopilotState(telemetry, this._snapshot);
      if (mode === "MASTER") {
        if (this.master) {
          this.disengage();
          return;
        }
        this.master = true;
        this.capturePitch(telemetry);
        this.captureSpeed(telemetry);
        this.refreshTrim(telemetry);
        return;
      }
      if (!this.master) {
        this.master = true;
        this.capturePitch(telemetry);
        this.captureSpeed(telemetry);
      }
      let engagedSpeed = false;
      switch (mode) {
        case "HDG":
          this.captureHeading(telemetry);
          this.lateralMode = "HDG";
          break;
        case "ALT":
          this.captureAltitude(telemetry);
          this.verticalMode = "ALT";
          break;
        case "VS":
          this.captureVS(telemetry);
          this.verticalMode = "VS";
          break;
        case "SPD":
          this.captureSpeed(telemetry);
          this.speedMode = true;
          engagedSpeed = true;
          break;
        case "APP":
          this.evaluateAppCapture(telemetry);
          break;
      }
      this.refreshTrim(telemetry);
      if (engagedSpeed && this.trim.throttle > 0) this._trimThrottlePending = true;
    }
    disengage() {
      this.master = false;
      this.lateralMode = null;
      this.verticalMode = null;
      this.speedMode = false;
      this.appArmed = false;
      this.trim.elevator = 0;
      this.trim.throttle = 0;
      this._trimThrottlePending = false;
    }
    reset() {
      this.disengage();
    }
    /**
     * Toggle a mode off when it is already the active one, else engage it.
     * Used by the one-click HUD buttons.
     */
    toggle(mode, telemetry) {
      if (mode === "MASTER") {
        this.engage("MASTER", telemetry);
        return this.master;
      }
      const isActive = mode === "HDG" && this.lateralMode === "HDG" || mode === "APP" && (this.lateralMode === "APP" || this.appArmed) || mode === "ALT" && this.verticalMode === "ALT" || mode === "VS" && this.verticalMode === "VS" || mode === "SPD" && this.speedMode;
      if (isActive) {
        if (mode === "HDG") this.lateralMode = null;
        if (mode === "APP") {
          this.lateralMode = null;
          if (this.verticalMode === "APP") this.verticalMode = "PITCH";
          this.appArmed = false;
        }
        if (mode === "ALT" || mode === "VS") this.verticalMode = "PITCH";
        if (mode === "SPD") this.speedMode = false;
        return false;
      }
      this.engage(mode, telemetry);
      return true;
    }
    captureHeading(telemetry) {
      this.targets.headingDeg = telemetry.headingDeg;
    }
    captureAltitude(telemetry) {
      this.targets.altitudeFt = telemetry.altitudeFt;
    }
    capturePitch(telemetry) {
      this.targets.pitchDeg = telemetry.pitchDeg;
    }
    captureVS(telemetry) {
      this.targets.vsFpm = telemetry.vsiFpm;
    }
    captureSpeed(telemetry) {
      this.targets.iasKnots = telemetry.iasKnots;
    }
    /** Desired steady flight-path angle of the active vertical mode, degrees. */
    flightPathAngleDeg(telemetry, vsOverrideFpm) {
      const vsFpm = vsOverrideFpm !== void 0 ? vsOverrideFpm : this.verticalMode === "VS" ? this.targets.vsFpm : 0;
      const tasMs = Math.max(1, (telemetry.tasKnots || 0) * 0.514444);
      return Math.atan2(vsFpm / 60, tasMs) * 180 / Math.PI;
    }
    /**
     * Capture the steady-state trim solution for the current targets. Called on
     * engage/target changes only — never per substep — so the injected solver may
     * allocate. Falls back to zero feedforward when no solver or no solution.
     */
    refreshTrim(telemetry, vsOverrideFpm) {
      this.trim.elevator = 0;
      this.trim.throttle = 0;
      if (!this.trimSolver) return;
      const solution = this.trimSolver(telemetry, this.flightPathAngleDeg(telemetry, vsOverrideFpm));
      if (!solution || !solution.feasible) return;
      if (Number.isFinite(solution.elevator)) this.trim.elevator = solution.elevator;
      if (Number.isFinite(solution.throttle)) this.trim.throttle = solution.throttle;
    }
    /**
     * APP becomes active only when established near the approach course;
     * otherwise it arms and captures automatically in update().
     * @returns {boolean} true when APP is active
     */
    evaluateAppCapture(telemetry) {
      const dev = this.approachDeviation(telemetry.airportKey, telemetry);
      if (dev && this.appWithinCapture(dev)) {
        this.lateralMode = "APP";
        this.verticalMode = "APP";
        this.appArmed = false;
        this.master = true;
        this.refreshTrim(telemetry, dev.referenceSinkFpm);
        return true;
      }
      this.appArmed = true;
      this.master = true;
      return false;
    }
    appWithinCapture(dev) {
      return dev.distanceToThresholdM > 0 && dev.distanceToThresholdM < this.appMaxRangeM && Math.abs(dev.crossTrackM) < this.appMaxCrossTrackM && Math.abs(dev.glideslopeErrorFt) < this.appCaptureFt;
    }
    /**
     * @param {object} telemetry FlightPhysicsCore snapshot or flat sim snapshot (headingDeg, rollDeg, pitchDeg,
     *   altitudeFt, vsiFpm, iasKnots, throttle, x, z, altitude, airportKey)
     * @param {number} dt seconds
     * @returns {{aileron:number, elevator:number, throttle:number}} zero axes when
     *   master is off; throttle passes through unless speed mode is active.
     */
    update(telemetry, dt) {
      telemetry = autopilotState(telemetry, this._snapshot);
      const out = this.output;
      out.aileron = 0;
      out.elevator = 0;
      out.throttle = telemetry.throttle ?? 0;
      if (!this.master) return out;
      if (this.appArmed) this.evaluateAppCapture(telemetry);
      if (this.lateralMode === "APP") {
        const dev = this.approachDeviation(telemetry.airportKey, telemetry);
        if (!dev || dev.distanceToThresholdM <= 0) {
          this.lateralMode = null;
        } else {
          const headingError = wrapHeading(dev.courseDeg - telemetry.headingDeg) - clamp3(dev.crossTrackM * 0.05, -25, 25);
          out.aileron = this.bankCommand(headingError, telemetry.rollDeg);
        }
      } else if (this.lateralMode === "HDG") {
        out.aileron = this.bankCommand(
          wrapHeading(this.targets.headingDeg - telemetry.headingDeg),
          telemetry.rollDeg
        );
      }
      if (this.verticalMode === "APP") {
        const dev = this.approachDeviation(telemetry.airportKey, telemetry);
        if (!dev || dev.distanceToThresholdM <= 0) {
          this.verticalMode = "PITCH";
        } else {
          out.elevator = clamp3(
            this.trim.elevator - dev.glideslopeErrorFt * this.gsElevatorPerFt - (telemetry.vsiFpm - dev.referenceSinkFpm) * this.gsElevatorPerFpmDamp,
            -1,
            1
          );
        }
      } else if (this.verticalMode === "ALT") {
        const altErrFt = this.targets.altitudeFt - telemetry.altitudeFt;
        out.elevator = clamp3(
          this.trim.elevator + altErrFt * this.elevatorPerFtAlt - telemetry.vsiFpm * this.elevatorPerFpmDamp,
          -1,
          1
        );
      } else if (this.verticalMode === "VS") {
        const vsErrFpm = this.targets.vsFpm - telemetry.vsiFpm;
        out.elevator = clamp3(
          this.trim.elevator + vsErrFpm * this.elevatorPerFpmVs,
          -1,
          1
        );
      } else {
        out.elevator = clamp3(
          this.trim.elevator + (this.targets.pitchDeg - telemetry.pitchDeg) * this.elevatorPerDegPitch,
          -1,
          1
        );
      }
      if (this.speedMode) {
        if (this._trimThrottlePending) {
          out.throttle = clamp3(this.trim.throttle, 0, 1);
          this._trimThrottlePending = false;
        } else {
          out.throttle = clamp3(
            out.throttle + (this.targets.iasKnots - telemetry.iasKnots) * this.throttlePerKtPerSec * dt,
            0,
            1
          );
        }
      }
      return out;
    }
    /** Turn toward the heading error at up to maxBankDeg, then roll out. */
    bankCommand(headingErrorDeg, rollDeg) {
      const bankTargetDeg = clamp3(
        headingErrorDeg * this.hdgDegPerDegError,
        -this.maxBankDeg,
        this.maxBankDeg
      );
      if (Math.abs(headingErrorDeg) < 0.5 && Math.abs(rollDeg) < 1) return 0;
      const bankTerm = clamp3(
        headingErrorDeg * this.hdgDegPerDegError,
        -this.maxBankDeg,
        this.maxBankDeg
      ) * this.aileronPerDegBankError;
      return clamp3(bankTerm - rollDeg * this.aileronBankDamping, -1, 1);
    }
    /** Compact mode annunciation for HUD/MCP, e.g. "HDG ALT SPD" or "APP armed". */
    annunciation() {
      if (!this.master) return "";
      const modes = [];
      if (this.appArmed) modes.push("APP armed");
      if (this.lateralMode === "APP" && this.verticalMode === "APP") {
        modes.push("APP");
      } else {
        if (this.lateralMode) modes.push(this.lateralMode);
        if (this.verticalMode) modes.push(this.verticalMode);
      }
      if (this.speedMode) modes.push("SPD");
      return modes.join(" ");
    }
  };

  // node_modules/@stlim0727/flightsim-core/src/systems/FlightWarningsCore.js
  function nextGpwsCallout(tracker, state, aircraftId, inhibited = false) {
    const ra = state.radioAltFt;
    let result = null;
    if (aircraftId === "B738" && !inhibited && ra !== void 0 && !state.onGround && state.vsiFpm < -100) {
      const callouts = [
        ["Five hundred, five hundred", 500],
        ["One hundred, one hundred", 100],
        ["Fifty", 50],
        ["Forty", 40],
        ["Thirty", 30],
        ["Twenty", 20],
        ["Ten", 10]
      ];
      for (const [text, altitudeFt] of callouts) {
        if (tracker.lastRadioAlt > altitudeFt && ra <= altitudeFt && !tracker.calledAltitudes.has(altitudeFt)) {
          tracker.calledAltitudes.add(altitudeFt);
          result = { altitudeFt, text };
          break;
        }
      }
    }
    if (ra > 1e3) tracker.calledAltitudes.clear();
    tracker.lastRadioAlt = ra;
    return result;
  }
  var PROFILES = {
    B738: { vne: 340, mach: 0.82, bank: 35, terrain: true, landingFlap: 15 },
    C172: { vne: 163, bank: 60, terrain: false },
    F16: { vne: 800, mach: 2.05, bank: 85, terrain: true, landingFlap: 0 }
  };
  var FlightWarningsCore = class {
    constructor(config = "B738") {
      this.configure(config);
    }
    configure(config) {
      this.id = typeof config === "string" ? config : config.id;
      this.profile = PROFILES[this.id] || PROFILES.B738;
      this.numEngines = config.propulsion?.numEngines ?? (this.id === "C172" || this.id === "F16" ? 1 : 2);
      this.reset();
    }
    reset() {
      this.lastRadioAlt = 9999;
      this.calledAltitudes = /* @__PURE__ */ new Set();
      this.result = [];
      this.active = /* @__PURE__ */ new Map();
      this.previous = null;
      this.closure = 0;
      this.departure = false;
      this.peakAltitude = null;
      this.wasGrounded = false;
      this.peakRadioAlt = 0;
      this.levelTime = 0;
    }
    updateWarnings(dt, s, terrainAheadSeconds = Infinity) {
      if (!(dt > 0) || !Number.isFinite(dt)) return this.result || [];
      dt = Math.min(dt, 0.25);
      const p2 = this.profile, candidates = /* @__PURE__ */ new Map();
      const add = (id, text, priority, voice = text) => candidates.set(id, { id, text, priority, voice });
      const airborne = s.onGround === false;
      const ra = s.radioAltFt, vsi = s.vsiFpm;
      const validHeight = Number.isFinite(ra) && ra >= 0;
      if (validHeight && this.previous !== null) {
        const measured = Math.max(0, (this.previous - ra) / dt);
        this.closure += (measured - this.closure) * (1 - Math.exp(-dt / 0.5));
      } else this.closure = 0;
      this.previous = validHeight ? ra : null;
      if (s.onGround) {
        this.departure = false;
        this.peakAltitude = null;
        this.wasGrounded = true;
        this.peakRadioAlt = 0;
        this.levelTime = 0;
      }
      if (airborne && this.wasGrounded && validHeight && ra > 30) {
        this.departure = true;
        this.wasGrounded = false;
      }
      if (this.departure && Number.isFinite(s.altitudeFt)) {
        this.peakAltitude = Math.max(this.peakAltitude ?? s.altitudeFt, s.altitudeFt);
        if (validHeight) this.peakRadioAlt = Math.max(this.peakRadioAlt, ra);
        this.levelTime = Math.abs(vsi) <= 100 ? this.levelTime + dt : 0;
        const configuredApproach = vsi < -100 && s.gearState > 0.95 && s.flapDegree >= (p2.landingFlap ?? 0);
        if (ra > 1500 || this.peakRadioAlt >= 300 && (this.levelTime >= 5 || configuredApproach))
          this.departure = false;
      }
      if (this.id === "B738" && s.onGround && s.throttle > 0.7 && s.iasKnots > 60 && (s.flapDegree < 1 || s.flapDegree > 25 || s.spoilers > 0.1 || s.parkBrake))
        add("takeoff-config", "TAKEOFF CONFIG", 80, null);
      if (airborne) {
        const stallWarning = s.isStallWarning ?? (s.isStalled || s.isPreStall);
        if (stallWarning) add("stall", "STALL", 95, null);
        const overspeed = this.active.has("overspeed");
        if (s.iasKnots > p2.vne - (overspeed ? 5 : 0) || s.mach > (p2.mach ?? Infinity) - (overspeed ? 0.01 : 0))
          add("overspeed", "OVERSPEED", 85, this.id === "F16" ? "Limit" : null);
        if (s.configurationOverspeed?.flap) add("flap-overspeed", "FLAP OVERSPEED", 84, null);
        if (s.configurationOverspeed?.gear) add("gear-overspeed", "GEAR OVERSPEED", 84, null);
        if (Math.abs(s.rollDeg) > p2.bank + (validHeight && ra > 1e3 ? 10 : 0))
          add("bank", "BANK ANGLE", 50, this.id === "B738" ? "Bank angle, bank angle" : null);
        if (s.engine1?.failed || this.numEngines > 1 && s.engine2?.failed) add("engine", "ENGINE FAILURE", 70, this.id === "F16" ? "Engine" : null);
        if (p2.terrain && validHeight && Number.isFinite(vsi)) {
          const landing = s.gearState > 0.95 && s.flapDegree >= p2.landingFlap;
          const sink = Math.max(0, -vsi), impactTime = this.closure > 1 ? ra / this.closure : Infinity;
          if (ra > 10 && ra < 2450 && sink > 1500 + ra * 2 || ra > 10 && impactTime < (landing ? 3 : 8) && (!landing || sink > 1e3) || terrainAheadSeconds < 8)
            add("pull-up", "PULL UP", 100, this.id === "F16" ? "Pull up, pull up" : "Terrain, terrain. Pull up, pull up");
          else if (ra > 30 && ra < 2450 && sink > 1e3 + ra * 1.2)
            add("sink-rate", "SINK RATE", 80, this.id === "B738" ? "Sink rate, sink rate" : void 0);
          else if (ra > 30 && impactTime < 15 && !landing || terrainAheadSeconds < 15)
            add("terrain", "TERRAIN", 90, "Terrain, terrain");
          if (!this.departure && vsi < -100 && ra > 30) {
            if (ra < 500 && s.gearState < 0.95) add("gear", this.id === "F16" ? "GEAR DOWN" : "TOO LOW GEAR", 65, this.id === "B738" ? "Too low gear" : void 0);
            else if (this.id === "B738" && ra < 200 && s.flapDegree < p2.landingFlap) add("flaps", "TOO LOW FLAPS", 60, "Too low flaps");
          }
          if (this.departure && ra > 30 && ra < 1500 && vsi < -200 && this.peakAltitude - s.altitudeFt > Math.max(20, ra * 0.1))
            add("dont-sink", "DON'T SINK", 75);
        }
      }
      for (const [id, value] of candidates) this.active.set(id, { ...value, clearTime: 0 });
      for (const [id, value] of this.active) if (!candidates.has(id)) {
        value.clearTime += dt;
        if (!airborne || value.clearTime >= 0.8) this.active.delete(id);
      }
      this.result = [...this.active.values()].sort((a, b) => b.priority - a.priority);
      return this.result;
    }
    /** Snapshot consumes physics telemetry and an optional predictive terrain time.
     * gpwsCallout is a one-sample radio-altitude crossing, not an audio command.
     */
    update(dt, telemetry, terrainAheadSeconds = Infinity) {
      const activeWarnings = this.updateWarnings(dt, telemetry, terrainAheadSeconds);
      const has = (id) => activeWarnings.some((warning) => warning.id === id);
      return {
        activeWarnings,
        gpwsCallout: dt > 0 && Number.isFinite(dt) ? nextGpwsCallout(this, telemetry, this.id, activeWarnings.length > 0) : null,
        stallWarning: has("stall"),
        overspeed: has("overspeed"),
        bankAngle: has("bank"),
        terrainConflict: has("terrain") || has("pull-up")
      };
    }
  };
  function terrainConflictSeconds(position, velocity2, terrain, landing) {
    if (!terrain || Math.hypot(velocity2.x, velocity2.z) < 15) return Infinity;
    for (let seconds = 2; seconds <= 20; seconds += 2) {
      const height = terrain.getHeight(position.x + velocity2.x * seconds, position.z + velocity2.z * seconds);
      const rise = height - terrain.getHeight(position.x, position.z);
      if (landing && rise < 15) continue;
      if (position.y + velocity2.y * seconds < height + 10) return seconds;
    }
    return Infinity;
  }

  // node_modules/@stlim0727/flightsim-core/src/navigation/approachDeviation.js
  var DEG = Math.PI / 180;
  function approachDeviation(data, pos) {
    if (!data) return null;
    const th = thRad(data.headingDeg);
    const dx = pos.x - data.threshold.x;
    const dz = pos.z - data.threshold.z;
    const along = dx * Math.sin(th) + dz * -Math.cos(th);
    const cross = dx * Math.cos(th) + dz * Math.sin(th);
    const distanceToThresholdM = -along;
    const gsAltitudeFt = data.elevationFt + Math.tan(data.gsAngleDeg * DEG) * distanceToThresholdM / 0.3048;
    const speedKnots = pos.tasKnots ?? pos.groundSpeedKnots ?? pos.iasKnots ?? 140;
    return {
      courseDeg: data.headingDeg,
      crossTrackM: cross,
      distanceToThresholdM,
      glideslopeErrorFt: pos.altitudeFt - gsAltitudeFt,
      // Required sink rate on the glideslope at this speed, negative = descending (fpm).
      referenceSinkFpm: -Math.tan(data.gsAngleDeg * DEG) * speedKnots * 101.27
    };
  }
  function thRad(headingDeg) {
    return headingDeg * DEG;
  }

  // node_modules/@stlim0727/flightsim-core/src/terrain/TerrainProvider.js
  var import_three = __toESM(require_three(), 1);
  function toPlainNormal(n) {
    return n ? { x: n.x, y: n.y, z: n.z } : null;
  }
  function toNormalVector3(normal2, Vector3Ctor = import_three.Vector3) {
    if (!normal2) return null;
    const { x, y, z } = normal2;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    if (x * x + y * y + z * z <= 1e-4) return null;
    if (normal2.isVector3) return normal2;
    return typeof Vector3Ctor === "function" ? new Vector3Ctor(x, y, z) : { x, y, z };
  }
  function surfaceNormal(sample, x, z, stepM = 30) {
    const d = Number.isFinite(stepM) && stepM > 0 ? stepM : 30;
    const hl = sample(x - d, z);
    const hr = sample(x + d, z);
    const hf = sample(x, z - d);
    const hb = sample(x, z + d);
    if ([hl, hr, hf, hb].some((v) => v === null || !Number.isFinite(v))) return null;
    const nx = hl - hr;
    const nz = hf - hb;
    const ny = 2 * d;
    const len = Math.hypot(nx, ny, nz);
    return { x: nx / len, y: ny / len, z: nz / len };
  }
  function sampleReadyHeight(provider, x, z) {
    if (!provider) return null;
    const ready = Boolean(provider.isReady?.(x, z));
    const h = provider.getHeight?.(x, z);
    if (!ready) return null;
    return Number.isFinite(h) ? h : null;
  }
  function analyticTerrainProvider(source, { kind = "analytic", visualRoot = null } = {}) {
    if (typeof source?.getHeight !== "function") {
      throw new TypeError("analyticTerrainProvider needs an object with getHeight(x, z)");
    }
    return {
      kind,
      source,
      visualRoot: visualRoot ?? source.mesh ?? source.group ?? null,
      getHeight(x, z) {
        const h = source.getHeight(x, z);
        return Number.isFinite(h) ? h : null;
      },
      getNormal(x, z) {
        return typeof source.getNormal === "function" ? toPlainNormal(source.getNormal(x, z)) : null;
      },
      isReady: () => true,
      update() {
      },
      dispose() {
        source.dispose?.();
      }
    };
  }
  function resolveGroundHeight(getProvider, fallback) {
    return (x, z) => {
      const provider = getProvider();
      const h = sampleReadyHeight(provider, x, z);
      if (h !== null) return h;
      return fallback(x, z);
    };
  }
  function createGroundSurfaceQueries(options = {}) {
    const {
      getTerrain,
      getOverride,
      getProvider,
      getFallbackHeight,
      getFallbackNormal,
      minHeight = -Infinity,
      waterFloorHeight,
      Vector3: Vector3Ctor = import_three.Vector3
    } = options;
    const overrideGetter = getOverride ?? getProvider ?? (() => null);
    const fallbackHeight = getFallbackHeight ?? ((x, z) => getTerrain?.()?.getHeight?.(x, z) ?? 0);
    const fallbackNormal = getFallbackNormal ?? ((x, z) => getTerrain?.()?.getNormal?.(x, z) ?? null);
    return {
      getGroundHeight(x, z) {
        const provider = overrideGetter();
        const h = sampleReadyHeight(provider, x, z);
        if (h !== null) {
          if (Number.isFinite(waterFloorHeight) && provider.isWater?.(x, z)) {
            return waterFloorHeight;
          }
          return Math.max(minHeight, h);
        }
        return fallbackHeight(x, z);
      },
      getGroundNormal(x, z) {
        const provider = overrideGetter();
        const h = sampleReadyHeight(provider, x, z);
        if (h !== null) {
          if (Number.isFinite(waterFloorHeight) && provider.isWater?.(x, z)) return null;
          if (h < minHeight) return null;
          return toNormalVector3(provider.getNormal?.(x, z) ?? null, Vector3Ctor);
        }
        return toNormalVector3(fallbackNormal(x, z), Vector3Ctor);
      },
      isWater(x, z) {
        const provider = overrideGetter();
        if (sampleReadyHeight(provider, x, z) === null) return null;
        return Boolean(provider.isWater?.(x, z));
      }
    };
  }
  function createGroundHeightQuery(options) {
    return createGroundSurfaceQueries(options).getGroundHeight;
  }
  function assertTerrainProviderContract(provider, points = [[0, 0]]) {
    for (const name of ["getHeight", "getNormal", "isReady", "update", "dispose"]) {
      if (typeof provider?.[name] !== "function") throw new Error(`terrain provider is missing ${name}()`);
    }
    if (typeof provider.kind !== "string") throw new Error("terrain provider needs a string kind");
    for (const [x, z] of points) {
      const h = provider.getHeight(x, z);
      if (h !== null && !Number.isFinite(h)) throw new Error(`getHeight(${x}, ${z}) must be a finite number or null`);
      if (provider.isReady(x, z) && h === null) throw new Error(`isReady(${x}, ${z}) is true but getHeight is null`);
      const n = provider.getNormal(x, z);
      if (n !== null) {
        const len = Math.hypot(n.x, n.y, n.z);
        if (!(Math.abs(len - 1) < 1e-3) || n.y <= 0) throw new Error(`getNormal(${x}, ${z}) must be an upward unit vector`);
      }
    }
    return true;
  }

  // node_modules/@stlim0727/flightsim-core/src/geo/Geodesy.js
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var MAX_MERCATOR_LAT = 85.05112878;
  var WGS84_A = 6378137;
  var WGS84_B = 6356752314245e-6;
  var WGS84_E2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_A * WGS84_A);
  var WGS84_E2_PRIME = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B);
  var A2 = WGS84_A * WGS84_A;
  var B2 = WGS84_B * WGS84_B;
  function finite(value, name) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
    return value;
  }
  function originOf(origin) {
    if (!origin) throw new TypeError("origin is required");
    const latitude = origin.latitude ?? origin.lat;
    const longitude = origin.longitude ?? origin.lon;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new TypeError("origin needs finite latitude/longitude (or lat/lon)");
    }
    return {
      latitude,
      longitude,
      height: finite(origin.height ?? 0, "origin.height")
    };
  }
  function axes({ latitude, longitude }) {
    const lat = latitude * D2R;
    const lon = longitude * D2R;
    const sl = Math.sin(lat);
    const cl = Math.cos(lat);
    const so = Math.sin(lon);
    const co = Math.cos(lon);
    return {
      east: [-so, co, 0],
      north: [-sl * co, -sl * so, cl],
      up: [cl * co, cl * so, sl]
    };
  }
  function wgs84ToEcef(latitude, longitude, height = 0) {
    const lat = finite(latitude, "latitude") * D2R;
    const lon = finite(longitude, "longitude") * D2R;
    const h = finite(height, "height");
    const sinLat = Math.sin(lat);
    const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
    return {
      x: (n + h) * Math.cos(lat) * Math.cos(lon),
      y: (n + h) * Math.cos(lat) * Math.sin(lon),
      z: (n * (1 - WGS84_E2) + h) * sinLat
    };
  }
  function ecefToWgs84(x, y, z) {
    const X = finite(x, "x");
    const Y = finite(y, "y");
    const Z = finite(z, "z");
    const p2 = Math.hypot(X, Y);
    const theta = Math.atan2(Z * WGS84_A, p2 * WGS84_B);
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    const lat = Math.atan2(
      Z + WGS84_E2_PRIME * WGS84_B * st * st * st,
      p2 - WGS84_E2 * WGS84_A * ct * ct * ct
    );
    const sinLat = Math.sin(lat);
    const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
    const cosLat = Math.cos(lat);
    const height = Math.abs(cosLat) > 1e-12 ? p2 / cosLat - n : Z / sinLat - n * (1 - WGS84_E2);
    return { latitude: lat * R2D, longitude: Math.atan2(Y, X) * R2D, height };
  }
  function wgs84ToEnu(latitude, longitude, origin, height = 0) {
    const o = originOf(origin);
    const p2 = wgs84ToEcef(latitude, longitude, height);
    const c = wgs84ToEcef(o.latitude, o.longitude, o.height);
    const a = axes(o);
    const dx = p2.x - c.x;
    const dy = p2.y - c.y;
    const dz = p2.z - c.z;
    return {
      east: a.east[0] * dx + a.east[1] * dy + a.east[2] * dz,
      north: a.north[0] * dx + a.north[1] * dy + a.north[2] * dz,
      up: a.up[0] * dx + a.up[1] * dy + a.up[2] * dz
    };
  }
  function enuToWgs84(east, north, up, origin) {
    const o = originOf(origin);
    const e = finite(east, "east");
    const n = finite(north, "north");
    const u = finite(up ?? 0, "up");
    const c = wgs84ToEcef(o.latitude, o.longitude, o.height);
    const a = axes(o);
    const px = c.x + a.east[0] * e + a.north[0] * n + a.up[0] * u;
    const py = c.y + a.east[1] * e + a.north[1] * n + a.up[1] * u;
    const pz = c.z + a.east[2] * e + a.north[2] * n + a.up[2] * u;
    const A = (a.up[0] * a.up[0] + a.up[1] * a.up[1]) / A2 + a.up[2] * a.up[2] / B2;
    const B = 2 * ((px * a.up[0] + py * a.up[1]) / A2 + pz * a.up[2] / B2);
    const C = (px * px + py * py) / A2 + pz * pz / B2 - 1;
    const disc = B * B - 4 * A * C;
    if (disc < 0) {
      const lat = o.latitude * D2R;
      const sinLat = Math.sin(lat);
      const rn = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
      const rm = WGS84_A * (1 - WGS84_E2) / Math.pow(1 - WGS84_E2 * sinLat * sinLat, 1.5);
      return {
        latitude: o.latitude + n / rm * R2D,
        longitude: o.longitude + e / (rn * Math.cos(lat)) * R2D,
        height: o.height + u
      };
    }
    const y1 = (-B + Math.sqrt(disc)) / (2 * A);
    const y2 = (-B - Math.sqrt(disc)) / (2 * A);
    const y = Math.abs(y1) < Math.abs(y2) ? y1 : y2;
    return ecefToWgs84(px + a.up[0] * y, py + a.up[1] * y, pz + a.up[2] * y);
  }
  function lonLatToTilePixel(lat, lon, zoom) {
    const n = 2 ** zoom;
    const wrappedLon = ((lon + 180) % 360 + 360) % 360 - 180;
    const clampedLat = Math.min(MAX_MERCATOR_LAT, Math.max(-MAX_MERCATOR_LAT, lat));
    const latRad = clampedLat * D2R;
    const fx = (wrappedLon + 180) / 360 * n;
    const fy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    return { fx, fy };
  }
  function tilePixelToLonLat(fx, fy, zoom) {
    const n = 2 ** zoom;
    const x = (fx / n % 1 + 1) % 1;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * fy / n)));
    return { lat: latRad * R2D, lon: x * 360 - 180 };
  }

  // node_modules/@stlim0727/flightsim-core/src/terrain/TerrariumElevationProvider.js
  var TILE_SIZE = 256;
  var DEFAULT_ZOOM = 11;
  var D2R2 = Math.PI / 180;
  var DEFAULT_RETRY_MS = 5e3;
  function decodeTerrarium(rgba) {
    const heights = new Float32Array(rgba.length / 4);
    for (let i = 0, j = 0; i < heights.length; i++, j += 4) {
      heights[i] = rgba[j] * 256 + rgba[j + 1] + rgba[j + 2] / 256 - 32768;
    }
    return heights;
  }
  function createAnchorFrame(anchor, simOffset = { x: 0, z: 0 }) {
    const r = anchor.headingDeg * D2R2;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    return {
      toWgs84(x, z) {
        const a = x - simOffset.x;
        const b = -(z - simOffset.z);
        const east = a * cos + b * sin;
        const north = -a * sin + b * cos;
        const lat = anchor.lat + north / 110540;
        const latMid = (anchor.lat + lat) * 0.5 * D2R2;
        const lon = anchor.lon + east / (111320 * Math.cos(latMid));
        return { lat, lon };
      }
    };
  }
  function zoneDistance(x, z, zone) {
    const dx = x < zone.minX ? zone.minX - x : x > zone.maxX ? x - zone.maxX : 0;
    const dz = z < zone.minZ ? zone.minZ - z : z > zone.maxZ ? z - zone.maxZ : 0;
    return Math.hypot(dx, dz);
  }
  function createTerrariumProvider(options) {
    const {
      anchor,
      simOffset = { x: 0, z: 0 },
      toWgs84,
      loadTile,
      zoom = DEFAULT_ZOOM,
      maxTiles = 24,
      prefetchRadius = 1,
      flatZones = [],
      retryMs = DEFAULT_RETRY_MS,
      now = () => Date.now()
    } = options || {};
    if (!anchor && typeof toWgs84 !== "function" || typeof loadTile !== "function") {
      throw new Error("createTerrariumProvider needs { loadTile } and either { anchor } or { toWgs84 }");
    }
    const frame = typeof toWgs84 === "function" ? { toWgs84 } : createAnchorFrame(anchor, simOffset);
    const tilesAcross = 2 ** zoom;
    const cacheLimit = Number.isFinite(maxTiles) ? Math.max(1, Math.floor(maxTiles)) : maxTiles === Infinity ? Infinity : 24;
    const radius = Number.isFinite(prefetchRadius) ? Math.max(0, Math.floor(prefetchRadius)) : 1;
    const wrapX = (tx) => (tx % tilesAcross + tilesAcross) % tilesAcross;
    const tiles = /* @__PURE__ */ new Map();
    const failedAt = /* @__PURE__ */ new Map();
    let datumM = null;
    let disposed = false;
    const keyOf = (x, y) => `${zoom}/${x}/${y}`;
    function touch(key) {
      if (!tiles.has(key)) return;
      const value = tiles.get(key);
      tiles.delete(key);
      tiles.set(key, value);
    }
    function applyFlatZones(x, z, rawHeight) {
      if (!flatZones.length) return rawHeight;
      let bestW = 0;
      let bestH = rawHeight;
      for (let i = 0; i < flatZones.length; i++) {
        const zone = flatZones[i];
        const dist = zoneDistance(x, z, zone);
        const targetH = zone.height ?? 0;
        if (dist === 0) return targetH;
        const margin = zone.blendMargin ?? 400;
        if (margin > 0 && dist < margin) {
          const t = dist / margin;
          const w = 1 - t * t * (3 - 2 * t);
          if (w > bestW) {
            bestW = w;
            bestH = targetH * w + rawHeight * (1 - w);
          }
        }
      }
      return bestH;
    }
    function request(tx, ty) {
      if (disposed) return "disposed";
      const wy = Math.floor(ty);
      if (wy < 0 || wy >= tilesAcross) return "out-of-bounds";
      const wx = wrapX(Math.floor(tx));
      const key = keyOf(wx, wy);
      if (tiles.has(key)) {
        const state = tiles.get(key);
        if (state !== "failed") {
          touch(key);
          return state instanceof Float32Array ? state : "pending";
        }
        if (now() - (failedAt.get(key) || 0) < retryMs) return state;
        tiles.delete(key);
        failedAt.delete(key);
      }
      const pending = { pending: true };
      tiles.set(key, pending);
      while (tiles.size > cacheLimit) {
        const evicted = tiles.keys().next().value;
        tiles.delete(evicted);
        failedAt.delete(evicted);
      }
      Promise.resolve().then(() => loadTile(zoom, wx, wy)).then((rgba) => {
        if (disposed || tiles.get(key) !== pending) return;
        tiles.set(key, decodeTerrarium(rgba));
        failedAt.delete(key);
      }).catch(() => {
        if (disposed || tiles.get(key) !== pending) return;
        tiles.set(key, "failed");
        failedAt.set(key, now());
      });
      return "pending";
    }
    function pixel(data, px, py) {
      const cx = Math.min(TILE_SIZE - 1, Math.max(0, px));
      const cy = Math.min(TILE_SIZE - 1, Math.max(0, py));
      return data[cy * TILE_SIZE + cx];
    }
    function sampleMsl(x, z, fetchMissing) {
      const { lat, lon } = frame.toWgs84(x, z);
      const { fx, fy } = lonLatToTilePixel(lat, lon, zoom);
      const gx = (fx - Math.floor(fx)) * TILE_SIZE - 0.5;
      const gy = (fy - Math.floor(fy)) * TILE_SIZE - 0.5;
      const tx = wrapX(Math.floor(fx));
      const ty = Math.floor(fy);
      if (ty < 0 || ty >= tilesAcross) return null;
      if (fetchMissing) request(tx, ty);
      const key = keyOf(tx, ty);
      const data = tiles.get(key);
      if (!(data instanceof Float32Array)) return null;
      touch(key);
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const wx = gx - x0;
      const wy = gy - y0;
      const h00 = pixel(data, x0, y0);
      const h10 = pixel(data, x0 + 1, y0);
      const h01 = pixel(data, x0, y0 + 1);
      const h11 = pixel(data, x0 + 1, y0 + 1);
      return (h00 * (1 - wx) + h10 * wx) * (1 - wy) + (h01 * (1 - wx) + h11 * wx) * wy;
    }
    function ensureDatum(fetchMissing = true) {
      if (datumM !== null) return true;
      const h = sampleMsl(simOffset.x, simOffset.z, fetchMissing);
      if (h === null) return false;
      datumM = h;
      return true;
    }
    const provider = {
      kind: "terrarium",
      zoom,
      visualRoot: null,
      getHeight(x, z) {
        const hasDatum = ensureDatum(false);
        if (!hasDatum && cacheLimit === 1) {
          ensureDatum(true);
          return null;
        }
        const h = sampleMsl(x, z, true);
        if (!hasDatum && !ensureDatum(true)) return null;
        return h === null ? null : applyFlatZones(x, z, h - datumM);
      },
      isReady(x, z) {
        return ensureDatum(false) && sampleMsl(x, z, false) !== null;
      },
      isWater(x, z) {
        if (!ensureDatum(false)) return false;
        for (let i = 0; i < flatZones.length; i++) {
          if (zoneDistance(x, z, flatZones[i]) === 0) return false;
        }
        const msl = sampleMsl(x, z, false);
        return msl !== null && msl <= 0.1;
      },
      getNormal(x, z) {
        return surfaceNormal(provider.getHeight, x, z);
      },
      update(position) {
        if (!position || disposed) return;
        const hasDatum = ensureDatum(false);
        if (!hasDatum && cacheLimit === 1) {
          ensureDatum(true);
          return;
        }
        const { lat, lon } = frame.toWgs84(position.x, position.z);
        const { fx, fy } = lonLatToTilePixel(lat, lon, zoom);
        const cx = Math.floor(fx);
        const cy = Math.floor(fy);
        const byKey = /* @__PURE__ */ new Map();
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= tilesAcross) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const wx = wrapX(cx + dx);
            const key = keyOf(wx, ny);
            const distSq = dx * dx + dy * dy;
            const prev = byKey.get(key);
            if (!prev || distSq < prev.distSq) {
              byKey.set(key, { wx, ny, key, distSq });
            }
          }
        }
        const candidates = [...byKey.values()].sort((a, b) => a.distSq - b.distSq);
        let anchorKey = null;
        if (!hasDatum) {
          const anchorWgs = frame.toWgs84(simOffset.x, simOffset.z);
          const anchorTp = lonLatToTilePixel(anchorWgs.lat, anchorWgs.lon, zoom);
          const ax = wrapX(Math.floor(anchorTp.fx));
          const ay = Math.floor(anchorTp.fy);
          if (ay >= 0 && ay < tilesAcross) anchorKey = keyOf(ax, ay);
        }
        let selected = candidates.slice(0, cacheLimit);
        const needsSeparateDatumSlot = !hasDatum && anchorKey !== null && !selected.some((c) => c.key === anchorKey);
        if (needsSeparateDatumSlot && cacheLimit > 1) {
          selected = candidates.slice(0, cacheLimit - 1);
        }
        if (needsSeparateDatumSlot) touch(anchorKey);
        for (let i = selected.length - 1; i >= 0; i--) touch(selected[i].key);
        for (let i = selected.length - 1; i >= 0; i--) {
          request(selected[i].wx, selected[i].ny);
        }
        if (!hasDatum) {
          ensureDatum(true);
          if (selected.length > 0) touch(selected[0].key);
        }
      },
      dispose() {
        disposed = true;
        tiles.clear();
        failedAt.clear();
      }
    };
    return provider;
  }

  // node_modules/@stlim0727/flightsim-core/src/tile/TileScheduler.js
  function createTileScheduler(options = {}) {
    const {
      maxConcurrent = 4,
      priorityOf = () => 0
    } = options;
    const limit = Math.max(1, Math.floor(maxConcurrent));
    const inFlight = /* @__PURE__ */ new Map();
    const queue = [];
    const stats = { misses: 0, errors: 0, active: 0, queued: 0 };
    let priorityContext = null;
    let sequence = 0;
    let disposed = false;
    function setPriorityContext(value) {
      priorityContext = value;
    }
    function pump() {
      queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      while (stats.active < limit && queue.length > 0) {
        const job = queue.shift();
        stats.queued = queue.length;
        stats.active++;
        Promise.resolve().then(() => job.run(job.value)).then(job.resolve, job.reject).finally(() => {
          stats.active--;
          pump();
        });
      }
    }
    function schedule(key, value, run) {
      if (disposed) return Promise.reject(new Error("tile scheduler disposed"));
      if (inFlight.has(key)) return inFlight.get(key);
      const promise = new Promise((resolve, reject) => {
        queue.push({
          key,
          value,
          run,
          resolve,
          reject,
          priority: priorityOf(value, priorityContext),
          seq: sequence++
        });
        stats.misses++;
        stats.queued = queue.length;
      });
      inFlight.set(key, promise);
      promise.finally(() => inFlight.delete(key)).catch(() => {
      });
      Promise.resolve().then(pump);
      return promise;
    }
    function dispose() {
      disposed = true;
      for (const job of queue) job.reject(new Error("tile scheduler disposed"));
      queue.length = 0;
      stats.queued = 0;
      inFlight.clear();
    }
    return {
      schedule,
      setPriorityContext,
      stats: () => ({ ...stats }),
      inFlightCount: () => inFlight.size,
      dispose
    };
  }

  // node_modules/@stlim0727/flightsim-core/src/terrain/conformance.js
  function terrainProviderConformanceFailures(provider, points = [[0, 0]]) {
    const failures = [];
    try {
      assertTerrainProviderContract(provider, points);
    } catch (error) {
      failures.push(error.message);
      return failures;
    }
    for (const [x, z] of points) {
      const height = provider.getHeight(x, z);
      if (height !== null && !Number.isFinite(height)) {
        failures.push(`getHeight(${x}, ${z}) must be finite or null`);
      }
      if (provider.isReady(x, z) && !Number.isFinite(height)) {
        failures.push(`isReady(${x}, ${z}) is true but getHeight is not authoritative`);
      }
      const normal2 = provider.getNormal(x, z);
      if (normal2 !== null) {
        const finite2 = [normal2.x, normal2.y, normal2.z].every(Number.isFinite);
        const length = Math.hypot(normal2.x, normal2.y, normal2.z);
        if (!finite2 || Math.abs(length - 1) > 1e-3 || normal2.y <= 0) {
          failures.push(`getNormal(${x}, ${z}) must be a finite upward unit vector`);
        }
      }
      const water = provider.isWater?.(x, z);
      if (water !== void 0 && water !== null && typeof water !== "boolean") {
        failures.push(`isWater(${x}, ${z}) must be boolean or null`);
      }
    }
    return failures;
  }
  function assertTerrainProviderConformance(provider, points = [[0, 0]]) {
    const failures = terrainProviderConformanceFailures(provider, points);
    if (failures.length) {
      throw new Error(`terrain provider conformance failed: ${failures.join("; ")}`);
    }
    return true;
  }

  // flightsim-core-bundle-entry.js
  globalThis.Flight3dPhysics = Object.assign(globalThis.Flight3dPhysics || {}, src_exports);
  globalThis.FlightSimCore = src_exports;
  if (typeof window !== "undefined") {
    window.Flight3dPhysics = globalThis.Flight3dPhysics;
    window.FlightSimCore = src_exports;
  }
})();
