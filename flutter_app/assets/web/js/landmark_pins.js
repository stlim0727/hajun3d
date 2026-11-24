/**
 * landmark_pins.js — clickable map pins at nearby landmark coordinates.
 *
 * Pins are pooled, share one geometry/material set, and are positioned in the
 * simulation's world frame. The scene's floating-origin shift handles the
 * camera-relative render transform, so no per-frame world rebuild is needed.
 */
(function (root) {
  'use strict';

  const MAX_PINS = 12;
  const PIN_HEIGHT = 7;
  const BULB_RADIUS = 3.2;
  const MAX_RANGE_M = 15000;
  const SCALE_REF_M = 120;

  let game = null;
  let group = null;
  let shapes = null;
  let pins = [];
  let pickTargets = [];
  let selectedId = null;
  let anchorKey = '';
  let activePointers = 0;
  let press = null;

  const hasThree = typeof THREE !== 'undefined';
  const raycaster = hasThree ? new THREE.Raycaster() : null;
  const ndc = hasThree ? new THREE.Vector2() : null;

  function anchor() {
    return root.GEO_ANCHOR || { lat: 35.165199, lon: 128.938995, headingDeg: 353.9 };
  }

  function simBase() {
    return (game && game.geoSimAnchorBase) || root.GEO_SIM_ANCHOR || { x: 160, z: 0 };
  }

  function anchorSignature() {
    const a = anchor();
    const b = simBase();
    return `${a.lat}|${a.lon}|${a.headingDeg}|${b.x}|${b.z || 0}`;
  }

  function worldFromLatLon(lat, lon) {
    const geodesy = root.Geodesy;
    if (!geodesy || typeof geodesy.wgs84ToGame !== 'function') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const local = geodesy.wgs84ToGame(lat, lon, anchor());
    const base = simBase();
    return { x: local.x + base.x, z: local.z + (base.z || 0) };
  }

  function buildShapes() {
    const coneGeometry = new THREE.ConeGeometry(2.6, PIN_HEIGHT, 10);
    coneGeometry.rotateX(Math.PI);
    coneGeometry.translate(0, PIN_HEIGHT / 2, 0);

    const bulbGeometry = new THREE.SphereGeometry(BULB_RADIUS, 12, 8);
    const ringGeometry = new THREE.RingGeometry(3.4, 4.4, 20);
    ringGeometry.rotateX(-Math.PI / 2);
    const haloGeometry = new THREE.RingGeometry(5.0, 7.2, 24);
    haloGeometry.rotateX(-Math.PI / 2);

    const overlay = { transparent: true, depthTest: false, depthWrite: false };
    shapes = {
      coneGeometry,
      bulbGeometry,
      ringGeometry,
      haloGeometry,
      outline: new THREE.MeshBasicMaterial({ color: 0x0b1220, opacity: 0.95, ...overlay }),
      coneNormal: new THREE.MeshBasicMaterial({ color: 0xff4d4d, opacity: 1, ...overlay }),
      coneSelected: new THREE.MeshBasicMaterial({ color: 0xfbbf24, opacity: 1, ...overlay }),
      bulb: new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 1, ...overlay }),
      ringNormal: new THREE.MeshBasicMaterial({
        color: 0xff4d4d, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false
      }),
      ringSelected: new THREE.MeshBasicMaterial({
        color: 0xfbbf24, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false
      }),
      haloNormal: new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.35, side: THREE.DoubleSide, ...overlay }),
      haloSelected: new THREE.MeshBasicMaterial({ color: 0xfbbf24, opacity: 0.5, side: THREE.DoubleSide, ...overlay })
    };
  }

  function createPin() {
    const node = new THREE.Group();

    const halo = new THREE.Mesh(shapes.haloGeometry, shapes.haloNormal);
    halo.position.y = 0.08;
    halo.renderOrder = 4;

    const ring = new THREE.Mesh(shapes.ringGeometry, shapes.ringNormal);
    ring.position.y = 0.12;
    ring.renderOrder = 5;

    const coneOutline = new THREE.Mesh(shapes.coneGeometry, shapes.outline);
    coneOutline.scale.setScalar(1.2);
    coneOutline.renderOrder = 6;

    const bulbOutline = new THREE.Mesh(shapes.bulbGeometry, shapes.outline);
    bulbOutline.position.y = PIN_HEIGHT + BULB_RADIUS * 0.55;
    bulbOutline.scale.setScalar(1.24);
    bulbOutline.renderOrder = 7;

    const cone = new THREE.Mesh(shapes.coneGeometry, shapes.coneNormal);
    cone.renderOrder = 8;

    const bulb = new THREE.Mesh(shapes.bulbGeometry, shapes.bulb);
    bulb.position.y = PIN_HEIGHT + BULB_RADIUS * 0.55;
    bulb.renderOrder = 9;

    node.add(halo, ring, coneOutline, bulbOutline, cone, bulb);
    node.visible = false;

    const pin = { node, cone, bulb, ring, halo, item: null, world: null, grounded: false };
    cone.userData.pin = pin;
    bulb.userData.pin = pin;
    return pin;
  }

  function applySelection() {
    for (const pin of pins) {
      const selected = Boolean(pin.item && selectedId != null && String(pin.item.id) === String(selectedId));
      pin.cone.material = selected ? shapes.coneSelected : shapes.coneNormal;
      pin.bulb.material = shapes.bulb;
      pin.ring.material = selected ? shapes.ringSelected : shapes.ringNormal;
      pin.halo.material = selected ? shapes.haloSelected : shapes.haloNormal;
    }
  }

  function refreshPositions() {
    for (const pin of pins) {
      if (!pin.item) continue;
      pin.world = worldFromLatLon(pin.item.lat, pin.item.lon);
      pin.grounded = false;
    }
  }

  function pick(clientX, clientY) {
    if (!initialized() || !game || !game.isPlaying || game.screenPaused) return;
    const canvas = game.renderer && game.renderer.domElement;
    if (!canvas || !raycaster) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, game.camera);
    const hits = raycaster.intersectObjects(pickTargets, false);
    if (!hits.length) return;
    const pin = hits[0].object.userData.pin;
    if (pin && pin.item && typeof game.showLandmarkDetail === 'function') {
      game.showLandmarkDetail(pin.item);
    }
  }

  function initialized() {
    return Boolean(group && shapes);
  }

  function bindPicking() {
    const canvas = game.renderer && game.renderer.domElement;
    if (!canvas || canvas.__landmarkPinPicking) return;
    canvas.__landmarkPinPicking = true;

    canvas.addEventListener('pointerdown', (event) => {
      activePointers++;
      if (activePointers > 1 || event.button !== 0) {
        press = null;
        return;
      }
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() };
    });

    window.addEventListener('pointerup', (event) => {
      activePointers = Math.max(0, activePointers - 1);
      if (!press || event.pointerId !== press.id || activePointers > 0) {
        press = null;
        return;
      }
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      const elapsed = performance.now() - press.at;
      press = null;
      if (moved <= 6 && elapsed <= 700) pick(event.clientX, event.clientY);
    });

    window.addEventListener('pointercancel', () => {
      activePointers = 0;
      press = null;
    });
  }

  function init(instance) {
    if (initialized() || !hasThree || !instance || !instance.scene) return;
    game = instance;
    buildShapes();
    group = new THREE.Group();
    group.name = 'LandmarkPins';
    for (let i = 0; i < MAX_PINS; i++) {
      const pin = createPin();
      group.add(pin.node);
      pins.push(pin);
      pickTargets.push(pin.cone, pin.bulb);
    }
    game.scene.add(group);
    anchorKey = anchorSignature();
    bindPicking();
  }

  function setItems(items) {
    if (!initialized()) return;
    const list = Array.isArray(items) ? items.slice(0, MAX_PINS) : [];
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      pin.item = list[i] || null;
      pin.grounded = false;
      pin.node.visible = Boolean(pin.item && worldFromLatLon(pin.item.lat, pin.item.lon));
    }
    refreshPositions();
    applySelection();
  }

  function select(id) {
    selectedId = id == null ? null : String(id);
    if (initialized()) applySelection();
  }

  function clear() {
    if (!initialized()) return;
    for (const pin of pins) {
      pin.item = null;
      pin.world = null;
      pin.grounded = false;
      pin.node.visible = false;
    }
    selectedId = null;
    applySelection();
  }

  function update() {
    if (!initialized() || !game || !game.camera) return;
    const camera = game.camera.position;
    const origin = game.renderOrigin || { x: 0, y: 0, z: 0 };
    const provider = game.terrainProvider;
    const fallbackY = Number.isFinite(game.groundY) ? game.groundY : 0;
    let anyVisible = false;

    if (anchorSignature() !== anchorKey) {
      anchorKey = anchorSignature();
      refreshPositions();
    }

    for (const pin of pins) {
      if (!pin.item || !pin.world) {
        pin.node.visible = false;
        continue;
      }
      if (!pin.grounded) {
        let height = fallbackY;
        if (provider && typeof provider.isReady === 'function' && provider.isReady(pin.world.x, pin.world.z)
            && typeof provider.getHeight === 'function') {
          height = provider.getHeight(pin.world.x, pin.world.z);
          pin.grounded = true;
        } else if (!provider) {
          pin.grounded = true;
        }
        pin.node.position.set(pin.world.x, height, pin.world.z);
      }

      const dx = pin.world.x - origin.x - camera.x;
      const dy = pin.node.position.y - origin.y - camera.y;
      const dz = pin.world.z - origin.z - camera.z;
      const distance = Math.hypot(dx, dy, dz);
      pin.node.visible = distance > 25 && distance < MAX_RANGE_M;
      if (pin.node.visible) {
        anyVisible = true;
        pin.node.scale.setScalar(Math.max(2, Math.min(100, distance / SCALE_REF_M)));
      }
    }
    group.visible = Boolean(game.isPlaying && !game.screenPaused && anyVisible);
  }

  const api = { init, setItems, select, clear, update };
  root.LandmarkPins = api;
})(typeof window !== 'undefined' ? window : globalThis);
