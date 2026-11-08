/**
 * Sky Jet Explorer 3D - Departing Airport, Incheon Mega Hub, Ground GSE, Bus Traffic & AI Flights
 * Subsystem: airports (16 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 4. 고해상도 국제공항 & 정밀 탑승교 & PAPI 유도등 (초대형 메가 에어포트)
  // ----------------------------------------------------------------
  initAirports() {
    this.airportGroup = new THREE.Group();
    this.obstacles = [];

    // 아스팔트 바닥 (초대형 1,400m x 4,400m)
    const islandGeo = new THREE.BoxGeometry(1400, 4, 4400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const airportGround = new THREE.Mesh(islandGeo, groundMat);
    airportGround.position.set(0, 0, 0);
    airportGround.receiveShadow = true;
    this.airportGroup.add(airportGround);

    // --------------------------------------------------------------
    // 36L 정밀 활주로 (100m x 3800m 메가 런웨이, Y = 2.10)
    // --------------------------------------------------------------
    const runwayGeo = new THREE.PlaneGeometry(100, 3800);
    const runwayMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(160, 2.10, 0);
    runway.receiveShadow = true;
    this.airportGroup.add(runway);

    // 활주로 시단 피아노 건반 (Threshold Piano Keys - Z = ±1800, Y = 2.14)
    const whiteMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    [-1800, 1800].forEach(zBase => {
      for (let k = -42; k <= 42; k += 5.5) {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 50), whiteMat);
        bar.rotation.x = -Math.PI / 2;
        bar.position.set(160 + k, 2.14, zBase);
        this.airportGroup.add(bar);
      }
    });

    // 활주로 중앙선 (Centerline Stripes - Y = 2.14)
    for (let z = -1750; z <= 1750; z += 55) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 36), whiteMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(160, 2.14, z);
      this.airportGroup.add(stripe);
    }

    // 착륙 목표 지점 (Aiming Point - Z = ±1400, Y = 2.14)
    [-1400, 1400].forEach(z => {
      [-24, 24].forEach(xOff => {
        const aim = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 65), whiteMat);
        aim.rotation.x = -Math.PI / 2;
        aim.position.set(160 + xOff, 2.14, z);
        this.airportGroup.add(aim);
      });
    });

    // PAPI (Precision Approach Path Indicator) 4구 진입각 지시등
    this.papiLights = [];
    for (let p = 0; p < 4; p++) {
      const papiBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, 2.0),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 })
      );
      papiBox.position.set(95, 2.6, 1250 + p * 8);
      this.airportGroup.add(papiBox);

      const lamp = new THREE.PointLight(0xffffff, 2.2, 90);
      lamp.position.set(97, 3.2, 1250 + p * 8);
      this.airportGroup.add(lamp);
      this.papiLights.push(lamp);
    }

    // --------------------------------------------------------------
    // 유도로 및 황색 유도선 (Taxiways - 75m x 3800m, Y = 2.06)
    // --------------------------------------------------------------
    const taxiway = new THREE.Mesh(
      new THREE.PlaneGeometry(75, 3800),
      new THREE.MeshStandardMaterial({ 
        color: 0x242e3d, 
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    );
    taxiway.rotation.x = -Math.PI / 2;
    taxiway.position.set(-80, 2.06, 0);
    taxiway.receiveShadow = true;
    this.airportGroup.add(taxiway);

    // 연결 유도로 5개소 (Connectors: -1500, -750, 0, 750, 1500, Y = 2.06)
    [-1500, -750, 0, 750, 1500].forEach(z => {
      const link = new THREE.Mesh(new THREE.PlaneGeometry(240, 65), new THREE.MeshStandardMaterial({ 
        color: 0x242e3d,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      }));
      link.rotation.x = -Math.PI / 2;
      link.position.set(40, 2.06, z);
      this.airportGroup.add(link);
    });

    const yellowMat = new THREE.MeshBasicMaterial({ 
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const taxiLine = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3750), yellowMat);
    taxiLine.rotation.x = -Math.PI / 2;
    taxiLine.position.set(-80, 2.09, 0);
    this.airportGroup.add(taxiLine);

    // --------------------------------------------------------------
    // 활주로 및 유도로 야간 조명 시스템 (Airport Night Runway Lighting System)
    // --------------------------------------------------------------
    const nightGroup = new THREE.Group();
    nightGroup.name = 'airportNightLights';
    nightGroup.visible = (this.timeOfDay === 'night');

    const edgeBulbGeo = new THREE.SphereGeometry(0.75, 6, 6);
    const whiteBulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const greenBulbMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const redBulbMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const blueBulbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. 활주로 양측 측면 유도등 (Runway Edge Lights: X = 160 ± 52, Z = -1800 ~ 1800)
    for (let z = -1800; z <= 1800; z += 60) {
      const isThreshold = (z > 1650);
      const isEnd = (z < -1650);
      const mat = isThreshold ? greenBulbMat : (isEnd ? redBulbMat : whiteBulbMat);

      [-52, 52].forEach(xOff => {
        const bulb = new THREE.Mesh(edgeBulbGeo, mat);
        bulb.position.set(160 + xOff, 2.45, z);
        nightGroup.add(bulb);
      });
    }

    // 2. 유도로 측면 청색 유도등 (Taxiway Blue Edge Lights: X = -80 ± 40, Z = -1800 ~ 1800)
    for (let z = -1800; z <= 1800; z += 90) {
      [-40, 40].forEach(xOff => {
        const bulb = new THREE.Mesh(edgeBulbGeo, blueBulbMat);
        bulb.position.set(-80 + xOff, 2.35, z);
        nightGroup.add(bulb);
      });
    }

    // 3. 터미널 창문 야간 백라이트 발광 스트립 (Terminal Night Windows)
    const terminalWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let tz = -320; tz <= 320; tz += 90) {
      for (let ty of [12, 24, 36]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(65, 4.5), terminalWindowMat);
        win.position.set(-289, ty, tz);
        win.rotation.y = Math.PI / 2;
        nightGroup.add(win);
      }
    }

    this.airportGroup.add(nightGroup);

    // --------------------------------------------------------------
    // 여객 터미널 허브 빌딩 (대형 180m x 48m x 780m)
    // --------------------------------------------------------------
    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.7,
      transparent: true,
      opacity: 0.88
    });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(180, 48, 780), terminalMat);
    terminal.position.set(-380, 24, 0);
    terminal.castShadow = true;
    this.airportGroup.add(terminal);
    this.registerObstacle(terminal, '국제공항 여객 터미널 빌딩');

    // --------------------------------------------------------------
    // 멀티 실시간 회전 도킹 탑승교 (Gate 1, 2, 3 Animated Boarding Bridges)
    // - 평상시에는 실제 공항처럼 옆(유도로/벽면 방향)을 보며 대기하다가,
    // - 비행기가 게이트에 정지하면 로툰다를 축으로 회전하여 비행기 L1 문으로 도킹!
    // --------------------------------------------------------------
    const createJetBridge = (gateZ, gateName, gateIdx) => {
      const jetBridgeGroup = new THREE.Group();

      // 1. 원형 로툰다 (피벗 타워 - 고정 축)
      const rotunda = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 14, 18),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 })
      );
      rotunda.position.set(-285, 11, gateZ);
      rotunda.castShadow = true;
      jetBridgeGroup.add(rotunda);

      // 2. ★ 로툰다 중심 회전 암 피벗 그룹 (Rotunda Swing Arm Pivot)
      const armPivot = new THREE.Group();
      armPivot.position.set(-285, 0, gateZ);

      // 평상시 대기 각도: 실제 공항처럼 옆(대략 40도)을 바라봄
      const standbyAngle = (gateIdx % 2 === 0) ? 0.68 : -0.68;
      const dockedAngle = 0.0; // 비행기 정지선 L1 도어를 향함
      armPivot.rotation.y = standbyAngle;

      // 3. 신축형 텔레스코픽 터널 통로 (암 피벗에 부착되어 함께 회전)
      const tunnel = new THREE.Mesh(
        new THREE.BoxGeometry(85, 7.5, 8.5),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
      );
      tunnel.position.set(45, 10.2, 0);
      tunnel.castShadow = true;
      armPivot.add(tunnel);

      // 터널 좌우 유리창
      const bridgeGlass = new THREE.Mesh(
        new THREE.BoxGeometry(80, 3.8, 8.7),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 })
      );
      bridgeGlass.position.set(45, 10.5, 0);
      armPivot.add(bridgeGlass);

      // 4. 하부 이동 대차 & 유압 리프트 기둥 (Wheel Bogie - 브릿지와 함께 바닥을 굴러 회전)
      const columnMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const liftColumn = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 8.5, 12), columnMat);
      liftColumn.position.set(75, 5.5, 0);
      liftColumn.castShadow = true;
      armPivot.add(liftColumn);

      const axle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 8.5), columnMat);
      axle.position.set(75, 1.6, 0);
      armPivot.add(axle);

      [-3.6, 3.6].forEach(zTire => {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8, 1.8, 1.6, 16),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        tire.rotation.x = Math.PI / 2;
        tire.position.set(75, 1.8, zTire);
        tire.castShadow = true;
        armPivot.add(tire);
      });

      // 5. 항공기 도킹 캐빈 & 아코디언 고무 주름 캐노피
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(12, 8.5, 9.5),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
      );
      cabin.position.set(91, 9.5, 0);
      cabin.castShadow = true;
      armPivot.add(cabin);

      // 아코디언 고무 주름 (비행기 동체 밀착 캐노피)
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      for (let c = 0; c < 5; c++) {
        const fold = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.5, 8, 16), canopyMat);
        fold.rotation.y = Math.PI / 2;
        fold.position.set(98 + c * 0.75, 9.5, 0);
        fold.scale.set(1.2, 1.1, 1);
        armPivot.add(fold);
      }

      jetBridgeGroup.add(armPivot);
      this.airportGroup.add(jetBridgeGroup);
      this.registerObstacle(rotunda, `${gateName} 지지 타워`);

      // 실시간 회전 도킹 탑승교 등록
      this.animatedJetways.push({
        name: gateName,
        armPivot,
        standbyAngle,
        dockedAngle,
        currentAngle: standbyAngle,
        targetAngle: standbyAngle,
        stopX: -155,
        stopZ: gateZ,
        isDocked: false
      });
    };

    // 1번, 2번, 3번 게이트 탑승교 생성
    createJetBridge(0, '해상공항 1번 탑승교 게이트', 0);
    createJetBridge(180, '해상공항 2번 탑승교 게이트', 1);
    createJetBridge(-180, '해상공항 3번 탑승교 게이트', 2);

    // --------------------------------------------------------------
    // 1번 게이트 전용 정지선 및 유도 표식 (Gate 1 Bay Markings)
    // --------------------------------------------------------------
    const gateStopGroup = new THREE.Group();
    // 1. 적색 정지선 (Stop Line)
    const stopBar = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 1.8), 
      new THREE.MeshBasicMaterial({ 
        color: 0xef4444,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );
    stopBar.rotation.x = -Math.PI / 2;
    stopBar.position.set(-155, 2.14, 0);
    gateStopGroup.add(stopBar);

    // 2. 황색 가이드 링
    const guideRing = new THREE.Mesh(
      new THREE.RingGeometry(7.0, 8.2, 28), 
      new THREE.MeshBasicMaterial({ 
        color: 0xfacc15, 
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );
    guideRing.rotation.x = -Math.PI / 2;
    guideRing.position.set(-155, 2.14, 0);
    gateStopGroup.add(guideRing);

    // 3. 전자식 시각 도킹 유도 장치 (VDGS 스탠드)
    const vdgsPole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 16, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    vdgsPole.position.set(-155, 8.0, -18);
    gateStopGroup.add(vdgsPole);

    const vdgsScreen = new THREE.Mesh(
      new THREE.BoxGeometry(9, 6, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.85 })
    );
    vdgsScreen.position.set(-155, 14.5, -18);
    gateStopGroup.add(vdgsScreen);

    this.airportGroup.add(gateStopGroup);

    // --------------------------------------------------------------
    // 공항 관제탑 (ATC Tower)
    // --------------------------------------------------------------
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 18, 130, 18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    towerBase.position.set(-380, 65, -500);
    towerBase.castShadow = true;
    this.airportGroup.add(towerBase);
    this.registerObstacle(towerBase, '공항 관제탑');

    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 15, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.85 })
    );
    towerCab.position.set(-380, 135, -500);
    this.airportGroup.add(towerCab);

    this.beaconLight = new THREE.PointLight(0x38bdf8, 2.8, 350);
    this.beaconLight.position.set(-380, 150, -500);
    this.airportGroup.add(this.beaconLight);

    // 격납고 (Hangar)
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(160, 36, 120),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 })
    );
    hangar.position.set(-380, 18, 480);
    hangar.castShadow = true;
    this.airportGroup.add(hangar);
    this.registerObstacle(hangar, '항공기 정비 격납고');

    // 지상 서비스 차량 (GSE Vehicles - 토잉카 & 연료 트럭)
    this.initAirportGSE();

    this.scene.add(this.airportGroup);

  },

  // ----------------------------------------------------------------
  // 지상 요원 3D 메쉬 생성 (마샬러 유도 요원 또는 램프 순찰 요원)
  // ----------------------------------------------------------------
  createGroundCrewMesh(isMarshaller = false) {
    const group = new THREE.Group();

    // 고시인성 형광 안전 조끼 및 장비 재질
    const vestMat = new THREE.MeshStandardMaterial({
      color: isMarshaller ? 0xf97316 : 0xfacc15, // 오렌지/옐로우 형광 안전조끼
      roughness: 0.5,
      metalness: 0.1
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 고휘도 반사띠
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // 작업 바지
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }); // 안전모

    // 1. 몸통 (형광 안전 조끼)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 0.45), vestMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    group.add(torso);

    // 반사띠 2줄 (가슴 & 허리)
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.48), stripeMat);
    stripe1.position.y = 1.48;
    group.add(stripe1);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.48), stripeMat);
    stripe2.position.y = 1.15;
    group.add(stripe2);

    // 2. 머리 & 안전모
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), skinMat);
    head.position.y = 2.15;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
    helmet.position.y = 2.22;
    group.add(helmet);

    // 3. 다리 (좌/우 보행 피벗)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.24, 0.8, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), pantsMat);
    lLegMesh.position.y = -0.4;
    leftLeg.add(lLegMesh);
    group.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.24, 0.8, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), pantsMat);
    rLegMesh.position.y = -0.4;
    rightLeg.add(rLegMesh);
    group.add(rightLeg);

    // 4. 팔 (좌/우 유도/보행 피벗)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.52, 1.8, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), vestMat);
    lArmMesh.position.y = -0.35;
    leftArm.add(lArmMesh);
    group.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.52, 1.8, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), vestMat);
    rArmMesh.position.y = -0.35;
    rightArm.add(rArmMesh);
    group.add(rightArm);

    let leftWand = null;
    let rightWand = null;

    if (isMarshaller) {
      // 마샬러 유도봉 (야간/주간 고휘도 발광봉)
      const wandMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.8
      });
      const wandGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8);

      leftWand = new THREE.Mesh(wandGeo, wandMat);
      leftWand.position.set(0, -0.75, 0.2);
      leftWand.rotation.x = Math.PI / 4;
      leftArm.add(leftWand);

      rightWand = new THREE.Mesh(wandGeo, wandMat);
      rightWand.position.set(0, -0.75, 0.2);
      rightWand.rotation.x = Math.PI / 4;
      rightArm.add(rightWand);
    }

    return {
      group,
      torso,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      leftWand,
      rightWand,
      isMarshaller
    };
  },

  // ----------------------------------------------------------------
  // 수하물 카트를 견인하는 공항 토잉카(Towing Tug) 3D 메쉬 생성
  // ----------------------------------------------------------------
  createTowingTugMesh(cartsCount = 2) {
    const group = new THREE.Group();
    const wheels = [];

    // 토잉 트랙터 본체 (공항 특유의 밝은 산업용 옐로우)
    const tugMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.3 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const hitchMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

    // 트랙터 차체 (길이 5.2m x 폭 2.6m x 높이 1.4m)
    const tractorBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 5.2), tugMat);
    tractorBody.position.y = 1.0;
    tractorBody.castShadow = true;
    group.add(tractorBody);

    // 전면 대형 강철 범퍼
    const fwdBumper = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.6), bumperMat);
    fwdBumper.position.set(0, 0.7, -2.7);
    group.add(fwdBumper);

    // 운전석 캐빈 프레임
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 2.4), bumperMat);
    cabRoof.position.set(0, 2.4, 0.2);
    group.add(cabRoof);

    // 루프 경광등 (주황 비콘)
    const beacon = new THREE.PointLight(0xf59e0b, 2.5, 25);
    beacon.position.set(0, 2.6, 0.2);
    group.add(beacon);
    const beaconDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.5 })
    );
    beaconDome.position.set(0, 2.55, 0.2);
    group.add(beaconDome);

    // 트랙터 4륜 광폭 타이어
    [
      { x: -1.4, z: -1.6 }, { x: 1.4, z: -1.6 },
      { x: -1.4, z: 1.6 },  { x: 1.4, z: 1.6 }
    ].forEach(wPos => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 14), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wPos.x, 0.7, wPos.z);
      tire.castShadow = true;
      group.add(tire);
      wheels.push(tire);
    });

    // 수하물 카트(Baggage Carts) 견인 트레일러 연결
    const baggageCartMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const luggageColors = [0xef4444, 0x2563eb, 0x10b981, 0x8b5cf6, 0xf97316];

    for (let c = 0; c < cartsCount; c++) {
      const zOffset = 3.6 + c * 4.0;

      // 견인 히치 바
      const hitch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), hitchMat);
      hitch.rotation.x = Math.PI / 2;
      hitch.position.set(0, 0.5, zOffset - 0.6);
      group.add(hitch);

      // 카트 베이스 트레이
      const cartBed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 3.0), baggageCartMat);
      cartBed.position.set(0, 0.65, zOffset + 1.2);
      cartBed.castShadow = true;
      group.add(cartBed);

      // 카트 사이드 레일 가드
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 3.0), hitchMat);
      railL.position.set(-1.05, 1.1, zOffset + 1.2);
      group.add(railL);
      const railR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 3.0), hitchMat);
      railR.position.set(1.05, 1.1, zOffset + 1.2);
      group.add(railR);

      // 여행용 수하물 가방들 (Luggage Suitcases)
      for (let l = 0; l < 4; l++) {
        const lugColor = luggageColors[(c * 3 + l) % luggageColors.length];
        const lugMat = new THREE.MeshStandardMaterial({ color: lugColor, roughness: 0.4 });
        const lugMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.65), lugMat);
        lugMesh.position.set((l % 2 === 0 ? -0.45 : 0.45), 1.05, zOffset + 0.65 + Math.floor(l / 2) * 1.0);
        lugMesh.rotation.y = (Math.random() - 0.5) * 0.2;
        group.add(lugMesh);
      }

      // 카트 4륜 캐스터 바퀴
      [-1.0, 1.0].forEach(cx => {
        [-0.9, 0.9].forEach(cz => {
          const cTire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 10), tireMat);
          cTire.rotation.z = Math.PI / 2;
          cTire.position.set(cx, 0.35, zOffset + 1.2 + cz);
          group.add(cTire);
          wheels.push(cTire);
        });
      });
    }

    return { group, beacon, wheels };
  },

  // 지상 안내원(Marshaller & Ground Crew) 및 계류장을 분주히 달리는 토잉카 시스템 초기화
  initAirportGSE() {
    // --------------------------------------------------------------
    // 1. 출발 해상공항 1번 게이트 정면 마샬러 (유도봉 안내 요원)
    // --------------------------------------------------------------
    const mMesh = this.createGroundCrewMesh(true);
    mMesh.group.position.set(-155, 2.12, -22);
    mMesh.group.rotation.y = 0; // 남쪽(+Z)을 향해 서서 비행기를 마주봄
    this.airportGroup.add(mMesh.group);
    this.marshallerCrew.push({
      mesh: mMesh,
      pos: new THREE.Vector3(-155, 2.12, -22)
    });

    // --------------------------------------------------------------
    // 2. 출발 해상공항 순찰 지상 안내원들 4명 (Apron Ramp Agents)
    // --------------------------------------------------------------
    const crewDefs = [
      { x: -140, z: -80, minZ: -180, maxZ: 120, speed: 1.4, dir: 1 },
      { x: -170, z: 120, minZ: -40, maxZ: 260, speed: 1.2, dir: -1 },
      { x: -210, z: -150, minZ: -280, maxZ: 80, speed: 1.5, dir: 1 },
      { x: -240, z: 200, minZ: 60, maxZ: 380, speed: 1.3, dir: -1 }
    ];

    crewDefs.forEach((cDef, idx) => {
      const crew = this.createGroundCrewMesh(false);
      crew.group.position.set(cDef.x, 2.12, cDef.z);
      this.airportGroup.add(crew.group);
      this.movingGroundCrew.push({
        group: crew.group,
        mesh: crew,
        z: cDef.z,
        minZ: cDef.minZ,
        maxZ: cDef.maxZ,
        speed: cDef.speed,
        dir: cDef.dir,
        walkOffset: idx * 1.5
      });
    });

    // --------------------------------------------------------------
    // 3. 출발 해상공항 계류장 주행 토잉카 3대 (Towing Tugs with Baggage Carts)
    // --------------------------------------------------------------
    const tugDefs = [
      { x: -130, z: -120, minZ: -280, maxZ: 280, speed: 8.5, dir: 1, carts: 3 },
      { x: -215, z: 180, minZ: -220, maxZ: 360, speed: 9.2, dir: -1, carts: 2 },
      { x: -175, z: 320, minZ: 80, maxZ: 520, speed: 7.8, dir: 1, carts: 2 }
    ];

    tugDefs.forEach((tDef, idx) => {
      const tugData = this.createTowingTugMesh(tDef.carts);
      tugData.group.position.set(tDef.x, 2.12, tDef.z);
      this.airportGroup.add(tugData.group);
      this.movingTugs.push({
        group: tugData.group,
        beacon: tugData.beacon,
        wheels: tugData.wheels,
        z: tDef.z,
        minZ: tDef.minZ,
        maxZ: tDef.maxZ,
        speed: tDef.speed,
        dir: tDef.dir,
        beaconOffset: idx * 1.8
      });
    });
  },

  // ----------------------------------------------------------------
  // 4-A. 인천국제공항 스타일 초대형 메가 허브 공항 (Incheon Int'l Airport Hub)
  // - 제1여객터미널(T1, 1600m 아치 글래스 루프), 제2여객터미널(T2), 탑승동(Concourse)
  // - 2본 평행 4,000m 메가 활주로 (16R/34L & 15L/33R) & 고속 탈출 유도로
  // - 교통센터(160m 유리 돔), 20개 탑승교, 100m 8각 하이테크 관제탑
  // - 주기된 다른 항공기 12대 (B747, A320, DC-10 대한항공/아시아나풍 리버리)
  // ----------------------------------------------------------------
  initIncheonAirport() {
    this.incheonAirportGroup = new THREE.Group();
    const incheonZ = -45000;

    // 공용 재질
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x242e3d, roughness: 0.85, metalness: 0.1 });
    const runwayMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.7, 
      polygonOffset: true, 
      polygonOffsetFactor: -1, 
      polygonOffsetUnits: -1 
    });
    const whiteLineMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      polygonOffset: true, 
      polygonOffsetFactor: -2, 
      polygonOffsetUnits: -2 
    });
    const yellowTaxiMat = new THREE.MeshBasicMaterial({ 
      color: 0xfacc15, 
      polygonOffset: true, 
      polygonOffsetFactor: -2, 
      polygonOffsetUnits: -2 
    });
    const terminalGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.85,
      transparent: true,
      opacity: 0.90
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.45 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65 });

    // 1. 거대한 인천공항 아스팔트 에이프런 바닥 (2,800m x 6,200m)
    const apron = new THREE.Mesh(new THREE.BoxGeometry(2800, 4, 6200), groundMat);
    apron.position.set(-150, 0, incheonZ);
    apron.receiveShadow = true;
    this.incheonAirportGroup.add(apron);

    // 2. 복수 평행 4,000m 메가 활주로 2본 (16R/34L & 15L/33R)
    [160, 820].forEach((rX, rIdx) => {
      const rName = rIdx === 0 ? '16R/34L (서측 메인 활주로)' : '15L/33R (동측 평행 활주로)';
      const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 4000), runwayMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(rX, 2.10, incheonZ);
      rMesh.receiveShadow = true;
      this.incheonAirportGroup.add(rMesh);

      // 활주로 시단 피아노 건반 (Threshold Keys)
      [-1900, 1900].forEach(zOff => {
        for (let k = -44; k <= 44; k += 5.5) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 52), whiteLineMat);
          bar.rotation.x = -Math.PI / 2;
          bar.position.set(rX + k, 2.14, incheonZ + zOff);
          this.incheonAirportGroup.add(bar);
        }
      });

      // 중앙선
      for (let z = -1850; z <= 1850; z += 55) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 38), whiteLineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(rX, 2.14, incheonZ + z);
        this.incheonAirportGroup.add(stripe);
      }

      // 착륙 목표 지점 (Aiming Point)
      [-1450, 1450].forEach(z => {
        [-24, 24].forEach(xOff => {
          const aim = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 70), whiteLineMat);
          aim.rotation.x = -Math.PI / 2;
          aim.position.set(rX + xOff, 2.14, incheonZ + z);
          this.incheonAirportGroup.add(aim);
        });
      });

      // 4구 PAPI 진입각 지시등
      for (let p = 0; p < 4; p++) {
        const lamp = new THREE.PointLight(0xffffff, 2.2, 90);
        lamp.position.set(rX - 65, 3.2, incheonZ + 1250 + p * 8);
        this.scene.add(lamp);
        this.papiLights.push(lamp);
      }
    });

    // 활주로 진입등 시스템 (ALS: 고휘도 스트로브 바 24개)
    const alsGroup = new THREE.Group();
    const whiteLampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redLampMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let zDist = 2050; zDist <= 3550; zDist += 65) {
      const isOuter = zDist > 3000;
      const barMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 1.8), isOuter ? redLampMat : whiteLampMat);
      barMesh.position.set(160, 2.4, incheonZ + zDist);
      alsGroup.add(barMesh);

      const barMesh2 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 1.8), isOuter ? redLampMat : whiteLampMat);
      barMesh2.position.set(820, 2.4, incheonZ + zDist);
      alsGroup.add(barMesh2);
    }
    this.incheonAirportGroup.add(alsGroup);

    // 3. 고속 탈출 유도로 & 평행 유도로 시스템
    [-60, 490].forEach(taxX => {
      const taxLine = new THREE.Mesh(new THREE.PlaneGeometry(75, 4200), groundMat);
      taxLine.rotation.x = -Math.PI / 2;
      taxLine.position.set(taxX, 2.06, incheonZ);
      this.incheonAirportGroup.add(taxLine);

      const yLine = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4150), yellowTaxiMat);
      yLine.rotation.x = -Math.PI / 2;
      yLine.position.set(taxX, 2.09, incheonZ);
      this.incheonAirportGroup.add(yLine);
    });

    // 유도로 연결선 8개소
    [-1500, -900, -300, 300, 900, 1500].forEach(zLink => {
      const link = new THREE.Mesh(new THREE.PlaneGeometry(1100, 55), groundMat);
      link.rotation.x = -Math.PI / 2;
      link.position.set(380, 2.06, incheonZ + zLink);
      this.incheonAirportGroup.add(link);
    });

    // --------------------------------------------------------------
    // 4. 인천공항 제1여객터미널 (T1: 1,600m 우아한 곡면 글래스 아치 루프)
    // --------------------------------------------------------------
    const t1Group = new THREE.Group();
    t1Group.position.set(-420, 0, incheonZ);

    // 1) 메인 중앙 홀 (Great Central Hall: 220m x 48m x 450m)
    const t1Hall = new THREE.Mesh(new THREE.BoxGeometry(220, 48, 450), terminalGlassMat);
    t1Hall.position.set(0, 24, 0);
    t1Hall.castShadow = true;
    t1Group.add(t1Hall);
    this.registerObstacle(t1Hall, '인천공항 제1여객터미널 중앙홀', new THREE.Vector3(-420, 0, incheonZ));

    // 중앙 아치형 날개 지붕 (Curved Aero-Roof)
    const t1RoofCenter = new THREE.Mesh(new THREE.CylinderGeometry(130, 130, 470, 32, 1, false, 0, Math.PI), roofMat);
    t1RoofCenter.rotation.x = Math.PI / 2;
    t1RoofCenter.rotation.z = Math.PI;
    t1RoofCenter.position.set(0, 44, 0);
    t1RoofCenter.scale.set(0.9, 0.22, 1.0);
    t1RoofCenter.castShadow = true;
    t1Group.add(t1RoofCenter);

    // 2) T1 좌우 윙 콘코스 (North & South Concourse Wings: 전장 1,600m 확장)
    [-1, 1].forEach(side => {
      const wingLen = 600;
      const wingZ = side * (225 + wingLen / 2);
      const wingMesh = new THREE.Mesh(new THREE.BoxGeometry(110, 34, wingLen), terminalGlassMat);
      wingMesh.position.set(-20, 17, wingZ);
      wingMesh.castShadow = true;
      t1Group.add(wingMesh);

      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(125, 6, wingLen + 20), roofMat);
      wingRoof.position.set(-20, 35, wingZ);
      wingRoof.castShadow = true;
      t1Group.add(wingRoof);
      this.registerObstacle(wingMesh, `인천공항 T1 ${side === -1 ? '남측' : '북측'} 윙 콘코스`, new THREE.Vector3(-420, 0, incheonZ));
    });

    // 3) 4층 출국장 고가도로 램프 (Elevated Departure Viaduct: 폭 26m, 전장 1,400m)
    const viaductMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const viaductRamp = new THREE.Mesh(new THREE.BoxGeometry(26, 3.5, 1400), viaductMat);
    viaductRamp.position.set(-135, 12.5, 0);
    viaductRamp.castShadow = true;
    t1Group.add(viaductRamp);

    // 고가 교각 기둥 24개
    for (let vz = -650; vz <= 650; vz += 60) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 11, 12), concreteMat);
      pillar.position.set(-135, 5.5, vz);
      t1Group.add(pillar);
    }

    // 1층 입국장 도로 (폭 28m, 전장 1,500m)
    const arrivalRoad = new THREE.Mesh(new THREE.PlaneGeometry(28, 1500), runwayMat);
    arrivalRoad.rotation.x = -Math.PI / 2;
    arrivalRoad.position.set(-168, 2.12, 0);
    t1Group.add(arrivalRoad);

    this.incheonAirportGroup.add(t1Group);

    // --------------------------------------------------------------
    // 5. 인천공항 교통센터 (Transportation Center 돔 & 주차빌딩 2동)
    // --------------------------------------------------------------
    const tcGroup = new THREE.Group();
    tcGroup.position.set(-720, 0, incheonZ);

    // 유선형 초대형 유리 돔 (160m x 95m x 28m)
    const tcDome = new THREE.Mesh(
      new THREE.SphereGeometry(95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      terminalGlassMat
    );
    tcDome.scale.set(0.9, 0.32, 1.4);
    tcDome.position.set(0, 0, 0);
    tcDome.castShadow = true;
    tcGroup.add(tcDome);
    this.registerObstacle(tcDome, '인천공항 교통센터 돔', new THREE.Vector3(-720, 0, incheonZ));

    // 단기/장기 주차타워 2동
    [-180, 180].forEach(pz => {
      const parkTower = new THREE.Mesh(new THREE.BoxGeometry(110, 24, 180), concreteMat);
      parkTower.position.set(0, 12, pz);
      parkTower.castShadow = true;
      tcGroup.add(parkTower);
      this.registerObstacle(parkTower, '인천공항 주차타워', new THREE.Vector3(-720, 0, incheonZ));
    });

    this.incheonAirportGroup.add(tcGroup);

    // --------------------------------------------------------------
    // 6. 인천공항 중앙 탑승동 (Concourse: 전장 900m, 폭 110m)
    // --------------------------------------------------------------
    const concourseGroup = new THREE.Group();
    concourseGroup.position.set(-180, 0, incheonZ);

    const ccBody = new THREE.Mesh(new THREE.BoxGeometry(90, 28, 900), terminalGlassMat);
    ccBody.position.set(0, 14, 0);
    ccBody.castShadow = true;
    concourseGroup.add(ccBody);

    const ccRoof = new THREE.Mesh(new THREE.BoxGeometry(105, 5, 920), roofMat);
    ccRoof.position.set(0, 29, 0);
    ccRoof.castShadow = true;
    concourseGroup.add(ccRoof);
    this.registerObstacle(ccBody, '인천공항 탑승동 (Concourse)', new THREE.Vector3(-180, 0, incheonZ));

    this.incheonAirportGroup.add(concourseGroup);

    // --------------------------------------------------------------
    // 7. 인천공항 제2여객터미널 (T2: 모던 H형 에어로 터미널 1,200m)
    // --------------------------------------------------------------
    const t2Group = new THREE.Group();
    t2Group.position.set(-1100, 0, incheonZ);

    const t2Main = new THREE.Mesh(new THREE.BoxGeometry(160, 42, 600), terminalGlassMat);
    t2Main.position.set(0, 21, 0);
    t2Main.castShadow = true;
    t2Group.add(t2Main);

    [-360, 360].forEach(wZ => {
      const t2Wing = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 320), terminalGlassMat);
      t2Wing.position.set(30, 15, wZ);
      t2Wing.castShadow = true;
      t2Group.add(t2Wing);
    });
    this.registerObstacle(t2Main, '인천공항 제2여객터미널 (T2)', new THREE.Vector3(-1100, 0, incheonZ));

    this.incheonAirportGroup.add(t2Group);

    // --------------------------------------------------------------
    // 8. 인천공항 실시간 회전 도킹 탑승교 20개소 (Jetways 1~20) & VDGS 전광판
    // - 평상시 옆쪽(대기 각도)을 보며 대기하다가 비행기가 게이트에 도착하면 L1 도어로 스윙 도킹!
    // --------------------------------------------------------------
    const makeIncheonJetway = (xPos, zPos, gateIdx, name = '게이트 탑승교') => {
      const jGroup = new THREE.Group();

      // 로툰다 고정 타워
      const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 14, 16), concreteMat);
      rotunda.position.set(xPos, 9, incheonZ + zPos);
      rotunda.castShadow = true;
      jGroup.add(rotunda);

      // ★ 로툰다 중심 회전 암 피벗 그룹 (Swing Arm Pivot)
      const armPivot = new THREE.Group();
      armPivot.position.set(xPos, 0, incheonZ + zPos);
      const standbyAngle = (gateIdx % 2 === 0) ? 0.65 : -0.65;
      const dockedAngle = 0.0;
      armPivot.rotation.y = standbyAngle;

      // 통로 브릿지 (암 피벗에 부착되어 함께 회전)
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(75, 7.5, 8.5), roofMat);
      bridge.position.set(40, 8.5, 0);
      bridge.castShadow = true;
      armPivot.add(bridge);

      // 유리창
      const bGlass = new THREE.Mesh(new THREE.BoxGeometry(70, 3.8, 8.7), terminalGlassMat);
      bGlass.position.set(40, 9, 0);
      armPivot.add(bGlass);

      // 휠 대차
      const wheelColumn = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 8, 10), concreteMat);
      wheelColumn.position.set(65, 4.5, 0);
      armPivot.add(wheelColumn);

      // 도킹 캐빈 & 아코디언 캐노피
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 9), concreteMat);
      cabin.position.set(80, 8, 0);
      armPivot.add(cabin);

      const canopy = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.5, 8, 16), groundMat);
      canopy.rotation.y = Math.PI / 2;
      canopy.position.set(86, 8, 0);
      armPivot.add(canopy);

      jGroup.add(armPivot);

      // VDGS 전자식 도킹 유도 전광판 (Visual Docking Guidance System)
      const vdgsBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 5.5, 7.5),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 1.2 })
      );
      vdgsBox.position.set(xPos + 92, 12, incheonZ + zPos);
      jGroup.add(vdgsBox);

      // 지상 정지선 및 유도 황색선
      const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.6), whiteLineMat);
      stopLine.rotation.x = -Math.PI / 2;
      stopLine.position.set(xPos + 95, 2.14, incheonZ + zPos);
      jGroup.add(stopLine);

      this.incheonAirportGroup.add(jGroup);
      this.registerObstacle(rotunda, name, new THREE.Vector3(xPos, 0, incheonZ + zPos));

      this.animatedJetways.push({
        name,
        armPivot,
        standbyAngle,
        dockedAngle,
        currentAngle: standbyAngle,
        targetAngle: standbyAngle,
        stopX: xPos + 95,
        stopZ: incheonZ + zPos,
        isDocked: false
      });
    };

    // T1 탑승교 10개 (동측 계류장 방면)
    [-450, -350, -250, -150, -50, 50, 150, 250, 350, 450].forEach((zGate, gIdx) => {
      makeIncheonJetway(-330, zGate, gIdx, `인천공항 T1 ${gIdx + 1}번 게이트`);
    });

    // 탑승동 탑승교 6개
    [-300, -180, -60, 60, 180, 300].forEach((zGate, gIdx) => {
      makeIncheonJetway(-130, zGate, 10 + gIdx, `인천공항 탑승동 ${11 + gIdx}번 게이트`);
    });

    // T2 탑승교 4개
    [-200, -70, 70, 200].forEach((zGate, gIdx) => {
      makeIncheonJetway(-1020, zGate, 16 + gIdx, `인천공항 T2 ${17 + gIdx}번 게이트`);
    });

    // --------------------------------------------------------------
    // 9. 인천공항 상징 100m 8각 하이테크 관제탑 (ATC Tower)
    // --------------------------------------------------------------
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-420, 0, incheonZ - 850);

    // 8각 콘크리트 코어 샤프트 (높이 95m)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 95, 8), concreteMat);
    shaft.position.y = 47.5;
    shaft.castShadow = true;
    towerGroup.add(shaft);

    // 360도 파노라마 유리 관제실 캡슐 (3층 구조)
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(28, 16, 22, 16), terminalGlassMat);
    cab.position.y = 100;
    cab.castShadow = true;
    towerGroup.add(cab);

    // 상단 레이더 돔
    const radome = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), roofMat);
    radome.position.y = 114;
    towerGroup.add(radome);

    // 최상단 야간 항공 장애등 비콘
    const atcBeacon = new THREE.PointLight(0x38bdf8, 3.5, 450);
    atcBeacon.position.y = 122;
    towerGroup.add(atcBeacon);

    this.incheonAirportGroup.add(towerGroup);
    this.registerObstacle(shaft, '인천공항 관제탑', new THREE.Vector3(-420, 0, incheonZ - 850));

    // --------------------------------------------------------------
    // 10. 화물 터미널 & 정비 격납고 (Cargo Hub & Hangars)
    // --------------------------------------------------------------
    [-46500, -43500].forEach((zC, cIdx) => {
      const cargoBldg = new THREE.Mesh(new THREE.BoxGeometry(180, 28, 110), concreteMat);
      cargoBldg.position.set(-850, 14, zC);
      cargoBldg.castShadow = true;
      this.incheonAirportGroup.add(cargoBldg);
      this.registerObstacle(cargoBldg, `인천공항 화물 터미널 #${cIdx + 1}`);
    });

    // --------------------------------------------------------------
    // 10-B. 인천공항 계류장 지상 마샬러, 순찰 요원 및 토잉카 시스템
    // --------------------------------------------------------------
    // 1) 인천공항 T1 1번 게이트 정면 마샬러 요원
    const incheonMarshaller = this.createGroundCrewMesh(true);
    incheonMarshaller.group.position.set(-235, 2.12, incheonZ - 475);
    incheonMarshaller.group.rotation.y = 0; // 마주봄
    this.incheonAirportGroup.add(incheonMarshaller.group);
    this.marshallerCrew.push({
      mesh: incheonMarshaller,
      pos: new THREE.Vector3(-235, 2.12, incheonZ - 475)
    });

    // 2) 인천공항 계류장 순찰 요원들 4명
    const incheonCrewDefs = [
      { x: -220, z: incheonZ - 300, minZ: incheonZ - 420, maxZ: incheonZ - 180, speed: 1.4, dir: 1 },
      { x: -250, z: incheonZ + 100, minZ: incheonZ - 50,  maxZ: incheonZ + 250, speed: 1.3, dir: -1 },
      { x: -70,  z: incheonZ - 120, minZ: incheonZ - 260, maxZ: incheonZ + 40,  speed: 1.5, dir: 1 },
      { x: -100, z: incheonZ + 180, minZ: incheonZ + 50,  maxZ: incheonZ + 320, speed: 1.2, dir: -1 }
    ];
    incheonCrewDefs.forEach((cDef, idx) => {
      const crew = this.createGroundCrewMesh(false);
      crew.group.position.set(cDef.x, 2.12, cDef.z);
      this.incheonAirportGroup.add(crew.group);
      this.movingGroundCrew.push({
        group: crew.group,
        mesh: crew,
        z: cDef.z,
        minZ: cDef.minZ,
        maxZ: cDef.maxZ,
        speed: cDef.speed,
        dir: cDef.dir,
        walkOffset: idx * 1.5
      });
    });

    // 3) 인천공항 계류장 주행 토잉카 4대
    const incheonTugDefs = [
      { x: -210, z: incheonZ - 350, minZ: incheonZ - 600, maxZ: incheonZ - 100, speed: 9.0, dir: 1, carts: 3 },
      { x: -260, z: incheonZ + 220, minZ: incheonZ - 50,  maxZ: incheonZ + 500, speed: 8.5, dir: -1, carts: 2 },
      { x: -80,  z: incheonZ - 50,  minZ: incheonZ - 350, maxZ: incheonZ + 250, speed: 9.5, dir: 1, carts: 3 },
      { x: 380,  z: incheonZ + 100, minZ: incheonZ - 400, maxZ: incheonZ + 600, speed: 11.0, dir: -1, carts: 2 }
    ];
    incheonTugDefs.forEach((tDef, idx) => {
      const tugData = this.createTowingTugMesh(tDef.carts);
      tugData.group.position.set(tDef.x, 2.12, tDef.z);
      this.incheonAirportGroup.add(tugData.group);
      this.movingTugs.push({
        group: tugData.group,
        beacon: tugData.beacon,
        wheels: tugData.wheels,
        z: tDef.z,
        minZ: tDef.minZ,
        maxZ: tDef.maxZ,
        speed: tDef.speed,
        dir: tDef.dir,
        beaconOffset: idx * 1.5
      });
    });

    // --------------------------------------------------------------
    // 11. 주기된 다른 항공기들 (AI Aircrafts 12대 + 택싱 비행기 1대)
    // --------------------------------------------------------------
    this.initAIAircrafts(incheonZ);

    this.scene.add(this.incheonAirportGroup);
  },

  // ----------------------------------------------------------------
  // 4-B. 주기 및 택싱 중인 다른 여객기들 (AI Aircrafts: B747, A320, DC-10 등)
  // - 대한항공풍 스카이블루 리버리, 아시아나풍 색동 리버리, 카고 화물 리버리
  // ----------------------------------------------------------------
  initAIAircrafts(incheonZ) {
    this.aiAircraft = [];

    // 1. 게이트에 도킹된 주기 AI 여객기들 10대
    const parkedDefs = [
      { type: 'b747', livery: 'korean', x: -245, z: incheonZ - 350, rotY: Math.PI / 2, name: 'B747 대한항공 점보' },
      { type: 'a320', livery: 'asiana', x: -250, z: incheonZ - 250, rotY: Math.PI / 2, name: 'A320 아시아나' },
      { type: 'dc10', livery: 'sky',    x: -248, z: incheonZ - 150, rotY: Math.PI / 2, name: 'DC-10 스카이' },
      { type: 'b747', livery: 'korean', x: -245, z: incheonZ + 150, rotY: Math.PI / 2, name: 'B747 대한항공 점보' },
      { type: 'a320', livery: 'asiana', x: -250, z: incheonZ + 250, rotY: Math.PI / 2, name: 'A320 아시아나' },
      { type: 'md80', livery: 'sky',    x: -252, z: incheonZ + 350, rotY: Math.PI / 2, name: 'MD-80 제트' },
      // 탑승동 게이트
      { type: 'a320', livery: 'korean', x: -50, z: incheonZ - 180, rotY: Math.PI / 2, name: 'A320 탑승동' },
      { type: 'a320', livery: 'asiana', x: -50, z: incheonZ + 180, rotY: Math.PI / 2, name: 'A320 탑승동' },
      // 화물 계류장
      { type: 'b747', livery: 'cargo',  x: -720, z: incheonZ - 1500, rotY: 0, name: 'B747 화물기 #1' },
      { type: 'dc10', livery: 'cargo',  x: -720, z: incheonZ + 1500, rotY: 0, name: 'DC-10 화물기 #2' }
    ];

    parkedDefs.forEach(def => {
      const plane = this.createParkedAircraft(def.type, def.livery);
      plane.position.set(def.x, 2.12, def.z);
      plane.rotation.y = def.rotY;
      this.incheonAirportGroup.add(plane);
      this.registerObstacle(plane, def.name);
    });

    // --------------------------------------------------------------
    // 2. ★ 살아 숨쉬는 비행 AI 항공기 편대 16대 (눈앞에서 날아다니고 활주하는 역동적 항공망)
    // --------------------------------------------------------------

    // [AI-1: 출발 해상공항 36R 활주로 쾌속 이륙기 (A320 대한항공)]
    // 플레이어 바로 옆 활주로에서 굉음을 내며 전속력으로 활주하여 이륙!
    const depTakeoff = this.createParkedAircraft('a320', 'korean');
    depTakeoff.position.set(-120, 2.12, 1200);
    depTakeoff.rotation.set(0, 0, 0); // 북쪽(활주로 진행방향)을 향해 똑바로 정렬
    this.scene.add(depTakeoff);
    this.aiAircraft.push({
      id: 'dep_takeoff',
      name: '대한항공 A320 [출발 해상공항 쾌속 이륙편]',
      mesh: depTakeoff,
      mode: 'DEP_TAKEOFF_CIRCUIT',
      state: 'TAKEOFF_ROLL',
      speed: 70, // 시속 280km로 빠른 활주
      heading: 0
    });

    // [AI-2: 출발 해상공항 상공 저고도 가로지르기 (B747-400 대한항공)]
    // 게임 시작 시 출발 활주로 바로 앞 하늘(고도 190m)을 가로질러 날아감!
    const depCross = this.createParkedAircraft('b747', 'korean');
    depCross.position.set(-2200, 190, 400);
    depCross.rotation.set(0, -Math.PI / 2, 0); // 동쪽(+X) 진행방향 정렬
    this.scene.add(depCross);
    this.aiAircraft.push({
      id: 'dep_cross',
      name: '대한항공 B747 점보 [해상공항 상공 횡단편]',
      mesh: depCross,
      mode: 'DEP_CROSSING',
      speed: 95,
      heading: -Math.PI / 2 // 서 -> 동 횡단
    });

    // [AI-3: 출발 해상공항 36L 활주로 착륙 접근기 (MD-80 스카이)]
    const depLanding = this.createParkedAircraft('md80', 'sky');
    depLanding.position.set(160, 220, 2600);
    depLanding.rotation.set(-0.04, 0, 0); // 북쪽(-Z) 활주로를 향해 글라이드슬롭 정렬
    this.scene.add(depLanding);
    this.aiAircraft.push({
      id: 'dep_landing',
      name: '스카이 MD-80 [해상공항 접근 착륙편]',
      mesh: depLanding,
      mode: 'DEP_LANDING_CIRCUIT',
      state: 'APPROACH',
      speed: 80,
      heading: 0
    });

    // [AI-4: 출발 해상공항 바다 상공 웅장한 선회기 (DC-10 삼발기)]
    const depOrbit = this.createParkedAircraft('dc10', 'asiana');
    depOrbit.position.set(1800, 280, 0);
    depOrbit.rotation.set(0, Math.PI, 0.26);
    this.scene.add(depOrbit);
    this.aiAircraft.push({
      id: 'dep_orbit',
      name: '아시아나 DC-10 [해상공항 바다 선회편]',
      mesh: depOrbit,
      mode: 'DEP_ORBIT',
      speed: 85,
      orbitAngle: 0,
      orbitRadius: 1800,
      orbitAlt: 280
    });

    // [AI-5: 플레이어 전방 편대 선도 순항기 (A320 아시아나)]
    // 플레이어가 날아갈 때 항상 앞쪽 700m 상공에서 하얀 비행운을 뿜으며 똑바로 날아감!
    const proxLead = this.createParkedAircraft('a320', 'asiana');
    proxLead.position.set(80, 240, -1200);
    proxLead.rotation.set(0, 0, 0); // 북쪽 진행방향
    this.scene.add(proxLead);
    this.aiAircraft.push({
      id: 'prox_lead',
      name: '아시아나 A320 [항로 선도 순항편]',
      mesh: proxLead,
      mode: 'PROX_LEAD',
      speed: 92,
      heading: 0
    });

    // [AI-6: 플레이어 좌측 대항 근접 교차기 (B747-400 점보 - Head-on Crossing)]
    // 플레이어 좌측 280m에서 반대 방향(남쪽)으로 마주쳐 굉음을 내며 스쳐 지나감!
    const proxHeadon1 = this.createParkedAircraft('b747', 'cargo');
    proxHeadon1.position.set(-280, 280, -2800);
    proxHeadon1.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향 정렬
    this.scene.add(proxHeadon1);
    this.aiAircraft.push({
      id: 'prox_headon1',
      name: 'B747 대형 화물기 [대항 남하 교차편]',
      mesh: proxHeadon1,
      mode: 'PROX_HEADON',
      speed: 100,
      offsetSide: -320,
      heading: Math.PI
    });

    // [AI-7: 플레이어 우측 초고속 콩코드 대항 교차기 (Concorde 콩코드)]
    const proxHeadon2 = this.createParkedAircraft('concorde', 'korean');
    proxHeadon2.position.set(340, 360, -4500);
    proxHeadon2.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향 정렬
    this.scene.add(proxHeadon2);
    this.aiAircraft.push({
      id: 'prox_headon2',
      name: '콩코드 초음속기 [마하 2.0 고공 교차편]',
      mesh: proxHeadon2,
      mode: 'PROX_HEADON',
      speed: 155, // 시속 580km
      offsetSide: 380,
      heading: Math.PI
    });

    // [AI-8: 200km 대륙 항로 중부 순항기 1 (A320 대한항공)]
    const enrA320 = this.createParkedAircraft('a320', 'korean');
    enrA320.position.set(-180, 380, -14000);
    enrA320.rotation.set(0, 0, 0); // 북쪽(-Z) 진행방향
    this.scene.add(enrA320);
    this.aiAircraft.push({
      id: 'enr_a320',
      name: '대한항공 A320 [대륙 항로 북상 정기편]',
      mesh: enrA320,
      mode: 'ENROUTE_NORTH',
      speed: 105,
      heading: 0
    });

    // [AI-9: 200km 대륙 항로 중부 순항기 2 (DC-10 스카이)]
    const enrDC10 = this.createParkedAircraft('dc10', 'sky');
    enrDC10.position.set(240, 420, -22000);
    enrDC10.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향
    this.scene.add(enrDC10);
    this.aiAircraft.push({
      id: 'enr_dc10',
      name: '스카이 DC-10 [대륙 항로 남하 정기편]',
      mesh: enrDC10,
      mode: 'ENROUTE_SOUTH',
      speed: 98,
      heading: Math.PI
    });

    // [AI-10: 대륙 횡단 초고속 콩코드 (Concorde)]
    const enrConcorde = this.createParkedAircraft('concorde', 'asiana');
    enrConcorde.position.set(0, 540, -30000);
    enrConcorde.rotation.set(0, 0, 0); // 북쪽(-Z) 진행방향
    this.scene.add(enrConcorde);
    this.aiAircraft.push({
      id: 'enr_concorde',
      name: '콩코드 초음속기 [대륙 횡단 초음속 회랑]',
      mesh: enrConcorde,
      mode: 'ENROUTE_NORTH',
      speed: 160,
      heading: 0
    });

    // [AI-11: 대륙 CBD 마천루 숲 상공 저공 순항기 (MD-80)]
    const enrCity = this.createParkedAircraft('md80', 'korean');
    enrCity.position.set(1200, 260, -37000);
    enrCity.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 진행방향
    this.scene.add(enrCity);
    this.aiAircraft.push({
      id: 'enr_city',
      name: '대한항공 MD-80 [대륙 메트로폴리스 상공편]',
      mesh: enrCity,
      mode: 'ENROUTE_SOUTH',
      speed: 90,
      heading: Math.PI
    });

    // [AI-12: 인천국제공항 15L 활주로 전담 연속 이착륙기 (B747-400 대한항공)]
    const icnTakeoff = this.createParkedAircraft('b747', 'korean');
    icnTakeoff.position.set(450, 2.12, incheonZ - 1400);
    icnTakeoff.rotation.set(0, Math.PI, 0); // 남쪽(+Z 활주로 이륙방향) 정렬
    this.scene.add(icnTakeoff);
    this.aiAircraft.push({
      id: 'icn_takeoff',
      name: '대한항공 B747 [인천 15L 이륙 활주편]',
      mesh: icnTakeoff,
      mode: 'ICN_TAKEOFF_CIRCUIT',
      state: 'TAKEOFF_ROLL',
      speed: 85,
      heading: Math.PI
    });

    // [AI-13: 인천국제공항 16R 활주로 착륙 어프로치기 (A320 아시아나)]
    const icnLanding = this.createParkedAircraft('a320', 'asiana');
    icnLanding.position.set(160, 240, incheonZ + 6000);
    icnLanding.rotation.set(-0.04, 0, 0); // 북쪽(-Z 활주로) 향해 글라이드슬롭 정렬
    this.scene.add(icnLanding);
    this.aiAircraft.push({
      id: 'icn_landing',
      name: '아시아나 A320 [인천 16R 착륙 어프로치편]',
      mesh: icnLanding,
      mode: 'ICN_LANDING_CIRCUIT',
      state: 'FINAL_APPROACH',
      speed: 78,
      heading: 0
    });

    // [AI-14: 인천공항 관제탑 상공 홀딩 패턴 선회기 (B747 대한항공)]
    const icnHolding = this.createParkedAircraft('b747', 'korean');
    icnHolding.position.set(1600, 480, incheonZ);
    icnHolding.rotation.set(0, Math.PI, 0.26);
    this.scene.add(icnHolding);
    this.aiAircraft.push({
      id: 'icn_holding',
      name: '대한항공 B747 [인천공항 상공 대기 선회편]',
      mesh: icnHolding,
      mode: 'ICN_HOLDING',
      speed: 95,
      orbitAngle: 0
    });

    // [AI-15: 인천공항 15L 착륙 최종 접근기 (DC-10 삼발기)]
    const icnFinal2 = this.createParkedAircraft('dc10', 'asiana');
    icnFinal2.position.set(450, 320, incheonZ + 8500);
    icnFinal2.rotation.set(-0.04, 0, 0); // 북쪽(-Z 활주로) 향해 정렬
    this.scene.add(icnFinal2);
    this.aiAircraft.push({
      id: 'icn_final2',
      name: '아시아나 DC-10 [인천 15L 착륙 어프로치편]',
      mesh: icnFinal2,
      mode: 'ICN_LANDING_CIRCUIT_15L',
      state: 'FINAL_APPROACH',
      speed: 76,
      heading: 0
    });

    // [AI-16: 인천공항 유도로 택싱 지상 여객기 (A320)]
    const icnTaxi = this.createParkedAircraft('a320', 'korean');
    icnTaxi.position.set(-60, 2.12, incheonZ + 800);
    icnTaxi.rotation.set(0, 0, 0); // 북쪽(-Z) 주행 정렬
    this.incheonAirportGroup.add(icnTaxi);
    this.aiAircraft.push({
      id: 'icn_taxi',
      name: '대한항공 A320 [유도로 지상 유도 주행]',
      mesh: icnTaxi,
      mode: 'TAXIWAY_GROUND',
      speed: 18,
      minZ: incheonZ - 1400,
      maxZ: incheonZ + 1400,
      dir: -1
    });
  },

  // AI 여객기 경량 고품질 메쉬 생성 헬퍼
  createParkedAircraft(type, livery = 'korean') {
    const group = new THREE.Group();

    // 리버리별 색상 지정
    let bodyColor = 0xf8fafc;
    let cheatlineColor = 0x0284c7; // 기본 블루
    let tailColor = 0x0369a1;

    if (livery === 'korean') {
      bodyColor = 0xf0f9ff;
      cheatlineColor = 0x38bdf8; // 대한항공 스카이블루
      tailColor = 0x0284c7;
    } else if (livery === 'asiana') {
      bodyColor = 0xfafafa;
      cheatlineColor = 0xef4444; // 아시아나 색동 레드
      tailColor = 0xf59e0b;
    } else if (livery === 'cargo') {
      bodyColor = 0xe2e8f0;
      cheatlineColor = 0x475569;
      tailColor = 0x334155;
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.25 });
    const cheatlineMat = new THREE.MeshStandardMaterial({ color: cheatlineColor, roughness: 0.25 });
    const tailMat = new THREE.MeshStandardMaterial({ color: tailColor, roughness: 0.25 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });

    const isJumbo = (type === 'b747');
    const isConcorde = (type === 'concorde');
    const fRadius = isJumbo ? 3.4 : (type === 'dc10' ? 2.9 : (isConcorde ? 1.45 : 2.1));
    const fLength = isJumbo ? 38.0 : (type === 'dc10' ? 30.0 : (isConcorde ? 44.0 : 22.0));
    const wingSpan = isJumbo ? 34.0 : (type === 'dc10' ? 24.0 : (isConcorde ? 17.5 : 18.0));

    // 1. 동체 (Fuselage)
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(fRadius, fRadius, fLength, 18), bodyMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.position.y = fRadius + 2.2;
    fuse.castShadow = true;
    group.add(fuse);

    // B747 2층 어퍼덱 험프
    if (isJumbo) {
      const hump = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 15, 16, 1, false, 0, Math.PI), bodyMat);
      hump.rotation.x = Math.PI / 2;
      hump.rotation.z = Math.PI;
      hump.position.set(0, fRadius + 3.2, -6.5);
      hump.scale.set(0.95, 1.0, 1.0);
      group.add(hump);
    }

    // 노즈 콘 (콩코드는 날카로운 롱 노즈)
    const noseLen = isConcorde ? 8.5 : fRadius * 2.8;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(fRadius, noseLen, 18), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, fRadius + 2.2, -fLength / 2 - (noseLen / 2));
    if (isConcorde) nose.rotation.x = -Math.PI / 2 + 0.08; // 드룹 노즈 살짝 처짐
    group.add(nose);

    // 윈드실드
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(fRadius * 0.9, 1.1, 1.8), glassMat);
    windshield.position.set(0, fRadius + (isJumbo ? 4.2 : (isConcorde ? 2.5 : 3.0)), -fLength / 2 - 1.2);
    windshield.rotation.x = isConcorde ? 0.22 : 0.38;
    group.add(windshield);

    // 치트라인 띠
    const cheatline = new THREE.Mesh(new THREE.CylinderGeometry(fRadius + 0.05, fRadius + 0.05, fLength * 0.85, 18), cheatlineMat);
    cheatline.rotation.x = Math.PI / 2;
    cheatline.position.set(0, fRadius + 2.2, 0);
    cheatline.scale.set(1.01, 1.0, 0.15);
    group.add(cheatline);

    // 2. 주익 날개 (Wings) - 콩코드는 거대 델타익
    if (isConcorde) {
      const deltaWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.35, 24.0), wingMat);
      deltaWing.position.set(0, fRadius + 1.6, 3.5);
      deltaWing.rotation.x = 0.04;
      group.add(deltaWing);
    } else {
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.45, isJumbo ? 7.5 : 4.8), wingMat);
      wingL.position.set(-wingSpan / 2, fRadius + 1.8, 0);
      wingL.rotation.y = 0.35;
      wingL.rotation.z = 0.06;
      wingL.castShadow = true;
      group.add(wingL);

      const wingR = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.45, isJumbo ? 7.5 : 4.8), wingMat);
      wingR.position.set(wingSpan / 2, fRadius + 1.8, 0);
      wingR.rotation.y = -0.35;
      wingR.rotation.z = -0.06;
      wingR.castShadow = true;
      group.add(wingR);

      // 윙렛
      [-1, 1].forEach(side => {
        const wlet = new THREE.Mesh(new THREE.BoxGeometry(0.28, isJumbo ? 3.4 : 2.2, 1.8), cheatlineMat);
        wlet.position.set(side * wingSpan, fRadius + 3.0, -side * 2.5);
        wlet.rotation.y = -side * 0.35;
        group.add(wlet);
      });
    }

    // 3. 제트 엔진 (Engines)
    if (isConcorde) {
      // 콩코드 하부 4연장 사각 나셀 팩
      [-4.5, 4.5].forEach(ex => {
        const engBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 8.5), bodyMat);
        engBox.position.set(ex, fRadius + 0.6, 6.5);
        engBox.castShadow = true;
        group.add(engBox);

        // 배기 노즐 2기
        [-0.8, 0.8].forEach(nx => {
          const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.60, 1.4, 12), chromeMat);
          nozzle.rotation.x = Math.PI / 2;
          nozzle.position.set(ex + nx, fRadius + 0.6, 11.2);
          group.add(nozzle);
        });
      });
    } else {
      const engineCount = isJumbo ? 4 : (type === 'dc10' ? 3 : 2);
      const engXPositions = isJumbo ? [-14, -8, 8, 14] : (type === 'dc10' ? [-8.5, 8.5] : [-6.5, 6.5]);
      engXPositions.forEach(ex => {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.05, 4.6, 14), bodyMat);
        eng.rotation.x = Math.PI / 2;
        eng.position.set(ex, fRadius + 0.5, 0.5);
        eng.castShadow = true;
        group.add(eng);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 8, 16), chromeMat);
        lip.position.set(ex, fRadius + 0.5, -1.8);
        group.add(lip);
      });
    }

    if (type === 'dc10') {
      // 꼬리날개 중앙 2번 엔진
      const tailEng = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.15, 5.0, 14), bodyMat);
      tailEng.rotation.x = Math.PI / 2;
      tailEng.position.set(0, fRadius + 8.5, fLength / 2 - 2.5);
      group.add(tailEng);
    }

    // 4. 수직 꼬리날개 (Vertical Fin)
    const finHeight = isJumbo ? 9.5 : (type === 'dc10' ? 8.2 : 6.8);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, finHeight, 5.5), tailMat);
    fin.position.set(0, fRadius + 2.2 + finHeight / 2, fLength / 2 - 2.2);
    fin.rotation.x = -0.35;
    fin.castShadow = true;
    group.add(fin);

    // 수평 미익
    const hStab = new THREE.Mesh(new THREE.BoxGeometry(wingSpan * 0.45, 0.35, 3.2), wingMat);
    hStab.position.set(0, fRadius + 3.8, fLength / 2 - 1.5);
    group.add(hStab);

    // 5. 랜딩기어 바퀴
    [-2.8, 2.8].forEach(wx => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.5, 12), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.78, 1.5);
      group.add(wheel);
    });
    const noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 10), tireMat);
    noseWheel.rotation.z = Math.PI / 2;
    noseWheel.position.set(0, 0.6, -fLength / 2 + 2.5);
    group.add(noseWheel);

    return group;
  },

  // ----------------------------------------------------------------
  // 4-C. 공항 리무진 버스 터미널 도착/정차/출발 시스템 (Bus Arrival Loop)
  // - 공항 리무진 버스, KAL 리무진, 터미널 셔틀 등 24대 실시간 도착 연출
  // ----------------------------------------------------------------
  initAirportBuses() {
    this.airportBuses = [];
    const incheonZ = -45000;

    const busTypes = [
      { name: 'limousine', color: 0x1e3a8a, label: '인천공항 리무진' }, // 네이비
      { name: 'kal',       color: 0x0284c7, label: 'KAL 리무진' },     // 스카이블루
      { name: 'express',   color: 0xdc2626, label: '경기 공항버스' },   // 레드
      { name: 'shuttle',   color: 0x16a34a, label: '터미널 무료셔틀' }  // 그린
    ];

    // 터미널 1층 입국장 & 3층 출국장 승강장에 도착하고 순환하는 버스 20대
    for (let b = 0; b < 20; b++) {
      const bInfo = busTypes[b % busTypes.length];
      const isDeparture = (b % 2 === 0); // 3층 출국장(고가) vs 1층 입국장(지상)
      const busMesh = this.createAirportBusMesh(bInfo.color, bInfo.label);

      const targetX = isDeparture ? -555 : -588;
      const targetY = isDeparture ? 14.5 : 2.14;
      // 정류장 정차 구간: Z = incheonZ - 350 ~ incheonZ + 350
      const stopZ = incheonZ - 320 + (b / 20) * 640;

      busMesh.position.set(targetX, targetY, incheonZ + 1200 - b * 150);
      busMesh.rotation.y = Math.PI; // 남쪽 -> 북쪽 방향 주행
      this.incheonAirportGroup.add(busMesh);

      this.airportBuses.push({
        mesh: busMesh,
        speed: 18 + Math.random() * 6,
        isDeparture,
        targetX,
        targetY,
        stopZ,
        state: 'APPROACHING', // 'APPROACHING' | 'STOPPED' | 'DEPARTING'
        stopTimer: 0,
        stopDuration: 5.5 + Math.random() * 5.0, // 5~10초간 승강장에 정차
        minZ: incheonZ - 900,
        maxZ: incheonZ + 1500
      });
    }
  },

  // 공항 리무진 버스 정밀 3D 모델링
  createAirportBusMesh(color, label = '공항 리무진') {
    const v = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.35 });
    const whiteRoofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.95 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const bW = 2.8, bH = 3.4, bL = 12.5;

    // 하부 차체 바디
    const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH * 0.55, bL), bodyMat);
    body.position.y = (bH * 0.55) / 2 + 0.6;
    body.castShadow = true;
    v.add(body);

    // 파노라마 창문 띠
    const windowBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.05, 1.25, bL - 1.2), glassMat);
    windowBand.position.set(0, 2.35, 0);
    v.add(windowBand);

    // 화이트 루프 패널
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.4, bL), whiteRoofMat);
    roof.position.set(0, 3.15, 0);
    roof.castShadow = true;
    v.add(roof);

    // 루프 상단 에어컨 공조기 유닛
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.8), whiteRoofMat);
    acUnit.position.set(0, 3.45, 0.5);
    v.add(acUnit);

    // 대형 전면 곡면 윈드실드
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.2, 1.8, 0.4), glassMat);
    windshield.position.set(0, 2.1, -bL / 2 - 0.05);
    windshield.rotation.x = -0.15;
    v.add(windshield);

    // 헤드라이트 & 테일라이트
    [-bW * 0.38, bW * 0.38].forEach(hx => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.2), lightMat);
      hl.position.set(hx, 0.9, -bL / 2 - 0.08);
      v.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.2), tailMat);
      tl.position.set(hx, 0.9, bL / 2 + 0.08);
      v.add(tl);
    });

    // 휠 6개 (전방 1축, 후방 2축 대형 리무진 구조)
    [-bL * 0.36, bL * 0.24, bL * 0.36].forEach(wZ => {
      [-bW / 2 - 0.1, bW / 2 + 0.1].forEach(wX => {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 12), wheelMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(wX, 0.62, wZ);
        tire.castShadow = true;
        v.add(tire);
      });
    });

    return v;
  },

  // 공항 리무진 버스 실시간 이동 및 승강장 정차/출발 루프
  updateAirportBuses(dt) {
    if (!this.airportBuses || this.airportBuses.length === 0) return;

    this.airportBuses.forEach(b => {
      if (b.state === 'APPROACHING') {
        // 승강장 방면으로 주행 (Z 감소)
        b.mesh.position.z -= b.speed * dt;

        // 정류장(stopZ) 근처에 도달하면 감속 및 정차!
        if (Math.abs(b.mesh.position.z - b.stopZ) < 8.0) {
          b.mesh.position.z = b.stopZ;
          b.state = 'STOPPED';
          b.stopTimer = 0;
        }
      } else if (b.state === 'STOPPED') {
        // 정류장에 정차하여 승객 승하차 대기 (비상등 점멸)
        b.stopTimer += dt;
        if (b.stopTimer >= b.stopDuration) {
          // 승객 승하차 완료 -> 다시 출발!
          b.state = 'DEPARTING';
        }
      } else if (b.state === 'DEPARTING') {
        // 다시 가속하며 터미널 탈출
        b.mesh.position.z -= (b.speed * 1.1) * dt;

        // 터미널 순환로 끝에 도달하면 다시 고속도로에서 진입하도록 루프
        if (b.mesh.position.z < b.minZ) {
          b.mesh.position.z = b.maxZ;
          b.state = 'APPROACHING';
        }
      }
    });
  },

  // AI 여객기 활주로 이착륙 활주, 고공 순항 및 공역 비행 실시간 업데이트 (진행 방향과 기수 100% 일치)
  updateAIAircraft(dt) {
    if (!this.aiAircraft || this.aiAircraft.length === 0) return;

    this.aiContrailTimer = (this.aiContrailTimer || 0) + dt;
    const shouldSpawnContrail = (this.aiContrailTimer >= 0.05); // 0.05초마다 굵고 웅장한 비행운 분출
    if (shouldSpawnContrail) this.aiContrailTimer = 0;

    const incheonZ = -45000;
    const playerPos = this.planeGroup ? this.planeGroup.position : new THREE.Vector3(0, 0, 0);

    this.aiAircraft.forEach(ai => {
      const p = ai.mesh.position;

      // ------------------------------------------------------------
      // 1. [AI-1] 출발 해상공항 36R 활주로 쾌속 이륙 서킷 (A320 대한항공)
      // - 플레이어 바로 옆 활주로에서 굉음을 내며 북쪽(-Z)으로 가속 질주 후 이륙!
      // ------------------------------------------------------------
      if (ai.mode === 'DEP_TAKEOFF_CIRCUIT') {
        if (ai.state === 'TAKEOFF_ROLL') {
          ai.speed = Math.min(105, ai.speed + dt * 38);
          p.z -= ai.speed * dt; // 북쪽 방향 고속 질주 (1200 -> -350)
          p.y = 2.12;
          p.x = -120;
          ai.mesh.rotation.set(0, 0, 0); // 북쪽(-Z) 정면 전진

          if (p.z < -350) {
            ai.state = 'LIFTOFF_CLIMB';
          }
        } else if (ai.state === 'LIFTOFF_CLIMB') {
          p.z -= ai.speed * dt;
          p.y += (ai.speed * 0.42) * dt;
          ai.mesh.rotation.set(0.22, 0, 0); // 북쪽을 보며 기수 상승 (피치 업)

          if (p.y >= 260) {
            ai.state = 'CIRCUIT_ORBIT';
            ai.orbitAngle = Math.PI; // -Z 위치에서 원형 궤도 자연스럽게 연결
          }
        } else if (ai.state === 'CIRCUIT_ORBIT') {
          ai.orbitAngle += dt * 0.38;
          p.x = Math.cos(ai.orbitAngle) * 1400;
          p.z = Math.sin(ai.orbitAngle) * 1400;
          p.y = 260;
          // 접선 속도 방향: Math.PI - ai.orbitAngle, 좌선회 뱅크: 0.26
          ai.mesh.rotation.set(0, Math.PI - ai.orbitAngle, 0.26);

          if (ai.orbitAngle >= Math.PI * 3) {
            ai.state = 'APPROACH_LAND';
          }
        } else if (ai.state === 'APPROACH_LAND') {
          p.x = THREE.MathUtils.lerp(p.x, -120, 0.06);
          p.z -= 65 * dt; // 북쪽으로 강하 접근
          p.y = THREE.MathUtils.lerp(p.y, 2.12, 0.045);
          ai.mesh.rotation.set(-0.04, 0, 0); // 북쪽을 보며 부드러운 착륙 강하각

          if (p.y <= 2.4 && p.z <= 600) {
            p.y = 2.12;
            p.z = 1400;
            ai.speed = 30;
            ai.state = 'TAKEOFF_ROLL';
            this.createTouchdownSmoke(new THREE.Vector3(-120, 2.12, 600));
          }
        }
      }

      // ------------------------------------------------------------
      // 2. [AI-2] 출발 해상공항 상공 저고도 가로지르기 (B747 대한항공)
      // - 출발 활주로 앞바다 하늘(고도 190m)을 서->동(+X)으로 웅장하게 횡단!
      // ------------------------------------------------------------
      else if (ai.mode === 'DEP_CROSSING') {
        p.x += ai.speed * dt; // 동쪽(+X)으로 전진 비행
        p.y = 190;
        p.z = 400;
        ai.mesh.rotation.set(0, -Math.PI / 2, 0); // 동쪽(+X) 정면 비행
        if (p.x > 2500) {
          p.x = -2500; // 서쪽에서 다시 횡단 루프
        }
      }

      // ------------------------------------------------------------
      // 3. [AI-3] 출발 해상공항 36L 활주로 접근 착륙기 (MD-80 스카이)
      // - 남쪽 바다에서 북쪽(-Z) 활주로를 향해 똑바로 하강 접근!
      // ------------------------------------------------------------
      else if (ai.mode === 'DEP_LANDING_CIRCUIT') {
        p.z -= ai.speed * dt; // 북쪽(-Z)으로 진입
        p.y = Math.max(2.12, p.y - dt * 18.0);
        p.x = 160;
        ai.mesh.rotation.set(-0.04, 0, 0); // 북쪽 정면 착륙 강하
        if (p.y <= 2.2 && p.z < 200) {
          this.createTouchdownSmoke(p.clone());
          p.z = 3500; // 남쪽 바다에서 다시 착륙 접근 루프
          p.y = 260;
        }
      }

      // ------------------------------------------------------------
      // 4. [AI-4] 출발 해상공항 바다 상공 웅장한 선회기 (DC-10 삼발기)
      // ------------------------------------------------------------
      else if (ai.mode === 'DEP_ORBIT') {
        ai.orbitAngle = (ai.orbitAngle || 0) + dt * 0.28;
        const r = ai.orbitRadius || 1800;
        p.x = Math.cos(ai.orbitAngle) * r;
        p.z = Math.sin(ai.orbitAngle) * r;
        p.y = ai.orbitAlt || 280;
        ai.mesh.rotation.set(0, Math.PI - ai.orbitAngle, 0.26); // 진행 방향 일치 + 뱅크각
      }

      // ------------------------------------------------------------
      // 5. [AI-5] 플레이어 전방 편대 선도 순항기 (A320 아시아나)
      // - 플레이어 앞쪽 700m 상공에서 북쪽(-Z)으로 앞서 비행!
      // ------------------------------------------------------------
      else if (ai.mode === 'PROX_LEAD') {
        const targetZ = playerPos.z - 750;
        p.z = THREE.MathUtils.lerp(p.z, targetZ, 0.05);
        p.x = THREE.MathUtils.lerp(p.x, playerPos.x + 120, 0.03);
        p.y = THREE.MathUtils.lerp(p.y, Math.max(80, playerPos.y + 35), 0.04);
        ai.mesh.rotation.set(0, 0, 0); // 북쪽(-Z) 정면 비행
      }

      // ------------------------------------------------------------
      // 6. [AI-6 & 7] 플레이어 근접 대항 교차기 (Head-on Close Crossing)
      // - 남쪽(+Z)을 똑바로 바라보며 남하하여 마주쳐 스쳐 지나감!
      // ------------------------------------------------------------
      else if (ai.mode === 'PROX_HEADON') {
        p.z += ai.speed * dt; // 남쪽(+Z)으로 비행
        p.x = playerPos.x + (ai.offsetSide || -300);
        ai.mesh.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 정면 비행!

        // 플레이어 뒤쪽 1200m로 벗어나면 다시 플레이어 전방 2200m에 리스폰!
        if (p.z > playerPos.z + 1200) {
          p.z = playerPos.z - 2200;
          p.y = Math.max(90, playerPos.y + 40 + Math.random() * 60);
        }
      }

      // ------------------------------------------------------------
      // 7. [AI-8, 10] 200km 대륙 항로 북상 순항기들 (A320, Concorde)
      // - 북쪽(-Z)을 바라보며 순항!
      // ------------------------------------------------------------
      else if (ai.mode === 'ENROUTE_NORTH') {
        p.z -= ai.speed * dt; // 북쪽 이동
        ai.mesh.rotation.set(0, 0, 0); // 북쪽(-Z) 정면
        if (p.z < incheonZ - 3000) {
          p.z = 2500;
        }
      }

      // ------------------------------------------------------------
      // 8. [AI-9, 11] 200km 대륙 항로 남하 순항기들 (DC-10, MD-80)
      // - 남쪽(+Z)을 바라보며 순항!
      // ------------------------------------------------------------
      else if (ai.mode === 'ENROUTE_SOUTH') {
        p.z += ai.speed * dt; // 남쪽 이동
        ai.mesh.rotation.set(0, Math.PI, 0); // 남쪽(+Z) 정면
        if (p.z > 2500) {
          p.z = incheonZ - 3000;
        }
      }

      // ------------------------------------------------------------
      // 9. [AI-12] 인천국제공항 15L 활주로 전담 연속 이륙기 (B747 점보)
      // - 인천 15L 활주로에서 남쪽(+Z)으로 활주/이륙 후 서킷 비행!
      // ------------------------------------------------------------
      else if (ai.mode === 'ICN_TAKEOFF_CIRCUIT') {
        if (ai.state === 'TAKEOFF_ROLL') {
          ai.speed = Math.min(105, ai.speed + dt * 32);
          p.z += ai.speed * dt; // 남쪽을 향해 활주로 질주
          p.y = 2.12;
          p.x = 450;
          ai.mesh.rotation.set(0, Math.PI, 0); // 남쪽 정면 활주

          if (p.z > incheonZ + 1800) {
            ai.state = 'ROTATION_CLIMB';
          }
        } else if (ai.state === 'ROTATION_CLIMB') {
          p.z += ai.speed * dt;
          p.y += (ai.speed * 0.42) * dt;
          ai.mesh.rotation.set(0.22, Math.PI, 0); // 남쪽을 보며 기수 상승

          if (p.y >= 380) {
            ai.state = 'DOWNWIND_CRUISE';
          }
        } else if (ai.state === 'DOWNWIND_CRUISE') {
          p.z -= ai.speed * dt; // 북쪽(-Z)으로 순항
          p.x = 1200;
          p.y = 420;
          ai.mesh.rotation.set(0, 0, 0); // 북쪽 정면 비행

          if (p.z < incheonZ - 3800) {
            ai.state = 'BASE_FINAL';
          }
        } else if (ai.state === 'BASE_FINAL') {
          p.z += ai.speed * dt * 0.45; // 남쪽(+Z)으로 강하 접근
          p.x = THREE.MathUtils.lerp(p.x, 450, 0.05);
          p.y = THREE.MathUtils.lerp(p.y, 2.12, 0.04);
          ai.mesh.rotation.set(-0.04, Math.PI, 0); // 남쪽을 보며 강하

          if (p.y <= 2.8 && Math.abs(p.x - 450) < 35) {
            ai.state = 'TAKEOFF_ROLL';
            p.y = 2.12;
            p.x = 450;
            p.z = incheonZ - 1500;
            ai.speed = 35;
            this.createTouchdownSmoke(p.clone());
          }
        }
      }

      // ------------------------------------------------------------
      // 10. [AI-13, 15] 인천국제공항 활주로 착륙 어프로치기들
      // - 대륙 쪽에서 북쪽(인천공항 -Z)을 향해 똑바로 강하 접근!
      // ------------------------------------------------------------
      else if (ai.mode === 'ICN_LANDING_CIRCUIT' || ai.mode === 'ICN_LANDING_CIRCUIT_15L') {
        const rwyX = ai.mode === 'ICN_LANDING_CIRCUIT' ? 160 : 450;
        p.z -= ai.speed * dt; // 북쪽 이동
        p.y = Math.max(2.12, p.y - dt * 16.0);
        p.x = rwyX;
        ai.mesh.rotation.set(-0.04, 0, 0); // 북쪽 정면 착륙 강하

        if (p.z <= incheonZ + 1200) {
          p.y = 2.12;
          this.createTouchdownSmoke(p.clone());
          p.z = incheonZ + 8000;
          p.y = 280;
        }
      }

      // ------------------------------------------------------------
      // 11. [AI-14] 인천공항 상공 홀딩 패턴 선회기 (B747)
      // ------------------------------------------------------------
      else if (ai.mode === 'ICN_HOLDING') {
        ai.orbitAngle = (ai.orbitAngle || 0) + dt * 0.28;
        p.x = Math.cos(ai.orbitAngle) * 1600;
        p.z = incheonZ + Math.sin(ai.orbitAngle) * 1600;
        p.y = 480;
        ai.mesh.rotation.set(0, Math.PI - ai.orbitAngle, 0.26); // 진행 방향 일치 + 뱅크각
      }

      // ------------------------------------------------------------
      // 12. [AI-16] 인천공항 지상 유도로 택싱기 (A320)
      // ------------------------------------------------------------
      else if (ai.mode === 'TAXIWAY_GROUND') {
        p.z += ai.dir * ai.speed * dt;
        if (p.z < incheonZ - 1400) {
          p.z = incheonZ - 1400;
          ai.dir = 1; // 남쪽으로 전환
          ai.mesh.rotation.y = Math.PI; // 남쪽 정면 바라봄!
        } else if (p.z > incheonZ + 1400) {
          p.z = incheonZ + 1400;
          ai.dir = -1; // 북쪽으로 전환
          ai.mesh.rotation.y = 0; // 북쪽 정면 바라봄!
        } else {
          ai.mesh.rotation.y = (ai.dir === 1) ? Math.PI : 0;
        }
      }

      // ★ 비행 중인 모든 항공기 양 날개 2줄 선명한 제트 비행운(Contrail) 분출! (고도 35m 이상)
      if (shouldSpawnContrail && p.y > 35 && ai.mode !== 'TAXIWAY_GROUND') {
        this.createContrailParticle(p, ai.mesh.quaternion, -6.5);
        this.createContrailParticle(p, ai.mesh.quaternion, 6.5);
      }
    });
  },

  // ----------------------------------------------------------------
  // 4-B. 대륙 메트로폴리스 도시, 빽빽한 주택가, 해변 휴양객 및 움직이는 자동차 & 보행자 시스템
  // ----------------------------------------------------------------
  initContinentalCityAndBeach() {
    this.cityGroup = new THREE.Group();
    this.movingVehicles = [];
    this.movingPedestrians = [];
    this.beachPeople = [];
    this.cityNightLights = [];

    // 공용 재질들
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 });
    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const grassPlotMat = new THREE.MeshLambertMaterial({ color: 0x22543d });

    // --------------------------------------------------------------
    // 1. 대륙 간선 도로망 (Highways & City Roadways)
    // --------------------------------------------------------------
    // 1) 동서 해안 메가 고속도로 (Coastal Expressway: Z = -28350, 폭 32m, 길이 12,000m)
    const coastalHwy = new THREE.Mesh(new THREE.PlaneGeometry(12000, 32), roadMat);
    coastalHwy.rotation.x = -Math.PI / 2;
    coastalHwy.position.set(0, 0.08, -28350);
    this.cityGroup.add(coastalHwy);

    // 중앙 황색 차선
    const coastalLine = new THREE.Mesh(new THREE.PlaneGeometry(12000, 0.8), roadLineMat);
    coastalLine.rotation.x = -Math.PI / 2;
    coastalLine.position.set(0, 0.09, -28350);
    this.cityGroup.add(coastalLine);

    // 2) 대륙 공항 직통 대로 (Airport Grand Boulevard: X = -580, Z = -28350 ~ -46000, 폭 28m)
    const airportHwy = new THREE.Mesh(new THREE.PlaneGeometry(28, 17650), roadMat);
    airportHwy.rotation.x = -Math.PI / 2;
    airportHwy.position.set(-580, 0.08, -37175);
    this.cityGroup.add(airportHwy);

    const airportHwyLine = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 17650), roadLineMat);
    airportHwyLine.rotation.x = -Math.PI / 2;
    airportHwyLine.position.set(-580, 0.09, -37175);
    this.cityGroup.add(airportHwyLine);

    // 3) 도시 횡단 간선도로 5개 노선 (City Arterial Super-Avenues: 길이 14,000m 광활 확장)
    [-31000, -34500, -38000, -41500, -48000].forEach(zRoad => {
      const cityAve = new THREE.Mesh(new THREE.PlaneGeometry(14000, 26), roadMat);
      cityAve.rotation.x = -Math.PI / 2;
      cityAve.position.set(0, 0.08, zRoad);
      this.cityGroup.add(cityAve);

      const aveLine = new THREE.Mesh(new THREE.PlaneGeometry(14000, 0.7), roadLineMat);
      aveLine.rotation.x = -Math.PI / 2;
      aveLine.position.set(0, 0.09, zRoad);
      this.cityGroup.add(aveLine);
    });

    // 4) 동부 신도시 남북 간선대로 (East Metropolis Boulevard: X = 1600, Z = -28350 ~ -49000, 폭 26m)
    const eastHwy = new THREE.Mesh(new THREE.PlaneGeometry(26, 20650), roadMat);
    eastHwy.rotation.x = -Math.PI / 2;
    eastHwy.position.set(1600, 0.08, -38675);
    this.cityGroup.add(eastHwy);

    const eastHwyLine = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 20650), roadLineMat);
    eastHwyLine.rotation.x = -Math.PI / 2;
    eastHwyLine.position.set(1600, 0.09, -38675);
    this.cityGroup.add(eastHwyLine);

    // 5) 서부 해안 산업지구 남북 대로 (West Waterfront Boulevard: X = -2800, Z = -28350 ~ -46000, 폭 24m)
    const westHwy = new THREE.Mesh(new THREE.PlaneGeometry(24, 17650), roadMat);
    westHwy.rotation.x = -Math.PI / 2;
    westHwy.position.set(-2800, 0.08, -37175);
    this.cityGroup.add(westHwy);

    // --------------------------------------------------------------
    // 2. 3D 자동차 생성 헬퍼 (Moving Vehicle Builder)
    // --------------------------------------------------------------
    const carColors = [0xef4444, 0x2563eb, 0xf59e0b, 0x10b981, 0xf8fafc, 0x0f172a, 0x64748b, 0x8b5cf6];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const wheelHubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    const createVehicle = (type, color) => {
      const v = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.35 });
      const wheels = [];

      let bW = 2.0, bH = 1.4, bL = 4.6, cabinL = 2.4, cabinH = 0.9, cabinZ = -0.15;
      if (type === 'bus') {
        bW = 2.7; bH = 3.2; bL = 12.0;
        const busBody = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bL), bodyMat);
        busBody.position.y = bH / 2 + 0.6;
        busBody.castShadow = true;
        v.add(busBody);

        // 버스 승객 창문 띠
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 1.2, bL - 1.2), glassMat);
        winBand.position.set(0, bH - 0.5 + 0.6, 0);
        v.add(winBand);

        // 휠 4개 (전후)
        [-bL * 0.35, bL * 0.35].forEach(wZ => {
          [-bW / 2 - 0.1, bW / 2 + 0.1].forEach(wX => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 12), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);
            wGroup.position.set(wX, 0.65, wZ);
            v.add(wGroup);
            wheels.push(wGroup);
          });
        });
      } else if (type === 'truck') {
        bW = 2.5; bH = 3.4; bL = 8.5;
        // 운전석 캡
        const cab = new THREE.Mesh(new THREE.BoxGeometry(bW, 2.4, 2.6), bodyMat);
        cab.position.set(0, 1.8, -2.6);
        cab.castShadow = true;
        v.add(cab);

        // 윈드실드
        const cabWin = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.05, 0.9, 1.2), glassMat);
        cabWin.position.set(0, 2.2, -2.8);
        v.add(cabWin);

        // 후방 화물 컨테이너
        const cargoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, bH, 5.4), cargoMat);
        cargo.position.set(0, bH / 2 + 0.6, 1.2);
        cargo.castShadow = true;
        v.add(cargo);

        [-3.0, 0.6, 2.6].forEach(wZ => {
          [-bW / 2 - 0.1, bW / 2 + 0.1].forEach(wX => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);
            wGroup.position.set(wX, 0.6, wZ);
            v.add(wGroup);
            wheels.push(wGroup);
          });
        });
      } else {
        // sedan or suv
        if (type === 'suv') {
          bW = 2.2; bH = 1.7; bL = 4.8; cabinL = 3.0; cabinH = 1.0; cabinZ = 0.2;
        }
        // 하부 차체
        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH * 0.55, bL), bodyMat);
        bodyMesh.position.y = (bH * 0.55) / 2 + 0.4;
        bodyMesh.castShadow = true;
        v.add(bodyMesh);

        // 상부 캐빈 & 글래스
        const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.88, cabinH, cabinL), glassMat);
        cabinMesh.position.set(0, bodyMesh.position.y + (bH * 0.55) / 2 + cabinH / 2 - 0.05, cabinZ);
        v.add(cabinMesh);

        // 루프 패널
        const roof = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.86, 0.12, cabinL * 0.95), bodyMat);
        roof.position.set(0, cabinMesh.position.y + cabinH / 2 + 0.06, cabinZ);
        v.add(roof);

        // 휠 4개
        [-bL * 0.32, bL * 0.32].forEach(wZ => {
          [-bW / 2 - 0.06, bW / 2 + 0.06].forEach(wX => {
            const wGroup = new THREE.Group();
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wGroup.add(tire);
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 8), wheelHubMat);
            hub.rotation.z = Math.PI / 2;
            wGroup.add(hub);

            wGroup.position.set(wX, 0.42, wZ);
            v.add(wGroup);
            wheels.push(wGroup);
          });
        });
      }

      // 전방 헤드라이트 (Light-On in Night)
      [-bW * 0.36, bW * 0.36].forEach(hX => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.15), headlightMat);
        hl.position.set(hX, 0.8, -bL / 2 - 0.05);
        v.add(hl);
      });

      // 후방 테일라이트
      [-bW * 0.36, bW * 0.36].forEach(tX => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.15), taillightMat);
        tl.position.set(tX, 0.8, bL / 2 + 0.05);
        v.add(tl);
      });

      return { mesh: v, wheels };
    };

    // --------------------------------------------------------------
    // 3. 도로 위를 달리는 수많은 움직이는 자동차들 배치 (65대)
    // --------------------------------------------------------------
    // 1) 해안 고속도로 (동서 주행 차량 24대: Z = -28350, 차선 2개 좌우 대향)
    for (let c = 0; c < 24; c++) {
      const isEast = (c % 2 === 0);
      const laneOffset = isEast ? -7.5 : 7.5;
      const type = (c % 5 === 0) ? 'bus' : ((c % 4 === 0) ? 'truck' : ((c % 3 === 0) ? 'suv' : 'sedan'));
      const color = carColors[c % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startX = -5500 + (c / 24) * 11000 + (Math.random() - 0.5) * 200;
      mesh.position.set(startX, 0.08, -28350 + laneOffset);
      mesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'x',
        dir: isEast ? 1 : -1,
        speed: 28 + Math.random() * 14, // 100~150 km/h 고속도로
        min: -6000,
        max: 6000
      });
    }

    // 2) 공항 접근 고속도로 (남북 주행 차량 22대: X = -580, Z = -28350 ~ -45800)
    for (let c = 0; c < 22; c++) {
      const isNorth = (c % 2 === 0);
      const laneOffset = isNorth ? -6.5 : 6.5;
      const type = (c % 4 === 0) ? 'bus' : ((c % 3 === 0) ? 'suv' : 'sedan');
      const color = carColors[(c + 3) % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startZ = -28500 - (c / 22) * 17000 + (Math.random() - 0.5) * 250;
      mesh.position.set(-580 + laneOffset, 0.08, startZ);
      mesh.rotation.y = isNorth ? Math.PI : 0;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        speed: 24 + Math.random() * 10,
        min: -45800,
        max: -28350
      });
    }

    // 3) 도시 5개 횡단 간선도로 주행 차량 30대
    [-31000, -34500, -38000, -41500, -48000].forEach((zRoad, rIdx) => {
      for (let c = 0; c < 6; c++) {
        const isEast = (c % 2 === 0);
        const laneOffset = isEast ? -6.0 : 6.0;
        const type = (c % 4 === 0) ? 'bus' : ((c % 3 === 0) ? 'suv' : 'sedan');
        const color = carColors[(c + rIdx * 2) % carColors.length];
        const { mesh, wheels } = createVehicle(type, color);

        const startX = -6000 + (c / 6) * 12000 + (Math.random() - 0.5) * 200;
        mesh.position.set(startX, 0.08, zRoad + laneOffset);
        mesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
        this.cityGroup.add(mesh);

        this.movingVehicles.push({
          mesh,
          wheels,
          axis: 'x',
          dir: isEast ? 1 : -1,
          speed: 20 + Math.random() * 10,
          min: -6800,
          max: 6800
        });
      }
    });

    // 4) 동부 신도시 남북 간선대로 주행 차량 16대 (X = 1600, Z = -28350 ~ -49000)
    for (let c = 0; c < 16; c++) {
      const isNorth = (c % 2 === 0);
      const laneOffset = isNorth ? -6.0 : 6.0;
      const type = (c % 3 === 0) ? 'suv' : ((c % 4 === 0) ? 'bus' : 'sedan');
      const color = carColors[(c + 5) % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startZ = -28500 - (c / 16) * 20000 + (Math.random() - 0.5) * 200;
      mesh.position.set(1600 + laneOffset, 0.08, startZ);
      mesh.rotation.y = isNorth ? Math.PI : 0;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        speed: 25 + Math.random() * 10,
        min: -49000,
        max: -28350
      });
    }

    // 5) 서부 해안 산업지구 남북 대로 주행 트럭/차량 12대 (X = -2800, Z = -28350 ~ -46000)
    for (let c = 0; c < 12; c++) {
      const isNorth = (c % 2 === 0);
      const laneOffset = isNorth ? -5.5 : 5.5;
      const type = (c % 2 === 0) ? 'truck' : 'sedan';
      const color = carColors[(c + 1) % carColors.length];
      const { mesh, wheels } = createVehicle(type, color);

      const startZ = -28500 - (c / 12) * 17000 + (Math.random() - 0.5) * 200;
      mesh.position.set(-2800 + laneOffset, 0.08, startZ);
      mesh.rotation.y = isNorth ? Math.PI : 0;
      this.cityGroup.add(mesh);

      this.movingVehicles.push({
        mesh,
        wheels,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        speed: 20 + Math.random() * 8,
        min: -46000,
        max: -28350
      });
    }

    // --------------------------------------------------------------
    // 4. 3D 사람 모델링 헬퍼 (Humanoid Builder)
    // --------------------------------------------------------------
    const skinTones = [0xfbcfe8, 0xfde047, 0xfcd34d, 0xd97706, 0xb45309];
    const clothColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xf8fafc, 0x0f172a];
    const hairColors = [0x0f172a, 0x78350f, 0xca8a04, 0x475569];

    const createHuman = (pose = 'walk', shirtColor, pantsColor) => {
      const h = new THREE.Group();
      const skin = skinTones[Math.floor(Math.random() * skinTones.length)];
      const skinMat = new THREE.MeshLambertMaterial({ color: skin });
      const sColor = shirtColor || clothColors[Math.floor(Math.random() * clothColors.length)];
      const pColor = pantsColor || clothColors[Math.floor(Math.random() * clothColors.length)];
      const shirtMat = new THREE.MeshLambertMaterial({ color: sColor });
      const pantsMat = new THREE.MeshLambertMaterial({ color: pColor });
      const hairMat = new THREE.MeshLambertMaterial({ color: hairColors[Math.floor(Math.random() * hairColors.length)] });

      // 머리 & 헤어
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
      head.position.y = 1.62;
      h.add(head);

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), hairMat);
      hair.position.set(0, 1.70, -0.04);
      hair.scale.set(1.0, 0.65, 1.05);
      h.add(hair);

      // 상체 몸통
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), shirtMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      h.add(torso);

      // 좌/우 다리 (걷기 피벗 장착)
      const legLGroup = new THREE.Group();
      legLGroup.position.set(-0.14, 0.82, 0);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.80, 0.20), pantsMat);
      legL.position.y = -0.40;
      legLGroup.add(legL);
      h.add(legLGroup);

      const legRGroup = new THREE.Group();
      legRGroup.position.set(0.14, 0.82, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.80, 0.20), pantsMat);
      legR.position.y = -0.40;
      legRGroup.add(legR);
      h.add(legRGroup);

      // 좌/우 팔
      const armLGroup = new THREE.Group();
      armLGroup.position.set(-0.32, 1.40, 0);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.16), skinMat);
      armL.position.y = -0.31;
      armLGroup.add(armL);
      h.add(armLGroup);

      const armRGroup = new THREE.Group();
      armRGroup.position.set(0.32, 1.40, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.16), skinMat);
      armR.position.y = -0.31;
      armRGroup.add(armR);
      h.add(armRGroup);

      if (pose === 'lie') {
        // 선베드에 누워있는 포즈 (90도 틸트)
        h.rotation.x = -Math.PI / 2;
        head.rotation.x = 0.25;
      } else if (pose === 'sit') {
        // 의자에 앉아있는 포즈
        legLGroup.rotation.x = -Math.PI / 2;
        legRGroup.rotation.x = -Math.PI / 2;
        torso.position.y = 0.85;
        head.position.y = 1.32;
        hair.position.y = 1.40;
        armLGroup.position.y = 1.10;
        armRGroup.position.y = 1.10;
        legLGroup.position.y = 0.52;
        legRGroup.position.y = 0.52;
      }

      return { mesh: h, legL: legLGroup, legR: legRGroup, armL: armLGroup, armR: armRGroup, pose };
    };

    // --------------------------------------------------------------
    // 5. ★ 부산 해운대 스타일 초대형 해변가 휴양지 (Haeundae Beach Vacation Scene, Z = -28000)
    // --------------------------------------------------------------
    const parasolColors = [
      { c1: 0xef4444, c2: 0xf8fafc }, // 해운대 시그니처 레드/화이트
      { c1: 0x0284c7, c2: 0xf8fafc }, // 시원한 블루/화이트
      { c1: 0xfacc15, c2: 0x16a34a }, // 옐로우/그린
      { c1: 0xec4899, c2: 0xf8fafc }, // 핫핑크/화이트
      { c1: 0xf97316, c2: 0xfef08a }, // 오렌지/옐로우
      { c1: 0x06b6d4, c2: 0xf8fafc }  // 청록/화이트
    ];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.3 });
    const sunbedMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const towelColors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xfbbf24, 0xa855f7, 0xf97316];
    const tubeColors = [0xf43f5e, 0x06b6d4, 0xfacc15, 0x10b981, 0xa855f7];

    // 1) 해운대 상징 128개 파라솔 & 선베드 단지 (X = -3500 ~ +3500)
    for (let p = 0; p < 128; p++) {
      const pGroup = new THREE.Group();
      const pColor = parasolColors[p % parasolColors.length];

      // 파라솔 기둥
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), poleMat);
      pole.position.y = 1.6;
      pole.rotation.z = (Math.random() - 0.5) * 0.10;
      pGroup.add(pole);

      // 8각 삿갓 파라솔 캐노피
      const canGeo = new THREE.ConeGeometry(2.3, 1.05, 8);
      const canMat = new THREE.MeshLambertMaterial({ color: pColor.c1, side: THREE.DoubleSide });
      const canopy = new THREE.Mesh(canGeo, canMat);
      canopy.position.set(0, 3.1, 0);
      pGroup.add(canopy);

      // 파라솔 아래 선베드 2개 & 테이블
      [-0.95, 0.95].forEach((bedOffset, bIdx) => {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 2.1), sunbedMat);
        bed.position.set(bedOffset, 0.11, 0.25);
        bed.castShadow = true;
        pGroup.add(bed);

        const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.75), sunbedMat);
        backrest.position.set(bedOffset, 0.32, -0.6);
        backrest.rotation.x = -0.55;
        pGroup.add(backrest);

        // 선베드에 누워있는 사람 (Sunbather) 또는 앉아서 쉬는 사람
        const rand = Math.random();
        if (rand > 0.18) {
          const pose = (rand > 0.52) ? 'lie' : 'sit';
          const human = createHuman(pose);
          if (pose === 'lie') {
            human.mesh.position.set(bedOffset, 0.36, 0.25);
          } else {
            human.mesh.position.set(bedOffset, 0.15, -0.1);
            human.mesh.rotation.y = (bIdx === 0) ? 0.3 : -0.3;
          }
          pGroup.add(human.mesh);
          this.beachPeople.push(human);
        }
      });

      // 비치 미니 테이블 & 시원한 음료 캔
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.38, 8), poleMat);
      table.position.set(0, 0.19, 0.1);
      pGroup.add(table);
      const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 6), new THREE.MeshLambertMaterial({ color: pColor.c1 }));
      drink.position.set(0.08, 0.49, 0.1);
      pGroup.add(drink);

      const pX = -3450 + (p / 128) * 6900 + (Math.random() - 0.5) * 50;
      const pZ = -28070 + (p % 4) * 48 + (Math.random() - 0.5) * 20;
      pGroup.position.set(pX, 0.05, pZ);
      this.cityGroup.add(pGroup);
    }

    // 2) 모래사장 피크닉 돗자리 & 모래성 놀이 가족 그룹 28개소
    for (let m = 0; m < 28; m++) {
      const matGroup = new THREE.Group();
      const tColor = towelColors[m % towelColors.length];
      const matMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshLambertMaterial({ color: tColor, side: THREE.DoubleSide })
      );
      matMesh.rotation.x = -Math.PI / 2;
      matMesh.position.y = 0.06;
      matGroup.add(matMesh);

      // 돗자리에 옹기종기 모여 앉아 쉬는 사람들 (2~3명)
      const numSitters = 2 + (m % 2);
      for (let s = 0; s < numSitters; s++) {
        const sitter = createHuman('sit');
        const sAngle = (s / numSitters) * Math.PI * 2 + 0.3;
        sitter.mesh.position.set(Math.cos(sAngle) * 0.75, 0.06, Math.sin(sAngle) * 0.75);
        sitter.mesh.rotation.y = sAngle + Math.PI; // 중앙을 바라보며 마주 앉음
        matGroup.add(sitter.mesh);
        this.beachPeople.push(sitter);
      }

      // 모래성 (Sand Castle)
      if (m % 2 === 0) {
        const castleMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
        [-0.45, 0.45].forEach(cx => {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 8), castleMat);
          tower.position.set(cx + 1.4, 0.25, -0.2);
          matGroup.add(tower);
          const topCone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 8), castleMat);
          topCone.position.set(cx + 1.4, 0.65, -0.2);
          matGroup.add(topCone);
        });
      }

      const matX = -3200 + (m / 28) * 6400 + (Math.random() - 0.5) * 80;
      const matZ = -27920 + (m % 3) * 35;
      matGroup.position.set(matX, 0, matZ);
      this.cityGroup.add(matGroup);
    }

    // 3) 해운대 바닷가 파도 타기 & 알록달록 튜브 물놀이객 42명 (Beach Tube Swimmers)
    const tubeGeo = new THREE.TorusGeometry(0.72, 0.22, 8, 16);
    for (let sw = 0; sw < 42; sw++) {
      const swGroup = new THREE.Group();
      const tbColor = tubeColors[sw % tubeColors.length];
      const tbMat = new THREE.MeshLambertMaterial({ color: tbColor });
      const tubeMesh = new THREE.Mesh(tubeGeo, tbMat);
      tubeMesh.rotation.x = Math.PI / 2;
      tubeMesh.position.y = 0.25;
      swGroup.add(tubeMesh);

      // 튜브에 상체를 얹고 물놀이하는 사람
      const swimmer = createHuman('sit');
      swimmer.mesh.position.set(0, 0.05, 0);
      swimmer.mesh.rotation.y = (Math.random() - 0.5) * 1.5;
      swGroup.add(swimmer.mesh);

      const swX = -3300 + (sw / 42) * 6600 + (Math.random() - 0.5) * 60;
      const swZ = -27790 + (sw % 3) * 22; // 얕은 바닷물 라인
      const baseY = 0.45;
      swGroup.position.set(swX, baseY, swZ);
      this.cityGroup.add(swGroup);

      this.beachSwimmers.push({
        mesh: swGroup,
        baseY: baseY,
        phase: sw * 0.4
      });
      this.beachPeople.push(swimmer);
    }

    // 4) 해운대 해변 라이프가드 망루 3개소 (Lifeguard Towers)
    [-1400, 0, 1400].forEach((lgX, lgIdx) => {
      const lgGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
      const roofMatLg = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });

      // 4개 타워 기둥
      [-1.5, 1.5].forEach(kx => {
        [-1.5, 1.5].forEach(kz => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.5, 8), woodMat);
          post.position.set(kx, 2.25, kz);
          lgGroup.add(post);
        });
      });

      // 플랫폼 바닥
      const plat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 3.6), woodMat);
      plat.position.set(0, 4.3, 0);
      lgGroup.add(plat);

      // 빨간색 햇빛 차양 지붕
      const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), roofMatLg);
      lgRoof.position.set(0, 6.2, 0);
      lgRoof.rotation.y = Math.PI / 4;
      lgGroup.add(lgRoof);

      // 구명환 (Lifebuoy - 도넛)
      const buoy = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.12, 8, 12),
        new THREE.MeshLambertMaterial({ color: 0xef4444 })
      );
      buoy.position.set(1.85, 3.6, 0);
      buoy.rotation.y = Math.PI / 2;
      lgGroup.add(buoy);

      // 망루 위 감시 라이프가드 요원
      const guard = createHuman('walk', 0xef4444, 0xf8fafc);
      guard.mesh.position.set(0, 4.45, 0);
      lgGroup.add(guard.mesh);
      this.beachPeople.push(guard);

      lgGroup.position.set(lgX, 0.05, -27890);
      this.cityGroup.add(lgGroup);
    });

    // 5) 모래사장에 꽂혀 있는 컬러풀 서핑보드 군락 28개
    const boardColors = [0x0284c7, 0xef4444, 0xfacc15, 0x10b981, 0xa855f7, 0xf97316];
    for (let sb = 0; sb < 28; sb++) {
      const sbGroup = new THREE.Group();
      const col = boardColors[sb % boardColors.length];
      const boardMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.1 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.5, 0.08), boardMat);
      board.position.y = 1.0;
      board.rotation.x = -0.35;
      board.rotation.y = (Math.random() - 0.5) * 0.4;
      sbGroup.add(board);

      const sbX = -3100 + (sb / 28) * 6200 + (Math.random() - 0.5) * 40;
      sbGroup.position.set(sbX, 0.05, -27845 + (sb % 2) * 15);
      this.cityGroup.add(sbGroup);
    }

    // 6) 해운대 백사장 뒤편 야자수 가로수길 70여 그루 (Palm Trees)
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    for (let pl = 0; pl < 70; pl++) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 7.5, 8), palmTrunkMat);
      trunk.position.y = 3.75;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      palm.add(trunk);

      for (let lf = 0; lf < 6; lf++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2), palmLeafMat);
        leaf.position.set(0, 7.5, 0);
        leaf.rotation.y = (lf / 6) * Math.PI * 2;
        leaf.rotation.x = 0.75;
        palm.add(leaf);
      }

      const plX = -3500 + (pl / 70) * 7000 + (Math.random() - 0.5) * 35;
      palm.position.set(plX, 0.05, -28130 + (pl % 2) * 18);
      this.cityGroup.add(palm);
    }

    // 7) 해운대 비치 바 & 아이스크림 가판대 4개소 (Beach Snack Shack)
    [-2000, -700, 700, 2000].forEach((shkX, sIdx) => {
      const shack = new THREE.Group();
      const sBodyMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.7 });
      const sRoofMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

      const booth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 3.6), sBodyMat);
      booth.position.y = 1.4;
      shack.add(booth);

      const awning = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 4.2), sRoofMat);
      awning.position.set(0, 3.0, 0);
      shack.add(awning);

      const clerk = createHuman('walk', 0xf8fafc, 0xef4444);
      clerk.mesh.position.set(0, 0.05, 1.2);
      shack.add(clerk.mesh);

      const customer = createHuman('walk');
      customer.mesh.position.set(0.8, 0.05, 2.5);
      customer.mesh.rotation.y = Math.PI;
      shack.add(customer.mesh);

      this.beachPeople.push(clerk);
      this.beachPeople.push(customer);

      shack.position.set(shkX, 0.05, -28080);
      this.cityGroup.add(shack);
    });

    // 8) 비치발리볼 코트 4개소 (Beach Volleyball Courts)
    [-1000, -350, 450, 1100].forEach(vbX => {
      const vbGroup = new THREE.Group();
      [-4.0, 4.0].forEach(pX => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8), poleMat);
        p.position.set(pX, 1.75, 0);
        vbGroup.add(p);
      });
      const net = new THREE.Mesh(
        new THREE.PlaneGeometry(8.0, 1.2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, side: THREE.DoubleSide })
      );
      net.position.set(0, 2.6, 0);
      vbGroup.add(net);

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      ball.position.set(0.6, 3.6, -0.4);
      vbGroup.add(ball);

      // 4명의 비치발리볼 선수들
      [-2.2, 2.2].forEach(px => {
        [-1.8, 1.8].forEach(pz => {
          const player = createHuman('walk', 0xef4444, 0x3b82f6);
          player.mesh.position.set(px, 0.05, pz);
          player.mesh.rotation.y = (pz > 0) ? Math.PI : 0;
          vbGroup.add(player.mesh);
          this.beachPeople.push(player);
        });
      });

      vbGroup.position.set(vbX, 0.05, -27950);
      this.cityGroup.add(vbGroup);
    });

    // 9) 해변가에서 걸어다니는 휴양객 및 조깅객들 (Beach Walking Pedestrians 36명)
    for (let w = 0; w < 36; w++) {
      const isEast = (w % 2 === 0);
      const walker = createHuman('walk');
      const startX = -3200 + (w / 36) * 6400;
      walker.mesh.position.set(startX, 0.05, -27860 + (w % 4) * 22);
      walker.mesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
      this.cityGroup.add(walker.mesh);

      this.movingPedestrians.push({
        ...walker,
        axis: 'x',
        dir: isEast ? 1 : -1,
        walkSpeed: (w % 3 === 0) ? 2.8 : 1.4 + Math.random() * 0.5,
        walkPhase: Math.random() * Math.PI * 2,
        min: -3400,
        max: 3400
      });
      this.beachPeople.push(walker);
    }

    // --------------------------------------------------------------
    // 6. 빽빽한 교외 주택가 (Dense Suburban Houses - 140여 채)
    // --------------------------------------------------------------
    const roofColors = [0x991b1b, 0x1e3a8a, 0x334155, 0xb45309, 0x475569];
    const houseColors = [0xf8fafc, 0xfef3c7, 0xf1f5f9, 0xe2e8f0, 0xfde047];
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.7 });

    const createSuburbanHouse = () => {
      const hGroup = new THREE.Group();
      const rCol = roofColors[Math.floor(Math.random() * roofColors.length)];
      const hCol = houseColors[Math.floor(Math.random() * houseColors.length)];
      const wallMat = new THREE.MeshStandardMaterial({ color: hCol, roughness: 0.7 });
      const roofMat = new THREE.MeshStandardMaterial({ color: rCol, roughness: 0.5 });

      const w = 15, h = 6.8, d = 13;

      // 주택 본체 벽
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      walls.position.y = h / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      hGroup.add(walls);

      // 삼각 박공 지붕 (Gable Roof)
      const roofGeo = new THREE.ConeGeometry(w * 0.78, 4.5, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, h + 2.2, 0);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.0, 1.0, d / w);
      roof.castShadow = true;
      hGroup.add(roof);

      // 굴뚝
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 }));
      chimney.position.set(w * 0.3, h + 3.0, d * 0.2);
      hGroup.add(chimney);

      // 현관문 & 창문들
      const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.5, 0.2), doorMat);
      door.position.set(0, 1.75, d / 2 + 0.1);
      hGroup.add(door);

      [-3.8, 3.8].forEach(wx => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 0.15), winMat);
        win.position.set(wx, 3.6, d / 2 + 0.1);
        hGroup.add(win);
      });

      // 마당 잔디밭 구역
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(w + 10, d + 12), grassPlotMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(0, 0.02, 0);
      hGroup.add(lawn);

      // 진입로에 주차된 자가용
      const carColor = carColors[Math.floor(Math.random() * carColors.length)];
      const { mesh: parkedCar } = createVehicle('sedan', carColor);
      parkedCar.position.set(w / 2 + 3.2, 0.05, d / 2 - 2);
      parkedCar.rotation.y = (Math.random() - 0.5) * 0.2;
      hGroup.add(parkedCar);

      return hGroup;
    };

    // 대륙 남서부 교외 주택단지 (X = -1200 ~ -2800, Z = -29000 ~ -33000): 65채
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 9; c++) {
        const house = createSuburbanHouse();
        const hX = -2800 + c * 180 + (Math.random() - 0.5) * 20;
        const hZ = -29200 - r * 190 + (Math.random() - 0.5) * 20;
        house.position.set(hX, 0, hZ);
        this.cityGroup.add(house);
      }
    }

    // 대륙 남동부 교외 주택단지 (X = 1200 ~ 2800, Z = -29000 ~ -33000): 65채
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 9; c++) {
        const house = createSuburbanHouse();
        const hX = 1200 + c * 180 + (Math.random() - 0.5) * 20;
        const hZ = -29200 - r * 190 + (Math.random() - 0.5) * 20;
        house.position.set(hX, 0, hZ);
        this.cityGroup.add(house);
      }
    }

    // --------------------------------------------------------------
    // 7. 대형 메트로폴리스 고층 아파트 단지 & 빌딩 숲 (High-Rise City Towers)
    // --------------------------------------------------------------
    const towerFacadeColors = [0xf8fafc, 0xe2e8f0, 0x94a3b8, 0x64748b, 0x0284c7];
    const towerNightWindowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.1, // 야간 시 1.5로 부스트
      roughness: 0.3
    });
    this.cityNightLights.push(towerNightWindowMat);

    const createApartmentTower = (w, h, d, color) => {
      const tower = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 });

      // 본체 타워
      const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      core.position.y = h / 2;
      core.castShadow = true;
      core.receiveShadow = true;
      tower.add(core);

      // 격자 창문 배열 텍스처 대용 유리 블록 스트라이프
      const numFloors = Math.floor(h / 7);
      for (let f = 1; f < numFloors; f++) {
        const yFloor = f * 7;
        // 각 층 발코니
        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.2, 0.7, d + 1.2),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
        );
        balcony.position.set(0, yFloor, 0);
        tower.add(balcony);

        // 창문 띠 (Night-Glow Windows)
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 3.2, d + 0.2), towerNightWindowMat);
        winBand.position.set(0, yFloor + 2.2, 0);
        tower.add(winBand);
      }

      // 옥상 헬리패드 & 통신 안테나
      const roofTop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 3.5, d * 0.7), wallMat);
      roofTop.position.set(0, h + 1.75, 0);
      tower.add(roofTop);

      const helipad = new THREE.Mesh(
        new THREE.RingGeometry(w * 0.15, w * 0.25, 16),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
      );
      helipad.rotation.x = -Math.PI / 2;
      helipad.position.set(0, h + 3.6, 0);
      tower.add(helipad);

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 18, 8), poleMat);
      antenna.position.set(0, h + 12, 0);
      tower.add(antenna);

      // 옥상 항공 장애등 (Red Strobe)
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(0, h + 21, 0);
      tower.add(beacon);

      return tower;
    };

    // 1) 대륙 북서부 도심 아파트 단지 (X = -1500 ~ -3800, Z = -34000 ~ -41000): 18동
    for (let i = 0; i < 18; i++) {
      const w = 32 + (i % 3) * 12;
      const d = 26 + (i % 2) * 10;
      const h = 55 + (i * 7) % 65 + Math.random() * 25; // 55m ~ 135m 고층
      const col = towerFacadeColors[i % towerFacadeColors.length];
      const tower = createApartmentTower(w, h, d, col);

      const tX = -1600 - (i % 5) * 450 + (Math.random() - 0.5) * 50;
      const tZ = -34200 - Math.floor(i / 5) * 520 + (Math.random() - 0.5) * 60;
      tower.position.set(tX, 0, tZ);
      this.cityGroup.add(tower);
      this.registerObstacle(tower, `도심 아파트 타워 W${i + 1}`);
    }

    // 2) 대륙 북동부 도심 아파트 단지 (X = 1400 ~ 3800, Z = -34000 ~ -41000): 18동
    for (let i = 0; i < 18; i++) {
      const w = 30 + (i % 3) * 14;
      const d = 28 + (i % 2) * 8;
      const h = 60 + (i * 8) % 60 + Math.random() * 25; // 60m ~ 145m 초고층
      const col = towerFacadeColors[(i + 2) % towerFacadeColors.length];
      const tower = createApartmentTower(w, h, d, col);

      const tX = 1500 + (i % 5) * 450 + (Math.random() - 0.5) * 50;
      const tZ = -34200 - Math.floor(i / 5) * 520 + (Math.random() - 0.5) * 60;
      tower.position.set(tX, 0, tZ);
      this.cityGroup.add(tower);
      this.registerObstacle(tower, `도심 아파트 타워 E${i + 1}`);
    }

    // 3) ★ 대륙 도심 센트럴 비즈니스 지구 초고층 마천루 숲 (Downtown CBD Skyscrapers: 24동, 높이 110m~320m)
    // - 63빌딩 골드 타워, 롯데월드타워 스타일 유선형 스카이스크래퍼, IFC 랜드마크 타워
    const cbdGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.85 });
    const cbdGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.12, metalness: 0.92 });
    const cbdSilverMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.20, metalness: 0.70 });

    for (let c = 0; c < 24; c++) {
      const cbdGroup = new THREE.Group();
      const style = c % 3; // 0: Gold Tower, 1: Aero Skyscraper, 2: Glass Cube
      const towerH = 120 + (c * 17) % 190 + Math.random() * 30; // 120m ~ 320m 메가 스카이스크래퍼
      const baseW = 38 + (c % 4) * 8;
      const baseD = 36 + (c % 3) * 8;

      if (style === 0) {
        // 골드 커튼월 63빌딩 스타일 타워
        const core = new THREE.Mesh(new THREE.BoxGeometry(baseW, towerH, baseD), cbdGoldMat);
        core.position.y = towerH / 2;
        core.castShadow = true;
        cbdGroup.add(core);

        // 상단 사선 컷 루프
        const topSlope = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.65, 24, 4), cbdGoldMat);
        topSlope.position.set(0, towerH + 10, 0);
        topSlope.rotation.y = Math.PI / 4;
        cbdGroup.add(topSlope);
      } else if (style === 1) {
        // 롯데월드타워 스타일 유선형 초고층 스카이스크래퍼
        const core = new THREE.Mesh(new THREE.CylinderGeometry(baseW * 0.35, baseW * 0.65, towerH, 16), cbdGlassMat);
        core.position.y = towerH / 2;
        core.castShadow = true;
        cbdGroup.add(core);

        // 최상단 첨탑 안테나 (Spire)
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 35, 8), cbdSilverMat);
        spire.position.y = towerH + 17.5;
        cbdGroup.add(spire);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.y = towerH + 35;
        cbdGroup.add(beacon);
      } else {
        // IFC 메가 큐브 글래스 타워
        const core = new THREE.Mesh(new THREE.BoxGeometry(baseW, towerH, baseD), cbdGlassMat);
        core.position.y = towerH / 2;
        core.castShadow = true;
        cbdGroup.add(core);

        const crown = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.8, 14, baseD * 0.8), cbdSilverMat);
        crown.position.set(0, towerH + 7, 0);
        cbdGroup.add(crown);
      }

      // CBD 타워 배치 (도심 중앙 X = -1200 ~ +1200, Z = -35000 ~ -39500)
      const cbdX = -1000 + (c % 6) * 400 + (Math.random() - 0.5) * 60;
      const cbdZ = -35200 - Math.floor(c / 6) * 750 + (Math.random() - 0.5) * 60;
      cbdGroup.position.set(cbdX, 0, cbdZ);
      this.cityGroup.add(cbdGroup);
      this.registerObstacle(cbdGroup, `도심 마천루 타워 CBD #${c + 1}`);
    }

    // 4) 대륙 동부 광활한 신도시 아파트 단지 16동 추가 (X = 2200 ~ 4500, Z = -42000 ~ -48000)
    for (let i = 0; i < 16; i++) {
      const w = 34 + (i % 2) * 10;
      const d = 26 + (i % 3) * 6;
      const h = 65 + (i * 9) % 60 + Math.random() * 20;
      const col = towerFacadeColors[(i + 1) % towerFacadeColors.length];
      const tower = createApartmentTower(w, h, d, col);

      const tX = 2400 + (i % 4) * 480 + (Math.random() - 0.5) * 40;
      const tZ = -42500 - Math.floor(i / 4) * 650 + (Math.random() - 0.5) * 50;
      tower.position.set(tX, 0, tZ);
      this.cityGroup.add(tower);
      this.registerObstacle(tower, `동부 신도시 아파트 타워 #${i + 1}`);
    }

    // --------------------------------------------------------------
    // 8. 대륙 공항 앞 광장 & 터미널 주변 걸어다니는 사람들 (Pedestrians 30명)
    // --------------------------------------------------------------
    for (let p = 0; p < 30; p++) {
      const isNorth = (p % 2 === 0);
      const ped = createHuman('walk');
      const startX = -450 - (p % 6) * 35 + (Math.random() - 0.5) * 15;
      const startZ = -44800 - Math.floor(p / 6) * 70 + (Math.random() - 0.5) * 20;

      ped.mesh.position.set(startX, 2.14, startZ);
      ped.mesh.rotation.y = isNorth ? Math.PI : 0;
      if (this.incheonAirportGroup) {
        this.incheonAirportGroup.add(ped.mesh);
      } else {
        this.cityGroup.add(ped.mesh);
      }

      this.movingPedestrians.push({
        ...ped,
        axis: 'z',
        dir: isNorth ? -1 : 1,
        walkSpeed: 1.5 + Math.random() * 0.4,
        walkPhase: Math.random() * Math.PI * 2,
        min: -45500,
        max: -44500
      });
    }

    this.scene.add(this.cityGroup);
  },

  // ----------------------------------------------------------------
  // 4-C. 자동차 주행 및 보행자 보행 실시간 물리 시뮬레이션
  // ----------------------------------------------------------------
  updateCityLife(dt) {
    if (!this.movingVehicles || !this.movingPedestrians) return;

    // 1. 자동차 이동 & 4개 바퀴 회전
    for (let i = 0; i < this.movingVehicles.length; i++) {
      const v = this.movingVehicles[i];
      const moveDist = v.speed * v.dir * dt;
      v.mesh.position[v.axis] += moveDist;

      // 바퀴 회전
      const rollDelta = Math.abs(moveDist) * 1.6;
      if (v.wheels) {
        for (let w = 0; w < v.wheels.length; w++) {
          v.wheels[w].rotation.x += rollDelta;
        }
      }

      // 도로 경계 루프
      if (v.dir > 0 && v.mesh.position[v.axis] > v.max) {
        v.mesh.position[v.axis] = v.min;
      } else if (v.dir < 0 && v.mesh.position[v.axis] < v.min) {
        v.mesh.position[v.axis] = v.max;
      }
    }

    // 2. 보행자 보행 이동 & 팔다리 교차 스윙
    for (let j = 0; j < this.movingPedestrians.length; j++) {
      const p = this.movingPedestrians[j];
      const step = p.walkSpeed * p.dir * dt;
      p.mesh.position[p.axis] += step;

      p.walkPhase += dt * p.walkSpeed * 5.0;
      const swing = Math.sin(p.walkPhase);
      if (p.legL && p.legR) {
        p.legL.rotation.x = swing * 0.52;
        p.legR.rotation.x = -swing * 0.52;
      }
      if (p.armL && p.armR) {
        p.armL.rotation.x = -swing * 0.45;
        p.armR.rotation.x = swing * 0.45;
      }

      // 보도 경계 왕복 반전
      if (p.dir > 0 && p.mesh.position[p.axis] > p.max) {
        p.dir = -1;
        p.mesh.rotation.y += Math.PI;
      } else if (p.dir < 0 && p.mesh.position[p.axis] < p.min) {
        p.dir = 1;
        p.mesh.rotation.y += Math.PI;
      }
    }

    // 3. 해운대 바닷가 파도 물놀이객(튜브) 수면 부유 요동 애니메이션
    if (this.beachSwimmers && this.beachSwimmers.length > 0) {
      this.beachWaveTime = (this.beachWaveTime || 0) + dt * 2.4;
      for (let s = 0; s < this.beachSwimmers.length; s++) {
        const sw = this.beachSwimmers[s];
        sw.mesh.position.y = sw.baseY + Math.sin(this.beachWaveTime + sw.phase) * 0.16;
        sw.mesh.rotation.z = Math.cos(this.beachWaveTime * 0.8 + sw.phase) * 0.06;
      }
    }
  },

  // ----------------------------------------------------------------
  // 공항 지상 안내원(마샬러), 순찰 요원 및 토잉카 실시간 애니메이션
  // ----------------------------------------------------------------
  updateAirportGSE(dt) {
    if (!this.planeGroup) return;
    const planePos = this.planeGroup.position;
    const now = performance.now() * 0.001;

    // 1. 마샬러(Marshaller) 유도봉 수신호 애니메이션
    this.marshallerCrew.forEach(m => {
      const dist = m.pos.distanceTo(planePos);
      const mesh = m.mesh;
      if (!mesh || !mesh.leftArm || !mesh.rightArm) return;

      if (dist < 22.0 && this.isOnGround && Math.abs(this.speed) < 0.25) {
        // ★ 비행기가 정지선에 도착 완료: 양팔을 머리 위로 교차하여 'X' (ALL STOP) 정지 신호!
        mesh.leftArm.rotation.set(-2.5, 0, 0.55);
        mesh.rightArm.rotation.set(-2.5, 0, -0.55);
      } else if (dist < 110.0 && this.isOnGround) {
        // ★ 게이트 진입 중: 양팔을 위아래로 젖히며 "앞으로 전진(Come Ahead)" 유도 신호!
        const wave = Math.sin(now * 4.5);
        mesh.leftArm.rotation.set(-1.2 + wave * 0.55, 0, 0.2);
        mesh.rightArm.rotation.set(-1.2 - wave * 0.55, 0, -0.2);
      } else {
        // 대기 상태 (자연스럽게 팔을 아래로 내림)
        mesh.leftArm.rotation.set(0.1, 0, 0.1);
        mesh.rightArm.rotation.set(0.1, 0, -0.1);
      }
    });

    // 2. 계류장 순찰 요원 보행 애니메이션
    this.movingGroundCrew.forEach(crew => {
      crew.z += crew.dir * crew.speed * dt;
      if (crew.dir > 0 && crew.z >= crew.maxZ) {
        crew.dir = -1;
        crew.group.rotation.y = Math.PI;
      } else if (crew.dir < 0 && crew.z <= crew.minZ) {
        crew.dir = 1;
        crew.group.rotation.y = 0;
      }
      crew.group.position.z = crew.z;

      // 발걸음 및 팔 흔들기
      const step = Math.sin((now * 4.0) + crew.walkOffset);
      if (crew.mesh.leftLeg) crew.mesh.leftLeg.rotation.x = step * 0.55;
      if (crew.mesh.rightLeg) crew.mesh.rightLeg.rotation.x = -step * 0.55;
      if (crew.mesh.leftArm) crew.mesh.leftArm.rotation.x = -step * 0.45;
      if (crew.mesh.rightArm) crew.mesh.rightArm.rotation.x = step * 0.45;
    });

    // 3. 계류장 토잉카 주행 및 루프 경광등 점멸
    this.movingTugs.forEach(tug => {
      tug.z += tug.dir * tug.speed * dt;
      if (tug.dir > 0 && tug.z >= tug.maxZ) {
        tug.dir = -1;
        tug.group.rotation.y = Math.PI;
      } else if (tug.dir < 0 && tug.z <= tug.minZ) {
        tug.dir = 1;
        tug.group.rotation.y = 0;
      }
      tug.group.position.z = tug.z;

      // 바퀴 회전
      const wheelRot = tug.speed * dt * 0.8;
      tug.wheels.forEach(w => {
        w.rotation.x += (tug.dir > 0 ? wheelRot : -wheelRot);
      });

      // 주황 비콘 경광등 점멸
      if (tug.beacon) {
        tug.beacon.intensity = 1.0 + Math.sin(now * 8.0 + tug.beaconOffset) * 1.5;
      }
    });
  },

  // ----------------------------------------------------------------
  // 실제 탑승교 실시간 회전 도킹 시스템 (Rotunda Swing Arm Docking)
  // - 평상시에는 실제 공항처럼 옆을 보며 대기
  // - 비행기가 게이트 정지선에 도착하면 비행기 L1 도어로 부드럽게 스윙 회전 연결!
  // ----------------------------------------------------------------
  updateAnimatedJetways(dt) {
    if (!this.planeGroup || !this.animatedJetways) return;
    const planePos = this.planeGroup.position;

    // 가장 가까운 게이트 탑승교 탐색
    let closestJetway = null;
    let minDist = Infinity;

    this.animatedJetways.forEach(j => {
      const dist = Math.hypot(planePos.x - j.stopX, planePos.z - j.stopZ);
      if (dist < minDist) {
        minDist = dist;
        closestJetway = j;
      }
    });

    const isNearGate = (minDist <= 55.0) && this.isOnGround;
    const isPlaneStopped = isNearGate && Math.abs(this.speed) < 0.25;

    // 모든 탑승교 각도 보간 회전
    this.animatedJetways.forEach(j => {
      const isTarget = (j === closestJetway && isPlaneStopped && this.flightPhase !== 'TAKEOFF_RUN' && this.flightPhase !== 'CLIMB_CRUISE');
      j.targetAngle = isTarget ? j.dockedAngle : j.standbyAngle;

      // 부드러운 스윙 회전 보간 (Lerp)
      if (Math.abs(j.currentAngle - j.targetAngle) > 0.005) {
        j.currentAngle = THREE.MathUtils.lerp(j.currentAngle, j.targetAngle, dt * 1.5);
        j.armPivot.rotation.y = j.currentAngle;
      } else {
        j.currentAngle = j.targetAngle;
        j.armPivot.rotation.y = j.targetAngle;
      }

      // 도킹 완료 판정
      if (isTarget && Math.abs(j.currentAngle - j.dockedAngle) < 0.02) {
        if (!j.isDocked) {
          j.isDocked = true;
          this.isJetwayDocked = true;
          this.activeDockingJetway = j;
          this.onJetwayDockComplete(j);
        }
      } else if (!isTarget) {
        j.isDocked = false;
        if (this.activeDockingJetway === j) {
          this.isJetwayDocked = false;
          this.activeDockingJetway = null;
        }
      }
    });
  },

  onJetwayDockComplete(jetway) {
    const dockBadge = document.getElementById('jetway-dock-status');
    if (dockBadge) {
      dockBadge.textContent = '도킹 완료 (L1 Door 연결)';
      dockBadge.className = 'status-val dock-complete';
    }
    this.playCautionChime();
    this.showPopup(`🚪 [${jetway.name}] 탑승교가 회전하여 비행기 도어에 연결되었습니다! 엔진을 끄세요(E키).`);
    this.triggerPassengerReaction('docking');

    const engineShutdownBtn = document.getElementById('gate-engine-shutdown-btn');
    if (engineShutdownBtn && !this.isEngineOff) {
      engineShutdownBtn.classList.remove('hidden');
    }
  }

  });
})();

