/**
 * Sky Jet Explorer 3D - Cockpit Microphone, Persistent Speech AI, Passenger Dialogue & Interactive PA
 * Subsystem: speech (16 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  triggerMovementPassengerReaction(motionType, kmh, alt) {
    const movementDialoguePool = {
      STALL_PANIC: [
        "🚨 [객실 285명 극심한 공포] '꺄아아악! 비행기 속도가 뚝 떨어지더니 아래로 곤두박질쳐요! 실속이다!'",
        "😱 [14A 승객 비명] '양력을 잃었어! 자유낙하하고 있어요! 기장님 제발 스로틀 끝까지 올리고 기수 내려주세요!'",
        "💺 [객실 승무원 긴급 방송] '승객 여러분! 전원 머리를 숙이고 충격 방지 자세(Brace)를 유지하십시오! 실속 급강하 중입니다!'",
        "📉 [22C 승객] '고도계가 미친 듯이 곤두박질친다! 바다가 무섭게 다가와요! 하준 기장님 살려주세요!'",
        "🙏 [가족 승객들 울음] '엔진 파워 최대로 올려주세요! 우리 모두 살고 싶어요!'"
      ],
      WINDSHEAR_PANIC: [
        "🌪️ [객실 285명 절규] '으아아악! 몸이 천장으로 솟구칠 것 같아요! 강력한 하강 기류다!'",
        "😱 [14C 승객] '마이크로버스트다! 비행기가 아래로 뚝뚝 떨어져요! 하준 기장님 파워 올려주세요!'",
        "💺 [객실 승무원] '승객 여러분! 전원 머리를 숙이고 충격 방지 자세(Brace Position)를 취하세요!'",
        "🙏 [가족 승객들] '하준 기장님 믿습니다! 제발 이 난기류 폭풍을 뚫고 올라가 주세요!'",
        "💨 [22A 승객] '풍속계랑 고도계가 미친 듯이 춤춰요! 기수 들어올려라 제발!'"
      ],
      TURBULENCE_SHAKE: [
        "🌊 [객실 승객들] '우당탕탕! 기체가 사정없이 요동치고 있어요! 손잡이 꽉 잡아!'",
        "🥤 [16B 승객] '커피랑 음료수가 공중에 붕 떴어요! 역대급 난기류 터뷸런스다!'",
        "👦 [창가 어린이] '엄마 무서워요! 비행기 날개가 위아래로 심하게 흔들려요!'",
        "💺 [객실 승무원 방송] '기류가 매우 불안정합니다! 좌석 벨트를 단단히 조여 매주시기 바랍니다!'",
        "💼 [09D 승객] '하준 기장님 목소리 듣고 침착하게 버티고 있습니다. 기장님 파이팅!'"
      ],
      ENGINE_FIRE: [
        "🔥 [좌측 11열 승객] '창밖을 봐! 1번 엔진에서 시뻘건 불꽃이 계속 뿜어져 나와요!'",
        "🧯 [승객 일동] '비대칭 추력으로 비행기가 왼쪽으로 기울고 있어! 하준 기장님 균형 잡아주세요!'",
        "😱 [23E 승객] '엔진 하나로 날고 있어! 공항까지 버텨야 해! 하준 기장님 힘내세요!'",
        "👨‍✈️ [객실 승무원] '승객 여러분 침착하십시오! 기장님께서 한쪽 엔진으로 비상착륙 준비 중이십니다!'"
      ],
      BIRD_STRIKE: [
        "🦅 [승객 285명 정적과 공포] '제트 엔진 소리가 아예 안 들려... 무동력으로 활공 중이야!'",
        "🤫 [19B 승객] '허드슨강의 기적처럼... 하준 기장님이라면 바다나 활주로에 살려주실 거야!'",
        "💨 [창가 승객] '바람 가르는 소리만 쉭쉭 나요! 고도가 점점 낮아진다! 하준 기장님 부탁해요!'",
        "🙏 [15A 승객] '글라이더 비행 성공할 수 있습니다! 하준 기장님 조종술을 믿어요!'"
      ],
      GEAR_FAILURE: [
        "🛞 [승객 285명 브레이스] '바퀴 없이 맨땅에 동체 착륙(Belly Landing)한다! 충격에 대비해!'",
        "⚠️ [객실 승무원] '브레이스! 브레이스! 머리를 무릎 사이에 파묻고 발을 바닥에 붙이세요!'",
        "🔥 [28C 승객] '활주로에 닿으면 불꽃이 튈 거야! 하준 기장님 부드럽게 미끄러져 주세요!'",
        "🤝 [승객들 서로 손잡으며] '우리 모두 무사할 수 있을 거야! 하준 기장님 파이팅!'"
      ],
      STEEP_CLIMB: [
        "🚀 [14A 창가 승객] '우와아아! 기수가 하늘로 치솟는다! 몸이 시트에 푹 파묻혀요!'",
        "👦 [24F 어린이] '엄마! 비행기가 롤러코스터처럼 올라가! 구름 뚫고 간다!'",
        "😮 [08C 비즈니스석] '엄청난 제트 추진력! 하준 기장님 피치 업 파워 장난 아닙니다!'",
        "✨ [승객 285명] '오오오~! (엔진 포효와 함께 기립할 듯 짜릿한 상승 각도!)'"
      ],
      STEEP_DIVE: [
        "😱 [객실 승객 일동] '으아악! 떨어진다! 무중력 체험이다! 손잡이 꽉 잡아!'",
        "💺 [객실 승무원] '승객 여러분 당황하지 마시고 안전벨트를 꼭 매주시기 바랍니다!'",
        "🎢 [19E 승객] '바이킹 타는 것처럼 배가 간질간질해요! 기장님 익스트림 기동 대박!'",
        "🌪️ [11B 승객] '급강하 중력 가속이다! 하준 기장님 부드럽게 수평 잡아주세요!'"
      ],
      HARD_BANK_LEFT: [
        "🌊 [좌측 창가 승객들] '창밖으로 바다가 90도로 꺾여 보여요! 좌측 급선회 대박이다!'",
        "🔄 [12B 승객] '몸이 오른쪽으로 쏠린다! 하준 기장님의 짜릿한 코너링!'",
        "📸 [31A 여행객] '날개 끝이 수평선을 찌를 것 같아요! 멋진 선회 비행!'"
      ],
      HARD_BANK_RIGHT: [
        "🌊 [우측 창가 승객들] '우측 날개가 바다를 향해 푹 기울었어요! 스릴 만점!'",
        "🔄 [09D 승객] '몸이 왼쪽으로 기운다! 하준 기장님 선회 실력 예술이네~'",
        "✨ [22C 승객] '마치 전투기를 탄 것 같은 날렵한 뱅크각! 멋집니다 기장님!'"
      ],
      SEA_SKIMMING: [
        "🌊 [창가 어린이] '꺅! 바다에 손 닿을 것 같아요! 물보라가 창문에 튀어요!'",
        "😲 [17D 승객] '영화 탑건 실사판이다! 바다 수면을 스치듯 날아가는 초저고도 비행!'",
        "🐬 [승객 일동] '창밖으로 돌고래도 지나가겠어요! 하준 기장님 조종술 대박!'"
      ],
      SUPER_SPEED: [
        "⚡ [05A 일등석 VIP] '제트 엔진 굉음이 엄청납니다! 음속으로 질주하는 쾌감!'",
        "💨 [22C 승객] '속도계 700km/h 돌파! 창밖 구름이 순식간에 사라져요!'",
        "🔥 [항공 매니아] '트윈 터보팬 엔진 전출력! 하준 항공 스피드 최고다!'"
      ],
      AIR_BRAKE: [
        "🛑 [11C 승객] '몸이 앞으로 확 쏠린다! 스피드 브레이크 전개 소리 들린다!'",
        "💨 [18A 승객] '감속 중력이 제대로 느껴지네요! 기장님 감속 제어 완벽합니다.'"
      ],
      HARD_BRAKING: [
        "🛑 [객실 승객들] '끼이익! 몸이 앞으로 쏠린다! 역추진 브레이크 굉음 웅장하네!'",
        "👏 [28F 승객] '엄청난 제동력! 활주로에 정확하게 멈춰 서고 있어요! 기장님 나이스!'"
      ],
      TAKEOFF_ACCEL: [
        "🛫 [승객 285명] '우와아아! 이륙 가속이다! 활주로를 총알처럼 질주 중!'",
        "🔥 [15D 승객] '몸이 시트에 파묻힌다! 제트 엔진 파워 풀가동!'"
      ],
      STALL_PANIC: [
        "⚠️ [객실 승객들] '어? 비행기가 부들부들 떨려요! 기장님 속도 올려주세요!'",
        "😨 [15B 승객] '스티크 셰이커 진동 온다! 하준 기장님 기수 숙이고 파워 업!'"
      ],
      SMOOTH_CRUISE: [
        "☕ [09B 승객] '구름 위를 미끄러지듯 날아가네요. 커피 한 잔 마시며 힐링 중~'",
        "😴 [가족 승객] '비행이 너무 부드럽고 편안해서 아이가 새근새근 잠들었어요.'",
        "🌤️ [18C 승객] '하준 기장님 비행 실력이 예술이라 흔들림이 1도 없네요. 최고!'"
      ]
    };

    const list = movementDialoguePool[motionType];
    if (!list || list.length === 0) return;

    const chosen = list[Math.floor(Math.random() * list.length)];
    this.displayPassengerDialogue(chosen);
  },

  // ----------------------------------------------------------------
  // 마이크 활성화, 기장 실시간 상시 안내 방송 (Captain PA) & 실시간 AI 승객 반응 시스템
  // ----------------------------------------------------------------
  toggleMicrophone() {
    if (this.isMicActive) {
      const paBanner = document.getElementById('pa-broadcast-banner');
      if (paBanner && paBanner.classList.contains('hidden')) {
        paBanner.classList.remove('hidden');
      } else {
        this.stopMicrophone();
      }
    } else {
      this.startMicrophone();
    }
  },

  startMicrophone(showBanner = true) {
    this.isMicActive = true;
    this.micRestartTimer = null;
    this.micLastRecognizedText = '';
    this.micVoiceTriggerCount = 0;
    this.lastVoiceDetectedTime = 0;
    this.recentAIReponses = [];

    // 브라우저 AudioContext 서스펜드 해제
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const micBtn = document.getElementById('mic-toggle-btn');
    const micText = document.getElementById('mic-status-text');
    const paBanner = document.getElementById('pa-broadcast-banner');
    const paText = document.getElementById('pa-speech-text');

    if (micBtn) {
      micBtn.classList.add('mic-active');
      micBtn.classList.add('active');
    }
    if (micText) micText.textContent = '마이크 LIVE (듣는 중)';
    if (paBanner && showBanner) paBanner.classList.remove('hidden');
    if (paText) paText.textContent = '"기장님, 지금 말씀하세요! 마이크로 말씀하시거나 아래 방송 칩을 누르면 승객들이 AI로 즉각 반응합니다."';

    this.playPAChime();
    this.showPopup('🎙️ 조종석 마이크 상시 청취 가동! 편하게 말씀하세요.');
    this.triggerPassengerReaction('pa_start');

    // 1. Web Audio API 마이크 볼륨 실시간 분석 (getUserMedia)
    this.initMicrophoneAudioStream();

    // 2. Web Speech Recognition (상시 자동 재연결 지속 청취 루프)
    this.initPersistentSpeechRecognition();
  },

  initMicrophoneAudioStream() {
    const startAudioProcessing = (stream) => {
      if (!this.isMicActive) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.micStream = stream;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.micAudioContext = new AudioContextClass();
        if (this.micAudioContext.state === 'suspended') {
          this.micAudioContext.resume().catch(() => {});
        }
        const source = this.micAudioContext.createMediaStreamSource(stream);
        this.micAnalyser = this.micAudioContext.createAnalyser();
        this.micAnalyser.fftSize = 64;
        this.micAnalyser.smoothingTimeConstant = 0.2;
        source.connect(this.micAnalyser);
        this.micDataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
        this.startVUMeterLoop();
        this.showPopup('✅ 마이크 하드웨어 정상 연결! 기장님 목소리에 즉각 반응합니다.');
      } catch (err) {
        console.warn('AudioContext analyser setup error:', err);
        this.startSimulatedVULoop();
      }
    };

    // 1. 표준 navigator.mediaDevices.getUserMedia 시도
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        startAudioProcessing(stream);
      }).catch(err => {
        console.warn('Microphone permission or hardware error:', err);
        // 권한 거부 시 사용자에게 친절한 안내 제공
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.showPopup('⚠️ 마이크 권한이 차단되어 있습니다. 주소창 설정에서 마이크를 허용하거나 아래 빠른 방송 버튼을 이용하세요!');
        } else {
          this.showPopup('🎙️ 마이크 대기 모드: 마이크로 말씀하시거나 아래 방송 칩을 눌러 승객들과 대화하세요!');
        }
        this.startSimulatedVULoop();
      });
    } else {
      // 2. 레거시 getUserMedia 시도
      const legacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (legacyGetUserMedia) {
        legacyGetUserMedia.call(navigator, { audio: true }, (stream) => {
          startAudioProcessing(stream);
        }, (err) => {
          console.warn('Legacy getUserMedia error:', err);
          this.startSimulatedVULoop();
        });
      } else {
        this.startSimulatedVULoop();
      }
    }
  },

  // 상시 지속 음성 인식 루프 (Auto-Restart Persistent Loop)
  initPersistentSpeechRecognition() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('Web Speech Recognition not supported in this browser environment.');
      return;
    }

    if (!this.isMicActive) return;

    try {
      if (this.speechRecognition) {
        try {
          this.speechRecognition.onstart = null;
          this.speechRecognition.onresult = null;
          this.speechRecognition.onerror = null;
          this.speechRecognition.onend = null;
          this.speechRecognition.abort();
        } catch (e) {}
        this.speechRecognition = null;
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const paText = document.getElementById('pa-speech-text');

      recognition.onstart = () => {
        this.micIsListening = true;
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText && paText) {
          paText.textContent = `"${currentText}"`;
          this.flashSpeakingIndicator(true);
        }

        if (finalTranscript.trim()) {
          this.handleCaptainSpeechAI(finalTranscript.trim());
        } else if (interimTranscript.trim().length >= 3) {
          this.scheduleInterimResponse(interimTranscript.trim());
        }
      };

      recognition.onerror = (e) => {
        console.warn('SpeechRecognition error:', e.error);
        if (e.error === 'not-allowed') {
          this.showPopup('⚠️ 마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요!');
          return;
        }
        // no-speech, aborted, network 등은 정상적인 재연결 루프로 자동 복구
        if (this.isMicActive) {
          this.scheduleRecognitionRestart(120);
        }
      };

      recognition.onend = () => {
        this.micIsListening = false;
        // 브라우저가 침묵으로 인해 자동으로 청취를 종료하더라도, 마이크 활성 상태면 즉시 재시작!
        if (this.isMicActive) {
          this.scheduleRecognitionRestart(80);
        }
      };

      this.speechRecognition = recognition;
      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      if (this.isMicActive) {
        this.scheduleRecognitionRestart(600);
      }
    }
  },

  scheduleRecognitionRestart(delay = 100) {
    if (!this.isMicActive) return;
    if (this.micRestartTimer) clearTimeout(this.micRestartTimer);
    this.micRestartTimer = setTimeout(() => {
      if (!this.isMicActive) return;
      this.initPersistentSpeechRecognition();
    }, delay);
  },

  scheduleInterimResponse(text) {
    if (this.interimDebounceTimer) clearTimeout(this.interimDebounceTimer);
    this.interimDebounceTimer = setTimeout(() => {
      if (this.isMicActive && text && text !== this.micLastRecognizedText) {
        this.handleCaptainSpeechAI(text);
      }
    }, 750);
  },

  flashSpeakingIndicator(active) {
    const micBtn = document.getElementById('mic-toggle-btn');
    const paBanner = document.getElementById('pa-broadcast-banner');
    if (active) {
      if (micBtn) micBtn.classList.add('mic-speaking');
      if (paBanner) paBanner.classList.add('speaking');
    } else {
      if (micBtn) micBtn.classList.remove('mic-speaking');
      if (paBanner) paBanner.classList.remove('speaking');
    }
  },

  stopMicrophone() {
    this.isMicActive = false;
    this.micIsListening = false;
    if (this.micRestartTimer) clearTimeout(this.micRestartTimer);
    if (this.interimDebounceTimer) clearTimeout(this.interimDebounceTimer);

    const micBtn = document.getElementById('mic-toggle-btn');
    const micText = document.getElementById('mic-status-text');
    const paBanner = document.getElementById('pa-broadcast-banner');

    if (micBtn) {
      micBtn.classList.remove('mic-active');
      micBtn.classList.remove('active');
      micBtn.classList.remove('mic-speaking');
    }
    if (micText) micText.textContent = '마이크 ON';
    this.flashSpeakingIndicator(false);

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micAudioContext) {
      this.micAudioContext.close().catch(() => {});
      this.micAudioContext = null;
    }
    if (this.speechRecognition) {
      try {
        this.speechRecognition.onstart = null;
        this.speechRecognition.onresult = null;
        this.speechRecognition.onerror = null;
        this.speechRecognition.onend = null;
        this.speechRecognition.abort();
      } catch (e) {}
      this.speechRecognition = null;
    }

    setTimeout(() => {
      if (!this.isMicActive && paBanner) {
        paBanner.classList.add('hidden');
      }
    }, 1200);

    this.showPopup('🎙️ 조종석 마이크 청취를 종료했습니다.');
  },

  startVUMeterLoop() {
    const vuBars = document.querySelectorAll('#pa-vu-meter .vu-bar');
    const paText = document.getElementById('pa-speech-text');

    const update = () => {
      if (!this.isMicActive) {
        this.flashSpeakingIndicator(false);
        return;
      }

      if (this.micAudioContext && this.micAudioContext.state === 'suspended') {
        this.micAudioContext.resume().catch(() => {});
      }

      if (this.micAnalyser && this.micDataArray) {
        this.micAnalyser.getByteFrequencyData(this.micDataArray);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < this.micDataArray.length; i++) {
          const val = this.micDataArray[i];
          sum += val;
          if (val > peak) peak = val;
        }
        const avg = sum / this.micDataArray.length;

        // 고감도 발화 감지 (작은 목소리나 일반 대화도 즉각 감지)
        const isSpeaking = (avg > 3.0 || peak > 16.0);
        this.flashSpeakingIndicator(isSpeaking);

        if (isSpeaking) {
          const now = Date.now();
          if (now - this.lastVoiceDetectedTime > 1500) {
            this.lastVoiceDetectedTime = now;
            this.micVoiceTriggerCount = (this.micVoiceTriggerCount || 0) + 1;
            if (paText && (!paText.textContent || paText.textContent.includes('편하게 말씀하세요') || paText.textContent.includes('감지 중'))) {
              paText.textContent = '"🎙️ 기장님 말씀 감지 중... 승객들이 경청하고 있습니다!"';
            }
            if (!this.micLastRecognizedText || (now - (this.lastAITriggerTime || 0) > 3000)) {
              this.triggerPassengerReaction('voice_active');
            }
          }
        }

        vuBars.forEach((bar, idx) => {
          const barVal = Math.min(1.0, (avg * (0.9 + idx * 0.25) + (isSpeaking ? Math.random() * 5 : 0)) / 20.0);
          const h = Math.max(3, Math.min(22, barVal * 22));
          bar.style.height = `${h}px`;
          if (barVal > 0.65) {
            bar.style.backgroundColor = '#f97316';
          } else if (barVal > 0.35) {
            bar.style.backgroundColor = '#facc15';
          } else {
            bar.style.backgroundColor = '#34d399';
          }
        });
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  startSimulatedVULoop() {
    const vuBars = document.querySelectorAll('#pa-vu-meter .vu-bar');
    const update = () => {
      if (!this.isMicActive) return;
      const t = Date.now() * 0.008;
      vuBars.forEach((bar, idx) => {
        const h = Math.max(4, Math.min(22, 10 + Math.sin(t + idx * 1.2) * 7));
        bar.style.height = `${h}px`;
        bar.style.backgroundColor = '#38bdf8';
      });
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  cycleSimulatedPA() {
    const phrases = [
      "손님 여러분, 안녕하십니까. 오늘 비행을 맡은 기장 하준입니다. 즐거운 비행 되십시오.",
      "우리 비행기는 곧 이륙하겠습니다. 좌석 벨트를 착용해 주십시오.",
      "현재 순항 고도 3,000미터로 순조롭게 비행 중입니다. 창밖으로 아름다운 바다가 보입니다.",
      "여러분 우리 비행기는 곧 착륙하겠습니다. 좌석 등받이를 세우고 안전벨트를 매 주십시오.",
      "기장입니다. 오늘 날씨가 아주 맑고 쾌청하여 비행이 무척 안정적입니다.",
      "인천공항 정지선에 도착했습니다. 탑승교가 연결되고 엔진이 꺼질 때까지 앉아 계십시오."
    ];
    const phrase = phrases[(this.captainPAIndex || 0) % phrases.length];
    this.captainPAIndex = ((this.captainPAIndex || 0) + 1);

    const paText = document.getElementById('pa-speech-text');
    if (paText) paText.textContent = `"${phrase}"`;
    this.handleCaptainSpeechAI(phrase);
  },

  // ----------------------------------------------------------------
  // 실시간 AI 승객 반응 엔진 (AI Passenger Reaction & Dialogue Engine)
  // - 기장이 마이크로 말한 문장의 의도(Intent), 키워드, 감정을 정밀 분석
  // - 객실 승객 285명이 각자의 개성 있는 캐릭터로 실시간 맞춤 화답 생성
  // ----------------------------------------------------------------
  handleCaptainSpeechAI(rawText) {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();
    this.micLastRecognizedText = text;
    this.lastAITriggerTime = Date.now();

    const paText = document.getElementById('pa-speech-text');
    if (paText) paText.textContent = `"${text}"`;

    // 문장 의도(Intent) 분석
    let intent = 'GENERAL';
    const lower = text.toLowerCase();

    if (lower.includes('이륙') || lower.includes('날아') || lower.includes('떠오') || (lower.includes('비행기') && lower.includes('출발'))) {
      intent = 'TAKEOFF_FLIGHT';
    } else if (lower.includes('착륙') || lower.includes('인천') || lower.includes('도착') || lower.includes('하강') || lower.includes('내려') || lower.includes('다왔') || lower.includes('벨트') || lower.includes('활주로')) {
      intent = 'LANDING_INCHEON';
    } else if (lower.includes('하준') || lower.includes('기장') || lower.includes('안녕') || lower.includes('반갑') || lower.includes('환영') || lower.includes('탑승') || lower.includes('출발')) {
      intent = 'GREETING_HAJUN';
    } else if (lower.includes('순항') || lower.includes('고도') || lower.includes('바다') || lower.includes('날씨') || lower.includes('구름') || lower.includes('하늘') || lower.includes('경치') || lower.includes('풍경') || lower.includes('맑')) {
      intent = 'CRUISE_WEATHER';
    } else if (lower.includes('기내식') || lower.includes('밥') || lower.includes('배고') || lower.includes('음료') || lower.includes('커피') || lower.includes('물') || lower.includes('주스') || lower.includes('간식') || lower.includes('맛있')) {
      intent = 'MEAL_SNACK';
    } else if (lower.includes('윈드시어') || lower.includes('난기류') || lower.includes('터뷸런스') || lower.includes('돌풍') || lower.includes('기류') || lower.includes('흔들') || lower.includes('비상') || lower.includes('엔진') || lower.includes('화재') || lower.includes('불') || lower.includes('버드') || lower.includes('브레이스') || lower.includes('조심') || lower.includes('죄송') || lower.includes('안전') || lower.includes('주의')) {
      intent = 'TURBULENCE_SAFETY';
    } else if (lower.includes('감사') || lower.includes('고마') || lower.includes('최고') || lower.includes('짱') || lower.includes('멋져') || lower.includes('굿') || lower.includes('잘') || lower.includes('대단') || lower.includes('박수') || lower.includes('파이팅') || lower.includes('화이팅')) {
      intent = 'PRAISE_CHEER';
    } else if (lower.includes('조상') || lower.includes('1903') || lower.includes('복엽기') || lower.includes('프로펠러') || lower.includes('나무') || lower.includes('원조')) {
      intent = 'ANCESTOR_1903';
    } else if (lower.includes('어디') || lower.includes('몇 시') || lower.includes('언제') || lower.includes('왜') || lower.includes('뭐')) {
      intent = 'QUESTION_INTERACTION';
    }

    // AI 화답 생성
    this.generateAIPassengerResponse(intent, text);
  },

  generateAIPassengerResponse(intent, spokenText) {
    const aiPassengerDialoguePool = {
      TAKEOFF_FLIGHT: [
        "🛫 [객실 승무원] '승객 여러분, 기장님 말씀대로 우리 비행기는 곧 이륙하오니 좌석 벨트를 매주시기 바랍니다.'",
        "🤩 [14A 창가 승객] '와아! 드디어 하늘로 날아오른다! 하준 기장님 부드러운 이륙 기대돼요!'",
        "👦 [24F 창가 어린이] '엄마! 곧 이륙한대! 엔진 소리 붕붕 난다! 하준 기장님 출발~!'",
        "💼 [08B 비즈니스석] '기장님의 든든한 이륙 안내 방송 덕분에 기분 좋게 여행을 시작합니다.'",
        "👏 [객실 승객 285명] '우와아~! 힘차게 날아올라라 하준 항공! 안전하고 멋진 비행 출발!'"
      ],
      GREETING_HAJUN: [
        "👨‍✈️ [승객 285명 일동] '하준 기장님 안녕하세요! 오늘 안전 비행 부탁드립니다!'",
        "👦 [24F 창가 어린이] '엄마! 하준 기장님이 말씀하신다! 목소리 진짜 멋져요!'",
        "💼 [12A 비즈니스석] '하준 기장님의 신뢰감 있는 목소리 들으니 푹 쉴 수 있겠습니다.'",
        "👩 [18C 여행객] '와! 하준 항공 비행기 타길 정말 잘했다! 기장님 파이팅!'",
        "👴 [05B 은퇴 교수] '기장님의 차분하고 듬직한 인사 방송에 깊은 감명을 받았습니다.'"
      ],
      LANDING_INCHEON: [
        "💺 [객실 승무원] '승객 여러분, 곧 착륙하오니 좌석 등받이를 세우고 안전벨트를 단단히 매주시기 바랍니다.'",
        "🏙️ [28A 창가 승객] '창밖으로 영종도 바다랑 활주로가 보여요! 하준 기장님 곧 착륙하네요!'",
        "👏 [15D 승객] '곧 착륙한다는 기장님 안내 방송 들으니 안심이 됩니다! 부드러운 터치다운 기대할게요!'",
        "🧳 [31F 여행객] '드디어 200km 대륙 횡단 끝! 하준 기장님 덕분에 안전하게 도착하네요.'",
        "👧 [09C 어린이] '우와! 비행기 바퀴가 펴졌나 봐! 땅이 점점 가까워져요!'"
      ],
      CRUISE_WEATHER: [
        "☁️ [14A 창가 승객] '창밖 날씨가 정말 예술이네요! 푸른 바다와 구름이 눈부십니다!'",
        "☕ [07D 승객] '기장님 비행이 너무 안정적이라 커피도 한 방울 안 흔들려요. 최고!'",
        "📸 [22B 승객] '순항 고도에서 바라본 한반도 풍경 사진 찍었어요! 대박입니다!'",
        "✈️ [19E 항공 매니아] '고도 유지와 트림 조종이 완벽합니다. 하준 기장님 솜씨 굿!'",
        "🌊 [11F 승객] '바다 위를 이렇게 시원하게 가로지르다니, 최고의 비행 여행입니다!'"
      ],
      MEAL_SNACK: [
        "🍱 [16B 승객] '기장님 말씀 듣고 나니 기내식 냄새 솔솔 나고 군침이 도네요!'",
        "🥤 [27C 승객] '시원한 오렌지 주스 한 잔 마시면서 방송 들으니 힐링 그 자체입니다!'",
        "😋 [08A 승객] '하준 항공 기내식 비빔밥이랑 디저트 진짜 꿀맛입니다! 서비스 짱!'",
        "👨‍👩‍👦 [가족 승객] '아이들도 간식 먹고 기장님 방송 들으면서 너무 신나 있어요!'"
      ],
      TURBULENCE_SAFETY: [
        "🛡️ [12D 승객] '기류로 기체가 요동쳤지만 기장님이 침착하게 방송해주셔서 안심이 돼요!'",
        "💪 [18A 승객] '윈드시어 난기류도 하준 기장님의 신들린 조종술이면 거뜬히 돌파할 겁니다!'",
        "🔒 [30C 승객] '기장님 지시대로 안전벨트 꽉 매고 브레이스 자세 유지 중입니다. 기장님 파이팅!'",
        "🌪️ [객실 승객 285명] '하준 기장님 힘내세요! 저희 285명은 기장님을 전적으로 믿습니다!'",
        "🙏 [가족 승객들] '기장님 든든한 안내 방송 들으니 불안한 마음이 싹 사라졌어요. 끝까지 힘내주세요!'"
      ],
      PRAISE_CHEER: [
        "🎉 [객실 승객 285명] '짝짝짝! (객실 가득 터져 나오는 환호와 열렬한 박수갈채)'",
        "🌟 [04A 일등석 VIP] '하준 기장님이야말로 대한민국 최고의 파일럿이십니다! 브라보!'",
        "🥰 [21F 승객] '기장님의 따뜻한 말씀에 승객들 모두 환하게 미소 짓고 있어요!'",
        "💯 [15E 승객] '비행 편안함 100점! 안내 방송 100점! 하준 항공 대만족입니다!'"
      ],
      ANCESTOR_1903: [
        "🪵 [역사 마니아 승객] '1903 조상 비행기를 타고 하늘을 날다니! 꿈만 같습니다!'",
        "💨 [모험가 승객] '목재 날개와 프로펠러 소리가 낭만적이네요! 하준 기장님 대단해요!'",
        "🕰️ [승객 285명] '인류 최초 비행의 감동을 그대로 느끼고 있습니다! 멋져요!'"
      ],
      QUESTION_INTERACTION: [
        "🗺️ [승객 285명] '기장님! 저희는 지금 인천국제공항을 향해 힘차게 날아가고 있습니다!'",
        "⌚ [10A 승객] '정시 도착 일정대로 완벽하게 가고 있습니다. 하준 기장님 파이팅!'",
        "💡 [23C 승객] '기장님 질문 방송에 객실 승객들이 다 같이 귀 기울이고 있어요!'"
      ],
      GENERAL: [
        `🎙️ [승객 285명] "기장님이 말씀하신 내용('...${spokenText.slice(0, 18)}...') 다들 잘 들었지?"`,
        `👨‍✈️ [객실 승무원] "하준 기장님 안내 방송 명확하게 수신했습니다. 객실 이상 무!"`,
        `✨ [14C 승객] "기장님 목소리가 기내 스피커로 엄청 선명하게 들려요! 귀 기울여 듣고 있습니다!"`,
        `👏 [20E 승객] "하준 기장님과 함께하는 비행이라 매 순간이 든든하고 즐겁습니다!"`
      ]
    };

    const pool = aiPassengerDialoguePool[intent] || aiPassengerDialoguePool.GENERAL;
    // 이전 대사와 중복 방지
    const filtered = pool.filter(msg => !this.recentAIReponses.includes(msg));
    const finalPool = filtered.length > 0 ? filtered : pool;
    const selected = finalPool[Math.floor(Math.random() * finalPool.length)];

    this.recentAIReponses.push(selected);
    if (this.recentAIReponses.length > 4) this.recentAIReponses.shift();

    this.displayPassengerDialogue(selected);
  },

  displayPassengerDialogue(dialogueText) {
    const box = document.getElementById('passenger-reaction-box');
    const bubble = document.getElementById('pax-bubble');
    if (!box || !bubble) return;

    box.classList.remove('hidden');
    // 통통 튀는 AI 반응 팝업 애니메이션 리트리거
    box.classList.remove('pax-pop');
    void box.offsetWidth; // DOM Reflow
    box.classList.add('pax-pop');

    bubble.textContent = dialogueText;

    if (this.passengerReactionTimer) clearTimeout(this.passengerReactionTimer);
    // 마이크가 켜져 있는 동안에는 대화가 길게 유지되어 상호작용 체감 향상
    const stayTime = this.isMicActive ? 14000 : 8000;
    this.passengerReactionTimer = setTimeout(() => {
      if (this.flightPhase !== 'DEPLANING' && !this.isMicActive) {
        box.classList.add('hidden');
      }
    }, stayTime);
  },

  triggerPassengerReaction(type) {
    const defaultReactions = {
      pa_start: "🎙️ [객실 285명] '어? 기장님 안내 방송 나온다! 다들 조용히 하고 들어보자!'",
      voice_active: "🗣️ [승객들] '쉿! 조종실에서 하준 기장님이 말씀하고 계셔! 집중해봐!'",
      emergency_windshear: "🌪️ [객실 285명 패닉] '꺄아악! 비행기가 아래로 곤두박질쳐요! 기장님 살려주세요! 윈드시어다!'",
      emergency_engine_fire: "🔥 [좌측 창가 승객 비명] '불이야! 1번 엔진에서 시커먼 연기와 불길이 치솟아요! 하준 기장님 도와주세요!'",
      emergency_bird_strike: "🦅 [객실 일동 충격] '쾅! 엔진에 새 떼가 빨려 들어갔어! 엔진 소리가 멈췄다! 글라이더처럼 날아가고 있어!'",
      emergency_gear_failure: "🛞 [승객 285명 긴장] '어? 바퀴가 안 나온대! 동체 비상 착륙이래요! 모두 충격 방지 자세(Brace) 취해!'",
      emergency_cleared: "🌈 [승객 285명 안도의 한숨] '휴우우~! 경보가 꺼졌다! 하준 기장님이 기체를 정상화하셨어! 살았다!'",
      emergency_landing_success: "🏆 [승객 285명 기립 박수 & 눈물] '와아아아!! 하준 기장님이 우리를 구하셨다! 살았어! 기적의 착륙 만세! 짝짝짝!'",
      turbulence: "💺 [객실 승객들] '어어어! 기체가 엄청 흔들려요! 난기류인가 봐! 안전벨트 꽉 매자!'",
      takeoff: "🛫 [승객 285명 일동] '우와아아~! 뜬다 뜬다! 하준 항공 이륙 대성공!'",
      touchdown: "🛬 [승객 285명 기립 박수] '와아아~! 짝짝짝! 기장님 착륙 실력 예술이다!'",
      docking: "🏢 [14B 승객] '탑승교가 비행기 문으로 착 붙었다! 기술 정말 신기하네~'",
      engine_shutdown: "🔴 [20C 승객] '거대한 제트 엔진 소리가 멈췄다! 기장님이 엔진 끄셨대!'",
      deplaning: "🚪 [승객 285명 전원] '차례차례 질서 있게 탑승교로 하선 중~ 하준 기장님 최고!'"
    };

    const text = defaultReactions[type] || "✨ [승객 285명] '하준 기장님 비행 최고입니다!'";
    this.displayPassengerDialogue(text);
  }

  });
})();

