/**
 * Sky Jet Explorer 3D - Synthesized Jet & Piston Audio, Warning Sounds & EGPWS Chimes
 * Subsystem: audio (Procedural multi-source Web Audio engine with DynamicsCompressor mastering limiter)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 6. 사운드 시스템 (합성 Web Audio & DynamicsCompressor 마스터링 리미터)
  // ----------------------------------------------------------------

  initAudio(context = null) {
    if (this.audioInitialized && this.audioCtx) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported by browser');
        return;
      }
      this.audioCtx = context || new AudioCtx();

      // 1. Master Dynamics Compressor (스튜디오 마스터링 리미터 - 터치다운/폭발/다중 경보 시 클리핑/디스토션 원천 차단)
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.18, this.audioCtx.currentTime);

      // 2. Makeup Gain (유니티 출력단)
      this.makeupGain = this.audioCtx.createGain();
      this.makeupGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // 3. Master Gain Node (전체 볼륨 및 무음 처리)
      this.masterGain = this.audioCtx.createGain();
      const initialGain = this.soundEnabled ? 1.0 : 0.0;
      this.masterGain.gain.setValueAtTime(initialGain, this.audioCtx.currentTime);

      // 신호 체인: 모든 음원 -> masterGain -> compressor -> makeupGain -> destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.makeupGain);
      this.makeupGain.connect(this.audioCtx.destination);

      // 4. 모바일/블루투스 오디오 경로 변경 및 일시정지 상태 복구 리스너
      if (typeof this.audioCtx.onstatechange !== 'undefined') {
        this.audioCtx.onstatechange = () => {
          if (this.audioCtx && (this.audioCtx.state === 'suspended' || this.audioCtx.state === 'interrupted')) {
            this.audioCtx.resume().catch(() => {});
          }
          this.syncAudioHint();
        };
      }

      // 5. 프로시저럴 다중 음원 합성 초기화
      this.initPackSynth();
      this.initEngineSynth();
      this.initPistonSynth();
      this.initWindSynth();
      this.initGroundSynth();

      this.audioInitialized = true;
      this.jetSoundActive = false;

      // 6. 브라우저 Autoplay Policy 대응 전역 제스처 언락 리스너 등록
      this.setupAudioAutoplayUnlock();
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  },

  getAudioDestination() {
    return this.masterGain || (this.audioCtx ? this.audioCtx.destination : null);
  },

  resumeAudio() {
    if (this.audioCtx && (this.audioCtx.state === 'suspended' || this.audioCtx.state === 'interrupted')) {
      return this.audioCtx.resume().catch(() => {});
    }
    return Promise.resolve();
  },

  setupAudioAutoplayUnlock() {
    if (typeof window === 'undefined') return;

    this._audioUnlockHandler = () => {
      this.resumeAudio();
      this.syncAudioHint();
    };

    const events = ['pointerdown', 'click', 'keydown', 'touchstart'];
    this._interactionEvents = events;

    this.attachAudioUnlockListeners();

    const hint = document.getElementById('audio-start-hint');
    if (hint) {
      hint.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resumeAudio();
        this.syncAudioHint();
      });
    }

    this.syncAudioHint();
  },

  attachAudioUnlockListeners() {
    if (this.audioListenersAttached || typeof window === 'undefined') return;
    if (this._interactionEvents && this._audioUnlockHandler) {
      this._interactionEvents.forEach(evt => {
        window.addEventListener(evt, this._audioUnlockHandler, { passive: true, capture: true });
      });
      this.audioListenersAttached = true;
    }
  },

  detachAudioUnlockListeners() {
    if (!this.audioListenersAttached || typeof window === 'undefined') return;
    if (this._interactionEvents && this._audioUnlockHandler) {
      this._interactionEvents.forEach(evt => {
        window.removeEventListener(evt, this._audioUnlockHandler, { capture: true });
      });
      this.audioListenersAttached = false;
    }
  },

  syncAudioHint() {
    if (typeof document === 'undefined') return;
    const hint = document.getElementById('audio-start-hint');
    if (!hint) return;

    const state = this.audioCtx?.state;
    const isRunning = state === 'running';

    if (isRunning || !this.soundEnabled) {
      hint.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      hint.style.opacity = '0';
      hint.style.transform = 'translate(-50%, 8px)';
      const hideBanner = () => {
        if (this.audioCtx?.state === 'running' || !this.soundEnabled) {
          hint.hidden = true;
        }
      };
      if (typeof setTimeout !== 'undefined') {
        setTimeout(hideBanner, 250);
      } else {
        hideBanner();
      }
      if (isRunning) {
        this.detachAudioUnlockListeners();
      }
    } else if (state === 'suspended' || state === 'interrupted') {
      hint.hidden = false;
      hint.style.opacity = '1';
      hint.style.transform = 'translate(-50%, 0)';
      this.attachAudioUnlockListeners();
    }
  },

  // ----------------------------------------------------------------
  // 음원 1: 조종석 항전장비 냉각 팬 & 에어컨 팩 연속 앰비언트 (Cabin Pack & Cooling Fan)
  // 주기장 및 아이들 대기 중 완벽한 실기 조종석 현장감 부여 (절대 무음 방지)
  // ----------------------------------------------------------------
  initPackSynth() {
    if (!this.audioCtx) return;
    const bufferSize = Math.floor(this.audioCtx.sampleRate * 2.0);
    const packBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = packBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }

    this.packNoise = this.audioCtx.createBufferSource();
    this.packNoise.buffer = packBuffer;
    this.packNoise.loop = true;

    this.packFilter = this.audioCtx.createBiquadFilter();
    this.packFilter.type = 'bandpass';
    this.packFilter.frequency.setValueAtTime(580, this.audioCtx.currentTime);
    this.packFilter.Q.setValueAtTime(0.8, this.audioCtx.currentTime);

    this.packGain = this.audioCtx.createGain();
    this.packGain.gain.setValueAtTime(0.16, this.audioCtx.currentTime);

    this.packNoise.connect(this.packFilter);
    this.packFilter.connect(this.packGain);
    this.packGain.connect(this.masterGain);
    this.packNoise.start();
  },

  // ----------------------------------------------------------------
  // 음원 2: 제트 엔진 신디사이저 (핑크 노이즈 연소음 + N1/N2 트윈 스풀 터빈 휘파람)
  // ----------------------------------------------------------------
  initEngineSynth() {
    if (!this.audioCtx) return;

    // 1. Paul Kellet 정규화 핑크 노이즈 버퍼 (터보팬 연소 & 바이패스 제트 분사음)
    const bufferSize = Math.floor(this.audioCtx.sampleRate * 2.0);
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let maxVal = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      if (Math.abs(output[i]) > maxVal) maxVal = Math.abs(output[i]);
    }
    if (maxVal > 0) {
      const norm = 0.92 / maxVal;
      for (let i = 0; i < bufferSize; i++) {
        output[i] *= norm;
      }
    }
    this.engineNoiseBuffer = noiseBuffer;

    // 제트 노이즈 음원
    this.engineNoise = this.audioCtx.createBufferSource();
    this.engineNoise.buffer = noiseBuffer;
    this.engineNoise.loop = true;

    // 연소 저역 통과 필터 (280 Hz 아이들 ~ 1100 Hz TOGA)
    this.jetNoiseFilter = this.audioCtx.createBiquadFilter();
    this.jetNoiseFilter.type = 'lowpass';
    this.jetNoiseFilter.frequency.setValueAtTime(320, this.audioCtx.currentTime);
    this.jetNoiseFilter.Q.setValueAtTime(1.8, this.audioCtx.currentTime);

    this.jetNoiseGain = this.audioCtx.createGain();
    this.jetNoiseGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.engineNoise.connect(this.jetNoiseFilter);
    this.jetNoiseFilter.connect(this.jetNoiseGain);
    this.jetNoiseGain.connect(this.masterGain);
    this.engineNoise.start();

    // 호환성 참조 유지
    this.jetNoiseSrc = this.engineNoise;

    // 2. 터빈 회전 코어 중저음 (Triangle 파형 54Hz ~ 102Hz)
    this.jetRumble = this.audioCtx.createOscillator();
    this.jetRumble.type = 'triangle';
    this.jetRumble.frequency.setValueAtTime(56, this.audioCtx.currentTime);

    const rumbleFilter = this.audioCtx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(160, this.audioCtx.currentTime);

    this.rumbleGainNode = this.audioCtx.createGain();
    this.rumbleGainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.jetRumble.connect(rumbleFilter);
    rumbleFilter.connect(this.rumbleGainNode);
    this.rumbleGainNode.connect(this.masterGain);
    this.jetRumble.start();

    // 3. Primary N1 저압 팬 컴프레서 스풀업 휘파람 (Sine Oscillator: 420Hz ~ 1800Hz)
    this.turbineWhine = this.audioCtx.createOscillator();
    this.turbineWhine.type = 'sine';
    this.turbineWhine.frequency.setValueAtTime(420, this.audioCtx.currentTime);

    this.turbineGainNode = this.audioCtx.createGain();
    this.turbineGainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.turbineWhine.connect(this.turbineGainNode);
    this.turbineGainNode.connect(this.masterGain);
    this.turbineWhine.start();

    // 4. Secondary N2 고압 코어 컴프레서 & 고조파 트윈 스풀 휘파람 (Triangle Oscillator: 840Hz ~ 3200Hz)
    this.turbineWhine2 = this.audioCtx.createOscillator();
    this.turbineWhine2.type = 'triangle';
    this.turbineWhine2.frequency.setValueAtTime(840, this.audioCtx.currentTime);

    this.turbineGainNode2 = this.audioCtx.createGain();
    this.turbineGainNode2.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.turbineWhine2.connect(this.turbineGainNode2);
    this.turbineGainNode2.connect(this.masterGain);
    this.turbineWhine2.start();
  },

  // ----------------------------------------------------------------
  // 음원 3: 피스톤 / 프로펠러 엔진 신디사이저 (1903 복엽기 조상 비행기 등)
  // ----------------------------------------------------------------
  initPistonSynth() {
    if (!this.audioCtx) return;

    // 4행정 엔진 배기 압력 펄스 파형 합성 (32 고조파 PeriodicWave)
    const real = new Float32Array(33), imaginary = new Float32Array(33);
    for (let harmonic = 1; harmonic < real.length; harmonic++) {
      real[harmonic] = 1 / (1 + (harmonic / 5) ** 2);
      imaginary[harmonic] = -0.35 * real[harmonic];
    }
    this.pistonPulse = this.audioCtx.createOscillator();
    try {
      this.pistonPulse.setPeriodicWave(this.audioCtx.createPeriodicWave(real, imaginary));
    } catch (e) {
      this.pistonPulse.type = 'sawtooth';
    }
    this.pistonPulse.frequency.setValueAtTime(24, this.audioCtx.currentTime);

    this.pistonFilter = this.audioCtx.createBiquadFilter();
    this.pistonFilter.type = 'lowpass';
    this.pistonFilter.frequency.setValueAtTime(1800, this.audioCtx.currentTime);
    this.pistonFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

    this.pistonGain = this.audioCtx.createGain();
    this.pistonGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.pistonPulse.connect(this.pistonFilter);
    this.pistonFilter.connect(this.pistonGain);
    this.pistonGain.connect(this.masterGain);
    this.pistonPulse.start();

    // 프로펠러 날 통과 공기 파동음 (블레이드 회전 주파수로 진폭 변조)
    this.propNoise = this.audioCtx.createBufferSource();
    this.propNoise.buffer = this.engineNoiseBuffer;
    this.propNoise.loop = true;

    this.propFilter = this.audioCtx.createBiquadFilter();
    this.propFilter.type = 'bandpass';
    this.propFilter.frequency.setValueAtTime(550, this.audioCtx.currentTime);
    this.propFilter.Q.setValueAtTime(0.6, this.audioCtx.currentTime);

    this.propGain = this.audioCtx.createGain();
    this.propGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.propBeat = this.audioCtx.createOscillator();
    this.propBeat.type = 'sine';
    this.propBeat.frequency.setValueAtTime(24, this.audioCtx.currentTime);

    this.propModGain = this.audioCtx.createGain();
    this.propModGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.propNoise.connect(this.propFilter);
    this.propFilter.connect(this.propGain);
    this.propGain.connect(this.masterGain);

    this.propBeat.connect(this.propModGain);
    this.propModGain.connect(this.propGain.gain);

    this.propBeat.start();
    this.propNoise.start();
  },

  // ----------------------------------------------------------------
  // 음원 4: 고속 공기역학 풍절음 (Aerodynamic Wind Slipstream)
  // ----------------------------------------------------------------
  initWindSynth() {
    if (!this.audioCtx) return;

    const bufferSize = Math.floor(this.audioCtx.sampleRate * 2.0);
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.55;
    }

    this.jetWindSrc = this.audioCtx.createBufferSource();
    this.jetWindSrc.buffer = noiseBuffer;
    this.jetWindSrc.loop = true;

    this.cockpitWindFilter = this.audioCtx.createBiquadFilter();
    this.cockpitWindFilter.type = 'bandpass';
    this.cockpitWindFilter.frequency.setValueAtTime(750, this.audioCtx.currentTime);
    this.cockpitWindFilter.Q.setValueAtTime(1.1, this.audioCtx.currentTime);

    this.cockpitWindGain = this.audioCtx.createGain();
    this.cockpitWindGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.jetWindSrc.connect(this.cockpitWindFilter);
    this.cockpitWindFilter.connect(this.cockpitWindGain);
    this.cockpitWindGain.connect(this.masterGain);
    this.jetWindSrc.start();
  },

  // ----------------------------------------------------------------
  // 음원 5: 활주로 지상 주행 럼블 (Ground Roll Rumble on Taxi / Landing)
  // ----------------------------------------------------------------
  initGroundSynth() {
    if (!this.audioCtx) return;

    const bufferSize = Math.floor(this.audioCtx.sampleRate * 2.0);
    const rumbleBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const rData = rumbleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      rData[i] = (Math.random() * 2 - 1) * 0.6;
    }

    this.groundRumbleSrc = this.audioCtx.createBufferSource();
    this.groundRumbleSrc.buffer = rumbleBuffer;
    this.groundRumbleSrc.loop = true;

    this.groundRumbleFilter = this.audioCtx.createBiquadFilter();
    this.groundRumbleFilter.type = 'lowpass';
    this.groundRumbleFilter.frequency.setValueAtTime(220, this.audioCtx.currentTime);
    this.groundRumbleFilter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

    this.groundRumbleGain = this.audioCtx.createGain();
    this.groundRumbleGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    this.groundRumbleSrc.connect(this.groundRumbleFilter);
    this.groundRumbleFilter.connect(this.groundRumbleGain);
    this.groundRumbleGain.connect(this.masterGain);
    this.groundRumbleSrc.start();
  },

  // ----------------------------------------------------------------
  // 연속 음원 실시간 상태 갱신 (updateAudio: 매 프레임 보간 호출)
  // ----------------------------------------------------------------
  updateAudio(dt) {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const now = this.audioCtx.currentTime;
    const isPiston = this.currentPlaneType === 'ancestor';
    const isRunning = this.jetSoundActive && !this.isEngineOff && !this.isDestroyed;

    // 1. 조종석 팩 에어컨/항전장비 팬 앰비언트 (엔진 꺼지면 대기 전원 수준 0.05로 감쇠)
    if (this.packGain) {
      const targetPack = (!this.soundEnabled || this.isDestroyed) ? 0.0 : (this.isEngineOff ? 0.05 : 0.16);
      this.packGain.gain.setTargetAtTime(targetPack, now, 0.08);
    }

    // 2. 피스톤 vs 제트 엔진 선택적 변조
    if (isPiston) {
      this.silenceJetEngines(now);
      this.updatePistonSynth(now, isRunning);
    } else {
      this.silencePistonEngines(now);
      this.updateJetSynth(now, isRunning);
    }

    // 3. 고속 공기역학 풍절음 (IAS 비속도 및 스포일러 난류 연동)
    if (this.cockpitWindFilter && this.cockpitWindGain) {
      const currentKmh = (this.speed || 0) * 280;
      const iasKnots = currentKmh / 1.852;
      const spoilerTurbulence = this.spoilerExtended ? 0.14 : 0.0;
      const baseWind = Math.min(0.68, Math.pow(iasKnots / 300.0, 1.5) * 0.58);
      const targetWindVol = (this.soundEnabled && !this.isDestroyed && this.jetSoundActive)
        ? Math.min(0.85, baseWind + spoilerTurbulence)
        : 0.0;
      const targetWindCutoff = 450 + Math.min(3200, iasKnots * 9.5) + (this.spoilerExtended ? 300 : 0);
      this.cockpitWindFilter.frequency.setTargetAtTime(targetWindCutoff, now, 0.10);
      this.cockpitWindGain.gain.setTargetAtTime(targetWindVol, now, 0.10);
    }

    // 4. 활주로 및 유도로 지상 굴림 럼블 (바퀴 접지 및 지상 속도 연동)
    if (this.groundRumbleFilter && this.groundRumbleGain) {
      const groundSpeedKmh = this.groundSpeed ? Math.abs(this.groundSpeed * 3.6) : ((this.speed || 0) * 280);
      if (this.isOnGround && groundSpeedKmh > 3 && this.soundEnabled && !this.isDestroyed && this.jetSoundActive) {
        const rumbleRatio = Math.min(1.0, groundSpeedKmh / 180.0);
        const targetRumbleVol = Math.min(0.55, rumbleRatio * 0.50);
        const targetRumbleCutoff = 180 + rumbleRatio * 140;
        this.groundRumbleFilter.frequency.setTargetAtTime(targetRumbleCutoff, now, 0.08);
        this.groundRumbleGain.gain.setTargetAtTime(targetRumbleVol, now, 0.08);
      } else {
        this.groundRumbleGain.gain.setTargetAtTime(0.0, now, 0.08);
      }
    }
  },

  updateJetSynth(now, isRunning) {
    if (!isRunning || !this.soundEnabled) {
      this.silenceJetEngines(now);
      return;
    }

    const n1 = Math.max(20, Math.min(100, this.n1 || 20));
    const n1Ratio = Math.max(0.0, Math.min(1.0, (n1 - 20) / 80.0)); // 0.0 ~ 1.0

    // 1. 제트 연소 핑크 노이즈 굉음 (280Hz ~ 1030Hz, 게인 0.35 ~ 1.15)
    if (this.jetNoiseFilter && this.jetNoiseGain) {
      const engineCutoff = 280 + n1Ratio * 750;
      const reverseBoost = this.reverseThrustActive ? 0.25 : 0.0;
      const engineVol = 0.35 + Math.pow(n1Ratio, 1.3) * 0.75 + reverseBoost;
      this.jetNoiseFilter.frequency.setTargetAtTime(engineCutoff, now, 0.08);
      this.jetNoiseGain.gain.setTargetAtTime(engineVol, now, 0.08);
    }

    // 2. 터빈 회전 코어 중저음 (54Hz ~ 102Hz)
    if (this.jetRumble && this.rumbleGainNode) {
      const rumbleFreq = 54 + n1Ratio * 48;
      const rumbleVol = 0.10 + n1Ratio * 0.12;
      this.jetRumble.frequency.setTargetAtTime(rumbleFreq, now, 0.08);
      this.rumbleGainNode.gain.setTargetAtTime(rumbleVol, now, 0.08);
    }

    // 3. Primary N1 저압 팬 스풀업 휘파람 (420Hz ~ 1800Hz)
    if (this.turbineWhine && this.turbineGainNode) {
      const turbineFreq = 420 + Math.pow(n1Ratio, 1.2) * 1380;
      const turbineVol = 0.08 + n1Ratio * 0.22;
      this.turbineWhine.frequency.setTargetAtTime(turbineFreq, now, 0.08);
      this.turbineGainNode.gain.setTargetAtTime(turbineVol, now, 0.08);
    }

    // 4. Secondary N2 고압 코어 트윈 스풀 휘파람 & 고조파 (840Hz ~ 3200Hz)
    if (this.turbineWhine2 && this.turbineGainNode2) {
      const turbineFreq2 = 840 + Math.pow(n1Ratio, 1.1) * 2360;
      const turbineVol2 = 0.04 + n1Ratio * 0.12;
      this.turbineWhine2.frequency.setTargetAtTime(turbineFreq2, now, 0.08);
      this.turbineGainNode2.gain.setTargetAtTime(turbineVol2, now, 0.08);
    }
  },

  updatePistonSynth(now, isRunning) {
    if (!isRunning || !this.soundEnabled) {
      this.silencePistonEngines(now);
      return;
    }

    const throttle = Math.max(0.1, Math.min(1.0, this.throttle || 0.1));
    const rpm = 700 + throttle * 2000;
    const firingHz = (rpm / 60) * 2; // 4기통 4행정 점화율

    if (this.pistonPulse && this.pistonFilter && this.pistonGain) {
      this.pistonPulse.frequency.setTargetAtTime(Math.max(12, firingHz), now, 0.06);
      this.pistonFilter.frequency.setTargetAtTime(900 + throttle * 1400, now, 0.08);
      this.pistonGain.gain.setTargetAtTime(0.28 + throttle * 0.35, now, 0.08);
    }

    if (this.propBeat && this.propFilter && this.propGain && this.propModGain) {
      const bladeHz = (rpm / 60) * 2; // 2엽 프로펠러
      this.propBeat.frequency.setTargetAtTime(Math.max(12, bladeHz), now, 0.06);
      this.propFilter.frequency.setTargetAtTime(380 + throttle * 600, now, 0.08);
      this.propGain.gain.setTargetAtTime(0.08 + throttle * 0.14, now, 0.08);
      this.propModGain.gain.setTargetAtTime(0.04 + throttle * 0.06, now, 0.08);
    }
  },

  silenceJetEngines(now) {
    const t = now || (this.audioCtx ? this.audioCtx.currentTime : 0);
    if (this.jetNoiseGain) this.jetNoiseGain.gain.setTargetAtTime(0.0, t, 0.06);
    if (this.rumbleGainNode) this.rumbleGainNode.gain.setTargetAtTime(0.0, t, 0.06);
    if (this.turbineGainNode) this.turbineGainNode.gain.setTargetAtTime(0.0, t, 0.06);
    if (this.turbineGainNode2) this.turbineGainNode2.gain.setTargetAtTime(0.0, t, 0.06);
  },

  silencePistonEngines(now) {
    const t = now || (this.audioCtx ? this.audioCtx.currentTime : 0);
    if (this.pistonGain) this.pistonGain.gain.setTargetAtTime(0.0, t, 0.06);
    if (this.propGain) this.propGain.gain.setTargetAtTime(0.0, t, 0.06);
    if (this.propModGain) this.propModGain.gain.setTargetAtTime(0.0, t, 0.06);
  },

  startJetSound() {
    this.jetSoundActive = true;
    if (!this.audioCtx) this.initAudio();
    this.resumeAudio();
    if (this.audioCtx) {
      this.updateAudio(0.016);
    }
  },

  stopJetSound() {
    this.jetSoundActive = false;
    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.silenceJetEngines(now);
      this.silencePistonEngines(now);
      if (this.cockpitWindGain) this.cockpitWindGain.gain.setTargetAtTime(0.0, now, 0.06);
      if (this.groundRumbleGain) this.groundRumbleGain.gain.setTargetAtTime(0.0, now, 0.06);
    }
  },

  // 광대역 마찰 접촉 노이즈 합성 (레이저 삐빅거림이 아닌 진짜 타이어/기체 마찰음)
  playContactNoise(duration, frequency, level, type = 'lowpass') {
    if (!this.audioCtx || !this.soundEnabled) return;
    const now = this.audioCtx.currentTime;
    const sampleRate = this.audioCtx.sampleRate || 44100;
    const bufferSize = Math.max(1, Math.ceil(sampleRate * duration));
    const buffer = this.audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    const attack = 0.008;

    for (let i = 0; i < bufferSize; i++) {
      const time = i / sampleRate;
      const envelope = Math.min(1, time / attack) * Math.exp(-6 * time / duration);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, now);
    filter.Q.setValueAtTime(0.8, now);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(level, now);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.getAudioDestination());

    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    };

    source.start(now);
    source.stop(now + duration);
  },

  // ----------------------------------------------------------------
  // 원샷 효과음 (모두 masterGain & DynamicsCompressor로 라우팅)
  // ----------------------------------------------------------------

  playTouchdownScreech(groundSpeedKnots = 120, sinkRate = 1.5) {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();

    const speed = Math.min(1, Math.max(0.2, (typeof groundSpeedKnots === 'number' ? groundSpeedKnots : 100) / 100));

    // 1. 휠 스핀업 타이어 마찰 스크리치 (1800Hz 대역 통과 필터링)
    this.playContactNoise(0.14 + 0.08 * speed, 1800, 0.35 * speed, 'bandpass');

    // 2. 올레오 스트럿 서스펜션 압축 둔탁한 타격 쿵 (180Hz 저역 통과)
    const severity = Math.min(1, Math.max(0.3, (typeof sinkRate === 'number' ? sinkRate : 1.5) / 3));
    this.playContactNoise(0.25, 180, 1.1 * severity, 'lowpass');
  },

  playExplosionSound() {
    this.stopJetSound();
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();

    const now = this.audioCtx.currentTime;
    const sampleRate = this.audioCtx.sampleRate || 44100;

    // 1. 저주파 서브우퍼 폭발 굉음 (3.5초 감쇠, 320Hz -> 32Hz 지수 스윕)
    const subBufferSize = Math.floor(sampleRate * 3.5);
    const subBuffer = this.audioCtx.createBuffer(1, subBufferSize, sampleRate);
    const sData = subBuffer.getChannelData(0);
    for (let i = 0; i < subBufferSize; i++) {
      sData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.75));
    }
    const subSource = this.audioCtx.createBufferSource();
    subSource.buffer = subBuffer;

    const bassFilter = this.audioCtx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(320, now);
    bassFilter.frequency.exponentialRampToValueAtTime(32, now + 2.8);

    const bassGain = this.audioCtx.createGain();
    bassGain.gain.setValueAtTime(1.4, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    subSource.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.getAudioDestination());
    subSource.start(now);

    // 2. 고주파 금속 파쇄 및 파편 굉음 (1.5초 감쇠, 2200Hz -> 350Hz)
    const crunchBufferSize = Math.floor(sampleRate * 1.5);
    const crunchBuffer = this.audioCtx.createBuffer(1, crunchBufferSize, sampleRate);
    const cData = crunchBuffer.getChannelData(0);
    for (let i = 0; i < crunchBufferSize; i++) {
      cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.3));
    }
    const crunchSource = this.audioCtx.createBufferSource();
    crunchSource.buffer = crunchBuffer;

    const crunchFilter = this.audioCtx.createBiquadFilter();
    crunchFilter.type = 'highpass';
    crunchFilter.frequency.setValueAtTime(2200, now);
    crunchFilter.frequency.exponentialRampToValueAtTime(350, now + 1.2);

    const crunchGain = this.audioCtx.createGain();
    crunchGain.gain.setValueAtTime(0.85, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    crunchSource.connect(crunchFilter);
    crunchFilter.connect(crunchGain);
    crunchGain.connect(this.getAudioDestination());
    crunchSource.start(now);
  },

  playMetalCrunchSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
    this.playContactNoise(0.38, 750, 0.45, 'bandpass');
  },

  playGearSnapSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.45, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.getAudioDestination());
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.31);
  },

  // 유압 모터 및 액추에이터 구동음 (Hydraulic Pump Sound)
  playHydraulicSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    try {
      this.resumeAudio();
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
      gain.connect(this.getAudioDestination());

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.4);
      osc2.stop(now + 2.4);
    } catch (e) {
      console.warn('Hydraulic sound error:', e);
    }
  },

  // 기계식 락 체결음 (Mechanical Gear Lock Sound)
  playGearLockSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    try {
      this.resumeAudio();
      const now = this.audioCtx.currentTime;
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(80, now);
      bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
      bassGain.gain.setValueAtTime(0.35, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      bassOsc.connect(bassGain);
      bassGain.connect(this.getAudioDestination());
      bassOsc.start(now);
      bassOsc.stop(now + 0.28);

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
        gain.connect(this.getAudioDestination());
        osc.start(t);
        osc.stop(t + 0.08);
      });
    } catch (e) {
      console.warn('Gear lock sound error:', e);
    }
  },

  // 실제 조종석 GPWS 음성 경보 (Speech Synthesis)
  speakGPWS(phrase) {
    if (!this.soundEnabled) return;
    const now = Date.now();
    if (this.lastSpokenPhrase === phrase && now - this.lastSpokenTime < 1600) return;
    this.lastSpokenPhrase = phrase;
    this.lastSpokenTime = now;

    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
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
  },

  // GPWS "Whoop Whoop" 사이렌 사운드 (420Hz -> 840Hz FM Sweep)
  playGPWSWhoopSiren() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
    const now = Date.now();
    if (now - this.lastWhoopTime < 1400) return;
    this.lastWhoopTime = now;

    if (!this.gpwsSirenGain) {
      this.gpwsSirenGain = this.audioCtx.createGain();
      this.gpwsSirenGain.connect(this.getAudioDestination());
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
  },

  stopGPWSSiren() {
    if (this.gpwsSirenGain && this.audioCtx) {
      try {
        this.gpwsSirenGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      } catch (e) {}
    }
  },

  // 주의 차임벨 (Caution High-Low Chime)
  playCautionChime() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
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
      gain.connect(this.getAudioDestination());
      osc.start(t);
      osc.stop(t + 0.3);
    });
  },

  // 스틱 셰이커 & 실속 딸깍음 (Stick Shaker Stall Clacker & Horn)
  playStickShakerSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
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
      gain.connect(this.getAudioDestination());
      osc.start(t);
      osc.stop(t + 0.035);
    }

    // 항공기 실속 경고 호른 (740Hz 톱니파 호른 경고음)
    try {
      const hornOsc = this.audioCtx.createOscillator();
      const hornGain = this.audioCtx.createGain();
      hornOsc.type = 'sawtooth';
      hornOsc.frequency.setValueAtTime(740, this.audioCtx.currentTime);
      hornGain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      hornGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.16);
      hornOsc.connect(hornGain);
      hornGain.connect(this.getAudioDestination());
      hornOsc.start(this.audioCtx.currentTime);
      hornOsc.stop(this.audioCtx.currentTime + 0.18);
    } catch (e) {}
  },

  playFlapSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
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
    gain.connect(this.getAudioDestination());
    osc.start(now);
    osc.stop(now + 0.65);
  },

  playSpoilerSound() {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.getAudioDestination());
    osc.start(now);
    osc.stop(now + 0.36);
  },

  playReverseThrustSound(active) {
    if (!this.audioCtx || !this.soundEnabled) return;
    this.resumeAudio();
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
        gain.connect(this.getAudioDestination());
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
  },

  // 기장 안내방송 차임벨 (딩~동~) 사운드 합성
  playPAChime() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx || !this.soundEnabled) return;
    try {
      this.resumeAudio();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // High Ding (880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(this.getAudioDestination());
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Low Dong (587.33Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, now + 0.35);
      gain2.gain.setValueAtTime(0.26, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(this.getAudioDestination());
      osc2.start(now + 0.35);
      osc2.stop(now + 1.2);
    } catch (e) {}
  },

  setMuted(muted) {
    this.soundEnabled = !muted;
    if (this.masterGain && this.audioCtx) {
      const target = this.soundEnabled ? 1.0 : 0.0;
      this.masterGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.05);
    }
    if (!this.soundEnabled) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      this.resumeAudio();
    }
    this.syncAudioHint();
  },

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.setMuted(!this.soundEnabled);
    return this.soundEnabled;
  }

  });
})();
