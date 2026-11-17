// Comprehensive GLB 3D Model Generator for Hajun Plane 3D
// Generates 100% compliant glTF 2.0 Binary (.glb) files for all aircraft and environments.

const fs = require('fs');
const path = require('path');
const GLBBuilder = require('./glb_builder');
const {
  createBox,
  createCylinder,
  createLoftFuselage,
  createSweptWing,
  createCone,
  createHorizontalPlane,
  createOrganicBeachGeometry,
  createProceduralTerrainGeometry,
  mergeGeometries,
  computeNormals
} = require('./geometry_utils');

// Materials helper
function setupCommonMaterials(builder) {
  return {
    whiteFuselage: builder.addMaterial('WhiteFuselage', {
      color: [0.96, 0.97, 0.99, 1.0],
      metallic: 0.22,
      roughness: 0.20
    }),
    airlineBlue: builder.addMaterial('AirlineBlue', {
      color: [0.01, 0.48, 0.85, 1.0],
      metallic: 0.35,
      roughness: 0.25
    }),
    airlineRed: builder.addMaterial('AirlineRed', {
      color: [0.88, 0.12, 0.15, 1.0],
      metallic: 0.30,
      roughness: 0.28
    }),
    wingGray: builder.addMaterial('WingTitaniumGray', {
      color: [0.72, 0.75, 0.80, 1.0],
      metallic: 0.42,
      roughness: 0.32
    }),
    cockpitGlass: builder.addMaterial('CockpitTintedGlass', {
      color: [0.06, 0.10, 0.16, 1.0],
      metallic: 0.92,
      roughness: 0.10
    }),
    cabinWindows: builder.addMaterial('CabinWindows', {
      color: [0.22, 0.65, 0.95, 1.0],
      metallic: 0.80,
      roughness: 0.18,
      emissive: [0.05, 0.15, 0.3]
    }),
    engineChrome: builder.addMaterial('EngineChrome', {
      color: [0.85, 0.88, 0.92, 1.0],
      metallic: 0.95,
      roughness: 0.12
    }),
    engineIntakeDark: builder.addMaterial('EngineIntakeDark', {
      color: [0.12, 0.14, 0.16, 1.0],
      metallic: 0.65,
      roughness: 0.50
    }),
    tireRubber: builder.addMaterial('TireRubber', {
      color: [0.12, 0.13, 0.15, 1.0],
      metallic: 0.05,
      roughness: 0.88
    }),
    goldTrim: builder.addMaterial('GoldTrim', {
      color: [0.96, 0.72, 0.15, 1.0],
      metallic: 0.75,
      roughness: 0.22
    }),
    vintageFabric: builder.addMaterial('VintageCanvasFabric', {
      color: [0.92, 0.88, 0.75, 1.0],
      metallic: 0.05,
      roughness: 0.90
    }),
    woodGrain: builder.addMaterial('VintageWoodStrut', {
      color: [0.55, 0.35, 0.18, 1.0],
      metallic: 0.08,
      roughness: 0.75
    })
  };
}

// -------------------------------------------------------------
// 1. AIRBUS A320 GENERATOR
// -------------------------------------------------------------
function generateA320() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  // A. Fuselage
  const profiles = [
    { z: -18.5, rx: 0.01, ry: 0.01, cy: 0.0 }, // Nose tip
    { z: -17.5, rx: 0.95, ry: 0.95, cy: 0.05 },
    { z: -16.0, rx: 1.60, ry: 1.65, cy: 0.12 },
    { z: -14.0, rx: 1.95, ry: 1.98, cy: 0.15 }, // Cockpit section
    { z: -10.0, rx: 1.98, ry: 2.00, cy: 0.15 },
    { z:   0.0, rx: 1.98, ry: 2.00, cy: 0.15 }, // Wing root
    { z:  10.0, rx: 1.98, ry: 2.00, cy: 0.15 },
    { z:  14.5, rx: 1.70, ry: 1.75, cy: 0.20 }, // Tail taper
    { z:  17.5, rx: 0.90, ry: 1.10, cy: 0.35 },
    { z:  19.5, rx: 0.25, ry: 0.40, cy: 0.55 },
    { z:  20.2, rx: 0.01, ry: 0.01, cy: 0.60 }  // Tail tip
  ];
  const fuselageGeo = createLoftFuselage(profiles, 24);
  const fuselageMesh = b.addMesh('A320_Fuselage_Mesh', [{
    positions: fuselageGeo.positions,
    indices: fuselageGeo.indices,
    normals: fuselageGeo.normals,
    materialIndex: m.whiteFuselage
  }]);

  // Cockpit windshield visor
  const cockpitGeo = createBox(2.2, 0.65, 1.4, 0, 1.25, -14.6);
  const cockpitMesh = b.addMesh('A320_Cockpit_Mesh', [{
    positions: cockpitGeo.positions,
    indices: cockpitGeo.indices,
    normals: cockpitGeo.normals,
    materialIndex: m.cockpitGlass
  }]);

  // B. Wings with Sharklets
  const leftWingGeo = createSweptWing({
    rootX: -1.7, rootY: -0.2, rootZ: -0.8,
    span: 16.5, rootChord: 6.2, tipChord: 1.6,
    sweepBack: 5.6, dihedralY: 1.3, thickness: 0.45,
    isLeft: true
  });
  const rightWingGeo = createSweptWing({
    rootX: 1.7, rootY: -0.2, rootZ: -0.8,
    span: 16.5, rootChord: 6.2, tipChord: 1.6,
    sweepBack: 5.6, dihedralY: 1.3, thickness: 0.45,
    isLeft: false
  });
  const wingsGeo = mergeGeometries([leftWingGeo, rightWingGeo]);

  // Airbus Sharklets (curled upward wingtip fins)
  const leftSharklet = createBox(0.12, 2.2, 1.2, -18.2, 2.1, 4.8);
  const rightSharklet = createBox(0.12, 2.2, 1.2, 18.2, 2.1, 4.8);
  const sharkletsGeo = mergeGeometries([leftSharklet, rightSharklet]);

  const wingsMesh = b.addMesh('A320_Wings_Mesh', [
    {
      positions: wingsGeo.positions,
      indices: wingsGeo.indices,
      normals: wingsGeo.normals,
      materialIndex: m.wingGray
    },
    {
      positions: sharkletsGeo.positions,
      indices: sharkletsGeo.indices,
      normals: sharkletsGeo.normals,
      materialIndex: m.airlineBlue
    }
  ]);

  // C. Engines: 2x CFM56 high bypass turbofans
  function makeEngine(cx) {
    const cowlNose = createCylinder(1.15, 1.22, 1.0, 20, cx, -1.6, -1.8, 'z');
    const cowlBody = createCylinder(1.22, 1.18, 2.2, 20, cx, -1.6, -0.2, 'z');
    const cowlTail = createCylinder(1.18, 0.95, 1.2, 20, cx, -1.6, 1.5, 'z');
    const cowlGeo = mergeGeometries([cowlNose, cowlBody, cowlTail]);

    const spinner = createCylinder(0.01, 0.45, 0.9, 16, cx, -1.6, -2.1, 'z');
    const fanDisk = createCylinder(1.05, 1.05, 0.2, 18, cx, -1.6, -1.6, 'z');
    const intakeGeo = mergeGeometries([spinner, fanDisk]);

    const pylon = createBox(0.35, 1.1, 3.2, cx, -0.85, -0.4);

    return { cowlGeo, intakeGeo, pylon };
  }

  const engL = makeEngine(-5.8);
  const engR = makeEngine(5.8);

  const enginesCowlingGeo = mergeGeometries([engL.cowlGeo, engR.cowlGeo, engL.pylon, engR.pylon]);
  const enginesIntakeGeo = mergeGeometries([engL.intakeGeo, engR.intakeGeo]);

  const enginesMesh = b.addMesh('A320_Engines_Mesh', [
    {
      positions: enginesCowlingGeo.positions,
      indices: enginesCowlingGeo.indices,
      normals: enginesCowlingGeo.normals,
      materialIndex: m.whiteFuselage
    },
    {
      positions: enginesIntakeGeo.positions,
      indices: enginesIntakeGeo.indices,
      normals: enginesIntakeGeo.normals,
      materialIndex: m.engineIntakeDark
    }
  ]);

  // D. Vertical Stabilizer (Tail fin) & Horizontal Stabilizers
  const tailFinGeo = createSweptWing({
    rootX: 0, rootY: 1.5, rootZ: 11.5,
    span: 7.2, rootChord: 5.6, tipChord: 2.1,
    sweepBack: 4.8, dihedralY: 0.0, thickness: 0.38,
    isLeft: false
  });
  // Rotate tail fin 90 deg around Z to make it vertical
  const finPositions = [];
  for (let i = 0; i < tailFinGeo.positions.length; i += 3) {
    const x = tailFinGeo.positions[i];
    const y = tailFinGeo.positions[i + 1];
    const z = tailFinGeo.positions[i + 2];
    finPositions.push(-y + 1.5, x + 1.5, z); // rotate to vertical
  }
  const finNormals = computeNormals(finPositions, tailFinGeo.indices);

  const leftHStab = createSweptWing({
    rootX: -0.6, rootY: 1.1, rootZ: 16.0,
    span: 6.2, rootChord: 3.2, tipChord: 1.2,
    sweepBack: 3.0, dihedralY: 0.4, thickness: 0.28,
    isLeft: true
  });
  const rightHStab = createSweptWing({
    rootX: 0.6, rootY: 1.1, rootZ: 16.0,
    span: 6.2, rootChord: 3.2, tipChord: 1.2,
    sweepBack: 3.0, dihedralY: 0.4, thickness: 0.28,
    isLeft: false
  });
  const hStabGeo = mergeGeometries([leftHStab, rightHStab]);

  const tailMesh = b.addMesh('A320_Tail_Mesh', [
    {
      positions: finPositions,
      indices: tailFinGeo.indices,
      normals: finNormals,
      materialIndex: m.airlineBlue
    },
    {
      positions: hStabGeo.positions,
      indices: hStabGeo.indices,
      normals: hStabGeo.normals,
      materialIndex: m.wingGray
    }
  ]);

  // E. Landing Gear (Tricycle)
  function makeGearWheels(cx, cy, cz, count = 2) {
    const wheels = [];
    if (count === 2) {
      wheels.push(createCylinder(0.55, 0.55, 0.35, 14, cx - 0.35, cy, cz, 'x'));
      wheels.push(createCylinder(0.55, 0.55, 0.35, 14, cx + 0.35, cy, cz, 'x'));
    }
    const strut = createCylinder(0.12, 0.12, 1.8, 10, cx, cy + 0.9, cz, 'y');
    return { wheelsGeo: mergeGeometries(wheels), strutGeo: strut };
  }

  const noseG = makeGearWheels(0, -2.4, -13.5, 2);
  const mainGL = makeGearWheels(-3.2, -2.4, 1.2, 2);
  const mainGR = makeGearWheels(3.2, -2.4, 1.2, 2);

  const allWheels = mergeGeometries([noseG.wheelsGeo, mainGL.wheelsGeo, mainGR.wheelsGeo]);
  const allStruts = mergeGeometries([noseG.strutGeo, mainGL.strutGeo, mainGR.strutGeo]);

  const gearMesh = b.addMesh('A320_Gear_Mesh', [
    {
      positions: allWheels.positions,
      indices: allWheels.indices,
      normals: allWheels.normals,
      materialIndex: m.tireRubber
    },
    {
      positions: allStruts.positions,
      indices: allStruts.indices,
      normals: allStruts.normals,
      materialIndex: m.engineChrome
    }
  ]);

  // Nodes hierarchy
  const nodeFuselage = b.addNode({ name: 'Fuselage', meshIndex: fuselageMesh });
  const nodeCockpit = b.addNode({ name: 'Cockpit', meshIndex: cockpitMesh });
  const nodeWings = b.addNode({ name: 'MainWings', meshIndex: wingsMesh });
  const nodeEngines = b.addNode({ name: 'Engines', meshIndex: enginesMesh });
  const nodeTail = b.addNode({ name: 'TailSection', meshIndex: tailMesh });
  const nodeGear = b.addNode({ name: 'LandingGear', meshIndex: gearMesh });

  const rootNode = b.addNode({
    name: 'Airbus_A320_Root',
    children: [nodeFuselage, nodeCockpit, nodeWings, nodeEngines, nodeTail, nodeGear]
  });

  return b.buildGLBBuffer([rootNode]);
}

