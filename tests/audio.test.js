import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/**
 * Lightweight mock of Web Audio API for Node.js test environment
 */
function createMockAudioContext() {
  class MockAudioParam {
    constructor(val = 1) {
      this.value = val;
    }
    setValueAtTime(v) { this.value = v; }
    setTargetAtTime(v) { this.value = v; }
    exponentialRampToValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
  }

  class MockNode {
    constructor() {
      this.connectedTo = [];
    }
    connect(dest) {
      this.connectedTo.push(dest);
      return dest;
    }
    disconnect() {
      this.connectedTo = [];
    }
    start() {}
    stop() {}
  }

  class MockGainNode extends MockNode {
    constructor() {
      super();
      this.gain = new MockAudioParam(1);
    }
  }

  class MockBiquadFilterNode extends MockNode {
    constructor() {
      super();
      this.type = 'lowpass';
      this.frequency = new MockAudioParam(350);
      this.Q = new MockAudioParam(1);
    }
  }

  class MockOscillatorNode extends MockNode {
    constructor() {
      super();
      this.type = 'sine';
      this.frequency = new MockAudioParam(440);
      this.wave = null;
    }
    setPeriodicWave(wave) { this.wave = wave; }
  }

  class MockCompressorNode extends MockNode {
    constructor() {
      super();
      this.threshold = new MockAudioParam(-12);
      this.knee = new MockAudioParam(8);
      this.ratio = new MockAudioParam(6);
      this.attack = new MockAudioParam(0.002);
      this.release = new MockAudioParam(0.18);
    }
  }

  return class MockAudioContext {
    constructor() {
      this.currentTime = 10.0;
      this.sampleRate = 44100;
      this.state = 'suspended';
      this.destination = new MockNode();
      this.onstatechange = null;
    }
    createGain() { return new MockGainNode(); }
    createBiquadFilter() { return new MockBiquadFilterNode(); }
    createPeriodicWave(real, imaginary) { return { real, imaginary }; }
    createOscillator() { return new MockOscillatorNode(); }
    createDynamicsCompressor() { return new MockCompressorNode(); }
    createBuffer(channels, size, sampleRate) {
      return {
        getChannelData: () => new Float32Array(size)
      };
    }
    createBufferSource() {
      const src = new MockNode();
      src.buffer = null;
      src.loop = false;
      return src;
    }
    resume() {
      this.state = 'running';
      if (typeof this.onstatechange === 'function') {
        this.onstatechange();
      }
      return Promise.resolve();
    }
  };
}

function loadAudioSubsystem(windowOverrides = {}) {
  const code = readFileSync('web/js/audio.js', 'utf8');

  class AirplaneGameMock {
    constructor() {
      this.soundEnabled = true;
      this.currentPlaneType = 'a320';
      this.n1 = 20;
      this.speed = 0;
      this.groundSpeed = 0;
      this.isOnGround = true;
      this.isEngineOff = false;
      this.isDestroyed = false;
      this.spoilerExtended = false;
      this.reverseThrustActive = false;
      this.throttle = 0.2;
    }
  }

  const mockListeners = [];
  const mockWindow = {
    AudioContext: createMockAudioContext(),
    addEventListener: (type, handler) => {
      mockListeners.push({ type, handler });
    },
    removeEventListener: (type, handler) => {
      const idx = mockListeners.findIndex(l => l.type === type && l.handler === handler);
      if (idx >= 0) mockListeners.splice(idx, 1);
    },
    ...windowOverrides
  };

  const mockHint = {
    hidden: true,
    style: { opacity: '0', transform: '' },
    addEventListener: (type, handler) => {
      mockListeners.push({ type: 'hint_' + type, handler });
    }
  };

  const mockDocument = {
    getElementById: (id) => {
      if (id === 'audio-start-hint') return mockHint;
      return null;
    }
  };

  const sandbox = {
    AirplaneGame: AirplaneGameMock,
    window: mockWindow,
    document: mockDocument,
    Float32Array,
    Math,
    setTimeout,
    clearTimeout,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  return {
    AirplaneGame: sandbox.AirplaneGame,
    mockWindow,
    mockDocument,
    mockHint,
    mockListeners
  };
}

test('audio subsystem: initAudio creates mastering chain with DynamicsCompressorNode', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();

  assert.ok(game.audioCtx, 'audioCtx must be initialized');
  assert.ok(game.compressor, 'Master DynamicsCompressorNode must exist');
  assert.equal(game.compressor.threshold.value, -12, 'Compressor threshold must be -12 dB');
  assert.equal(game.compressor.ratio.value, 6, 'Compressor ratio must be 6');
  assert.equal(game.compressor.knee.value, 8, 'Compressor knee must be 8');
  assert.ok(game.makeupGain, 'Makeup gain stage must exist');
  assert.equal(game.makeupGain.gain.value, 1.0, 'Makeup gain must be unity');
  assert.ok(game.masterGain, 'Master gain stage must exist');

  // Verify mastering chain: masterGain -> compressor -> makeupGain -> destination
  assert.ok(game.masterGain.connectedTo.includes(game.compressor), 'masterGain connects to compressor');
  assert.ok(game.compressor.connectedTo.includes(game.makeupGain), 'compressor connects to makeupGain');
  assert.ok(game.makeupGain.connectedTo.includes(game.audioCtx.destination), 'makeupGain connects to audioCtx.destination');
});

