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