// -------------------------------------------------------------
// 2. BOEING 747-400 GENERATOR (JUMBO JET)
// -------------------------------------------------------------
function generateB747() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  // Fuselage with upper deck hump
  const profiles = [
    { z: -35.0, rx: 0.01, ry: 0.01, cy: 0.0 }, // Nose tip
    { z: -33.0, rx: 1.5, ry: 1.5, cy: 0.1 },
    { z: -30.0, rx: 2.8, ry: 3.2, cy: 0.6 },  // Lower cockpit
    { z: -26.0, rx: 3.3, ry: 4.1, cy: 1.2 },  // Upper deck hump max
    { z: -18.0, rx: 3.3, ry: 4.1, cy: 1.2 },  // Upper deck cabin
    { z: -8.0,  rx: 3.3, ry: 3.5, cy: 0.4 },  // Blend back to main deck
    { z:  0.0,  rx: 3.3, ry: 3.3, cy: 0.0 },  // Wing center
    { z: 15.0,  rx: 3.3, ry: 3.3, cy: 0.0 },
    { z: 26.0,  rx: 2.7, ry: 2.7, cy: 0.4 },  // Tail taper
    { z: 32.0,  rx: 1.4, ry: 1.6, cy: 0.9 },
    { z: 35.5,  rx: 0.01, ry: 0.01, cy: 1.2 } // Tail cone
  ];
  const fuselageGeo = createLoftFuselage(profiles, 26);
  const fuselageMesh = b.addMesh('B747_Fuselage_Mesh', [{
    positions: fuselageGeo.positions,
    indices: fuselageGeo.indices,
    normals: fuselageGeo.normals,
    materialIndex: m.whiteFuselage
  }]);

  // Cockpit windows on upper deck
  const cockpitGeo = createBox(2.8, 0.8, 1.8, 0, 3.2, -27.5);
  const cockpitMesh = b.addMesh('B747_Cockpit_Mesh', [{
    positions: cockpitGeo.positions,
    indices: cockpitGeo.indices,
    normals: cockpitGeo.normals,
    materialIndex: m.cockpitGlass
  }]);

  // Giant swept wings with winglets
  const leftWing = createSweptWing({
    rootX: -3.0, rootY: -0.6, rootZ: -3.0,
    span: 29.0, rootChord: 12.0, tipChord: 3.2,
    sweepBack: 14.5, dihedralY: 3.2, thickness: 0.8,
    isLeft: true
  });
  const rightWing = createSweptWing({
    rootX: 3.0, rootY: -0.6, rootZ: -3.0,
    span: 29.0, rootChord: 12.0, tipChord: 3.2,
    sweepBack: 14.5, dihedralY: 3.2, thickness: 0.8,
    isLeft: false
  });
  const wingsGeo = mergeGeometries([leftWing, rightWing]);

  // Vertical winglets
  const leftWinglet = createBox(0.18, 2.8, 1.8, -32.0, 3.6, 11.5);
  const rightWinglet = createBox(0.18, 2.8, 1.8, 32.0, 3.6, 11.5);
  const wingletsGeo = mergeGeometries([leftWinglet, rightWinglet]);

  const wingsMesh = b.addMesh('B747_Wings_Mesh', [
    {
      positions: wingsGeo.positions,
      indices: wingsGeo.indices,
      normals: wingsGeo.normals,
      materialIndex: m.wingGray
    },
    {
      positions: wingletsGeo.positions,
      indices: wingletsGeo.indices,
      normals: wingletsGeo.normals,
      materialIndex: m.airlineBlue
    }
  ]);

  // 4x Giant Turbofan Engines (Inboard: -11m/+11m, Outboard: -19m/+19m)
  function makeTurbofan(cx, cz) {
    const cowl = createCylinder(1.45, 1.35, 4.2, 20, cx, -2.4, cz, 'z');
    const fan = createCylinder(1.30, 1.30, 0.3, 18, cx, -2.4, cz - 1.8, 'z');
    const pylon = createBox(0.42, 1.6, 4.0, cx, -1.2, cz + 0.3);
    return { cowl, fan, pylon };
  }

  const eL1 = makeTurbofan(-11.5, 0.5);
  const eL2 = makeTurbofan(-20.0, 4.5);
  const eR1 = makeTurbofan(11.5, 0.5);
  const eR2 = makeTurbofan(20.0, 4.5);

  const allCowls = mergeGeometries([eL1.cowl, eL2.cowl, eR1.cowl, eR2.cowl, eL1.pylon, eL2.pylon, eR1.pylon, eR2.pylon]);
  const allFans = mergeGeometries([eL1.fan, eL2.fan, eR1.fan, eR2.fan]);

  const enginesMesh = b.addMesh('B747_Engines_Mesh', [
    {
      positions: allCowls.positions,
      indices: allCowls.indices,
      normals: allCowls.normals,
      materialIndex: m.whiteFuselage
    },
    {
      positions: allFans.positions,
      indices: allFans.indices,
      normals: allFans.normals,
      materialIndex: m.engineIntakeDark
    }
  ]);

  // Giant Tail
  const tailFinGeo = createSweptWing({
    rootX: 0, rootY: 2.6, rootZ: 21.0,
    span: 11.5, rootChord: 9.5, tipChord: 3.5,
    sweepBack: 8.5, dihedralY: 0.0, thickness: 0.55,
    isLeft: false
  });
  const finPositions = [];
  for (let i = 0; i < tailFinGeo.positions.length; i += 3) {
    finPositions.push(-tailFinGeo.positions[i + 1] + 2.6, tailFinGeo.positions[i] + 2.6, tailFinGeo.positions[i + 2]);
  }
  const finNormals = computeNormals(finPositions, tailFinGeo.indices);

  const leftHStab = createSweptWing({
    rootX: -1.2, rootY: 1.8, rootZ: 28.0,
    span: 10.5, rootChord: 5.5, tipChord: 2.2,
    sweepBack: 5.5, dihedralY: 0.8, thickness: 0.4,
    isLeft: true
  });
  const rightHStab = createSweptWing({
    rootX: 1.2, rootY: 1.8, rootZ: 28.0,
    span: 10.5, rootChord: 5.5, tipChord: 2.2,
    sweepBack: 5.5, dihedralY: 0.8, thickness: 0.4,
    isLeft: false
  });
  const hStabs = mergeGeometries([leftHStab, rightHStab]);

  const tailMesh = b.addMesh('B747_Tail_Mesh', [
    {
      positions: finPositions,
      indices: tailFinGeo.indices,
      normals: finNormals,
      materialIndex: m.airlineBlue
    },
    {
      positions: hStabs.positions,
      indices: hStabs.indices,
      normals: hStabs.normals,
      materialIndex: m.wingGray
    }
  ]);

  // 18-Wheel Landing Gear
  const noseGear = createCylinder(0.65, 0.65, 0.4, 14, -0.4, -3.8, -26.0, 'x');
  const noseGearR = createCylinder(0.65, 0.65, 0.4, 14, 0.4, -3.8, -26.0, 'x');
  const mainBogie1 = createBox(4.5, 0.8, 4.0, -5.5, -3.8, 1.5);
  const mainBogie2 = createBox(4.5, 0.8, 4.0, 5.5, -3.8, 1.5);
  const gearGeo = mergeGeometries([noseGear, noseGearR, mainBogie1, mainBogie2]);

  const gearMesh = b.addMesh('B747_Gear_Mesh', [{
    positions: gearGeo.positions,
    indices: gearGeo.indices,
    normals: gearGeo.normals,
    materialIndex: m.tireRubber
  }]);

  const nF = b.addNode({ name: 'Fuselage', meshIndex: fuselageMesh });
  const nC = b.addNode({ name: 'Cockpit', meshIndex: cockpitMesh });
  const nW = b.addNode({ name: 'Wings', meshIndex: wingsMesh });
  const nE = b.addNode({ name: 'Engines', meshIndex: enginesMesh });
  const nT = b.addNode({ name: 'Tail', meshIndex: tailMesh });
  const nG = b.addNode({ name: 'Gear', meshIndex: gearMesh });

  const root = b.addNode({
    name: 'Boeing_747_400_Root',
    children: [nF, nC, nW, nE, nT, nG]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 3. MCDONNELL DOUGLAS DC-10-30 GENERATOR (HIGH-DETAIL TRIJET)
// -------------------------------------------------------------
function generateDC10() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  function transformGeo(geo, { rx = 0, ry = 0, rz = 0, tx = 0, ty = 0, tz = 0 } = {}) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    const positions = [];
    for (let i = 0; i < geo.positions.length; i += 3) {
      let x = geo.positions[i];
      let y = geo.positions[i + 1];
      let z = geo.positions[i + 2];

      if (rx !== 0) {
        const y1 = y * cx - z * sx;
        const z1 = y * sx + z * cx;
        y = y1; z = z1;
      }
      if (ry !== 0) {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        x = x1; z = z1;
      }
      if (rz !== 0) {
        const x1 = x * cz - y * sz;
        const y1 = x * sz + y * cz;
        x = x1; y = y1;
      }
      positions.push(x + tx, y + ty, z + tz);
    }
    return {
      positions,
      indices: geo.indices.slice(),
      normals: computeNormals(positions, geo.indices)
    };
  }

  // A. Widebody Fuselage (36 radial segments x 18 longitudinal stations)
  const profiles = [
    { z: -27.2, rx: 0.01, ry: 0.01, cy: -0.15 },
    { z: -26.8, rx: 0.42, ry: 0.40, cy: -0.12 },
    { z: -26.0, rx: 0.95, ry: 0.92, cy: -0.05 },
    { z: -24.8, rx: 1.58, ry: 1.56, cy: 0.02 },
    { z: -23.2, rx: 2.22, ry: 2.26, cy: 0.10 },
    { z: -21.2, rx: 2.75, ry: 2.86, cy: 0.15 },
    { z: -18.5, rx: 2.98, ry: 3.02, cy: 0.15 },
    { z: -12.0, rx: 3.02, ry: 3.04, cy: 0.15 },
    { z:  -4.0, rx: 3.02, ry: 3.04, cy: 0.15 },
    { z:   4.0, rx: 3.02, ry: 3.04, cy: 0.15 },
    { z:  12.0, rx: 3.00, ry: 3.02, cy: 0.16 },
    { z:  16.5, rx: 2.76, ry: 2.80, cy: 0.24 },
    { z:  20.5, rx: 2.28, ry: 2.38, cy: 0.38 },
    { z:  24.0, rx: 1.55, ry: 1.72, cy: 0.56 },
    { z:  26.5, rx: 0.92, ry: 1.10, cy: 0.72 },
    { z:  28.2, rx: 0.42, ry: 0.52, cy: 0.84 },
    { z:  29.0, rx: 0.18, ry: 0.22, cy: 0.88 },
    { z:  29.2, rx: 0.01, ry: 0.01, cy: 0.90 }
  ];
  const fuselageGeo = createLoftFuselage(profiles, 36);

  // Wing-to-body belly fairing + dorsal antennas
  const bellyFairing = createLoftFuselage([
    { z: -7.5, rx: 0.2, ry: 0.1, cy: -2.4 },
    { z: -4.0, rx: 2.45, ry: 0.85, cy: -2.35 },
    { z:  2.0, rx: 2.65, ry: 0.95, cy: -2.38 },
    { z:  7.5, rx: 2.20, ry: 0.75, cy: -2.32 },
    { z: 10.5, rx: 0.2, ry: 0.1, cy: -2.3 }
  ], 20);
  const vhfAnt1 = transformGeo(createBox(0.08, 0.55, 0.45), { rx: 0.22, tx: 0, ty: 3.35, tz: -14.5 });
  const vhfAnt2 = transformGeo(createBox(0.08, 0.48, 0.40), { rx: 0.20, tx: 0, ty: 3.32, tz: 3.5 });
  const satcomDome = createLoftFuselage([
    { z: -3.2, rx: 0.05, ry: 0.05, cy: 3.16 },
    { z: -2.0, rx: 0.42, ry: 0.28, cy: 3.16 },
    { z: -0.5, rx: 0.42, ry: 0.28, cy: 3.16 },
    { z:  0.8, rx: 0.05, ry: 0.05, cy: 3.16 }
  ], 14);

  const mainFuselage = mergeGeometries([fuselageGeo, bellyFairing, vhfAnt1, vhfAnt2, satcomDome]);

  // Nose radome tip + lower fuselage cheatline livery
  const noseRadome = createLoftFuselage([
    { z: -27.25, rx: 0.01, ry: 0.01, cy: -0.15 },
    { z: -26.8, rx: 0.43, ry: 0.41, cy: -0.12 },
    { z: -25.95, rx: 0.96, ry: 0.93, cy: -0.05 }
  ], 28);

  const stripeParts = [];
  for (const side of [-1, 1]) {
    stripeParts.push(createBox(0.08, 0.34, 34.0, side * 3.01, 0.35, -2.5));
    stripeParts.push(transformGeo(createBox(0.08, 0.30, 6.2), { ry: side * -0.26, tx: side * 2.18, ty: 0.32, tz: -21.8 }));
    stripeParts.push(transformGeo(createBox(0.08, 0.28, 7.0), { ry: side * 0.22, tx: side * 2.25, ty: 0.48, tz: 17.5 }));
  }
  const redLiveryGeo = mergeGeometries(stripeParts);

  const goldParts = [];
  for (const side of [-1, 1]) {
    goldParts.push(createBox(0.07, 0.12, 34.0, side * 3.02, 0.10, -2.5));
  }
  const goldLiveryGeo = mergeGeometries(goldParts);

  // Wrap-around 6-pane cockpit windshield
  const cockpitPanes = [
    transformGeo(createBox(1.15, 0.56, 0.14), { rx: -0.58, ry: 0.24, tx: -0.62, ty: 1.52, tz: -22.75 }),
    transformGeo(createBox(1.15, 0.56, 0.14), { rx: -0.58, ry: -0.24, tx: 0.62, ty: 1.52, tz: -22.75 }),
    transformGeo(createBox(1.05, 0.52, 0.14), { rx: -0.42, ry: 0.72, tx: -1.55, ty: 1.46, tz: -22.15 }),
    transformGeo(createBox(1.05, 0.52, 0.14), { rx: -0.42, ry: -0.72, tx: 1.55, ty: 1.46, tz: -22.15 }),
    transformGeo(createBox(0.95, 0.48, 0.14), { rx: -0.25, ry: 1.18, tx: -2.18, ty: 1.42, tz: -21.35 }),
    transformGeo(createBox(0.95, 0.48, 0.14), { rx: -0.25, ry: -1.18, tx: 2.18, ty: 1.42, tz: -21.35 })
  ];
  const cockpitGeo = mergeGeometries(cockpitPanes);

  // Cabin passenger windows (port & starboard)
  const windowParts = [];
  for (let z = -18.5; z <= 13.5; z += 1.05) {
    // Skip door gaps
    if (Math.abs(z + 15.3) < 0.7 || Math.abs(z + 4.8) < 0.7 || Math.abs(z - 5.7) < 0.7 || Math.abs(z - 12.0) < 0.7) {
      continue;
    }
    windowParts.push(createBox(0.10, 0.34, 0.26, -3.00, 0.85, z));
    windowParts.push(createBox(0.10, 0.34, 0.26, 3.00, 0.85, z));
  }
  const windowsGeo = mergeGeometries(windowParts);

  const fuselageMesh = b.addMesh('DC10_Fuselage_Mesh', [
    {
      positions: mainFuselage.positions,
      indices: mainFuselage.indices,
      normals: mainFuselage.normals,
      materialIndex: m.whiteFuselage
    },
    {
      positions: noseRadome.positions,
      indices: noseRadome.indices,
      normals: noseRadome.normals,
      materialIndex: m.engineIntakeDark
    },
    {
      positions: redLiveryGeo.positions,
      indices: redLiveryGeo.indices,
      normals: redLiveryGeo.normals,
      materialIndex: m.airlineRed
    },
    {
      positions: goldLiveryGeo.positions,
      indices: goldLiveryGeo.indices,
      normals: goldLiveryGeo.normals,
      materialIndex: m.goldTrim
    },
    {
      positions: cockpitGeo.positions,
      indices: cockpitGeo.indices,
      normals: cockpitGeo.normals,
      materialIndex: m.cockpitGlass
    },
    {
      positions: windowsGeo.positions,
      indices: windowsGeo.indices,
      normals: windowsGeo.normals,
      materialIndex: m.cabinWindows
    }
  ]);

  // B. Two-Section Swept Wings + 8 Flap Track Fairings + Wingtip Pods
  const leftInboard = createSweptWing({
    rootX: -2.6, rootY: -0.55, rootZ: -2.2,
    span: 8.4, rootChord: 10.8, tipChord: 6.4,
    sweepBack: 3.1, dihedralY: 0.75, thickness: 0.78,
    isLeft: true
  });
  const leftOutboard = createSweptWing({
    rootX: -11.0, rootY: 0.20, rootZ: 0.9,
    span: 14.8, rootChord: 6.4, tipChord: 2.3,
    sweepBack: 6.1, dihedralY: 1.55, thickness: 0.48,
    isLeft: true
  });
  const rightInboard = createSweptWing({
    rootX: 2.6, rootY: -0.55, rootZ: -2.2,
    span: 8.4, rootChord: 10.8, tipChord: 6.4,
    sweepBack: 3.1, dihedralY: 0.75, thickness: 0.78,
    isLeft: false
  });
  const rightOutboard = createSweptWing({
    rootX: 11.0, rootY: 0.20, rootZ: 0.9,
    span: 14.8, rootChord: 6.4, tipChord: 2.3,
    sweepBack: 6.1, dihedralY: 1.55, thickness: 0.48,
    isLeft: false
  });

  // Flap track canoe fairings under each wing
  const flapFairings = [];
  const fairingSpecs = [
    { x: 5.5, y: -0.62, z: 6.4, len: 2.6 },
    { x: 9.8, y: -0.25, z: 6.6, len: 2.3 },
    { x: 14.8, y: 0.25, z: 7.4, len: 1.9 },
    { x: 19.8, y: 0.80, z: 8.5, len: 1.5 }
  ];
  for (const f of fairingSpecs) {
    for (const side of [-1, 1]) {
      flapFairings.push(createCylinder(0.16, 0.04, f.len, 10, side * f.x, f.y, f.z, 'z'));
    }
  }

  // Wingtip nav light pods
  const leftTipPod = createCylinder(0.16, 0.14, 1.8, 12, -25.8, 1.75, 8.2, 'z');
  const rightTipPod = createCylinder(0.16, 0.14, 1.8, 12, 25.8, 1.75, 8.2, 'z');

  const wingsGeo = mergeGeometries([
    leftInboard, leftOutboard, rightInboard, rightOutboard,
    ...flapFairings, leftTipPod, rightTipPod
  ]);
  const wingsMesh = b.addMesh('DC10_Wings_Mesh', [{
    positions: wingsGeo.positions,
    indices: wingsGeo.indices,
    normals: wingsGeo.normals,
    materialIndex: m.wingGray
  }]);

  // C. Trijet CF6-50 Engines (2 Underwing + 1 Straight-Through Tail #2)
  function buildCF6Engine(cx, cy, cz, scale = 1.0, includePylon = true) {
    const cowlParts = [];
    const chromeParts = [];
    const darkParts = [];
    const coreParts = [];

    // Outer fan cowl
    cowlParts.push(createCylinder(1.36 * scale, 1.46 * scale, 1.35 * scale, 28, cx, cy, cz - 1.35 * scale, 'z'));
    cowlParts.push(createCylinder(1.46 * scale, 1.38 * scale, 2.35 * scale, 28, cx, cy, cz + 0.50 * scale, 'z'));
    // Core cowling
    coreParts.push(createCylinder(1.22 * scale, 0.96 * scale, 1.45 * scale, 24, cx, cy, cz + 2.25 * scale, 'z'));

    // Chrome intake lip + exhaust plug
    chromeParts.push(createCylinder(1.28 * scale, 1.38 * scale, 0.38 * scale, 28, cx, cy, cz - 2.12 * scale, 'z'));
    chromeParts.push(createCylinder(0.02, 0.38 * scale, 0.78 * scale, 16, cx, cy, cz - 1.55 * scale, 'z')); // Spinner
    chromeParts.push(createCylinder(0.45 * scale, 0.04, 1.05 * scale, 16, cx, cy, cz + 3.15 * scale, 'z')); // Exhaust cone

    // Dark intake throat + exhaust nozzle + 12 fan blades
    darkParts.push(createCylinder(1.22 * scale, 1.22 * scale, 0.30 * scale, 24, cx, cy, cz - 1.30 * scale, 'z'));
    darkParts.push(createCylinder(0.92 * scale, 0.72 * scale, 0.75 * scale, 22, cx, cy, cz + 2.85 * scale, 'z'));
    for (let bIdx = 0; bIdx < 12; bIdx++) {
      const ang = (bIdx / 12) * Math.PI * 2;
      const bx = cx + Math.cos(ang) * 0.76 * scale;
      const by = cy + Math.sin(ang) * 0.76 * scale;
      darkParts.push(transformGeo(createBox(0.06 * scale, 0.74 * scale, 0.22 * scale), {
        rz: ang - Math.PI / 2,
        ry: 0.35,
        tx: bx,
        ty: by,
        tz: cz - 1.42 * scale
      }));
    }

    if (includePylon) {
      coreParts.push(transformGeo(createBox(0.42 * scale, 1.45 * scale, 3.8 * scale), {
        rx: 0.14,
        tx: cx,
        ty: cy + 1.25 * scale,
        tz: cz + 0.55 * scale
      }));
    }

    return { cowlParts, chromeParts, darkParts, coreParts };
  }

  const eng1 = buildCF6Engine(-8.5, -2.05, -0.4, 1.0, true);
  const eng3 = buildCF6Engine(8.5, -2.05, -0.4, 1.0, true);
  const eng2 = buildCF6Engine(0, 4.65, 17.8, 1.06, false);

  // Extended straight-through tail nacelle fairing for Engine #2
  const tailNacelleBody = createCylinder(1.48, 1.42, 4.4, 28, 0, 4.65, 18.0, 'z');
  const tailNacelleFairing = transformGeo(createBox(0.85, 2.35, 6.2), { rx: -0.08, tx: 0, ty: 2.95, tz: 18.2 });
  const tailStripeRing = createCylinder(1.50, 1.49, 0.65, 28, 0, 4.65, 16.5, 'z');

  const allCowl = mergeGeometries([...eng1.cowlParts, ...eng3.cowlParts, ...eng2.cowlParts, tailNacelleBody, tailNacelleFairing]);
  const allCore = mergeGeometries([...eng1.coreParts, ...eng3.coreParts, ...eng2.coreParts]);
  const allChrome = mergeGeometries([...eng1.chromeParts, ...eng3.chromeParts, ...eng2.chromeParts]);
  const allDark = mergeGeometries([...eng1.darkParts, ...eng3.darkParts, ...eng2.darkParts]);

  const enginesMesh = b.addMesh('DC10_Engines_Mesh', [
    {
      positions: allCowl.positions,
      indices: allCowl.indices,
      normals: allCowl.normals,
      materialIndex: m.whiteFuselage
    },
    {
      positions: allCore.positions,
      indices: allCore.indices,
      normals: allCore.normals,
      materialIndex: m.wingGray
    },
    {
      positions: allChrome.positions,
      indices: allChrome.indices,
      normals: allChrome.normals,
      materialIndex: m.engineChrome
    },
    {
      positions: allDark.positions,
      indices: allDark.indices,
      normals: allDark.normals,
      materialIndex: m.engineIntakeDark
    },
    {
      positions: tailStripeRing.positions,
      indices: tailStripeRing.indices,
      normals: tailStripeRing.normals,
      materialIndex: m.airlineRed
    }
  ]);

  // D. Vertical Stabilizer (rising above Engine #2) & Horizontal Stabilizers
  const upperFinGeo = createSweptWing({
    rootX: 0, rootY: 5.5, rootZ: 15.8,
    span: 6.9, rootChord: 6.1, tipChord: 2.5,
    sweepBack: 4.3, dihedralY: 0.0, thickness: 0.44,
    isLeft: false
  });
  const finPositions = [];
  for (let i = 0; i < upperFinGeo.positions.length; i += 3) {
    finPositions.push(-upperFinGeo.positions[i + 1] + 5.5, upperFinGeo.positions[i] + 5.5, upperFinGeo.positions[i + 2]);
  }
  const finNormals = computeNormals(finPositions, upperFinGeo.indices);

  // Rudder accent / tail tip cap
  const finTipAccent = createBox(0.24, 0.45, 2.3, 0, 12.25, 21.35);

  const leftHStab = createSweptWing({
    rootX: -0.9, rootY: 1.45, rootZ: 22.8,
    span: 9.6, rootChord: 4.8, tipChord: 1.8,
    sweepBack: 4.2, dihedralY: 0.65, thickness: 0.34,
    isLeft: true
  });
  const rightHStab = createSweptWing({
    rootX: 0.9, rootY: 1.45, rootZ: 22.8,
    span: 9.6, rootChord: 4.8, tipChord: 1.8,
    sweepBack: 4.2, dihedralY: 0.65, thickness: 0.34,
    isLeft: false
  });
  const hStabs = mergeGeometries([leftHStab, rightHStab]);

  const tailMesh = b.addMesh('DC10_Tail_Mesh', [
    {
      positions: finPositions,
      indices: upperFinGeo.indices,
      normals: finNormals,
      materialIndex: m.airlineRed
    },
    {
      positions: finTipAccent.positions,
      indices: finTipAccent.indices,
      normals: finTipAccent.normals,
      materialIndex: m.goldTrim
    },
    {
      positions: hStabs.positions,
      indices: hStabs.indices,
      normals: hStabs.normals,
      materialIndex: m.wingGray
    }
  ]);

  // E. Signature DC-10-30 4-Point Landing Gear (Nose + Left/Right 4-wheel Bogies + Centerline 2-wheel Bogie)
  const tireParts = [];
  const strutParts = [];

  // Nose Gear (twin wheels)
  tireParts.push(createCylinder(0.56, 0.56, 0.36, 18, -0.42, -3.55, -20.5, 'x'));
  tireParts.push(createCylinder(0.56, 0.56, 0.36, 18, 0.42, -3.55, -20.5, 'x'));
  strutParts.push(createCylinder(0.16, 0.16, 2.1, 12, 0, -2.55, -20.5, 'y'));
  strutParts.push(createCylinder(0.24, 0.24, 0.85, 12, 0, -3.55, -20.5, 'x'));

  // Main Wing Bogies (4 wheels each)
  for (const side of [-1, 1]) {
    const gx = side * 5.3;
    const gz = 1.8;
    for (const dz of [-0.75, 0.75]) {
      for (const dx of [-0.48, 0.48]) {
        tireParts.push(createCylinder(0.68, 0.68, 0.42, 18, gx + dx, -3.55, gz + dz, 'x'));
      }
    }
    strutParts.push(createCylinder(0.22, 0.22, 2.9, 12, gx, -2.15, gz, 'y'));
    strutParts.push(createBox(0.32, 0.24, 1.85, gx, -3.55, gz));
  }

  // DC-10-30 Centerline Main Gear (twin wheels under belly)
  tireParts.push(createCylinder(0.64, 0.64, 0.40, 18, -0.45, -3.55, 2.2, 'x'));
  tireParts.push(createCylinder(0.64, 0.64, 0.40, 18, 0.45, -3.55, 2.2, 'x'));
  strutParts.push(createCylinder(0.18, 0.18, 1.8, 12, 0, -2.65, 2.2, 'y'));
  strutParts.push(createCylinder(0.26, 0.26, 0.95, 12, 0, -3.55, 2.2, 'x'));

  const allTires = mergeGeometries(tireParts);
  const allStruts = mergeGeometries(strutParts);
  const gearMesh = b.addMesh('DC10_Gear_Mesh', [
    {
      positions: allTires.positions,
      indices: allTires.indices,
      normals: allTires.normals,
      materialIndex: m.tireRubber
    },
    {
      positions: allStruts.positions,
      indices: allStruts.indices,
      normals: allStruts.normals,
      materialIndex: m.engineChrome
    }
  ]);

  const nF = b.addNode({ name: 'Fuselage', meshIndex: fuselageMesh });
  const nW = b.addNode({ name: 'Wings', meshIndex: wingsMesh });
  const nE = b.addNode({ name: 'TrijetEngines', meshIndex: enginesMesh });
  const nT = b.addNode({ name: 'TailSection', meshIndex: tailMesh });
  const nG = b.addNode({ name: 'LandingGear', meshIndex: gearMesh });

  const root = b.addNode({
    name: 'McDonnell_Douglas_DC10_Root',
    children: [nF, nW, nE, nT, nG]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 4. MCDONNELL DOUGLAS MD-80 GENERATOR (MAD DOG)
// -------------------------------------------------------------
function generateMD80() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  // Slender long pencil fuselage
  const profiles = [
    { z: -22.5, rx: 0.01, ry: 0.01, cy: 0.0 },
    { z: -21.0, rx: 1.0, ry: 1.0, cy: 0.05 },
    { z: -18.5, rx: 1.65, ry: 1.65, cy: 0.1 },
    { z: -10.0, rx: 1.68, ry: 1.68, cy: 0.1 },
    { z:   0.0, rx: 1.68, ry: 1.68, cy: 0.1 },
    { z:  10.0, rx: 1.68, ry: 1.68, cy: 0.1 },
    { z:  17.0, rx: 1.55, ry: 1.55, cy: 0.15 },
    { z:  21.5, rx: 0.90, ry: 0.90, cy: 0.3 },
    { z:  23.5, rx: 0.01, ry: 0.01, cy: 0.4 } // Flat screwdriver tail cone
  ];
  const fuselageGeo = createLoftFuselage(profiles, 22);
  const fuselageMesh = b.addMesh('MD80_Fuselage_Mesh', [{
    positions: fuselageGeo.positions,
    indices: fuselageGeo.indices,
    normals: fuselageGeo.normals,
    materialIndex: m.whiteFuselage
  }]);

  // Clean swept wings (no underwing engines!)
  const leftWing = createSweptWing({
    rootX: -1.6, rootY: -0.3, rootZ: -1.5,
    span: 15.0, rootChord: 5.5, tipChord: 1.5,
    sweepBack: 4.8, dihedralY: 1.2, thickness: 0.4,
    isLeft: true
  });
  const rightWing = createSweptWing({
    rootX: 1.6, rootY: -0.3, rootZ: -1.5,
    span: 15.0, rootChord: 5.5, tipChord: 1.5,
    sweepBack: 4.8, dihedralY: 1.2, thickness: 0.4,
    isLeft: false
  });
  const wingsGeo = mergeGeometries([leftWing, rightWing]);
  const wingsMesh = b.addMesh('MD80_Wings_Mesh', [{
    positions: wingsGeo.positions,
    indices: wingsGeo.indices,
    normals: wingsGeo.normals,
    materialIndex: m.wingGray
  }]);

  // Twin Rear Fuselage Engines (JT8D low-bypass turbofans)
  const engL = createCylinder(0.85, 0.78, 4.2, 18, -2.45, 0.4, 13.5, 'z');
  const engR = createCylinder(0.85, 0.78, 4.2, 18, 2.45, 0.4, 13.5, 'z');
  const pylonL = createBox(0.9, 0.3, 2.4, -1.9, 0.4, 13.5);
  const pylonR = createBox(0.9, 0.3, 2.4, 1.9, 0.4, 13.5);
  const rearEngines = mergeGeometries([engL, engR, pylonL, pylonR]);

  const enginesMesh = b.addMesh('MD80_Engines_Mesh', [{
    positions: rearEngines.positions,
    indices: rearEngines.indices,
    normals: rearEngines.normals,
    materialIndex: m.engineChrome
  }]);

  // High T-TAIL: Vertical stabilizer + Horizontal Stabilizer perched on top!
  const tailFinGeo = createSweptWing({
    rootX: 0, rootY: 1.2, rootZ: 14.0,
    span: 6.8, rootChord: 5.8, tipChord: 2.2,
    sweepBack: 4.6, dihedralY: 0.0, thickness: 0.35,
    isLeft: false
  });
  const finPositions = [];
  for (let i = 0; i < tailFinGeo.positions.length; i += 3) {
    finPositions.push(-tailFinGeo.positions[i + 1] + 1.2, tailFinGeo.positions[i] + 1.2, tailFinGeo.positions[i + 2]);
  }
  const finNormals = computeNormals(finPositions, tailFinGeo.indices);

  // Horizontal stabilizer sitting on the VERY TOP of the vertical fin (Y = 8.0)
  const leftHStab = createSweptWing({
    rootX: -0.4, rootY: 7.9, rootZ: 18.2,
    span: 5.5, rootChord: 2.6, tipChord: 1.1,
    sweepBack: 2.2, dihedralY: 0.0, thickness: 0.25,
    isLeft: true
  });
  const rightHStab = createSweptWing({
    rootX: 0.4, rootY: 7.9, rootZ: 18.2,
    span: 5.5, rootChord: 2.6, tipChord: 1.1,
    sweepBack: 2.2, dihedralY: 0.0, thickness: 0.25,
    isLeft: false
  });
  const bulletFairing = createCylinder(0.35, 0.25, 3.2, 12, 0, 8.0, 18.0, 'z');
  const tTailStabs = mergeGeometries([leftHStab, rightHStab, bulletFairing]);

  const tailMesh = b.addMesh('MD80_TTail_Mesh', [
    {
      positions: finPositions,
      indices: tailFinGeo.indices,
      normals: finNormals,
      materialIndex: m.airlineRed
    },
    {
      positions: tTailStabs.positions,
      indices: tTailStabs.indices,
      normals: tTailStabs.normals,
      materialIndex: m.wingGray
    }
  ]);

  const nF = b.addNode({ name: 'Fuselage', meshIndex: fuselageMesh });
  const nW = b.addNode({ name: 'Wings', meshIndex: wingsMesh });
  const nE = b.addNode({ name: 'RearEngines', meshIndex: enginesMesh });
  const nT = b.addNode({ name: 'TTailSection', meshIndex: tailMesh });

  const root = b.addNode({
    name: 'McDonnell_Douglas_MD80_Root',
    children: [nF, nW, nE, nT]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 5. CONCORDE SUPERSONIC GENERATOR (MACH 2.0)
// -------------------------------------------------------------
function generateConcorde() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  // Ultra-slender needle fuselage
  const profiles = [
    { z: -31.0, rx: 0.01, ry: 0.01, cy: -0.3 }, // Needle tip
    { z: -27.0, rx: 0.55, ry: 0.55, cy: -0.25 }, // Droop nose section
    { z: -22.0, rx: 1.20, ry: 1.25, cy: -0.05 }, // Visor cockpit
    { z: -15.0, rx: 1.45, ry: 1.50, cy: 0.05 },
    { z:   0.0, rx: 1.45, ry: 1.50, cy: 0.05 },
    { z:  15.0, rx: 1.45, ry: 1.50, cy: 0.05 },
    { z:  24.0, rx: 0.95, ry: 1.05, cy: 0.15 },
    { z:  30.5, rx: 0.01, ry: 0.01, cy: 0.25 }  // Tail sting
  ];
  const fuselageGeo = createLoftFuselage(profiles, 22);
  const fuselageMesh = b.addMesh('Concorde_Fuselage_Mesh', [{
    positions: fuselageGeo.positions,
    indices: fuselageGeo.indices,
    normals: fuselageGeo.normals,
    materialIndex: m.whiteFuselage
  }]);

  // Iconic Ogival Delta Wing (curved S-shape leading edge)
  const leftDelta = createSweptWing({
    rootX: -1.4, rootY: -0.2, rootZ: -6.0,
    span: 12.8, rootChord: 24.0, tipChord: 1.2,
    sweepBack: 19.5, dihedralY: 0.4, thickness: 0.38,
    isLeft: true
  });
  const rightDelta = createSweptWing({
    rootX: 1.4, rootY: -0.2, rootZ: -6.0,
    span: 12.8, rootChord: 24.0, tipChord: 1.2,
    sweepBack: 19.5, dihedralY: 0.4, thickness: 0.38,
    isLeft: false
  });
  const deltaWings = mergeGeometries([leftDelta, rightDelta]);
  const deltaMesh = b.addMesh('Concorde_DeltaWings_Mesh', [{
    positions: deltaWings.positions,
    indices: deltaWings.indices,
    normals: deltaWings.normals,
    materialIndex: m.whiteFuselage
  }]);

  // 4x Olympus 593 Turbojets in twin paired underwing nacelles
  const nacelleL = createBox(2.6, 1.25, 7.8, -4.5, -0.9, 10.5);
  const nacelleR = createBox(2.6, 1.25, 7.8, 4.5, -0.9, 10.5);
  const exhaustL1 = createCylinder(0.55, 0.55, 0.8, 14, -5.2, -0.9, 14.6, 'z');
  const exhaustL2 = createCylinder(0.55, 0.55, 0.8, 14, -3.8, -0.9, 14.6, 'z');
  const exhaustR1 = createCylinder(0.55, 0.55, 0.8, 14, 3.8, -0.9, 14.6, 'z');
  const exhaustR2 = createCylinder(0.55, 0.55, 0.8, 14, 5.2, -0.9, 14.6, 'z');

  const nacellesGeo = mergeGeometries([nacelleL, nacelleR]);
  const exhaustsGeo = mergeGeometries([exhaustL1, exhaustL2, exhaustR1, exhaustR2]);

  const enginesMesh = b.addMesh('Concorde_Engines_Mesh', [
    {
      positions: nacellesGeo.positions,
      indices: nacellesGeo.indices,
      normals: nacellesGeo.normals,
      materialIndex: m.whiteFuselage
    },
    {
      positions: exhaustsGeo.positions,
      indices: exhaustsGeo.indices,
      normals: exhaustsGeo.normals,
      materialIndex: m.engineChrome
    }
  ]);

  // Tall swept vertical fin
  const tailFinGeo = createSweptWing({
    rootX: 0, rootY: 1.1, rootZ: 11.5,
    span: 7.8, rootChord: 11.5, tipChord: 2.5,
    sweepBack: 7.2, dihedralY: 0.0, thickness: 0.35,
    isLeft: false
  });
  const finPositions = [];
  for (let i = 0; i < tailFinGeo.positions.length; i += 3) {
    finPositions.push(-tailFinGeo.positions[i + 1] + 1.1, tailFinGeo.positions[i] + 1.1, tailFinGeo.positions[i + 2]);
  }
  const finNormals = computeNormals(finPositions, tailFinGeo.indices);

  const tailMesh = b.addMesh('Concorde_Tail_Mesh', [{
    positions: finPositions,
    indices: tailFinGeo.indices,
    normals: finNormals,
    materialIndex: m.airlineBlue
  }]);

  const nF = b.addNode({ name: 'Fuselage', meshIndex: fuselageMesh });
  const nW = b.addNode({ name: 'DeltaWings', meshIndex: deltaMesh });
  const nE = b.addNode({ name: 'OlympusTurbojets', meshIndex: enginesMesh });
  const nT = b.addNode({ name: 'TailFin', meshIndex: tailMesh });

  const root = b.addNode({
    name: 'Concorde_Supersonic_Root',
    children: [nF, nW, nE, nT]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 6. AMPHIBIAN SEAPLANE GENERATOR
// -------------------------------------------------------------
function generateAmphibian() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  // Boat-hull fuselage with V-shaped keel
  const profiles = [
    { z: -14.0, rx: 0.01, ry: 0.01, cy: 0.5 },
    { z: -12.5, rx: 1.2, ry: 1.4, cy: 0.3 },
    { z: -8.0,  rx: 1.8, ry: 1.9, cy: 0.0 }, // Stepped hydro hull
    { z:  0.0,  rx: 1.8, ry: 1.9, cy: -0.1 },
    { z:  6.0,  rx: 1.7, ry: 1.7, cy: 0.2 }, // Step break
    { z: 12.0,  rx: 1.1, ry: 1.2, cy: 0.6 },
    { z: 15.5,  rx: 0.01, ry: 0.01, cy: 0.9 }
  ];
  const fuselageGeo = createLoftFuselage(profiles, 20);
  const keelGeo = createBox(0.4, 0.6, 16.0, 0, -1.8, -1.0);
  const boatBody = mergeGeometries([fuselageGeo, keelGeo]);

  const fuselageMesh = b.addMesh('Amphibian_Fuselage_Mesh', [{
    positions: boatBody.positions,
    indices: boatBody.indices,
    normals: boatBody.normals,
    materialIndex: m.whiteFuselage
  }]);

  // High mounted wing
  const leftWing = createSweptWing({
    rootX: -1.2, rootY: 1.7, rootZ: -1.0,
    span: 14.5, rootChord: 4.8, tipChord: 2.2,
    sweepBack: 1.8, dihedralY: 0.5, thickness: 0.45,
    isLeft: true
  });
  const rightWing = createSweptWing({
    rootX: 1.2, rootY: 1.7, rootZ: -1.0,
    span: 14.5, rootChord: 4.8, tipChord: 2.2,
    sweepBack: 1.8, dihedralY: 0.5, thickness: 0.45,
    isLeft: false
  });
  const wingsGeo = mergeGeometries([leftWing, rightWing]);

  // Dual Seaplane Pontoons / Outrigger Floats on wingtips
  const floatL = createCylinder(0.55, 0.45, 4.6, 14, -12.5, -0.6, -0.5, 'z');
  const strutL = createBox(0.15, 2.1, 0.25, -12.5, 0.5, -0.5);
  const floatR = createCylinder(0.55, 0.45, 4.6, 14, 12.5, -0.6, -0.5, 'z');
  const strutR = createBox(0.15, 2.1, 0.25, 12.5, 0.5, -0.5);
  const floatsGeo = mergeGeometries([floatL, strutL, floatR, strutR]);

  const wingsMesh = b.addMesh('Amphibian_Wings_Mesh', [
    {
      positions: wingsGeo.positions,
      indices: wingsGeo.indices,
      normals: wingsGeo.normals,
      materialIndex: m.airlineBlue
    },
    {
      positions: floatsGeo.positions,
      indices: floatsGeo.indices,
      normals: floatsGeo.normals,
      materialIndex: m.whiteFuselage
    }
  ]);

  // Twin Wing-Mounted Turboprops
  const engL = createCylinder(0.75, 0.65, 3.2, 16, -4.8, 2.0, -1.8, 'z');
  const engR = createCylinder(0.75, 0.65, 3.2, 16, 4.8, 2.0, -1.8, 'z');
  const propL = createBox(0.15, 3.6, 0.15, -4.8, 2.0, -3.5);
  const propR = createBox(0.15, 3.6, 0.15, 4.8, 2.0, -3.5);

  const enginesGeo = mergeGeometries([engL, engR]);
  const propsGeo = mergeGeometries([propL, propR]);

  const enginesMesh = b.addMesh('Amphibian_Engines_Mesh', [
    {
      positions: enginesGeo.positions,
      indices: enginesGeo.indices,
      normals: enginesGeo.normals,
      materialIndex: m.engineChrome
    },
    {
      positions: propsGeo.positions,
      indices: propsGeo.indices,
      normals: propsGeo.normals,
      materialIndex: m.goldTrim
    }
  ]);

  // Tail Fin & High Stabilizers
  const tailFin = createBox(0.35, 4.8, 4.2, 0, 3.6, 12.5);
  const hStab = createBox(7.8, 0.25, 2.2, 0, 5.5, 13.0);
  const tailGeo = mergeGeometries([tailFin, hStab]);

  const tailMesh = b.addMesh('Amphibian_Tail_Mesh', [{
    positions: tailGeo.positions,
    indices: tailGeo.indices,
    normals: tailGeo.normals,
    materialIndex: m.airlineBlue
  }]);

  const nF = b.addNode({ name: 'BoatFuselage', meshIndex: fuselageMesh });
  const nW = b.addNode({ name: 'HighWings', meshIndex: wingsMesh });
  const nE = b.addNode({ name: 'Turboprops', meshIndex: enginesMesh });
  const nT = b.addNode({ name: 'TailSection', meshIndex: tailMesh });

  const root = b.addNode({
    name: 'Amphibian_Seaplane_Root',
    children: [nF, nW, nE, nT]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 7. 1903 WRIGHT FLYER ANCESTOR GENERATOR
// -------------------------------------------------------------
function generateAncestor() {
  const b = new GLBBuilder();
  const m = setupCommonMaterials(b);

  // Biplane dual wings (upper & lower canvas wings)
  const lowerWing = createBox(12.3, 0.12, 2.2, 0, 0.35, 0);
  const upperWing = createBox(12.3, 0.12, 2.2, 0, 2.25, 0);

  // 12x Wooden vertical struts
  const struts = [];
  const xPositions = [-5.5, -3.5, -1.8, 0, 1.8, 3.5, 5.5];
  for (const x of xPositions) {
    struts.push(createCylinder(0.04, 0.04, 1.9, 8, x, 1.3, -0.85, 'y'));
    struts.push(createCylinder(0.04, 0.04, 1.9, 8, x, 1.3, 0.85, 'y'));
  }
  const strutsGeo = mergeGeometries(struts);

  const wingsMesh = b.addMesh('Ancestor_Wings_Mesh', [
    {
      positions: mergeGeometries([lowerWing, upperWing]).positions,
      indices: mergeGeometries([lowerWing, upperWing]).indices,
      normals: mergeGeometries([lowerWing, upperWing]).normals,
      materialIndex: m.vintageFabric
    },
    {
      positions: strutsGeo.positions,
      indices: strutsGeo.indices,
      normals: strutsGeo.normals,
      materialIndex: m.woodGrain
    }
  ]);

  // Forward Biplane Canard Elevator
  const canardLower = createBox(4.5, 0.08, 1.2, 0, 0.8, -4.2);
  const canardUpper = createBox(4.5, 0.08, 1.2, 0, 1.7, -4.2);
  const canardBooms = [
    createBox(0.08, 0.08, 4.4, -1.2, 0.9, -2.1),
    createBox(0.08, 0.08, 4.4, 1.2, 0.9, -2.1)
  ];
  const canardGeo = mergeGeometries([canardLower, canardUpper]);
  const canardWoodGeo = mergeGeometries(canardBooms);

  const canardMesh = b.addMesh('Ancestor_Canard_Mesh', [
    {
      positions: canardGeo.positions,
      indices: canardGeo.indices,
      normals: canardGeo.normals,
      materialIndex: m.vintageFabric
    },
    {
      positions: canardWoodGeo.positions,
      indices: canardWoodGeo.indices,
      normals: canardWoodGeo.normals,
      materialIndex: m.woodGrain
    }
  ]);

  // Rear Twin Vertical Rudders
  const rudderL = createBox(0.06, 1.8, 1.2, -0.65, 1.3, 3.8);
  const rudderR = createBox(0.06, 1.8, 1.2, 0.65, 1.3, 3.8);
  const ruddersGeo = mergeGeometries([rudderL, rudderR]);

  const rudderMesh = b.addMesh('Ancestor_Rudder_Mesh', [{
    positions: ruddersGeo.positions,
    indices: ruddersGeo.indices,
    normals: ruddersGeo.normals,
    materialIndex: m.vintageFabric
  }]);

  // Wooden Skids & Twin Pusher Propellers
  const skidL = createBox(0.12, 0.15, 6.2, -1.1, -0.35, -1.0);
  const skidR = createBox(0.12, 0.15, 6.2, 1.1, -0.35, -1.0);
  const propL = createBox(0.12, 2.4, 0.08, -1.6, 1.3, 1.3);
  const propR = createBox(0.12, 2.4, 0.08, 1.6, 1.3, 1.3);
  const undercarriageGeo = mergeGeometries([skidL, skidR, propL, propR]);

  const undercarriageMesh = b.addMesh('Ancestor_Undercarriage_Mesh', [{
    positions: undercarriageGeo.positions,
    indices: undercarriageGeo.indices,
    normals: undercarriageGeo.normals,
    materialIndex: m.woodGrain
  }]);

  const nW = b.addNode({ name: 'BiplaneWings', meshIndex: wingsMesh });
  const nC = b.addNode({ name: 'CanardElevator', meshIndex: canardMesh });
  const nR = b.addNode({ name: 'RearRudders', meshIndex: rudderMesh });
  const nU = b.addNode({ name: 'SkidsAndProps', meshIndex: undercarriageMesh });

  const root = b.addNode({
    name: 'Wright_Flyer_Ancestor_1903_Root',
    children: [nW, nC, nR, nU]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 8. DEPARTURE AIRPORT GENERATOR (Runway 36L, Gates, ATC Tower, Taxiways)
// -------------------------------------------------------------
function generateAirport() {
  const b = new GLBBuilder();
  const mAsphalt = b.addMaterial('AsphaltRunway', { color: [0.12, 0.14, 0.18, 1.0], roughness: 0.85, metallic: 0.1 });
  const mGround = b.addMaterial('AirportGround', { color: [0.20, 0.24, 0.30, 1.0], roughness: 0.88, metallic: 0.1 });
  const mWhiteMarking = b.addMaterial('RunwayWhiteMarkings', { color: [0.96, 0.96, 0.98, 1.0], roughness: 0.35, metallic: 0.1 });
  const mYellowTaxi = b.addMaterial('TaxiwayYellowLines', { color: [0.98, 0.78, 0.12, 1.0], roughness: 0.35 });
  const mTerminal = b.addMaterial('TerminalArchitecture', { color: [0.85, 0.88, 0.92, 1.0], roughness: 0.4, metallic: 0.45 });
  const mGlass = b.addMaterial('TerminalCurvedGlass', { color: [0.08, 0.45, 0.75, 1.0], roughness: 0.12, metallic: 0.88 });
  const mPapiYellow = b.addMaterial('PAPI_Light_Boxes', { color: [0.98, 0.82, 0.08, 1.0], roughness: 0.4 });
  const mHangar = b.addMaterial('MaintenanceHangar', { color: [0.72, 0.76, 0.82, 1.0], roughness: 0.35, metallic: 0.7 });

  // 1. Airfield Island Base (1,400m x 4,400m)
  const airportGround = createBox(1400.0, 4.0, 4400.0, 0, 0, 0);

  // 2. Runway 36L (100m x 3,800m at X = 160, Y = 2.10, Z = 0)
  const runway = createHorizontalPlane(100.0, 3800.0, 160.0, 2.10, 0);

  // 3. Markings: Piano keys threshold at Z = ±1800
  const whiteMarkings = [];
  [-1800, 1800].forEach(zBase => {
    for (let k = -42; k <= 42; k += 5.5) {
      whiteMarkings.push(createHorizontalPlane(3.0, 50.0, 160.0 + k, 2.14, zBase));
    }
  });

  // Centerline stripes every 55m from -1750 to 1750
  for (let z = -1750; z <= 1750; z += 55) {
    whiteMarkings.push(createHorizontalPlane(2.8, 36.0, 160.0, 2.14, z));
  }

  // Aiming points (9m x 65m) at Z = ±1400, X = 160 ± 24
  [-1400, 1400].forEach(z => {
    [-24, 24].forEach(xOff => {
      whiteMarkings.push(createHorizontalPlane(9.0, 65.0, 160.0 + xOff, 2.14, z));
    });
  });

  // 4. Taxiways (Parallel Taxiway Alpha at X = -120 + 5 connector taxiways)
  const taxiwayAlpha = createHorizontalPlane(60.0, 3800.0, -120.0, 2.08, 0);
  const connectors = [];
  [-1600, -800, 0, 800, 1600].forEach(z => {
    connectors.push(createHorizontalPlane(220.0, 50.0, 20.0, 2.08, z));
  });
  const taxiwaysGeo = mergeGeometries([taxiwayAlpha, ...connectors]);

  // Yellow centerline markings
  const yellowLines = [
    createHorizontalPlane(1.2, 3800.0, -120.0, 2.12, 0)
  ];
  [-1600, -800, 0, 800, 1600].forEach(z => {
    yellowLines.push(createHorizontalPlane(220.0, 1.2, 20.0, 2.12, z));
  });
  const yellowLinesGeo = mergeGeometries(yellowLines);

  // 5. Buildings: Terminal 1 Main, Concourse, Jet Bridges, Hangars
  const mainTerminal = createBox(360.0, 24.0, 80.0, -380.0, 12.0, -200.0);
  const concourse = createBox(80.0, 18.0, 400.0, -280.0, 9.0, 150.0);
  const hangar = createBox(140.0, 35.0, 100.0, -420.0, 17.5, -1200.0);

  // 8 Jet Bridges
  const jetBridges = [];
  for (let j = 0; j < 8; j++) {
    jetBridges.push(createBox(8.0, 4.2, 28.0, -230.0, 8.0, -40.0 + j * 50.0));
  }
  const terminalGeo = mergeGeometries([mainTerminal, concourse, hangar, ...jetBridges]);

  // 6. Air Traffic Control (ATC) Tower
  const towerShaft = createCylinder(7.0, 9.0, 80.0, 16, -450.0, 40.0, 500.0, 'y');
  const towerCab = createCylinder(14.0, 11.0, 14.0, 16, -450.0, 87.0, 500.0, 'y');
  const towerDome = createCylinder(5.0, 5.0, 8.0, 12, -450.0, 98.0, 500.0, 'y');
  const atcGeo = mergeGeometries([towerShaft, towerCab, towerDome]);

  // 7. PAPI Light Boxes
  const papiBoxes = [];
  for (let p = 0; p < 4; p++) {
    papiBoxes.push(createBox(2.4, 1.4, 2.0, 95.0, 2.6, 1250.0 + p * 8.0));
  }
  const papiGeo = mergeGeometries(papiBoxes);

  const markingsGeo = mergeGeometries(whiteMarkings);

  const groundMesh = b.addMesh('Departure_Airport_Ground_Mesh', [
    { positions: airportGround.positions, indices: airportGround.indices, normals: airportGround.normals, materialIndex: mGround },
    { positions: runway.positions, indices: runway.indices, normals: runway.normals, materialIndex: mAsphalt },
    { positions: taxiwaysGeo.positions, indices: taxiwaysGeo.indices, normals: taxiwaysGeo.normals, materialIndex: mAsphalt },
    { positions: markingsGeo.positions, indices: markingsGeo.indices, normals: markingsGeo.normals, materialIndex: mWhiteMarking },
    { positions: yellowLinesGeo.positions, indices: yellowLinesGeo.indices, normals: yellowLinesGeo.normals, materialIndex: mYellowTaxi }
  ]);

  const buildingsMesh = b.addMesh('Departure_Airport_Buildings_Mesh', [
    { positions: terminalGeo.positions, indices: terminalGeo.indices, normals: terminalGeo.normals, materialIndex: mTerminal },
    { positions: atcGeo.positions, indices: atcGeo.indices, normals: atcGeo.normals, materialIndex: mGlass },
    { positions: papiGeo.positions, indices: papiGeo.indices, normals: papiGeo.normals, materialIndex: mPapiYellow }
  ]);

  const nGround = b.addNode({ name: 'Airfield_Ground_And_Runways', meshIndex: groundMesh });
  const nBuildings = b.addNode({ name: 'Terminal_Tower_And_Facilities', meshIndex: buildingsMesh });

  const root = b.addNode({
    name: 'Departure_Airport_Island_Root',
    children: [nGround, nBuildings]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 8-B. INCHEON INTERNATIONAL AIRPORT MEGA HUB (Z = -45,000)
// -------------------------------------------------------------
function generateIncheonAirport() {
  const b = new GLBBuilder();
  const mApron = b.addMaterial('IncheonApronGround', { color: [0.15, 0.18, 0.24, 1.0], roughness: 0.85, metallic: 0.1 });
  const mRunway = b.addMaterial('IncheonMegaRunways', { color: [0.11, 0.13, 0.17, 1.0], roughness: 0.72, metallic: 0.15 });
  const mWhiteLines = b.addMaterial('IncheonWhiteMarkings', { color: [0.97, 0.97, 0.99, 1.0], roughness: 0.35 });
  const mYellowTaxi = b.addMaterial('IncheonTaxiLines', { color: [0.98, 0.80, 0.15, 1.0], roughness: 0.35 });
  const mTerminal1 = b.addMaterial('IncheonTerminalArchitecture', { color: [0.88, 0.90, 0.95, 1.0], roughness: 0.32, metallic: 0.5 });
  const mTerminalGlass = b.addMaterial('IncheonAerodynamicGlass', { color: [0.06, 0.42, 0.72, 1.0], roughness: 0.10, metallic: 0.92 });
  const mTower = b.addMaterial('IncheonTowerPylon', { color: [0.94, 0.95, 0.98, 1.0], roughness: 0.28, metallic: 0.6 });

  const incheonZ = -45000.0;

  // 1. Apron Ground Base (2,800m x 6,200m)
  const apron = createBox(2800.0, 4.0, 6200.0, -150.0, 0, incheonZ);

  // 2. Dual 4,000m Parallel Runways: 16R/34L (West: X = 160) & 15L/33R (East: X = 820)
  const runwayWest = createHorizontalPlane(100.0, 4000.0, 160.0, 2.10, incheonZ);
  const runwayEast = createHorizontalPlane(100.0, 4000.0, 820.0, 2.10, incheonZ);
  const runwaysGeo = mergeGeometries([runwayWest, runwayEast]);

  // Markings for both runways
  const whiteMarkings = [];
  [160.0, 820.0].forEach(rX => {
    // Threshold piano keys (Z = -45000 ± 1900)
    [-1900, 1900].forEach(zOff => {
      for (let k = -44; k <= 44; k += 5.5) {
        whiteMarkings.push(createHorizontalPlane(3.0, 52.0, rX + k, 2.14, incheonZ + zOff));
      }
    });

    // Centerline stripes every 55m
    for (let zOff = -1850; zOff <= 1850; zOff += 55) {
      whiteMarkings.push(createHorizontalPlane(2.8, 36.0, rX, 2.14, incheonZ + zOff));
    }

    // Aiming point rectangles (9m x 65m)
    [-1450, 1450].forEach(zOff => {
      [-24, 24].forEach(xOff => {
        whiteMarkings.push(createHorizontalPlane(9.0, 65.0, rX + xOff, 2.14, incheonZ + zOff));
      });
    });
  });
  const whiteMarkingsGeo = mergeGeometries(whiteMarkings);

  // 3. Parallel Taxiways linking both runways (X = -200, X = 490) + connector rapid exits
  const taxiwayWest = createHorizontalPlane(60.0, 4000.0, -200.0, 2.08, incheonZ);
  const taxiwayMid = createHorizontalPlane(60.0, 4000.0, 490.0, 2.08, incheonZ);
  const taxiCrossings = [];
  [-1600, -800, 0, 800, 1600].forEach(zOff => {
    taxiCrossings.push(createHorizontalPlane(1100.0, 50.0, 310.0, 2.08, incheonZ + zOff));
  });
  const taxiwaysGeo = mergeGeometries([taxiwayWest, taxiwayMid, ...taxiCrossings]);

  // Yellow centerline lines
  const yellowLines = [
    createHorizontalPlane(1.2, 4000.0, -200.0, 2.12, incheonZ),
    createHorizontalPlane(1.2, 4000.0, 490.0, 2.12, incheonZ)
  ];
  [-1600, -800, 0, 800, 1600].forEach(zOff => {
    yellowLines.push(createHorizontalPlane(1100.0, 1.2, 310.0, 2.12, incheonZ + zOff));
  });
  const yellowLinesGeo = mergeGeometries(yellowLines);

  // 4. Mega Terminal 1 & 2 Complex & Concourse
  const term1 = createBox(450.0, 32.0, 110.0, -550.0, 16.0, incheonZ - 200.0);
  const term2 = createBox(400.0, 30.0, 100.0, -550.0, 15.0, incheonZ + 800.0);
  const concourse = createBox(80.0, 22.0, 650.0, -320.0, 11.0, incheonZ + 300.0);

  // 16 Passenger Jet Bridges
  const jetBridges = [];
  for (let j = 0; j < 16; j++) {
    const xPos = (j % 2 === 0) ? -270.0 : -370.0;
    const zPos = incheonZ + (j * 40.0);
    jetBridges.push(createBox(18.0, 4.5, 7.5, xPos, 8.5, zPos));
  }

  // Cargo Logistics & Maintenance Hangars
  const cargoHub = createBox(300.0, 22.0, 120.0, 1200.0, 11.0, incheonZ);
  const hangarHub = createBox(220.0, 38.0, 140.0, 1200.0, 19.0, incheonZ + 1500.0);
  const incheonBuildingsGeo = mergeGeometries([term1, term2, concourse, cargoHub, hangarHub, ...jetBridges]);

  // 5. 100m Landmark Incheon Control Tower
  const towerShaft = createCylinder(8.0, 10.0, 90.0, 16, -650.0, 45.0, incheonZ + 300.0, 'y');
  const towerCab = createCylinder(18.0, 14.0, 16.0, 16, -650.0, 98.0, incheonZ + 300.0, 'y');
  const towerSpire = createCylinder(2.0, 4.0, 22.0, 8, -650.0, 115.0, incheonZ + 300.0, 'y');
  const incheonTowerGeo = mergeGeometries([towerShaft, towerCab, towerSpire]);

  const groundMesh = b.addMesh('Incheon_Ground_And_Runways_Mesh', [
    { positions: apron.positions, indices: apron.indices, normals: apron.normals, materialIndex: mApron },
    { positions: runwaysGeo.positions, indices: runwaysGeo.indices, normals: runwaysGeo.normals, materialIndex: mRunway },
    { positions: taxiwaysGeo.positions, indices: taxiwaysGeo.indices, normals: taxiwaysGeo.normals, materialIndex: mRunway },
    { positions: whiteMarkingsGeo.positions, indices: whiteMarkingsGeo.indices, normals: whiteMarkingsGeo.normals, materialIndex: mWhiteLines },
    { positions: yellowLinesGeo.positions, indices: yellowLinesGeo.indices, normals: yellowLinesGeo.normals, materialIndex: mYellowTaxi }
  ]);

  const buildingsMesh = b.addMesh('Incheon_Terminal_And_Tower_Mesh', [
    { positions: incheonBuildingsGeo.positions, indices: incheonBuildingsGeo.indices, normals: incheonBuildingsGeo.normals, materialIndex: mTerminal1 },
    { positions: incheonTowerGeo.positions, indices: incheonTowerGeo.indices, normals: incheonTowerGeo.normals, materialIndex: mTower }
  ]);

  const nGround = b.addNode({ name: 'Incheon_Airfield_And_Dual_Runways', meshIndex: groundMesh });
  const nBuildings = b.addNode({ name: 'Incheon_Terminals_Concourse_And_Tower', meshIndex: buildingsMesh });

  const root = b.addNode({
    name: 'Incheon_International_Airport_Hub_Root',
    children: [nGround, nBuildings]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 9. TERRAIN, OCEANS, ISLANDS & MOUNTAINS GENERATOR
// -------------------------------------------------------------
function generateTerrain() {
  const b = new GLBBuilder();
  const mOcean = b.addMaterial('VastOceanFloor', { color: [0.01, 0.42, 0.72, 1.0], roughness: 0.18, metallic: 0.45 });
  const mContinent = b.addMaterial('ContinentalMainlandGrass', { color: [0.14, 0.38, 0.18, 1.0], roughness: 0.90, metallic: 0.08 });
  const mGoldenBeach = b.addMaterial('GoldenCoastlineSand', { color: [0.96, 0.82, 0.25, 1.0], roughness: 0.95 });
  const mIslandSand = b.addMaterial('IslandTropicalSand', { color: [0.98, 0.88, 0.45, 1.0], roughness: 0.95 });
  const mIslandHill = b.addMaterial('IslandTropicalHill', { color: [1.0, 1.0, 1.0, 1.0], roughness: 0.92, metallic: 0.02 });
  const mPalmWood = b.addMaterial('PalmTrunkWood', { color: [0.47, 0.21, 0.06, 1.0], roughness: 0.85 });
  const mPalmLeaf = b.addMaterial('PalmLeafGreen', { color: [0.09, 0.64, 0.29, 1.0], roughness: 0.80 });
  const mMountainVertex = b.addMaterial('MountainProceduralTerrain', { color: [1.0, 1.0, 1.0, 1.0], roughness: 0.94, metallic: 0.02 });
  const mShipHull = b.addMaterial('CargoShipHullRed', { color: [0.60, 0.11, 0.11, 1.0], roughness: 0.60 });
  const mShipDeck = b.addMaterial('CargoShipDeckSlate', { color: [0.20, 0.25, 0.33, 1.0], roughness: 0.50 });
  const mContainer = b.addMaterial('CargoContainersColors', { color: [0.15, 0.40, 0.90, 1.0], roughness: 0.45 });
  const mWake = b.addMaterial('ShipFoamWake', { color: [0.96, 0.98, 1.0, 1.0], roughness: 0.25 });

  // 1. Vast Ocean (120,000m x 120,000m at Y = -1.5, Z = -25,000)
  const ocean = createHorizontalPlane(120000.0, 120000.0, 0, -1.5, -25000.0);

  // 2. Continental Mainland (50,000m x 40,000m at Y = -4.0, Z = -48,000)
  const continent = createBox(50000.0, 8.0, 40000.0, 0, -4.0, -48000.0);

  // 3. Golden Beach Coastline (50,000m x 600m at Y = 0.04, Z = -28,000)
  const coast = createHorizontalPlane(50000.0, 600.0, 0, 0.04, -28000.0);

  // 4. 6 Tropical Offshore Islands (High-poly organic coastlines & sculpted hills)
  const islandDefs = [
    { x: -450, z: -3500, r: 90, h: 30, variant: 'rolling' },
    { x: 480, z: -7500, r: 120, h: 38, variant: 'twin' },
    { x: -380, z: -12500, r: 110, h: 35, variant: 'ridge' },
    { x: 520, z: -17500, r: 130, h: 42, variant: 'volcanic' },
    { x: -480, z: -22000, r: 140, h: 48, variant: 'twin' },
    { x: 380, z: -26000, r: 110, h: 38, variant: 'rolling' }
  ];

  const islandSands = [];
  const islandHills = [];
  const palmTrunks = [];
  const palmLeaves = [];

  islandDefs.forEach((isl, idx) => {
    const islSeed = 101 + idx * 37.3;
    // Organic beach cylinder
    islandSands.push(createOrganicBeachGeometry(isl.r, 3.5, 32, isl.x, 0.5, isl.z, islSeed));
    // High-poly sculpted island hill
    islandHills.push(createProceduralTerrainGeometry({
      radius: isl.r * 0.82,
      height: isl.h,
      radialSegments: 32,
      heightRings: 12,
      variant: isl.variant,
      seed: islSeed + 13.7,
      isMountain: false,
      hasSnow: false,
      cx: isl.x,
      cy: 1.6,
      cz: isl.z
    }));

    // Palm trees
    for (let p = 0; p < 5; p++) {
      const pAng = (p / 5) * Math.PI * 2;
      const pDist = isl.r * 0.78;
      const tx = isl.x + Math.cos(pAng) * pDist;
      const tz = isl.z + Math.sin(pAng) * pDist;
      palmTrunks.push(createCylinder(0.4, 0.6, 7.0, 6, tx, 3.5, tz, 'y'));
      palmLeaves.push(createCone(4.0, 2.5, 6, tx, 7.0, tz));
    }
  });

  const islandSandsGeo = mergeGeometries(islandSands);
  const islandHillsGeo = mergeGeometries(islandHills);
  const palmTrunksGeo = mergeGeometries(palmTrunks);
  const palmLeavesGeo = mergeGeometries(palmLeaves);

  // 5. 4 Cargo Ships on Ocean
  const shipDefs = [
    { x: 320, z: -4500, rot: 0.1 },
    { x: -420, z: -11000, rot: -0.25 },
    { x: 280, z: -19500, rot: 0.05 },
    { x: -350, z: -25000, rot: 0.2 }
  ];
  const shipHulls = [];
  const shipDecks = [];
  const shipContainers = [];
  const shipWakes = [];

  shipDefs.forEach(s => {
    shipHulls.push(createBox(16.0, 7.0, 75.0, s.x, 2.0, s.z));
    shipDecks.push(createBox(12.0, 10.0, 18.0, s.x, 8.5, s.z + 22.0));
    shipContainers.push(createBox(6.5, 5.5, 9.5, s.x - 4.0, 6.5, s.z - 15.0));
    shipContainers.push(createBox(6.5, 5.5, 9.5, s.x + 4.0, 6.5, s.z - 15.0));
    shipContainers.push(createBox(6.5, 5.5, 9.5, s.x - 4.0, 6.5, s.z));
    shipContainers.push(createBox(6.5, 5.5, 9.5, s.x + 4.0, 6.5, s.z));
    shipWakes.push(createHorizontalPlane(24.0, 120.0, s.x, 0.05, s.z + 75.0));
  });

  const shipHullsGeo = mergeGeometries(shipHulls);
  const shipDecksGeo = mergeGeometries(shipDecks);
  const shipContainersGeo = mergeGeometries(shipContainers);
  const shipWakesGeo = mergeGeometries(shipWakes);

  // 6. Majestic Mountain Ranges & Foothills (High-poly procedural terrain with vertex colors)
  const mountainDefs = [
    { x: -3200, z: -2500, r: 580, h: 580, variant: 'ridge' },
    { x: 3300, z: -2200, r: 600, h: 620, variant: 'twin' },
    { x: -4200, z: -12000, r: 880, h: 920, variant: 'alpine' },
    { x: 4200, z: -18000, r: 920, h: 960, variant: 'massif' },
    { x: -5500, z: -28500, r: 1150, h: 1150, variant: 'ridge' },
    { x: 5500, z: -28500, r: 1150, h: 1150, variant: 'twin' },
    { x: -3800, z: -47500, r: 1300, h: 1300, variant: 'massif' },
    { x: 3800, z: -47800, r: 1250, h: 1250, variant: 'ridge' },
    { x: -5500, z: -52000, r: 1600, h: 1650, variant: 'alpine' },
    { x: 5500, z: -52000, r: 1550, h: 1600, variant: 'twin' },
    { x: 0, z: -56000, r: 1900, h: 1850, variant: 'alpine' },
    { x: -3500, z: -58000, r: 1700, h: 1700, variant: 'ridge' },
    { x: 3500, z: -58000, r: 1650, h: 1680, variant: 'massif' },
    { x: -2900, z: -49200, r: 900, h: 640, variant: 'rolling' },
    { x: 2950, z: -49600, r: 880, h: 610, variant: 'twin' },
    { x: -6400, z: -55000, r: 1200, h: 980, variant: 'ridge' },
    { x: 6400, z: -55200, r: 1180, h: 950, variant: 'alpine' }
  ];

  const mountainMeshes = mountainDefs.map((m, idx) => createProceduralTerrainGeometry({
    radius: m.r,
    height: m.h,
    radialSegments: 44,
    heightRings: 18,
    variant: m.variant,
    seed: 501 + idx * 43.9,
    isMountain: true,
    hasSnow: m.h >= 850,
    cx: m.x,
    cy: -20.0,
    cz: m.z
  }));

  const mountainsGeo = mergeGeometries(mountainMeshes);

  const landMesh = b.addMesh('Terrain_Land_And_Ocean_Mesh', [
    { positions: ocean.positions, indices: ocean.indices, normals: ocean.normals, materialIndex: mOcean },
    { positions: continent.positions, indices: continent.indices, normals: continent.normals, materialIndex: mContinent },
    { positions: coast.positions, indices: coast.indices, normals: coast.normals, materialIndex: mGoldenBeach }
  ]);

  const islandsMesh = b.addMesh('Tropical_Islands_And_Ships_Mesh', [
    { positions: islandSandsGeo.positions, indices: islandSandsGeo.indices, normals: islandSandsGeo.normals, materialIndex: mIslandSand },
    { positions: islandHillsGeo.positions, indices: islandHillsGeo.indices, normals: islandHillsGeo.normals, colors: islandHillsGeo.colors, materialIndex: mIslandHill },
    { positions: palmTrunksGeo.positions, indices: palmTrunksGeo.indices, normals: palmTrunksGeo.normals, materialIndex: mPalmWood },
    { positions: palmLeavesGeo.positions, indices: palmLeavesGeo.indices, normals: palmLeavesGeo.normals, materialIndex: mPalmLeaf },
    { positions: shipHullsGeo.positions, indices: shipHullsGeo.indices, normals: shipHullsGeo.normals, materialIndex: mShipHull },
    { positions: shipDecksGeo.positions, indices: shipDecksGeo.indices, normals: shipDecksGeo.normals, materialIndex: mShipDeck },
    { positions: shipContainersGeo.positions, indices: shipContainersGeo.indices, normals: shipContainersGeo.normals, materialIndex: mContainer },
    { positions: shipWakesGeo.positions, indices: shipWakesGeo.indices, normals: shipWakesGeo.normals, materialIndex: mWake }
  ]);

  const mountainsMesh = b.addMesh('Majestic_Mountain_Ranges_Mesh', [
    { positions: mountainsGeo.positions, indices: mountainsGeo.indices, normals: mountainsGeo.normals, colors: mountainsGeo.colors, materialIndex: mMountainVertex }
  ]);

  const nLand = b.addNode({ name: 'Ocean_And_Continental_Mainland', meshIndex: landMesh });
  const nIslands = b.addNode({ name: 'Offshore_Islands_And_Cargo_Ships', meshIndex: islandsMesh });
  const nMountains = b.addNode({ name: 'Continental_Mountains_Ranges', meshIndex: mountainsMesh });

  const root = b.addNode({
    name: 'Continental_Terrain_And_Nature_Root',
    children: [nLand, nIslands, nMountains]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 10. HAEUNDAE BEACH & METROPOLIS GENERATOR
// -------------------------------------------------------------
function generateHaeundae() {
  const b = new GLBBuilder();
  const mSand = b.addMaterial('BeachSand', { color: [0.94, 0.86, 0.60, 1.0], roughness: 0.95 });
  const mOcean = b.addMaterial('OceanWater', { color: [0.06, 0.44, 0.68, 1.0], roughness: 0.15, metallic: 0.85 });
  const mLctGlass = b.addMaterial('LCT_ReflectiveGlass', { color: [0.30, 0.60, 0.85, 1.0], roughness: 0.12, metallic: 0.88 });
  const mSkyscraperWhite = b.addMaterial('ModernHighriseConcrete', { color: [0.88, 0.90, 0.94, 1.0], roughness: 0.28, metallic: 0.45 });
  const mBridge = b.addMaterial('GwanganBridgePylons', { color: [0.96, 0.96, 0.98, 1.0], roughness: 0.35, metallic: 0.55 });
  const mBridgeRoad = b.addMaterial('GwanganBridgeRoadway', { color: [0.20, 0.22, 0.26, 1.0], roughness: 0.80 });

  // Sandy beach arc (Z = -28,200)
  const beachSand = createBox(3500.0, 2.0, 500.0, 0, 0.5, -28200.0);
  const ocean = createHorizontalPlane(5000.0, 2000.0, 0, 0.0, -27000.0);

  // Skyscrapers: LCT Landmark Tower (411m) & Residential Towers A & B (310m)
  const lctLandmark = createBox(58.0, 410.0, 58.0, -180.0, 205.0, -28700.0);
  const lctTowerA = createBox(46.0, 310.0, 46.0, -80.0, 155.0, -28750.0);
  const lctTowerB = createBox(46.0, 310.0, 46.0, -280.0, 155.0, -28750.0);
  const lctComplex = mergeGeometries([lctLandmark, lctTowerA, lctTowerB]);

  // Marine City Skyline towers
  const skyscrapers = [];
  const cityX = [120, 220, 340, 460, 600, 750, 900, -420, -560, -720, -900];
  for (let i = 0; i < cityX.length; i++) {
    const height = 150.0 + (i % 5) * 45.0;
    skyscrapers.push(createBox(42.0, height, 42.0, cityX[i], height / 2, -28800.0 - (i % 3) * 70.0));
  }
  const skylineGeo = mergeGeometries(skyscrapers);

  // Gwangan Grand Bridge suspension pylons & double-deck roadway
  const bridgePylon1 = createBox(16.0, 120.0, 20.0, 350.0, 60.0, -27400.0);
  const bridgePylon2 = createBox(16.0, 120.0, 20.0, -350.0, 60.0, -27400.0);
  const bridgeDeck = createBox(2400.0, 7.0, 26.0, 0, 36.0, -27400.0);
  const bridgeGeo = mergeGeometries([bridgePylon1, bridgePylon2]);

  const terrainMesh = b.addMesh('Coast_Terrain_Mesh', [
    { positions: beachSand.positions, indices: beachSand.indices, normals: beachSand.normals, materialIndex: mSand },
    { positions: ocean.positions, indices: ocean.indices, normals: ocean.normals, materialIndex: mOcean }
  ]);

  const cityscapeMesh = b.addMesh('Metropolis_Architecture_Mesh', [
    { positions: lctComplex.positions, indices: lctComplex.indices, normals: lctComplex.normals, materialIndex: mLctGlass },
    { positions: skylineGeo.positions, indices: skylineGeo.indices, normals: skylineGeo.normals, materialIndex: mSkyscraperWhite },
    { positions: bridgeGeo.positions, indices: bridgeGeo.indices, normals: bridgeGeo.normals, materialIndex: mBridge },
    { positions: bridgeDeck.positions, indices: bridgeDeck.indices, normals: bridgeDeck.normals, materialIndex: mBridgeRoad }
  ]);

  const nTerrain = b.addNode({ name: 'BeachAndOcean', meshIndex: terrainMesh });
  const nCity = b.addNode({ name: 'SkyscrapersAndBridge', meshIndex: cityscapeMesh });

  const root = b.addNode({
    name: 'Haeundae_Beach_Metropolis_Root',
    children: [nTerrain, nCity]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// 11. UNIFIED FULL WORLD ENVIRONMENT GENERATOR
// -------------------------------------------------------------
function generateWorldEnvironment() {
  // Combines all environment features into one master GLB
  const b = new GLBBuilder();
  const mOcean = b.addMaterial('MasterOcean', { color: [0.01, 0.42, 0.72, 1.0], roughness: 0.18, metallic: 0.45 });
  const mContinent = b.addMaterial('MasterContinent', { color: [0.14, 0.38, 0.18, 1.0], roughness: 0.90 });
  const mRunway = b.addMaterial('MasterRunway', { color: [0.12, 0.14, 0.18, 1.0], roughness: 0.80, metallic: 0.15 });
  const mWhite = b.addMaterial('MasterWhiteMarkings', { color: [0.97, 0.97, 0.99, 1.0], roughness: 0.35 });
  const mBuildings = b.addMaterial('MasterArchitecture', { color: [0.88, 0.90, 0.94, 1.0], roughness: 0.35, metallic: 0.5 });
  const mGlass = b.addMaterial('MasterGlass', { color: [0.10, 0.48, 0.80, 1.0], roughness: 0.10, metallic: 0.90 });
  const mMountain = b.addMaterial('MasterMountains', { color: [1.0, 1.0, 1.0, 1.0], roughness: 0.94, metallic: 0.02 });

  // 1. Ocean & Mainland
  const ocean = createHorizontalPlane(120000.0, 120000.0, 0, -1.5, -25000.0);
  const continent = createBox(50000.0, 8.0, 40000.0, 0, -4.0, -48000.0);
  const coast = createHorizontalPlane(50000.0, 600.0, 0, 0.04, -28000.0);

  // 2. Departure Airport Runways & Apron
  const depGround = createBox(1400.0, 4.0, 4400.0, 0, 0, 0);
  const depRunway = createHorizontalPlane(100.0, 3800.0, 160.0, 2.10, 0);
  const depTerminal = createBox(360.0, 24.0, 80.0, -380.0, 12.0, -200.0);
  const depTower = createCylinder(7.0, 9.0, 80.0, 16, -450.0, 40.0, 500.0, 'y');

  // 3. Incheon Mega Hub Runways & Apron
  const incheonZ = -45000.0;
  const incApron = createBox(2800.0, 4.0, 6200.0, -150.0, 0, incheonZ);
  const incRunwayW = createHorizontalPlane(100.0, 4000.0, 160.0, 2.10, incheonZ);
  const incRunwayE = createHorizontalPlane(100.0, 4000.0, 820.0, 2.10, incheonZ);
  const incTerm1 = createBox(450.0, 32.0, 110.0, -550.0, 16.0, incheonZ - 200.0);
  const incTower = createCylinder(8.0, 10.0, 90.0, 16, -650.0, 45.0, incheonZ + 300.0, 'y');

  // 4. Haeundae Beach, LCT & Gwangan Bridge
  const lctLandmark = createBox(58.0, 410.0, 58.0, -180.0, 205.0, -28700.0);
  const bridgeDeck = createBox(2400.0, 7.0, 26.0, 0, 36.0, -27400.0);
  const bridgeP1 = createBox(16.0, 120.0, 20.0, 350.0, 60.0, -27400.0);
  const bridgeP2 = createBox(16.0, 120.0, 20.0, -350.0, 60.0, -27400.0);

  // 5. Continental Mountains (High-poly procedural terrain with vertex colors)
  const worldMountainDefs = [
    { x: -3200.0, z: -2500.0, r: 580.0, h: 580.0, variant: 'ridge' },
    { x: 3300.0, z: -2200.0, r: 600.0, h: 620.0, variant: 'twin' },
    { x: -4200.0, z: -12000.0, r: 880.0, h: 920.0, variant: 'alpine' },
    { x: 4200.0, z: -18000.0, r: 920.0, h: 960.0, variant: 'massif' },
    { x: -5500.0, z: -28500.0, r: 1150.0, h: 1150.0, variant: 'ridge' },
    { x: 5500.0, z: -28500.0, r: 1150.0, h: 1150.0, variant: 'twin' },
    { x: -3800.0, z: -47500.0, r: 1300.0, h: 1300.0, variant: 'massif' },
    { x: -5500.0, z: -52000.0, r: 1600.0, h: 1650.0, variant: 'alpine' },
    { x: 0.0, z: -56000.0, r: 1900.0, h: 1850.0, variant: 'alpine' }
  ];
  const mountains = worldMountainDefs.map((m, idx) => createProceduralTerrainGeometry({
    radius: m.r,
    height: m.h,
    radialSegments: 36,
    heightRings: 14,
    variant: m.variant,
    seed: 501 + idx * 43.9,
    isMountain: true,
    hasSnow: m.h >= 850,
    cx: m.x,
    cy: -20.0,
    cz: m.z
  }));
  const mountainsGeo = mergeGeometries(mountains);

  const worldRunways = mergeGeometries([depRunway, incRunwayW, incRunwayE]);
  const worldBuildings = mergeGeometries([depTerminal, incTerm1, bridgeDeck, bridgeP1, bridgeP2]);
  const worldGlass = mergeGeometries([depTower, incTower, lctLandmark]);

  const groundMesh = b.addMesh('Master_World_Ground_Mesh', [
    { positions: ocean.positions, indices: ocean.indices, normals: ocean.normals, materialIndex: mOcean },
    { positions: continent.positions, indices: continent.indices, normals: continent.normals, materialIndex: mContinent },
    { positions: coast.positions, indices: coast.indices, normals: coast.normals, materialIndex: mWhite },
    { positions: depGround.positions, indices: depGround.indices, normals: depGround.normals, materialIndex: mRunway },
    { positions: incApron.positions, indices: incApron.indices, normals: incApron.normals, materialIndex: mRunway },
    { positions: worldRunways.positions, indices: worldRunways.indices, normals: worldRunways.normals, materialIndex: mRunway }
  ]);

  const structuresMesh = b.addMesh('Master_World_Structures_Mesh', [
    { positions: worldBuildings.positions, indices: worldBuildings.indices, normals: worldBuildings.normals, materialIndex: mBuildings },
    { positions: worldGlass.positions, indices: worldGlass.indices, normals: worldGlass.normals, materialIndex: mGlass },
    { positions: mountainsGeo.positions, indices: mountainsGeo.indices, normals: mountainsGeo.normals, colors: mountainsGeo.colors, materialIndex: mMountain }
  ]);

  const nGround = b.addNode({ name: 'World_Terrain_And_Runways', meshIndex: groundMesh });
  const nStructures = b.addNode({ name: 'World_Airports_And_Metropolis', meshIndex: structuresMesh });

  const root = b.addNode({
    name: 'Unified_Full_World_Environment_Root',
    children: [nGround, nStructures]
  });

  return b.buildGLBBuffer([root]);
}

// -------------------------------------------------------------
// MAIN EXECUTION: Generate and write all GLB files to disks
// -------------------------------------------------------------
function run() {
  console.log('🚀 Starting GLB 3D Pipeline Compilation (Planes + All Environments + Terrain)...');

  const outputDirs = [
    path.join(__dirname, '..', 'web', 'models'),
    path.join(__dirname, '..', 'web', 'assets', 'models'),
    path.join(__dirname, '..', 'flutter_app', 'assets', 'web', 'models'),
    path.join(__dirname, '..', 'flutter_app', 'assets', 'web', 'assets', 'models')
  ];

  // Ensure directories exist
  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const models = [
    // 1. Aircraft Models
    { name: 'a320.glb', gen: generateA320 },
    { name: 'b747.glb', gen: generateB747 },
    { name: 'dc10.glb', gen: generateDC10 },
    { name: 'md80.glb', gen: generateMD80 },
    { name: 'concorde.glb', gen: generateConcorde },
    { name: 'amphibian.glb', gen: generateAmphibian },
    { name: 'ancestor.glb', gen: generateAncestor },
    { name: 'airplane.glb', gen: generateA320 }, // Standard alias

    // 2. Airport Environments
    { name: 'airport.glb', gen: generateAirport },                         // Departure Airport
    { name: 'incheon_airport.glb', gen: generateIncheonAirport },         // Incheon Mega Hub Airport

    // 3. Terrain, Ocean & Nature Environments
    { name: 'terrain.glb', gen: generateTerrain },                         // Continents, Islands, Ships, Mountains
    { name: 'mountains_terrain.glb', gen: generateTerrain },               // Alias

    // 4. Metropolis & Haeundae Beach
    { name: 'haeundae.glb', gen: generateHaeundae },                       // LCT, Bridge, Beach
    { name: 'city_beach.glb', gen: generateHaeundae },                     // Alias
    { name: 'haeundae_beach_city.glb', gen: generateHaeundae },            // Alias

    // 5. Unified Full World Environment
    { name: 'world_environment.glb', gen: generateWorldEnvironment }       // All-in-one World Environment
  ];

  for (const m of models) {
    console.log(`🔨 Compiling ${m.name}...`);
    const glbBuffer = m.gen();

    // Verify GLB magic header
    const magic = glbBuffer.readUInt32LE(0);
    const version = glbBuffer.readUInt32LE(4);
    const totalLength = glbBuffer.readUInt32LE(8);

    if (magic !== 0x46546C67 || version !== 2) {
      throw new Error(`Invalid GLB header generated for ${m.name}`);
    }

    console.log(`   ✅ Valid glTF 2.0 Binary | Magic: 0x46546C67 | Version: ${version} | Size: ${totalLength} bytes`);

    // Write to all target folders
    for (const dir of outputDirs) {
      const outPath = path.join(dir, m.name);
      fs.writeFileSync(outPath, glbBuffer);
    }
  }

  console.log('🎉 All Plane, Airport, Terrain & City GLB models successfully generated and mirrored!');
}

run();