test('audio subsystem: cabin pack ambient hum prevents dead silence at gate/idle', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();

  assert.ok(game.packGain, 'Cabin pack hum gain node must exist');
  assert.ok(game.packFilter, 'Cabin pack filter must exist');
  assert.equal(game.packFilter.type, 'bandpass', 'Cabin pack filter must be bandpass');
  assert.equal(game.packFilter.frequency.value, 580, 'Cabin pack center frequency must be 580 Hz');
  assert.equal(game.packGain.gain.value, 0.16, 'Cabin pack normal hum volume should be 0.16');

  // When engines are shut down, ambient standby hum remains
  game.isEngineOff = true;
  game.audioCtx.state = 'running';
  game.updateAudio(0.016);
  assert.equal(game.packGain.gain.value, 0.05, 'Standby pack hum when engine off should be 0.05');
});

test('audio subsystem: jet engine synthesizes pink noise roar + N1/N2 twin spool turbine whine', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();
  game.audioCtx.state = 'running';
  game.startJetSound();

  assert.ok(game.jetNoiseGain, 'Jet noise gain node must exist');
  assert.ok(game.jetNoiseFilter, 'Jet noise lowpass filter must exist');
  assert.ok(game.turbineWhine, 'N1 low-pressure turbine whine oscillator must exist');
  assert.equal(game.turbineWhine.type, 'sine', 'N1 turbine whine must be sine');
  assert.ok(game.turbineWhine2, 'N2 high-pressure core twin spool oscillator must exist');
  assert.equal(game.turbineWhine2.type, 'triangle', 'N2 twin spool whine must be triangle');
  assert.ok(game.jetRumble, 'Core low rumble oscillator must exist');

  // Test Idle (N1 = 20%)
  game.n1 = 20;
  game.updateAudio(0.016);
  assert.ok(game.jetNoiseFilter.frequency.value >= 280, 'Idle combustion cutoff should be >= 280 Hz');
  assert.ok(game.jetNoiseGain.gain.value >= 0.35, 'Idle combustion volume should be >= 0.35');
  assert.ok(game.turbineWhine.frequency.value >= 420, 'N1 idle whine should be >= 420 Hz');
  assert.ok(game.turbineWhine2.frequency.value >= 840, 'N2 idle whine should be >= 840 Hz');

  // Test TOGA Takeoff (N1 = 100%)
  game.n1 = 100;
  game.updateAudio(0.016);
  assert.ok(game.jetNoiseFilter.frequency.value > 900, 'TOGA cutoff should rise above 900 Hz');
  assert.ok(game.jetNoiseGain.gain.value >= 1.0, 'TOGA combustion volume should be >= 1.0');
  assert.ok(game.turbineWhine.frequency.value > 1600, 'N1 TOGA whine should rise above 1600 Hz');
  assert.ok(game.turbineWhine2.frequency.value > 3000, 'N2 TOGA whine should rise above 3000 Hz');
});

