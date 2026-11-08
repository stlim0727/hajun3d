/**
 * Sky Jet Explorer 3D - Synthesized Jet Audio, Warning Sounds & EGPWS Chimes
 * Subsystem: audio (18 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

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

  });
})();

