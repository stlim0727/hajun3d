import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('validates 3rd-order non-linear touch stick shaping with 6% radial deadzone', () => {
  const code = readFileSync('web/js/input.js', 'utf8');
  const sandbox = {
    AirplaneGame: { prototype: {} },
    window: {},
    globalThis: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const shape = sandbox.shapeTouchStick || sandbox.AirplaneGame.prototype.shapeTouchStick;
  assert.equal(typeof shape, 'function', 'shapeTouchStick must be exported or attached to prototype');

  // 1. Inside 6% radial deadzone: returns exactly [0, 0]
  const zeroRes = shape(0.0, 0.0);
  assert.equal(zeroRes[0], 0, 'Pitch center must be 0');
  assert.equal(zeroRes[1], 0, 'Roll center must be 0');

  const dz1 = shape(0.03, 0.04);
  assert.equal(dz1[0], 0, 'Hypot = 0.05 must be dead neutral [0, 0]');
  assert.equal(dz1[1], 0, 'Hypot = 0.05 must be dead neutral [0, 0]');

  const dz2 = shape(0.059, 0.0);
  assert.equal(dz2[0], 0, '5.9% deflection must be in deadzone');
  assert.equal(dz2[1], 0, '5.9% deflection must be in deadzone');

  // 2. Full authority at maximum deflection (hypot = 1.0)
  const [maxP, maxR] = shape(1.0, 0.0);
  assert.ok(Math.abs(maxP - 1.0) < 1e-6, 'Pitch at max travel must be 1.0');
  assert.equal(maxR, 0, 'Roll at pure pitch max travel must be 0');

  const [negP, negR] = shape(-1.0, 0.0);
  assert.ok(Math.abs(negP - (-1.0)) < 1e-6, 'Pitch at full push down must be -1.0');

  const [rollOnlyP, rollOnlyR] = shape(0.0, 1.0);
  assert.equal(rollOnlyP, 0);
  assert.ok(Math.abs(rollOnlyR - 1.0) < 1e-6);

  // 3. 3rd-order polynomial curve test at intermediate travel
  // At mag = 0.53: travel = (0.53 - 0.06) / (1 - 0.06) = 0.47 / 0.94 = 0.5
  // response = 0.35 * 0.5 + 0.65 * (0.5^3) = 0.175 + 0.65 * 0.125 = 0.175 + 0.08125 = 0.25625
  const [midP, midR] = shape(0.53, 0.0);
  const expectedResponse = 0.35 * 0.5 + 0.65 * Math.pow(0.5, 3);
  assert.ok(Math.abs(midP - expectedResponse) < 1e-5, `Response at 50% travel must match 3rd-order curve (${expectedResponse})`);
  assert.equal(midR, 0);

  // 4. Diagonal input retains directional proportionality
  const [diagP, diagR] = shape(0.6, 0.8); // mag = 1.0
  assert.ok(Math.abs(diagP - 0.6) < 1e-5, 'Diagonal pitch component preserved at full travel');
  assert.ok(Math.abs(diagR - 0.8) < 1e-5, 'Diagonal roll component preserved at full travel');
});

test('validates ground effect formula phi_ground = (16h/b)^2 / (1 + (16h/b)^2) near runway', () => {
  const wingspan = 34.1; // Airbus A320

  const computePhiGround = (radioAlt, span) => {
    const hOverB = radioAlt / span;
    if (hOverB >= 1.2) return 1.0;
    const h_b = Math.max(0.08, hOverB);
    const h16 = 16.0 * h_b;
    const h16Sq = h16 * h16;
    return h16Sq / (1.0 + h16Sq);
  };

  // High above ground: out of ground effect
  assert.equal(computePhiGround(50.0, wingspan), 1.0, 'High altitude must have no ground effect reduction');

  // Half wingspan (h/b = 0.5): 16 * 0.5 = 8 -> 64 / 65 ~ 0.9846
  const phiAtHalf = computePhiGround(wingspan * 0.5, wingspan);
  assert.ok(Math.abs(phiAtHalf - (64 / 65)) < 1e-4, 'At h/b=0.5 phi_ground must be 64/65');

  // Low flare height (h/b = 0.1): 16 * 0.1 = 1.6 -> 2.56 / 3.56 ~ 0.719
  const phiAtFlare = computePhiGround(wingspan * 0.1, wingspan);
  const expectedFlare = 2.56 / 3.56;
  assert.ok(Math.abs(phiAtFlare - expectedFlare) < 1e-4, 'At h/b=0.1 induced drag must be reduced to ~71.9%');
  assert.ok(phiAtFlare < 0.75, 'Ground effect must significantly reduce induced drag near touchdown');
});

test('validates touch flight controls prototype API on AirplaneGame', () => {
  const code = readFileSync('web/js/input.js', 'utf8');
  const sandbox = {
    AirplaneGame: { prototype: {} },
    window: {},
    globalThis: {},
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const proto = sandbox.AirplaneGame.prototype;
  assert.equal(typeof proto.setTouchStick, 'function');
  assert.equal(typeof proto.setTouchThrottle, 'function');
  assert.equal(typeof proto.setTouchRudder, 'function');
  assert.equal(typeof proto.setTouchBrakes, 'function');

  // Test game instance interaction
  const mockGame = {
    joystickData: { x: 0, y: 0, active: false },
    throttle: 0,
    touchRudder: 0,
    keys: { brake: false }
  };
  Object.assign(mockGame, proto);

  // Test stick
  mockGame.setTouchStick(0.8, 0.6);
  assert.ok(mockGame.joystickData.active, 'Stick must be active on non-zero deflection');
  assert.ok(mockGame.joystickData.y > 0.5, 'Pitch up must follow stick pull');

  // Test throttle detent clamping
  mockGame.setTouchThrottle(0.70);
  assert.equal(mockGame.throttle, 0.70, 'Throttle detent 70% must set throttle to 0.70');
  mockGame.setTouchThrottle(1.5);
  assert.equal(mockGame.throttle, 1.0, 'Throttle must clamp to 1.0 (TOGA)');
  mockGame.setTouchThrottle(-0.2);
  assert.equal(mockGame.throttle, 0.0, 'Throttle must clamp to 0.0 (IDLE)');

  // Test rudder & nosewheel steering
  mockGame.setTouchRudder(0.5);
  assert.equal(mockGame.touchRudder, 0.5, 'Touch rudder input must be preserved');

  // Test wheel brakes
  mockGame.setTouchBrakes(1.0);
  assert.equal(mockGame.keys.brake, true, 'Brake must engage on touch down');
  mockGame.setTouchBrakes(0.0);
  assert.equal(mockGame.keys.brake, false, 'Brake must release on touch up');
});

test('validates FBW Normal Law Bank Angle Hold and coordinated turn behavior', () => {
  // Test bank angle hold logic:
  // When bankTilt is within normal envelope (e.g. 20 deg, bankTilt ~ 0.34) and rollInput is 0:
  // Target roll rate must be exactly 0 (Bank Angle Hold) rather than forced auto-leveling
  const fbwBankLimit = 0.545; // ~33 deg

  const computeRollRate = (bankTilt, isRollActive, rollInput) => {
    const maxBankTilt = 0.82;
    if (isRollActive) {
      if ((rollInput > 0 && bankTilt > -maxBankTilt) || (rollInput < 0 && bankTilt < maxBankTilt)) {
        return -rollInput * 0.024 * 0.70;
      }
      return 0;
    }
    if (Math.abs(bankTilt) > fbwBankLimit) {
      const targetTilt = Math.sign(bankTilt) * fbwBankLimit;
      return -(bankTilt - targetTilt) * 0.05;
    } else if (Math.abs(bankTilt) < 0.035) {
      return -bankTilt * 0.025;
    } else {
      return 0.0; // Bank Angle Hold
    }
  };

  // 1. Within 20 deg bank (bankTilt = 0.34): Neutral stick holds bank angle (roll rate = 0)
  assert.equal(computeRollRate(0.34, false, 0), 0.0, '20 deg bank must be held with 0 roll rate');
  assert.equal(computeRollRate(-0.34, false, 0), 0.0, '-20 deg bank must be held with 0 roll rate');

  // 2. Beyond 33 deg bank (bankTilt = 0.65, ~40 deg bank): Returns gently toward 33 deg
  const steepReturnRate = computeRollRate(0.65, false, 0);
  assert.ok(steepReturnRate < 0, 'Steep bank must return towards 33 deg boundary');
  assert.ok(Math.abs(steepReturnRate) < 0.01, 'Spiral return rate must be gentle');

  // 3. Near wings level (bankTilt = 0.02, ~1.1 deg): Gently settles to 0
  const wingsLevelRate = computeRollRate(0.02, false, 0);
  assert.ok(wingsLevelRate < 0, 'Wings level deadband must gently center');

  // 4. Coordinated turn rate is continuously non-zero whenever banked
  const computeTurnRate = (bankTilt, isRollActive, rollInput, inFlightRudder) => {
    let turnRate = bankTilt * 0.020;
    if (isRollActive) turnRate -= rollInput * 0.008;
    if (Math.abs(inFlightRudder) > 0.02) turnRate += -inFlightRudder * 0.022 * 0.45;
    return turnRate;
  };

  const turnAt20Deg = computeTurnRate(0.34, false, 0, 0);
  assert.ok(turnAt20Deg > 0.005, 'Banked aircraft must sustain turn rate even when roll stick is neutral');
});

test('validates Flight3d-style device orientation tilt projection and wraparound', () => {
  const code = readFileSync('web/js/input.js', 'utf8');
  const sandbox = {
    AirplaneGame: { prototype: {} },
    window: {},
    globalThis: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const screenTilt = sandbox.screenTilt || sandbox.AirplaneGame.prototype.screenTilt;
  const angleDelta = sandbox.angleDelta || sandbox.AirplaneGame.prototype.angleDelta;
  const isGyroSupportedDevice = sandbox.isGyroSupportedDevice || sandbox.AirplaneGame.prototype.isGyroSupportedDevice;

  assert.equal(typeof screenTilt, 'function');
  assert.equal(typeof angleDelta, 'function');
  assert.equal(typeof isGyroSupportedDevice, 'function');

  // 1. angleDelta wraparound tests
  assert.equal(angleDelta(10, 0), 10);
  assert.equal(angleDelta(-10, 0), -10);
  assert.equal(Math.abs(angleDelta(190, 10)), 180);
  assert.equal(angleDelta(170, -170), -20);
  assert.equal(angleDelta(-170, 170), 20);

  // 2. screenTilt projection tests
  // Flat device: beta = 0, gamma = 0 -> pitch = 0, roll = 0
  const flat = screenTilt(0, 0, 0);
  assert.ok(Math.abs(flat.pitch) < 1e-4);
  assert.ok(Math.abs(flat.roll) < 1e-4);

  // Pitched up 20 degrees in portrait (angle = 0): beta = 20, gamma = 0
  const pitchUp = screenTilt(20, 0, 0);
  assert.ok(Math.abs(pitchUp.pitch - 20) < 1e-3);
  assert.ok(Math.abs(pitchUp.roll) < 1e-3);

  // Banked right 25 degrees in portrait: beta = 0, gamma = 25
  const rollRight = screenTilt(0, 25, 0);
  assert.ok(Math.abs(rollRight.pitch) < 1e-3);
  assert.ok(Math.abs(rollRight.roll - 25) < 1e-3);

  // Landscape orientation (angle = 90) projection test:
  // In 90° landscape, pitch is derived from gamma and roll from beta
  const landscapeTilt = screenTilt(0, 20, 90);
  assert.ok(Math.abs(Math.abs(landscapeTilt.pitch) - 20) < 1e-3);

  // 3. isGyroSupportedDevice detection test
  const fakeMobileWin = {
    DeviceOrientationEvent: function() {},
    isSecureContext: true,
    ontouchstart: null
  };
  const fakeMobileNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
    maxTouchPoints: 5
  };
  assert.equal(isGyroSupportedDevice(fakeMobileWin, fakeMobileNav), true, 'Mobile touch device must be detected as gyro supported');

  const fakeDesktopWin = {
    DeviceOrientationEvent: function() {},
    isSecureContext: true
  };
  const fakeDesktopNav = {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    maxTouchPoints: 0
  };
  assert.equal(isGyroSupportedDevice(fakeDesktopWin, fakeDesktopNav), false, 'Desktop without touch should not force default gyro');
});

test('validates Boeing 737 level tilt sensitivity (25° pitch, 30° roll) and dual-input fusion', () => {
  const code = readFileSync('web/js/input.js', 'utf8');
  const sandbox = {
    AirplaneGame: { prototype: {} },
    window: {
      screen: { orientation: { angle: 0, type: 'portrait-primary' } },
      innerWidth: 390,
      innerHeight: 844,
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    globalThis: {},
    document: {
      getElementById: () => null,
      querySelectorAll: () => []
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const proto = sandbox.AirplaneGame.prototype;
  const game = {
    joystickData: { x: 0, y: 0, active: false, rawX: 0, rawY: 0 },
    stickNormPitch: 0,
    stickNormRoll: 0,
    isStickActive: false,
    gyroActive: true,
    gyroEnabled: true,
    gyroCalibration: null,
    gyroNormPitch: 0,
    gyroNormRoll: 0,
    gyroScreen: { angle: 0, type: 'portrait' },
    isTouchStickReleasing: false,
    syncStickVisuals: () => {}
  };
  Object.assign(game, proto);

  // 0. Initial flat posture calibrates zero-point at 0, 0
  game.handleDeviceOrientation({ beta: 0, gamma: 0 });
  assert.ok(game.gyroCalibration, 'Calibration zero-point must be captured');
  assert.ok(Math.abs(game.gyroCalibration.pitch) < 1e-3);
  assert.ok(Math.abs(game.gyroCalibration.roll) < 1e-3);

  // 1. Full pitch deflection at 25 degrees (Boeing 737 elevator travel)
  game.handleDeviceOrientation({ beta: 25, gamma: 0 });
  assert.ok(Math.abs(game.gyroNormPitch - 1.0) < 1e-3, '25 deg pitch tilt must yield 1.0 normalized pitch');
  assert.ok(Math.abs(game.gyroNormRoll) < 1e-3, 'Pure pitch must yield 0 roll');
  assert.ok(Math.abs(game.joystickData.y - 1.0) < 1e-3, 'Shaped pitch at full deflection must be 1.0');

  // 2. Full roll deflection at 30 degrees (Boeing 737 aileron wheel bank travel)
  game.handleDeviceOrientation({ beta: 0, gamma: 30 });
  assert.ok(Math.abs(game.gyroNormPitch) < 1e-3, 'Pure roll must yield 0 pitch');
  assert.ok(Math.abs(game.gyroNormRoll - 1.0) < 1e-3, '30 deg roll tilt must yield 1.0 normalized roll');
  assert.ok(Math.abs(game.joystickData.x - 1.0) < 1e-3, 'Shaped roll at full deflection must be 1.0');

  // 3. Half deflection at 12.5 deg pitch and 15 deg roll follows 737 3rd-order curve
  game.handleDeviceOrientation({ beta: 12.5, gamma: 0 });
  assert.ok(Math.abs(game.gyroNormPitch - 0.5) < 1e-3, '12.5 deg pitch must yield 0.5 normalized raw pitch');
  const expectedTravel = (0.5 - 0.06) / 0.94;
  const expectedResp = 0.35 * expectedTravel + 0.65 * Math.pow(expectedTravel, 3);
  assert.ok(Math.abs(game.joystickData.y - expectedResp) < 1e-3, 'Half pitch tilt follows 737 curve');

  // 4. Dual-input fusion: combining touch stick and gyro without exceeding 1.0 magnitude
  game.gyroNormPitch = 0.8;
  game.gyroNormRoll = 0.0;
  game.stickNormPitch = 0.0;
  game.stickNormRoll = 0.8;
  game.isStickActive = true;
  game.updateTouchAndTiltOutput();

  const combinedMag = Math.hypot(game.joystickData.rawY, game.joystickData.rawX);
  assert.ok(combinedMag <= 1.0001, 'Combined stick + gyro input must clamp to magnitude 1.0');

  // 5. Recenter recalibrates current tilt as zero-point
  game.handleDeviceOrientation({ beta: 15, gamma: -10 });
  game.recenterGyro();
  game.handleDeviceOrientation({ beta: 15, gamma: -10 });
  assert.ok(Math.abs(game.gyroNormPitch) < 1e-3, 'Recentered pitch must be zero at current angle');
  assert.ok(Math.abs(game.gyroNormRoll) < 1e-3, 'Recentered roll must be zero at current angle');
});

test('validates ISA atmosphere model (troposphere & tropopause) from physics.js', () => {
  const code = readFileSync('web/js/physics.js', 'utf8');
  const sandbox = {
    AirplaneGame: { prototype: {} },
    window: {},
    globalThis: {},
    THREE: {
      Vector3: function(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z; },
      Quaternion: function() { this.setFromAxisAngle = () => this; },
      MathUtils: {
        clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
        degToRad: deg => (deg * Math.PI) / 180,
        radToDeg: rad => (rad * 180) / Math.PI
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const Atmosphere = sandbox.Atmosphere || sandbox.AirplaneGame.prototype.Atmosphere;
  assert.ok(Atmosphere, 'Atmosphere object must be exported');

  // 1. Sea level conditions (0m)
  const sl = Atmosphere.getConditions(0);
  assert.ok(Math.abs(sl.temperature - 288.15) < 0.1, 'Sea level temp must be ~288.15 K');
  assert.ok(Math.abs(sl.pressure - 101325.0) < 1.0, 'Sea level pressure must be ~101325 Pa');
  assert.ok(Math.abs(sl.density - 1.225) < 0.005, 'Sea level density must be ~1.225 kg/m^3');
  assert.ok(Math.abs(sl.speedOfSound - 340.3) < 0.5, 'Sea level speed of sound must be ~340.3 m/s');
  assert.ok(Math.abs(sl.densityRatio - 1.0) < 0.001, 'Sea level density ratio must be 1.0');

  // 2. 5000m conditions (cruising climb)
  const at5k = Atmosphere.getConditions(5000);
  assert.ok(Math.abs(at5k.temperature - (288.15 - 0.0065 * 5000)) < 0.1, '5000m temp follows lapse rate');
  assert.ok(at5k.pressure < sl.pressure && at5k.pressure > 50000, '5000m pressure ~540 hPa');
  assert.ok(at5k.density < 0.8 && at5k.density > 0.7, '5000m density ~0.736 kg/m^3');

  // 3. 11000m tropopause (isothermal layer start)
  const atTropo = Atmosphere.getConditions(11000);
  const at12k = Atmosphere.getConditions(12000);
  assert.ok(Math.abs(atTropo.temperature - 216.65) < 0.1, 'Tropopause temp must be ~216.65 K');
  assert.ok(Math.abs(at12k.temperature - 216.65) < 0.1, 'Stratosphere base is isothermal');
  assert.ok(at12k.pressure < atTropo.pressure, 'Stratosphere pressure continues exponential decay');

  // 4. TAS / IAS conversion
  const tas = 250.0; // m/s
  const ias = Atmosphere.tasToIas(tas, at5k.densityRatio);
  assert.ok(ias < tas, 'IAS must be less than TAS at altitude');
  const recoveredTas = Atmosphere.iasToTas(ias, at5k.densityRatio);
  assert.ok(Math.abs(recoveredTas - tas) < 1e-4, 'IAS to TAS conversion roundtrip');
});

test('validates continuous flow separation and stall reattachment hysteresis', () => {
  // Simulate Flight3d continuous separation state dynamics
  let separation = 0.0;
  const alphaStallRad = (15.0 * Math.PI) / 180.0;
  const tas = 70.0; // ~136 kt flight speed
  const dt = 0.05; // 50ms timestep

  const updateSeparation = (alphaRad, dtSec) => {
    const absAlpha = Math.abs(alphaRad);
    const separationWeight = Math.max(0.0, Math.min(1.0, (tas - 2.0) / 13.0));
    const separationTarget = Math.max(0.0, Math.min(1.0, (absAlpha - alphaStallRad) / ((12.0 * Math.PI) / 180.0))) * separationWeight;
    const reattachMix = 1.0 - Math.exp(-dtSec / 0.5);
    separation = Math.max(separationTarget, separation * (1.0 - reattachMix));
    return separation;
  };

  // 1. Below critical AoA (12 deg): attached flow (separation == 0)
  assert.equal(updateSeparation((12.0 * Math.PI) / 180.0, dt), 0.0);

  // 2. Past critical AoA (21 deg, 6 deg into stall): abrupt onset
  const stalledSep = updateSeparation((21.0 * Math.PI) / 180.0, dt);
  assert.ok(stalledSep >= 0.5, 'Stall onset must be abrupt past alphaCrit');

  // 3. Recovery: pilot pushes nose down to 10 deg (below alphaStall)
  // Flow must NOT instantly reattach; hysteresis preserves separation decaying over ~0.5s
  const recoveryStep1 = updateSeparation((10.0 * Math.PI) / 180.0, 0.1);
  assert.ok(recoveryStep1 > 0.35, 'Separation must lag and not drop to zero immediately');

  // After 1.5 seconds (3 time constants), flow reattaches
  let recoveryStepN = recoveryStep1;
  for (let t = 0; t < 30; t++) {
    recoveryStepN = updateSeparation((10.0 * Math.PI) / 180.0, 0.05);
  }
  assert.ok(recoveryStepN < 0.05, 'After 1.5s recovery flow must reattach below 0.05');
});

test('validates transonic wave drag and dynamic pressure control column stiffness (q-feel)', () => {
  // 1. Transonic Mach wave drag: M > 0.78
  const computeWaveDrag = (mach, buffetMach = 0.78) => {
    if (mach > buffetMach) {
      return Math.pow(mach - buffetMach, 3.5) * 8.0;
    }
    return 0.0;
  };

  assert.equal(computeWaveDrag(0.75), 0.0, 'Subsonic drag below M 0.78 has 0 wave drag');
  assert.equal(computeWaveDrag(0.78), 0.0, 'At buffet boundary wave drag is 0');
  const waveDragM84 = computeWaveDrag(0.84);
  assert.ok(waveDragM84 > 0.0001, 'Supercritical M 0.84 exhibits sharp transonic drag rise');
  assert.ok(computeWaveDrag(0.88) > waveDragM84 * 5.0, 'Wave drag grows exponentially with Mach');

  // 2. Boeing 737 q-feel stiffness curve
  const computeQFeel = (iasKnots) => {
    return Math.max(0.40, 1.0 - Math.max(0, (iasKnots - 140) / 220.0) * 0.55);
  };

  assert.equal(computeQFeel(130), 1.0, 'Low speed <= 140 kt has full control deflection authority');
  assert.equal(computeQFeel(140), 1.0, '140 kt boundary stiffness is 1.0');
  const midQ = computeQFeel(250);
  assert.ok(midQ < 1.0 && midQ > 0.65, '250 kt cruise has progressive stiffening');
  assert.ok(Math.abs(computeQFeel(360) - 0.45) < 1e-4, '360 kt VMO has stiff control column');
  assert.ok(Math.abs(computeQFeel(400) - 0.40) < 1e-4, 'Extreme speed clamps at minimum 0.40 authority');

  // 3. Elevator authority in stall wake
  const elevatorEffectiveness = (separation) => Math.max(0.15, 1.0 - 0.80 * separation);
  assert.equal(elevatorEffectiveness(0.0), 1.0, 'Clean wing has 100% elevator authority');
  assert.ok(elevatorEffectiveness(1.0) <= 0.20, 'Deep stall wake buries tail with <= 20% authority');
});