test('audio subsystem: aerodynamic wind slipstream modulates with airspeed and spoilers', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();
  game.audioCtx.state = 'running';
  game.startJetSound();

  // Low speed (50 km/h) -> inaudible wind
  game.speed = 50 / 280;
  game.updateAudio(0.016);
  assert.ok(game.cockpitWindGain.gain.value < 0.05, 'Low speed wind should be minimal');

  // High speed (800 km/h) -> high wind rush
  game.speed = 800 / 280;
  game.updateAudio(0.016);
  assert.ok(game.cockpitWindGain.gain.value > 0.4, 'High speed wind should be loud');
  assert.ok(game.cockpitWindFilter.frequency.value > 2000, 'High speed cutoff should rise above 2000 Hz');

  // Spoiler extension adds extra turbulent rush
  const windBeforeSpoiler = game.cockpitWindGain.gain.value;
  game.spoilerExtended = true;
  game.updateAudio(0.016);
  assert.ok(game.cockpitWindGain.gain.value > windBeforeSpoiler, 'Extended spoiler must increase wind rush');
});

test('audio subsystem: ground rumble on taxi/landing and tire screech', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();
  game.audioCtx.state = 'running';
  game.startJetSound();

  // On ground & rolling (taxi speed 30 km/h)
  game.isOnGround = true;
  game.groundSpeed = 30 / 3.6;
  game.updateAudio(0.016);
  assert.ok(game.groundRumbleGain.gain.value > 0.05, 'Ground rumble should be audible during taxi');

  // Airborne -> ground rumble silent
  game.isOnGround = false;
  game.updateAudio(0.016);
  assert.equal(game.groundRumbleGain.gain.value, 0.0, 'Ground rumble must be 0 when airborne');

  // Touchdown screech synthesizes broadband contact noise
  assert.doesNotThrow(() => {
    game.playTouchdownScreech(130, 2.0);
  });
});

test('audio subsystem: piston/propeller engine synthesis for ancestor aircraft', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();
  game.audioCtx.state = 'running';
  game.startJetSound();

  // Switch to ancestor (1903 Wright Flyer)
  game.currentPlaneType = 'ancestor';
  game.throttle = 0.8;
  game.updateAudio(0.016);

  // Jet turbine whine must be silenced
  assert.equal(game.turbineGainNode.gain.value, 0.0, 'Jet N1 whine must be silent for piston plane');
  assert.equal(game.turbineGainNode2.gain.value, 0.0, 'Jet N2 whine must be silent for piston plane');
  assert.equal(game.jetNoiseGain.gain.value, 0.0, 'Jet combustion roar must be silent for piston plane');

  // Piston pulse and prop noise must be audible
  assert.ok(game.pistonGain.gain.value > 0.3, 'Piston pulse gain must be audible for ancestor');
  assert.ok(game.propGain.gain.value > 0.1, 'Propeller noise gain must be audible for ancestor');
});

test('audio subsystem: autoplay policy unlock binds listeners and syncs #audio-start-hint', () => {
  const { AirplaneGame, mockHint, mockListeners } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();

  // Context is suspended initially
  assert.equal(game.audioCtx.state, 'suspended');
  assert.equal(mockHint.hidden, false, 'audio-start-hint banner must be visible when suspended');

  // Global interaction listeners should be attached
  const interactionEvents = mockListeners.map(l => l.type);
  assert.ok(interactionEvents.includes('pointerdown'), 'pointerdown listener attached');
  assert.ok(interactionEvents.includes('click'), 'click listener attached');
  assert.ok(interactionEvents.includes('keydown'), 'keydown listener attached');
  assert.ok(interactionEvents.includes('touchstart'), 'touchstart listener attached');

  // Trigger click interaction to unlock
  const clickListener = mockListeners.find(l => l.type === 'click');
  clickListener.handler();

  assert.equal(game.audioCtx.state, 'running', 'AudioContext should resume to running state');
});

test('audio subsystem: mute and unmute controls master gain cleanly', () => {
  const { AirplaneGame } = loadAudioSubsystem();
  const game = new AirplaneGame();
  game.initAudio();

  // Normal unmuted
  assert.equal(game.soundEnabled, true);
  assert.equal(game.masterGain.gain.value, 1.0);

  // Mute
  game.toggleSound();
  assert.equal(game.soundEnabled, false);
  assert.equal(game.masterGain.gain.value, 0.0);

  // Unmute
  game.toggleSound();
  assert.equal(game.soundEnabled, true);
  assert.equal(game.masterGain.gain.value, 1.0);
});
