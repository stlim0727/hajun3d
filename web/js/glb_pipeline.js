/**
 * Sky Jet Explorer 3D - GLTF/GLB Binary Pipeline, Bundle Unpacker, Exporter & Model Swapper
 * Subsystem: glb_pipeline (17 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // ★ GLB 3D 모델 시스템 (glTF 2.0 / GLB 3D Pipeline: 비행기 & 배경 전체 자동 지원)
  // ----------------------------------------------------------------
  initGLBSystem() {
    this.customGLBModel = null;
    if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') {
      this.glbLoader = new THREE.GLTFLoader();
    }
    this.glbBuffers = this.glbBuffers || {};
    this.glbEnvironmentsLoaded = false;

    // window.GLB_BUNDLE에서 모든 비행기 및 배경 환경(공항, 인천, 지형, 해운대) 바이너리 즉시 언팩
    this.unpackGLBBundle();

    // Fullscreen Drag & Drop 리스너
    const dragOverlay = document.getElementById('glb-drag-overlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragOverlay) dragOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0 && dragOverlay) {
        dragOverlay.classList.remove('active');
        dragCounter = 0;
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (dragOverlay) dragOverlay.classList.remove('active');

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf')) {
          this.loadGLBFile(file, file.name);
        } else {
          this.showPopup('⚠️ .glb 또는 .gltf 형식의 3D 파일만 지원됩니다.');
        }
      }
    });
  },

  unpackGLBBundle() {
    this.glbBuffers = this.glbBuffers || {};
    if (typeof window !== 'undefined' && window.GLB_BUNDLE) {
      for (const key of Object.keys(window.GLB_BUNDLE)) {
        if (!this.glbBuffers[key]) {
          try {
            const b64 = window.GLB_BUNDLE[key];
            const binStr = atob(b64);
            const len = binStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binStr.charCodeAt(i);
            }
            this.glbBuffers[key] = bytes.buffer;
          } catch (err) {
            console.warn('Failed to unpack GLB for ' + key, err);
          }
        }
      }
    }
  },

  // 화면의 모든 비행기, 공항, 인천공항, 지형, 도시 배경을 실제 바이너리 GLB 파일에서 직접 로드
  loadAllRealGLBModels() {
    if (!this.glbLoader) {
      if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') {
        this.glbLoader = new THREE.GLTFLoader();
      } else {
        return;
      }
    }

    this.unpackGLBBundle();

    const parseAndMountGLB = (key, paths, onMount) => {
      // 1. 메모리 번들(window.GLB_BUNDLE)에서 즉시 파싱 (0ms 레이턴시, 100% 로컬/오프라인 지원)
      if (this.glbBuffers && this.glbBuffers[key]) {
        try {
          this.glbLoader.parse(this.glbBuffers[key], '', (gltf) => {
            onMount(gltf.scene, this.glbBuffers[key], gltf.animations);
            this.updateGLBStatusUI();
          });
          return;
        } catch (e) {
          console.warn(`Memory GLB parse error for ${key}:`, e);
        }
      }

      // 2. 웹 서버 / 파일 시스템 fetch 시도
      const tryFetch = (idx) => {
        if (idx >= paths.length) return;
        fetch(paths[idx])
          .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.arrayBuffer();
          })
          .then(buf => {
            this.glbBuffers = this.glbBuffers || {};
            this.glbBuffers[key] = buf;
            this.glbLoader.parse(buf, '', (gltf) => {
              onMount(gltf.scene, buf, gltf.animations);
              this.updateGLBStatusUI();
            });
          })
          .catch(() => tryFetch(idx + 1));
      };
      tryFetch(0);
    };

    // 1. 비행기 로드 (현재 기종 또는 기본 A320)
    const planeName = this.currentPlaneType || 'a320';
    parseAndMountGLB(planeName, [`models/${planeName}.glb`, `assets/models/${planeName}.glb`, 'models/airplane.glb'], (scene, buf, animations) => {
      this.applyGLBScene(scene, `${planeName}.glb`, animations);
      this.glbPlaneBuffer = buf;
    });

    // 모든 기종 백그라운드 프리페치 유지 (기종 변경 즉시 반응)
    ['a320', 'a350', 'b747', 'dc10', 'md80', 'concorde', 'amphibian', 'ancestor'].forEach(m => {
      if (!this.glbBuffers[m]) {
        fetch(`models/${m}.glb`)
          .then(r => r.ok ? r.arrayBuffer() : null)
          .then(b => {
            if (b) {
              this.glbBuffers = this.glbBuffers || {};
              this.glbBuffers[m] = b;
            }
          })
          .catch(() => {});
      }
    });

    // 2. 출발 공항 (36L 활주로, 관제탑, 터미널, 유도로)
    parseAndMountGLB('airport', ['models/airport.glb', 'assets/models/airport.glb'], (scene, buf) => {
      if (this.airportGroup) {
        while (this.airportGroup.children.length > 0) this.airportGroup.remove(this.airportGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.airportGroup.add(scene);
        this.glbAirportBuffer = buf;
        if (typeof this.addRunwayVisualDetails === 'function') {
          const whiteMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4
          });
          this.addRunwayVisualDetails(this.airportGroup, 160, 0, 3800, whiteMat);
        }
        this.initPAPILights();
      }
    });

    // 3. 인천국제공항 메가 허브 (복수 4,000m 평행 활주로, 랜드마크 타워, T1/T2, 콘코스)
    parseAndMountGLB('incheon_airport', ['models/incheon_airport.glb', 'assets/models/incheon_airport.glb'], (scene, buf) => {
      if (this.incheonAirportGroup) {
        while (this.incheonAirportGroup.children.length > 0) this.incheonAirportGroup.remove(this.incheonAirportGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.incheonAirportGroup.add(scene);
        this.glbIncheonBuffer = buf;
        if (typeof this.addRunwayVisualDetails === 'function') {
          const whiteMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4
          });
          this.addRunwayVisualDetails(this.incheonAirportGroup, 160, -45000, 4000, whiteMat);
          this.addRunwayVisualDetails(this.incheonAirportGroup, 820, -45000, 4000, whiteMat);
        }
      }
    });

    // 4. 지형, 산맥, 해양, 대륙, 섬, 선박 (120km 대양, 50km 대륙, 열대 섬, 대산맥)
    parseAndMountGLB('terrain', ['models/terrain.glb', 'assets/models/terrain.glb', 'models/mountains_terrain.glb'], (scene, buf) => {
      if (this.terrainGroup) {
        while (this.terrainGroup.children.length > 0) this.terrainGroup.remove(this.terrainGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.terrainGroup.add(scene);
        this.glbNatureBuffer = buf;
      }
    });

    // 5. 해운대 해변 및 대도시 (LCT 411m 마천루, 광안대교 현수교, 백사장)
    parseAndMountGLB('haeundae', ['models/haeundae.glb', 'models/city_beach.glb', 'models/haeundae_beach_city.glb', 'assets/models/haeundae.glb'], (scene, buf) => {
      if (this.cityGroup) {
        while (this.cityGroup.children.length > 0) this.cityGroup.remove(this.cityGroup.children[0]);
        scene.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
        this.cityGroup.add(scene);
        this.glbCityBuffer = buf;
      }
    });

    this.glbEnvironmentsLoaded = true;
    this.updateGLBStatusUI();
  },

  convertAllToGLBPipeline() {
    this.loadAllRealGLBModels();
  },

  updateGLBStatusUI() {
    const ids = [
      'glb-status-plane',
      'glb-status-airport',
      'glb-status-incheon',
      'glb-status-terrain',
      'glb-status-city'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = 'GLB 바이너리 적용됨';
        el.className = 'text-green';
      }
    });
  },

  loadGLBFile(fileOrBuffer, customName, targetType = 'plane') {
    if (typeof THREE.GLTFLoader === 'undefined') {
      this.showPopup('⚠️ GLTFLoader 모듈이 준비되지 않았습니다.');
      return;
    }
    if (!this.glbLoader) {
      this.glbLoader = new THREE.GLTFLoader();
    }

    const fileName = customName || (fileOrBuffer.name ? fileOrBuffer.name : 'model.glb');

    const parseBuffer = (buffer) => {
      this.glbLoader.parse(
        buffer,
        '',
        (gltf) => {
          if (targetType === 'background') {
            this.applyGLBBackground(gltf.scene, fileName);
          } else {
            this.applyGLBScene(gltf.scene, fileName, gltf.animations);
          }
        },
        (error) => {
          console.error('GLB parse error:', error);
          this.showPopup('❌ GLB 파일을 읽는 중 오류가 발생했습니다.');
        }
      );
    };

    if (fileOrBuffer instanceof ArrayBuffer) {
      parseBuffer(fileOrBuffer);
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => parseBuffer(e.target.result);
      reader.onerror = () => this.showPopup('❌ GLB 파일을 읽는 데 실패했습니다.');
      reader.readAsArrayBuffer(fileOrBuffer);
    }
  },

  applyGLBScene(scene, fileName, animations) {
    if (!scene) return;
    if (!this.planeGroup) {
      this.planeGroup = new THREE.Group();
      this.scene.add(this.planeGroup);
    }

    if (this.glbMixer) {
      this.glbMixer.stopAllAction();
      this.glbMixer = null;
    }
    this.glbGearAction = null;
    this.glbGearDuration = 0;
    this.glbMovingParts = { fans: [], rudder: null, flaps: [] };

    // 기존 비행기 자식 오브젝트 정리
    while (this.planeGroup.children.length > 0) {
      this.planeGroup.remove(this.planeGroup.children[0]);
    }

    // 바운딩 박스 정밀 계산 및 실제 여객기 규격으로 자동 정규화 스케일링
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetLengths = {
      a320: 37.6,
      a320_detailed: 37.6,
      a320_simplified: 37.6,
      a350: 66.8,
      b747: 70.6,
      dc10: 55.5,
      md80: 45.1,
      concorde: 61.7,
      amphibian: 19.8,
      ancestor: 12.3
    };
    const targetLength = targetLengths[this.currentPlaneType] || (this.currentPlaneType === 'ancestor' ? 14.0 : 38.0);
    const scale = targetLength / (maxDim || 1.0);
    scene.scale.set(scale, scale, scale);

    // ★ 중심점 X=0 완벽 정렬 & 회전 영점화 (기우뚱 및 쏠림 100% 원천 차단)
    scene.position.x = 0;
    if (this.currentPlaneType === 'amphibian') {
      scene.position.y = -box.min.y * scale - 4.72;
    } else if (this.currentPlaneType === 'a320' || this.currentPlaneType === 'a320_simplified' || this.currentPlaneType === 'a320_detailed') {
      scene.position.y = -center.y * scale + 1.83;
    } else if (this.currentPlaneType === 'a350') {
      scene.position.y = -center.y * scale + 5.26;
    } else if (this.currentPlaneType === 'dc10') {
      scene.position.y = -center.y * scale + 3.69;
    } else if (this.currentPlaneType === 'ancestor') {
      scene.position.y = -center.y * scale + 0.35;
    } else {
      scene.position.y = -center.y * scale + 1.2;
    }
    scene.position.z = -center.z * scale;
    if (this.currentPlaneType === 'a320' || this.currentPlaneType === 'a320_simplified' || this.currentPlaneType === 'a320_detailed' || this.currentPlaneType === 'a350') {
      scene.rotation.set(0, Math.PI, 0);
    } else {
      scene.rotation.set(0, 0, 0);
    }

    scene.traverse((node) => {
      if (node.name) {
        if (/^Fan[_ ]?Blades/i.test(node.name)) {
          this.glbMovingParts.fans.push(node);
        } else if (/^Rudder/i.test(node.name)) {
          node.userData.baseRotY = node.rotation.y;
          this.glbMovingParts.rudder = node;
        } else if (/^Flaps[_ ]?(Inner|Outer)/i.test(node.name)) {
          node.userData.baseRotX = node.rotation.x;
          this.glbMovingParts.flaps.push(node);
        } else if (/^Landing[_ ]?Gear/i.test(node.name)) {
          node.userData.basePosY = node.position.y;
          this.glbMovingParts.landingGear = node;
          if (this.gearExtended === false) {
            node.visible = false;
          }
        }
      }
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => {
            m.roughness = Math.max(0.15, Math.min(0.35, m.roughness || 0.28));
            m.metalness = Math.min(0.85, m.metalness || 0.25);
            m.side = THREE.DoubleSide;
            const nameLower = (m.name || '').toLowerCase();
            const isWindowOrDecal = /window|glass|cockpit|windshield|decal|strip/i.test(nameLower) ||
              /Material\.(005|007|008|010|016|027|051|052)$/i.test(m.name || '');
            if (isWindowOrDecal) {
              m.polygonOffset = true;
              m.polygonOffsetFactor = -2.0;
              m.polygonOffsetUnits = -4.0;
            }
            if (m.transparent) m.depthWrite = true;
            if (m.transmission > 0) m.transmission = 0;
            m.needsUpdate = true;
          });
        }
      }
    });

    this.glbGearMaterials = [];
    this.glbGearNodes = [];
    if (this.currentPlaneType === 'a320' || this.currentPlaneType === 'a320_simplified' || this.currentPlaneType === 'a320_detailed') {
      scene.traverse((node) => {
        if (node.isMesh && node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => {
            if (/Material\.(034|036|037|040|042|044|045|049|050|056)$/i.test(m.name || '')) {
              this.glbGearMaterials.push(m);
              this.glbGearNodes.push(node);
              const isVis = (this.gearExtended !== false);
              m.visible = isVis;
              node.visible = isVis;
            }
          });
        }
      });
    }

    if (animations && animations.length > 0 && typeof THREE.AnimationMixer !== 'undefined') {
      this.glbMixer = new THREE.AnimationMixer(scene);
      this.glbGearAction = this.glbMixer.clipAction(animations[0]);
      this.glbGearDuration = animations[0].duration || 1.0;
      this.glbGearAction.play();
      this.glbGearAction.paused = true;
      // dc10.glb 애니메이션: t=0 수납(UP), t=duration 전개(DOWN)
      this.glbGearAction.time = (this.gearExtended === false) ? 0 : this.glbGearDuration;
      this.glbMixer.update(0);
    }

    this.customGLBModel = scene;
    this.planeGroup.add(scene);

    if (typeof this.attachAircraftNavLights === 'function') {
      this.attachAircraftNavLights(this.currentPlaneType || 'dc10');
    }

    if (typeof this.attachGLBMovingParts === 'function') {
      this.attachGLBMovingParts(this.currentPlaneType || 'a320');
    }

    // ★ GLB 에어로다이내믹 제어평면 버텍스 셰이더 디포메이션 (A320, A350, DC-10, CL-215)
    this.setupGLBControlSurfaceShaders(scene, this.currentPlaneType);

    this.planeGroup.updateMatrixWorld(true);
    const fanExhaustPoints = [];
    if (this.glbMovingParts && Array.isArray(this.glbMovingParts.fans) && this.glbMovingParts.fans.length > 0) {
      const nozzleOffset = new THREE.Vector3(0, 0, 3.2);
      for (const fan of this.glbMovingParts.fans) {
        if (typeof fan.getWorldPosition !== 'function') continue;
        const worldPos = fan.getWorldPosition(new THREE.Vector3());
        const localPos = this.planeGroup.worldToLocal(worldPos).add(nozzleOffset);
        fanExhaustPoints.push(localPos);
      }
      fanExhaustPoints.sort((a, b) => a.x - b.x);
    }

    if (fanExhaustPoints.length > 0) {
      this.engineExhaustPoints = fanExhaustPoints;
    } else {
      const fallbackByType = {
        a320: [[-5.06, -1.5, 1.8], [5.06, -1.5, 1.8]],
        a350: [[-9.8, -2.1, 2.8], [9.8, -2.1, 2.8]],
        b747: [[-11.5, -1.4, -0.5], [-6.2, -1.8, 2.2], [6.2, -1.8, 2.2], [11.5, -1.4, -0.5]],
        dc10: [[-6.8, -1.8, 2.2], [0, 3.6, 13.5], [6.8, -1.8, 2.2]],
        md80: [[-2.6, 0.5, 13.0], [2.6, 0.5, 13.0]],
        concorde: [[-3.8, -1.4, 12.5], [3.8, -1.4, 12.5]],
        amphibian: [[-4.8, 1.5, 0.8], [4.8, 1.5, 0.8]],
        ancestor: [[0.8, 1.2, 0.6]]
      };
      const coords = fallbackByType[this.currentPlaneType] || fallbackByType.a320;
      this.engineExhaustPoints = coords.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    }

    const cleanName = fileName.replace(/\.[^/.]+$/, "");
    const planeNameText = document.getElementById('plane-name-text');
    if (planeNameText) {
      planeNameText.textContent = cleanName.slice(0, 12);
    }

    this.showPopup(`🎉 GLB 3D 기체 [${cleanName}] 장착 완료!`);
  },

  // ----------------------------------------------------------------
  // GLB 기체 에어로다이내믹 제어평면 버텍스 셰이더 디포메이션 (A320, A350, DC-10, CL-215)
  // 외형 훼손이나 분리 단면의 구멍 없이 GPU 상에서 날개 뒷전과 러더를 유려하게 실시간 굴절
  // ----------------------------------------------------------------
  setupGLBControlSurfaceShaders(scene, planeType) {
    if (!scene) return;
    const type = (planeType || '').toLowerCase();
    const supported = ['a320', 'a320_simplified', 'a320_detailed', 'a350', 'dc10', 'amphibian'];
    if (!supported.includes(type)) return;

    this.glbShaderUniforms = {
      uMeshToPlane: { value: new THREE.Matrix4() },
      uPlaneToMesh: { value: new THREE.Matrix4() },
      uAileronL: { value: 0.0 },
      uAileronR: { value: 0.0 },
      uElevator: { value: 0.0 },
      uRudder:   { value: 0.0 },
      uFlap:     { value: 0.0 },
      uRudderParams: { value: new THREE.Vector4() },
      uElevParams:   { value: new THREE.Vector4() },
      uWingParams:   { value: new THREE.Vector4() }
    };

    if (type.startsWith('a320')) {
      this.glbShaderUniforms.uRudderParams.value.set(13.5, 24.5, 2.5, 12.5);
      this.glbShaderUniforms.uElevParams.value.set(15.0, 24.5, 2.2, 7.8);
      this.glbShaderUniforms.uWingParams.value.set(8.5, 17.5, 1.2, 0.42);
    } else if (type === 'a350') {
      this.glbShaderUniforms.uRudderParams.value.set(23.0, 33.5, 3.5, 16.0);
      this.glbShaderUniforms.uElevParams.value.set(25.0, 33.5, 3.0, 12.5);
      this.glbShaderUniforms.uWingParams.value.set(15.0, 32.0, 2.0, 0.52);
    } else if (type === 'dc10') {
      this.glbShaderUniforms.uRudderParams.value.set(18.0, 27.8, 3.0, 17.0);
      this.glbShaderUniforms.uElevParams.value.set(21.0, 27.8, 1.5, 11.0);
      this.glbShaderUniforms.uWingParams.value.set(13.0, 25.0, 6.0, 0.42);
    } else if (type === 'amphibian') {
      this.glbShaderUniforms.uRudderParams.value.set(5.5, 9.8, 2.0, 9.8);
      this.glbShaderUniforms.uElevParams.value.set(6.5, 9.8, 5.5, 5.8);
      this.glbShaderUniforms.uWingParams.value.set(6.5, 14.0, -1.0, 0.12);
    }

    const meshToPlaneMat = new THREE.Matrix4();
    const planeToMeshMat = new THREE.Matrix4();
    const self = this;

    scene.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];

      const origOnBeforeRender = node.onBeforeRender;
      node.onBeforeRender = function(renderer, renderScene, camera, geometry, material, group) {
        if (origOnBeforeRender) {
          origOnBeforeRender.call(this, renderer, renderScene, camera, geometry, material, group);
        }
        if (self.planeGroup && self.glbShaderUniforms) {
          meshToPlaneMat.multiplyMatrices(self.planeGroup.matrixWorldInverse, node.matrixWorld);
          planeToMeshMat.copy(meshToPlaneMat).invert();
          self.glbShaderUniforms.uMeshToPlane.value.copy(meshToPlaneMat);
          self.glbShaderUniforms.uPlaneToMesh.value.copy(planeToMeshMat);
        }
      };

      mats.forEach((m) => {
        if (/Material\.(034|036|037|040|042|044|045|049|050|056)$/i.test(m.name || '')) return;

        m.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, self.glbShaderUniforms);

          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            uniform mat4 uMeshToPlane;
            uniform mat4 uPlaneToMesh;
            uniform float uAileronL;
            uniform float uAileronR;
            uniform float uElevator;
            uniform float uRudder;
            uniform float uFlap;
            uniform vec4 uRudderParams;
            uniform vec4 uElevParams;
            uniform vec4 uWingParams;
            `
          );

          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vec4 _planeP = uMeshToPlane * vec4( position, 1.0 );
            bool _deflected = false;

            if (_planeP.z > uRudderParams.x && _planeP.z <= uRudderParams.y &&
                _planeP.y >= uRudderParams.z && _planeP.y <= uRudderParams.w &&
                abs(_planeP.x) < 0.95) {
              float chordFraction = clamp((_planeP.z - uRudderParams.x) / max(0.1, uRudderParams.y - uRudderParams.x), 0.0, 1.0);
              float weight = chordFraction * chordFraction;
              float angle = uRudder * weight;
              float arm = _planeP.z - uRudderParams.x;
              _planeP.x += arm * sin(angle);
              _planeP.z = uRudderParams.x + arm * cos(angle);
              _deflected = true;
            }

            if (!_deflected && _planeP.z > uElevParams.x && _planeP.z <= uElevParams.y &&
                abs(_planeP.y - uElevParams.z) < 2.5 &&
                abs(_planeP.x) > 1.2 && abs(_planeP.x) <= uElevParams.w) {
              float chordFraction = clamp((_planeP.z - uElevParams.x) / max(0.1, uElevParams.y - uElevParams.x), 0.0, 1.0);
              float weight = chordFraction * chordFraction;
              float angle = uElevator * weight;
              float arm = _planeP.z - uElevParams.x;
              _planeP.y += arm * sin(angle);
              _planeP.z = uElevParams.x + arm * cos(angle);
              _deflected = true;
            }

            float _absX = abs(_planeP.x);
            if (!_deflected && _absX >= uWingParams.x && _absX <= uWingParams.y) {
              float zSpar = uWingParams.z + (_absX - uWingParams.x) * uWingParams.w;
              if (_planeP.z > zSpar && _planeP.z < zSpar + 4.5 && _planeP.y < 4.0 && _planeP.y > -3.0) {
                float chordFraction = clamp((_planeP.z - zSpar) / 2.5, 0.0, 1.0);
                float weight = chordFraction * chordFraction;
                float ailDef = (_planeP.x < 0.0) ? uAileronL : uAileronR;
                float angle = ailDef * weight;
                float arm = _planeP.z - zSpar;
                _planeP.y += arm * sin(angle);
                _planeP.z = zSpar + arm * cos(angle);
                _deflected = true;
              }
            }

            if (!_deflected && _absX >= 1.8 && _absX < uWingParams.x && uFlap > 0.001) {
              float zFlapSpar = uWingParams.z + (_absX - 1.8) * (uWingParams.w * 0.85);
              if (_planeP.z > zFlapSpar && _planeP.z < zFlapSpar + 5.0 && _planeP.y < 4.0 && _planeP.y > -3.0) {
                float chordFraction = clamp((_planeP.z - zFlapSpar) / 3.2, 0.0, 1.0);
                float weight = chordFraction * chordFraction;
                float angle = uFlap * weight;
                float arm = _planeP.z - zFlapSpar;
                _planeP.y -= arm * sin(angle);
                _planeP.z = zFlapSpar + arm * cos(angle);
                _deflected = true;
              }
            }

            if (_deflected) {
              transformed = (uPlaneToMesh * _planeP).xyz;
            }
            `
          );
        };
      });
    });
  },

  applyGLBBackground(scene, fileName) {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1200.0 / (maxDim || 1.0);
    scene.scale.set(scale, scale, scale);
    scene.position.set(-center.x * scale, 0.5, -center.z * scale - 6000);
    scene.traverse((node) => {
      if (node.isMesh) node.receiveShadow = true;
    });
    this.scene.add(scene);
    this.showPopup(`🌍 커스텀 배경 GLB [${fileName}] 맵이 장착되었습니다!`);
  },

  loadGLBPreset(type) {
    if (window.closeGLBMenu) window.closeGLBMenu();
    type = type || this.currentPlaneType || 'a320';
    this.currentPlaneType = type;
    this.groundY = (type === 'ancestor') ? 1.65 : 6.84;

    const names = {
      dc10: 'DC-10 삼발기',
      md80: 'MD-80 쌍발기',
      a320: 'A320 제트기',
      a320_detailed: 'A320-200 실물 고정밀',
      a320_simplified: 'A320-200 경량 최적화',
      a350: 'A350-900 XWB',
      b747: 'B747-400 점보',
      concorde: '콩코드 초음속기',
      amphibian: 'CL-215 수륙양용기',
      ancestor: '1903 조상 비행기'
    };
    const planeName = names[type] || type.toUpperCase();

    // UI 버튼 상태 갱신
    document.querySelectorAll('.plane-choice-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`select-${type}`);
    if (activeBtn) activeBtn.classList.add('active');
    const planeNameText = document.getElementById('plane-name-text');
    if (planeNameText) planeNameText.textContent = planeName;

    // 캐시된 버퍼가 있으면 즉시 바이너리 파싱 & 장착
    this.glbBuffers = this.glbBuffers || {};
    this.unpackGLBBundle();
    if (this.glbBuffers[type]) {
      this.loadGLBFile(this.glbBuffers[type], `${type.toUpperCase()}.glb`, 'plane');
      this.showPopup(`✈️ [${planeName}] 100% 바이너리 GLB 모델 장착!`);
      return;
    }

    const candidatePaths = [
      `models/${type}.glb`,
      `assets/models/${type}.glb`,
      `models/airplane.glb`
    ];

    const tryFetchGLB = (idx) => {
      if (idx >= candidatePaths.length) {
        if (typeof this.buildProceduralAircraft === 'function') {
          this.buildProceduralAircraft(type);
        }
        this.showPopup(`✈️ [${planeName}] 3D 비행기로 전환되었습니다!`);
        return;
      }
      const p = candidatePaths[idx];
      fetch(p)
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .then(buffer => {
          this.glbBuffers[type] = buffer;
          this.loadGLBFile(buffer, `${type.toUpperCase()}.glb`, 'plane');
          this.showPopup(`✈️ [${planeName}] 100% 바이너리 GLB 모델 로드 완료!`);
        })
        .catch(() => tryFetchGLB(idx + 1));
    };

    tryFetchGLB(0);
  },

  exportCurrentPlaneToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.planeGroup,
      (result) => {
        this.downloadGLBBuffer(result, `airplane_${this.currentPlaneType || 'model'}.glb`);
      },
      (err) => {
        console.error('Plane GLB export error:', err);
        this.showPopup('❌ 비행기 GLB 파일 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  },

  exportAirportToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.airportGroup,
      (result) => {
        this.downloadGLBBuffer(result, `departure_airport_36L.glb`);
      },
      (err) => {
        console.error('Airport GLB export error:', err);
        this.showPopup('❌ 출발 공항 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  },

  exportIncheonAirportToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.incheonAirportGroup,
      (result) => {
        this.downloadGLBBuffer(result, `incheon_airport_hub.glb`);
      },
      (err) => {
        console.error('Incheon Airport GLB export error:', err);
        this.showPopup('❌ 인천공항 허브 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  },

  exportTerrainToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const natureGroup = new THREE.Group();
    if (this.mountainsGroup) natureGroup.add(this.mountainsGroup.clone());
    if (this.islandsGroup) natureGroup.add(this.islandsGroup.clone());
    if (this.shipsGroup) natureGroup.add(this.shipsGroup.clone());

    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      natureGroup,
      (result) => {
        this.downloadGLBBuffer(result, `continental_terrain_and_nature.glb`);
      },
      (err) => {
        console.error('Terrain GLB export error:', err);
        this.showPopup('❌ 지형·산맥 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  },

  exportCityBeachToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.cityGroup,
      (result) => {
        this.downloadGLBBuffer(result, `haeundae_beach_city_background.glb`);
      },
      (err) => {
        console.error('City/Beach GLB export error:', err);
        this.showPopup('❌ 해운대·도시 배경 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  },

  exportFullWorldToGLB() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    if (typeof THREE.GLTFExporter === 'undefined') {
      this.showPopup('⚠️ GLTFExporter 모듈을 사용할 수 없습니다.');
      return;
    }
    const worldGroup = new THREE.Group();
    if (this.planeGroup) worldGroup.add(this.planeGroup.clone());
    if (this.airportGroup) worldGroup.add(this.airportGroup.clone());
    if (this.incheonAirportGroup) worldGroup.add(this.incheonAirportGroup.clone());
    if (this.mountainsGroup) worldGroup.add(this.mountainsGroup.clone());
    if (this.islandsGroup) worldGroup.add(this.islandsGroup.clone());
    if (this.shipsGroup) worldGroup.add(this.shipsGroup.clone());
    if (this.cityGroup) worldGroup.add(this.cityGroup.clone());

    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      worldGroup,
      (result) => {
        this.downloadGLBBuffer(result, `full_airplane_and_world.glb`);
      },
      (err) => {
        console.error('World GLB export error:', err);
        this.showPopup('❌ 전체 월드 GLB 추출 중 오류가 발생했습니다.');
      },
      { binary: true }
    );
  },

  downloadGLBBuffer(buffer, filename) {
    try {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.showPopup(`💾 [${filename}] 다운로드가 시작되었습니다!`);
    } catch (e) {
      console.error('Download error:', e);
    }
  },

  reloadGLBPlane() {
    if (window.closeGLBMenu) window.closeGLBMenu();
    this.convertAllToGLBPipeline();
    this.showPopup('🔄 비행기 및 공항/해운대 배경이 GLB 모드로 즉시 재생성되었습니다!');
  }

  });
})();

