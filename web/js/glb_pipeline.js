/**
 * Sky Jet Explorer 3D - GLTF/GLB Binary Pipeline, Bundle Unpacker, Exporter & Model Swapper
 * Subsystem: glb_pipeline (17 methods)
 */

(function() {
  'use strict';

  // Ensure AirplaneGame namespace exists for standalone viewer compatibility
  if (typeof window !== 'undefined') {
    window.AirplaneGame = window.AirplaneGame || function() {};
    window.AirplaneGame.prototype = window.AirplaneGame.prototype || {};
  }

  // ================================================================
  // ★ GLBMovingPartsController: 비행 시뮬레이터와 3D 모델 갤러리 공유 통합 컨트롤러
  // GPU 버텍스 셰이더 디포메이션(제어평면) + 착륙장치 수납/전개 + 터보팬/프로펠러 회전
  // 중복 코드 없이 게임 비행 모드와 갤러리 연속 가동(데모 루프) 모드를 단일 클래스로 제공
  // ================================================================
  class GLBMovingPartsController {
    constructor(options = {}) {
      this.scene = options.scene;
      this.planeType = (options.planeType || 'a320').toLowerCase();
      this.planeGroup = options.planeGroup || options.scene;
      this.demoLoop = !!options.demoLoop;
      this.animations = options.animations || [];
      this.demoTime = 0;
      this.enabled = true;

      // Moving parts collections
      this.parts = { fans: [], rudder: null, flaps: [], landingGear: null };
      this.fans = [];
      this.landingGears = [];
      this.gearNodes = [];
      this.gearMaterials = [];
      this.mixer = null;
      this.gearAction = null;
      this.gearDuration = 1.0;
      this.gearState = 'DOWN'; // 'DOWN' | 'UP' | 'TRANSIT'
      this.gearProgress = 1.0; // 0 = UP, 1 = DOWN

      // Shader uniforms & state
      this.shaderUniforms = null;
      this.hasMovingParts = false;

      this.init();
    }

    static get AIRCRAFT_DEFS() {
      return {
        a320: {
          rudderParams: [16.2, 25.0, 2.0, 1.35],
          elevParams:   [15.2, 25.0, 1.2, 2.10],
          wingParams:   [8.5, 17.5, 1.2, 0.42],
          hasBuiltInGear: true,
          gearMaterialRegex: /Material\.(034|036|037|040|042|044|045|049|050|056)$/i,
          fans: [{ radius: 0.80, blades: 24, leftX: -5.30, rightX: 5.30, y: -2.20, z: -0.25 }]
        },
        a320_simplified: {
          rudderParams: [16.2, 25.0, 2.0, 1.35],
          elevParams:   [15.2, 25.0, 1.2, 2.10],
          wingParams:   [8.5, 17.5, 1.2, 0.42],
          hasBuiltInGear: true,
          gearMaterialRegex: /Material\.(034|036|037|040|042|044|045|049|050|056)$/i,
          fans: [{ radius: 0.80, blades: 24, leftX: -5.30, rightX: 5.30, y: -2.20, z: -0.25 }]
        },
        a320_detailed: {
          rudderParams: [16.2, 25.0, 2.0, 1.35],
          elevParams:   [15.2, 25.0, 1.2, 2.10],
          wingParams:   [8.5, 17.5, 1.2, 0.42],
          hasBuiltInGear: true,
          gearMaterialRegex: /Material\.(034|036|037|040|042|044|045|049|050|056)$/i,
          fans: [{ radius: 0.80, blades: 24, leftX: -5.30, rightX: 5.30, y: -2.20, z: -0.25 }]
        },
        a350: {
          rudderParams: [22.0, 33.5, 5.0, 1.29],
          elevParams:   [26.5, 33.5, 1.8, 0.65],
          wingParams:   [16.0, 32.0, 3.5, 0.55],
          hasBuiltInGear: false,
          fans: [{ radius: 1.35, blades: 24, leftX: -9.49, rightX: 9.49, y: 0.48, z: -1.0 }],
          gearDefs: {
            nose: { x: 0, y: -1.17, z: -22.0, isNose: true, is4Wheel: false },
            mainL: { x: -5.4, y: -0.66, z: 2.1, isNose: false, is4Wheel: true },
            mainR: { x: 5.4, y: -0.66, z: 2.1, isNose: false, is4Wheel: true }
          }
        },
        dc10: {
          rudderParams: [22.5, 27.8, 5.0, 0.45],
          elevParams:   [23.0, 27.8, 2.0, 0.85],
          wingParams:   [13.0, 25.0, 6.0, 0.42],
          hasBuiltInGear: true,
          hasRiggedAnimation: true
        },
        amphibian: {
          rudderParams: [5.3, 6.6, -4.5, 0.10],
          elevParams:   [5.8, 6.6, 2.0, 0.15],
          wingParams:   [6.5, 14.0, -1.0, 0.12],
          hasBuiltInGear: true
        }
      };
    }

    static get TARGET_LENGTHS() {
      return {
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
    }

    static normalizeAircraftScene(scene, planeType, options = {}) {
      if (!scene || typeof THREE === 'undefined') return { scale: 1, size: new THREE.Vector3() };
      const type = (planeType || 'a320').toLowerCase();
      const targetLengths = GLBMovingPartsController.TARGET_LENGTHS;
      const targetLength = targetLengths[type] || (type === 'ancestor' ? 14.0 : 38.0);

      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = targetLength / (maxDim || 1.0);
      scene.scale.set(scale, scale, scale);

      scene.position.x = 0;
      if (type === 'amphibian') {
        scene.position.y = -box.min.y * scale - 4.72;
      } else if (type.startsWith('a320')) {
        scene.position.y = -center.y * scale + 1.83;
      } else if (type === 'a350') {
        scene.position.y = -center.y * scale + 5.26;
      } else if (type === 'dc10') {
        scene.position.y = -center.y * scale + 3.69;
      } else if (type === 'ancestor') {
        scene.position.y = -center.y * scale + 0.35;
      } else {
        scene.position.y = -center.y * scale + 1.2;
      }
      scene.position.z = -center.z * scale;

      if (type.startsWith('a320') || type === 'a350') {
        scene.rotation.set(0, Math.PI, 0);
      } else {
        scene.rotation.set(0, 0, 0);
      }

      scene.updateMatrixWorld(true);
      const finalBox = new THREE.Box3().setFromObject(scene);
      const finalSize = finalBox.getSize(new THREE.Vector3());
      return { scale, size: finalSize, box: finalBox };
    }

    static createTurbofanFan(radius, bladeCount = 20, chromeMat) {
      if (typeof THREE === 'undefined') return null;
      const fanGroup = new THREE.Group();
      const spinnerMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.75
      });
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.26, radius * 0.58, 18), spinnerMat);
      spinner.rotation.x = -Math.PI / 2;
      fanGroup.add(spinner);

      const spiral = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.04, radius * 0.08, radius * 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.9 })
      );
      spiral.rotation.x = -Math.PI / 2;
      spiral.position.z = radius * 0.18;
      fanGroup.add(spiral);

      const bladeMat = chromeMat || new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.92, roughness: 0.18 });
      const bladeGeo = new THREE.BoxGeometry(radius * 0.11, radius * 0.74, radius * 0.035);
      bladeGeo.translate(0, radius * 0.52, 0);

      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.z = angle;
        blade.rotation.y = 0.48;
        fanGroup.add(blade);
      }
      return fanGroup;
    }

    static createGLBLandingGear(x, y, z, isNose, is4WheelBogie, chromeMat, tireMat) {
      if (typeof THREE === 'undefined') return null;
      const gearAssembly = new THREE.Group();
      gearAssembly.position.set(x, y, z);

      const doorLGroup = new THREE.Group();
      const doorRGroup = new THREE.Group();
      gearAssembly.add(doorLGroup);
      gearAssembly.add(doorRGroup);

      const strutPivot = new THREE.Group();
      strutPivot.position.set(0, 0, 0);

      const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 12), chromeMat);
      mainStrut.position.set(0, -1.3, 0);
      mainStrut.castShadow = true;
      strutPivot.add(mainStrut);

      let bogieBeamGroup = null;

      if (is4WheelBogie) {
        bogieBeamGroup = new THREE.Group();
        bogieBeamGroup.position.set(0, -2.6, 0);

        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 2.2), chromeMat);
        beam.castShadow = true;
        bogieBeamGroup.add(beam);

        [-0.85, 0.85].forEach(axleZ => {
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.0, 10), chromeMat);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, 0, axleZ);
          bogieBeamGroup.add(axle);

          [-0.85, 0.85].forEach(wheelX => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wheelX, 0, axleZ);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.48, 16), tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.50, 12), chromeMat);
            hub.rotation.z = Math.PI / 2;
            wheelGroup.add(hub);

            bogieBeamGroup.add(wheelGroup);
          });
        });

        strutPivot.add(bogieBeamGroup);
      } else {
        const axleGroup = new THREE.Group();
        axleGroup.position.set(0, -2.6, 0);

        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, isNose ? 1.4 : 1.8, 10), chromeMat);
        axle.rotation.z = Math.PI / 2;
        axleGroup.add(axle);

        const wheelOffset = isNose ? 0.55 : 0.75;
        [-wheelOffset, wheelOffset].forEach(wheelX => {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(isNose ? 0.65 : 0.78, isNose ? 0.65 : 0.78, isNose ? 0.40 : 0.48, 16),
            tireMat
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wheelX, 0, 0);
          wheel.castShadow = true;
          axleGroup.add(wheel);

          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(isNose ? 0.35 : 0.42, isNose ? 0.35 : 0.42, isNose ? 0.42 : 0.50, 12),
            chromeMat
          );
          hub.rotation.z = Math.PI / 2;
          hub.position.set(wheelX, 0, 0);
          axleGroup.add(hub);
        });

        strutPivot.add(axleGroup);
      }

      gearAssembly.add(strutPivot);

      gearAssembly.userData = {
        gearId: isNose ? 'nose' : (x < 0 ? 'mainLeft' : 'mainRight'),
        strutPivot,
        doorL: doorLGroup,
        doorR: doorRGroup,
        bogieBeam: bogieBeamGroup,
        isNose,
        is4WheelBogie,
        origPos: new THREE.Vector3(x, y, z)
      };

      return gearAssembly;
    }

    init() {
      if (!this.scene) return;
      const def = GLBMovingPartsController.AIRCRAFT_DEFS[this.planeType];
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.15 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.1 });

      // 1. 노드 기반 가동 파츠 탐색
      this.scene.traverse((node) => {
        if (node.name) {
          if (/^Fan[_ ]?Blades/i.test(node.name)) {
            this.parts.fans.push(node);
            this.hasMovingParts = true;
          } else if (/^Rudder/i.test(node.name)) {
            node.userData.baseRotY = node.rotation.y;
            this.parts.rudder = node;
            this.hasMovingParts = true;
          } else if (/^Flaps[_ ]?(Inner|Outer)/i.test(node.name)) {
            node.userData.baseRotX = node.rotation.x;
            this.parts.flaps.push(node);
            this.hasMovingParts = true;
          } else if (/^Landing[_ ]?Gear/i.test(node.name)) {
            node.userData.basePosY = node.position.y;
            this.parts.landingGear = node;
            this.hasMovingParts = true;
          }
        }
      });

      // 2. 내장 랜딩기어 서브메시 및 머티리얼 탐지 (A320 등)
      if (def && def.gearMaterialRegex) {
        this.scene.traverse((node) => {
          if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              if (def.gearMaterialRegex.test(m.name || '')) {
                this.gearMaterials.push(m);
                this.gearNodes.push(node);
                this.hasMovingParts = true;
              }
            });
          }
        });
      }

      // 3. 엔진 터보팬 블레이드 장착 (A320, A350)
      if (def && def.fans && Array.isArray(def.fans)) {
        def.fans.forEach(f => {
          [f.leftX, f.rightX].forEach(x => {
            const fan = GLBMovingPartsController.createTurbofanFan(f.radius, f.blades, chromeMat);
            fan.position.set(x, f.y, f.z);
            this.planeGroup.add(fan);
            this.fans.push(fan);
            this.hasMovingParts = true;
          });
        });
      }

      // 4. 전용 랜딩기어 장착 (A350 등)
      if (def && def.gearDefs) {
        const g = def.gearDefs;
        [g.nose, g.mainL, g.mainR].forEach(gearSpec => {
          const gearObj = GLBMovingPartsController.createGLBLandingGear(
            gearSpec.x, gearSpec.y, gearSpec.z,
            gearSpec.isNose, gearSpec.is4Wheel,
            chromeMat, tireMat
          );
          this.planeGroup.add(gearObj);
          this.landingGears.push(gearObj);
          this.hasMovingParts = true;
        });
      }

      // 5. 키프레임 애니메이션 믹서 연결 (DC-10 등)
      if (this.animations && this.animations.length > 0 && typeof THREE.AnimationMixer !== 'undefined') {
        this.mixer = new THREE.AnimationMixer(this.scene);
        this.gearAction = this.mixer.clipAction(this.animations[0]);
        this.gearDuration = this.animations[0].duration || 1.0;
        this.gearAction.play();
        this.gearAction.paused = true;
        this.gearAction.time = this.gearDuration;
        this.mixer.update(0);
        this.hasMovingParts = true;
      }

      // 6. 버텍스 셰이더 디포메이션 셋업 (제어평면)
      if (def && def.rudderParams && def.elevParams && def.wingParams) {
        this.setupShaders(def);
        this.hasMovingParts = true;
      }
    }

    setupShaders(def) {
      if (this.planeGroup) {
        this.planeGroup.updateMatrixWorld(true);
      }
      const planeGroupInv = new THREE.Matrix4();
      if (this.planeGroup && this.planeGroup.matrixWorld) {
        planeGroupInv.copy(this.planeGroup.matrixWorld).invert();
      }

      this.shaderUniforms = {
        uMeshToPlane: { value: new THREE.Matrix4() },
        uPlaneToMesh: { value: new THREE.Matrix4() },
        uAileronL: { value: 0.0 },
        uAileronR: { value: 0.0 },
        uElevator: { value: 0.0 },
        uRudder:   { value: 0.0 },
        uFlap:     { value: 0.0 },
        uRudderParams: { value: new THREE.Vector4(...def.rudderParams) },
        uElevParams:   { value: new THREE.Vector4(...def.elevParams) },
        uWingParams:   { value: new THREE.Vector4(...def.wingParams) }
      };

      const meshToPlaneMat = new THREE.Matrix4();
      const planeToMeshMat = new THREE.Matrix4();
      const self = this;

      this.scene.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];

        // 0번 프레임 사전 연산 (렌더링 시작 전 유효한 행렬 보장)
        if (self.planeGroup && self.planeGroup.matrixWorld) {
          node.updateMatrixWorld(true);
          meshToPlaneMat.multiplyMatrices(planeGroupInv, node.matrixWorld);
          planeToMeshMat.copy(meshToPlaneMat).invert();
          self.shaderUniforms.uMeshToPlane.value.copy(meshToPlaneMat);
          self.shaderUniforms.uPlaneToMesh.value.copy(planeToMeshMat);
        }

        const origOnBeforeRender = node.onBeforeRender;
        node.onBeforeRender = function(renderer, renderScene, camera, geometry, material, group) {
          if (origOnBeforeRender) {
            try {
              origOnBeforeRender.call(this, renderer, renderScene, camera, geometry, material, group);
            } catch (e) {}
          }
          if (self.planeGroup && self.planeGroup.matrixWorld && self.shaderUniforms) {
            try {
              planeGroupInv.copy(self.planeGroup.matrixWorld).invert();
              meshToPlaneMat.multiplyMatrices(planeGroupInv, node.matrixWorld);
              planeToMeshMat.copy(meshToPlaneMat).invert();
              self.shaderUniforms.uMeshToPlane.value.copy(meshToPlaneMat);
              self.shaderUniforms.uPlaneToMesh.value.copy(planeToMeshMat);
            } catch (e) {}
          }
        };

        mats.forEach((m) => {
          if (def.gearMaterialRegex && def.gearMaterialRegex.test(m.name || '')) return;

          m.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, self.shaderUniforms);

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

              // 1. Rudder Deflection (Swept Hinge Rigid Planar Rotation)
              // uRudderParams: [zBase, zMax, yBase, sweepSlope]
              float _rZBase = uRudderParams.x;
              float _rZMax = uRudderParams.y;
              float _rYBase = uRudderParams.z;
              float _rSweep = uRudderParams.w;
              float _zRudderHinge = _rZBase + max(0.0, _planeP.y - _rYBase) * _rSweep;

              if (_planeP.z > _zRudderHinge && _planeP.z <= _rZMax &&
                  _planeP.y >= _rYBase && abs(_planeP.x) < 0.95) {
                float dist = _planeP.z - _zRudderHinge;
                // Narrow blend across hinge line to prevent skin tearing; rigid rotation across panel
                float weight = smoothstep(0.0, 0.12, dist);
                float angle = uRudder * weight;
                float arm = dist;
                _planeP.x += arm * sin(angle);
                _planeP.z = _zRudderHinge + arm * cos(angle);
                _deflected = true;
              }

              // 2. Elevator Deflection (Swept Hinge Rigid Planar Rotation)
              // uElevParams: [zBase, zMax, xBase, sweepSlope]
              float _eZBase = uElevParams.x;
              float _eZMax = uElevParams.y;
              float _eXBase = uElevParams.z;
              float _eSweep = uElevParams.w;
              float _absX = abs(_planeP.x);
              float _zElevHinge = _eZBase + max(0.0, _absX - _eXBase) * _eSweep;

              if (!_deflected && _planeP.z > _zElevHinge && _planeP.z <= _eZMax &&
                  _absX >= _eXBase && _absX <= (_eXBase + 8.5) &&
                  _planeP.y < 8.0 && _planeP.y > -3.5) {
                float dist = _planeP.z - _zElevHinge;
                float weight = smoothstep(0.0, 0.12, dist);
                float angle = uElevator * weight;
                float arm = dist;
                _planeP.y += arm * sin(angle);
                _planeP.z = _zElevHinge + arm * cos(angle);
                _deflected = true;
              }

              // 3. Aileron Deflection (Rear Spar Rigid Planar Rotation)
              // uWingParams: [xMin, xMax, zRootSpar, sweepSlope]
              if (!_deflected && _absX >= uWingParams.x && _absX <= uWingParams.y) {
                float zSpar = uWingParams.z + (_absX - uWingParams.x) * uWingParams.w;
                float dist = _planeP.z - zSpar;
                if (dist > 0.0 && dist < 4.2 && _planeP.y < 5.0 && _planeP.y > -3.5) {
                  float weight = smoothstep(0.0, 0.12, dist);
                  float ailDef = (_planeP.x < 0.0) ? uAileronL : uAileronR;
                  float angle = ailDef * weight;
                  float arm = dist;
                  _planeP.y += arm * sin(angle);
                  _planeP.z = zSpar + arm * cos(angle);
                  _deflected = true;
                }
              }

              // 4. Flap Deflection (Inboard Wing Trailing Edge Rigid Extension)
              if (!_deflected && _absX >= 1.8 && _absX < uWingParams.x && uFlap > 0.001) {
                float zFlapSpar = uWingParams.z + (_absX - 1.8) * (uWingParams.w * 0.85);
                float dist = _planeP.z - zFlapSpar;
                if (dist > 0.0 && dist < 5.0 && _planeP.y < 5.0 && _planeP.y > -3.5) {
                  float weight = smoothstep(0.0, 0.12, dist);
                  float angle = uFlap * weight;
                  float arm = dist;
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
          m.needsUpdate = true;
        });
      });
    }

    setGearProgress(progress, phase) {
      this.gearProgress = Math.max(0.0, Math.min(1.0, progress));
      this.gearState = phase || (progress >= 0.99 ? 'DOWN' : (progress <= 0.01 ? 'UP' : 'TRANSIT'));

      // A320 내장 기어 노드/머티리얼 표시 제어
      if (this.gearNodes.length > 0) {
        const isVis = progress > 0.25;
        this.gearNodes.forEach(n => { n.visible = isVis; });
        this.gearMaterials.forEach(m => { m.visible = isVis; });
      }

      // A350 정밀 착륙장치 스트럿/도어 회전
      if (this.landingGears.length > 0) {
        const isVis = progress > 0.15;
        this.landingGears.forEach(gear => {
          const u = gear.userData;
          if (!u) return;
          if (u.strutPivot) {
            u.strutPivot.rotation.x = -(1.0 - progress) * (Math.PI / 2);
            u.strutPivot.visible = isVis;
          }
          if (u.doorL) u.doorL.rotation.z = (1.0 - progress) * 0.8;
          if (u.doorR) u.doorR.rotation.z = -(1.0 - progress) * 0.8;
          if (u.bogieBeam) u.bogieBeam.rotation.x = -(1.0 - progress) * 0.45;
        });
      }

      // DC-10 리깅 키프레임 기어 애니메이션
      if (this.mixer && this.gearAction) {
        this.gearAction.time = progress * this.gearDuration;
        this.mixer.update(0);
      }

      // CL-215 (Amphibian) 네임드 기어 노드
      if (this.parts.landingGear) {
        const node = this.parts.landingGear;
        node.visible = progress > 0.15;
        node.position.y = (node.userData.basePosY || 0) + (1.0 - progress) * 1.8;
      }
    }

    setDeflections(ailL, ailR, elev, rud, flap) {
      if (this.shaderUniforms) {
        this.shaderUniforms.uAileronL.value = ailL;
        this.shaderUniforms.uAileronR.value = ailR;
        this.shaderUniforms.uElevator.value = elev;
        this.shaderUniforms.uRudder.value = rud;
        this.shaderUniforms.uFlap.value = flap;
      }
      if (this.parts.rudder) {
        this.parts.rudder.rotation.y = (this.parts.rudder.userData.baseRotY || 0) + rud;
      }
      if (this.parts.flaps && this.parts.flaps.length > 0) {
        for (const f of this.parts.flaps) {
          f.rotation.x = (f.userData.baseRotX || 0) + flap;
        }
      }
    }

    rotateFans(fanDelta) {
      for (let i = 0; i < this.fans.length; i++) {
        this.fans[i].rotation.z += fanDelta;
      }
      for (let i = 0; i < this.parts.fans.length; i++) {
        this.parts.fans[i].rotation.z += fanDelta;
      }
    }

    update(dt) {
      if (!this.enabled) return;
      dt = Math.max(0.001, Math.min(dt || 0.016, 0.1));

      if (this.demoLoop) {
        this.demoTime += dt;
        const t = this.demoTime;

        // 1. 연속 제어평면 시험 가동 (에일러론 롤, 승강타 피치, 방향타 요)
        const ail = 0.35 * Math.sin(1.8 * t);
        const elev = 0.32 * Math.sin(1.4 * t + 0.8);
        const rud = 0.30 * Math.sin(1.1 * t + 1.5);

        // 플랩 전개 주기 (16초 주기: 전개 -> 풀 플랩 유지 -> 수납)
        const flapPhase = (t % 16.0);
        let flap = 0.0;
        if (flapPhase >= 4.0 && flapPhase < 8.0) {
          flap = ((flapPhase - 4.0) / 4.0) * 0.56;
        } else if (flapPhase >= 8.0 && flapPhase < 12.0) {
          flap = 0.56;
        } else if (flapPhase >= 12.0 && flapPhase < 16.0) {
          flap = (1.0 - (flapPhase - 12.0) / 4.0) * 0.56;
        }

        this.setDeflections(-ail, ail, elev, rud, flap);

        // 2. 착륙장치 수납/전개 주기 (18초 주기: 전개 5초 -> 수납 3초 -> 수납 유지 5초 -> 전개 3초 -> 락)
        const gearCycle = (t % 18.0);
        let progress = 1.0;
        let phase = 'DOWN';
        if (gearCycle < 5.0) {
          progress = 1.0; phase = 'DOWN';
        } else if (gearCycle < 8.0) {
          progress = 1.0 - (gearCycle - 5.0) / 3.0; phase = 'TRANSIT';
        } else if (gearCycle < 13.0) {
          progress = 0.0; phase = 'UP';
        } else if (gearCycle < 16.0) {
          progress = (gearCycle - 13.0) / 3.0; phase = 'TRANSIT';
        } else {
          progress = 1.0; phase = 'DOWN';
        }
        this.setGearProgress(progress, phase);

        // 3. 엔진 터보팬 및 프로펠러 고속 연속 회전
        const fanDelta = 25.0 * dt;
        this.rotateFans(fanDelta);
      }
    }

    updateFlightControls(dt, flightState) {
      if (!this.enabled) return;
      const { targetAileron = 0, targetElevator = 0, targetRudder = 0, targetFlap = 0, rpmRatio = 0 } = flightState || {};

      if (this.shaderUniforms) {
        this.shaderUniforms.uAileronL.value = THREE.MathUtils.lerp(this.shaderUniforms.uAileronL.value, -targetAileron, 0.20);
        this.shaderUniforms.uAileronR.value = THREE.MathUtils.lerp(this.shaderUniforms.uAileronR.value, targetAileron, 0.20);
        this.shaderUniforms.uElevator.value = THREE.MathUtils.lerp(this.shaderUniforms.uElevator.value, targetElevator, 0.20);
        this.shaderUniforms.uRudder.value = THREE.MathUtils.lerp(this.shaderUniforms.uRudder.value, targetRudder, 0.22);
        this.shaderUniforms.uFlap.value = THREE.MathUtils.lerp(this.shaderUniforms.uFlap.value, targetFlap, 0.15);
      }
      if (this.parts.rudder) {
        const baseY = this.parts.rudder.userData.baseRotY || 0;
        this.parts.rudder.rotation.y = THREE.MathUtils.lerp(this.parts.rudder.rotation.y, baseY + targetRudder, 0.22);
      }
      if (this.parts.flaps && this.parts.flaps.length > 0) {
        for (const flap of this.parts.flaps) {
          const baseX = flap.userData.baseRotX || 0;
          flap.rotation.x = THREE.MathUtils.lerp(flap.rotation.x, baseX + targetFlap, 0.12);
        }
      }

      const fanDelta = rpmRatio * 30.0 * dt;
      this.rotateFans(fanDelta);
    }

    updateGear(progress, isExtending, phase) {
      this.setGearProgress(progress, phase);
    }

    dispose() {
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
      }
      this.fans.forEach(fan => {
        if (fan.parent) fan.parent.remove(fan);
        if (fan.geometry) fan.geometry.dispose();
        if (fan.material) fan.material.dispose();
      });
      this.fans = [];
      this.landingGears.forEach(gear => {
        if (gear.parent) gear.parent.remove(gear);
        gear.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
      });
      this.landingGears = [];
      this.gearNodes = [];
      this.gearMaterials = [];
      this.parts = { fans: [], rudder: null, flaps: [], landingGear: null };
    }
  }

  // Global export for gallery viewer and subsystems
  if (typeof window !== 'undefined') {
    window.GLBMovingParts = GLBMovingPartsController;
  }

  Object.assign(AirplaneGame.prototype, {
  GLBMovingParts: GLBMovingPartsController,
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

    // 기존 비행기 자식 오브젝트 및 이전 컨트롤러 정리
    if (this.glbMovingPartsController) {
      this.glbMovingPartsController.dispose();
      this.glbMovingPartsController = null;
    }
    while (this.planeGroup.children.length > 0) {
      this.planeGroup.remove(this.planeGroup.children[0]);
    }

    // ★ 실물 스케일 정규화 및 기우뚱 방지 중심점 정렬 (GLBMovingPartsController 공유 메서드)
    GLBMovingPartsController.normalizeAircraftScene(scene, this.currentPlaneType, { isViewer: false });

    // PBR 머티리얼 최적화 및 창문/데칼 z-fighting 방지
    scene.traverse((node) => {
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

    this.customGLBModel = scene;
    this.planeGroup.add(scene);
    this.planeGroup.updateMatrixWorld(true);

    // ★ 통합 무빙 파츠 컨트롤러 장착 (제어평면 셰이더, 기어 수납/전개, 터보팬 팬 회전)
    this.glbMovingPartsController = new GLBMovingPartsController({
      scene: scene,
      planeType: this.currentPlaneType,
      planeGroup: this.planeGroup,
      demoLoop: false,
      animations: animations
    });

    // 하위 호환성 프로퍼티 매핑
    this.glbMovingParts = this.glbMovingPartsController.parts;
    this.glbShaderUniforms = this.glbMovingPartsController.shaderUniforms;
    this.glbGearNodes = this.glbMovingPartsController.gearNodes;
    this.glbGearMaterials = this.glbMovingPartsController.gearMaterials;
    this.landingGears = this.glbMovingPartsController.landingGears;
    this.turbofans = this.glbMovingPartsController.fans;
    this.glbMixer = this.glbMovingPartsController.mixer;
    this.glbGearAction = this.glbMovingPartsController.gearAction;
    this.glbGearDuration = this.glbMovingPartsController.gearDuration;

    // 초기 기어 상태 동기화
    this.glbMovingPartsController.setGearProgress(
      (this.gearExtended === false) ? 0.0 : 1.0,
      this.gearPhase || (this.gearExtended === false ? 'UP' : 'DOWN')
    );

    if (typeof this.attachAircraftNavLights === 'function') {
      this.attachAircraftNavLights(this.currentPlaneType || 'dc10');
    }

    if (typeof this.attachGLBMovingParts === 'function') {
      this.attachGLBMovingParts(this.currentPlaneType || 'a320');
    }

    this.setupGLBControlSurfaceShaders(scene, this.currentPlaneType);

    this.planeGroup.updateMatrixWorld(true);
    const fanExhaustPoints = [];
    const allFans = (this.glbMovingPartsController.fans || []).concat(this.glbMovingPartsController.parts.fans || []);
    if (allFans.length > 0) {
      const nozzleOffset = new THREE.Vector3(0, 0, 3.2);
      for (const fan of allFans) {
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

  setupGLBControlSurfaceShaders(scene, planeType) {
    if (this.glbMovingPartsController && this.glbMovingPartsController.shaderUniforms) {
      this.glbShaderUniforms = this.glbMovingPartsController.shaderUniforms;
    }
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

