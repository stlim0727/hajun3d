/**
 * Hajun Plane 3D - Interactive 3D GLB Model Gallery & Viewer
 * Supports offline GLB_BUNDLE unpacking, HTTP model fetching, local drag & drop,
 * smooth 360° orbit rotation, pinch/wheel zoom, pan, preset views, wireframe, and grid.
 */

(function() {
  'use strict';

  const MODEL_CATALOG = [
    // Aircraft
    { id: 'a320', name: 'Airbus A320 (표준형)', category: 'aircraft', icon: '✈️', desc: '쌍발 협동체 제트 여객기 (기본 기체)', file: 'a320.glb' },
    { id: 'a320_detailed', name: 'Airbus A320-200 (고정밀 실물)', category: 'aircraft', icon: '✈️', desc: '고정밀 실물 스케일 정밀 3D CAD/PBR 모델 (73.2만 폴리곤, 16.5MB)', file: 'a320_detailed.glb' },
    { id: 'a320_simplified', name: 'Airbus A320-200 (경량 최적화)', category: 'aircraft', icon: '✈️', desc: 'Meshoptimizer QEM 데시메이션 경량 실물 모델 (9.8만 폴리곤, 3.0MB)', file: 'a320_simplified.glb' },
    { id: 'a350', name: 'Airbus A350 (원본)', category: 'aircraft', icon: '✈️', desc: '차세대 쌍발 광동체 장거리 여객기 (원본 3D 모델, 5.2천 폴리곤, 927KB)', file: 'a350.glb' },
    { id: 'b747', name: 'Boeing 747-400', category: 'aircraft', icon: '🛫', desc: '4발 점보 광동체 여객기', file: 'b747.glb' },
    { id: 'dc10', name: 'McDonnell Douglas DC-10', category: 'aircraft', icon: '🛩️', desc: '3발 광동체 장거리 여객기 (실물 비례 로우폴리 최적화 모델)', file: 'dc10.glb' },
    { id: 'md80', name: 'McDonnell Douglas MD-80', category: 'aircraft', icon: '✈️', desc: '리어 엔진 T-테일 쌍발 제트기', file: 'md80.glb' },
    { id: 'concorde', name: 'Concorde SST', category: 'aircraft', icon: '🚀', desc: '초음속 델타익 여객기', file: 'concorde.glb' },
    { id: 'amphibian', name: 'Canadair CL-215', category: 'aircraft', icon: '🌊', desc: '수상 이착륙 가능 수륙양용 비행정', file: 'amphibian.glb' },
    { id: 'ancestor', name: 'Classic Biplane', category: 'aircraft', icon: '🕰️', desc: '클래식 프로펠러 복엽기', file: 'ancestor.glb' },
    { id: 'airplane', name: 'Airplane (Standard)', category: 'aircraft', icon: '🛫', desc: '표준 항공기 베이스 GLB 모델', file: 'airplane.glb' },

    // Airports & Environments
    { id: 'airport', name: '출발 공항 (Runway 36L)', category: 'environment', icon: '🛫', desc: '활주로 36L, 관제탑 및 터미널 게이트', file: 'airport.glb' },
    { id: 'incheon_airport', name: '인천국제공항 메가 허브', category: 'environment', icon: '🏢', desc: '대형 허브 공항 터미널 및 다중 활주로', file: 'incheon_airport.glb' },
    { id: 'terrain', name: '대륙 지형 · 산맥', category: 'environment', icon: '⛰️', desc: '비행 경로 대륙 지형 및 산악 모델', file: 'terrain.glb' },
    { id: 'haeundae', name: '해운대 해변', category: 'environment', icon: '🏖️', desc: '부산 해운대 해안선 및 백사장 지형', file: 'haeundae.glb' },
    { id: 'world_environment', name: '월드 통합 환경', category: 'environment', icon: '🌍', desc: '전체 하늘·바다·지형 환경 모델', file: 'world_environment.glb' },
    { id: 'city_beach', name: '해변 도시 (City Beach)', category: 'environment', icon: '🏙️', desc: '고층 빌딩 및 해안 도시 스카이라인', file: 'city_beach.glb' },
    { id: 'haeundae_beach_city', name: '해운대 마린시티', category: 'environment', icon: '🌆', desc: '해운대 해변 도시 상세 모델', file: 'haeundae_beach_city.glb' },
    { id: 'mountains_terrain', name: '산악 지형 (Mountains)', category: 'environment', icon: '🏔️', desc: '고지대 산맥 지형 모델', file: 'mountains_terrain.glb' }
  ];

  const THEMES = {
    studio: { label: '스튜디오', bg: 0x0d1b2a, cssBg: 'radial-gradient(circle at 50% 35%, #1e293b 0%, #0d1b2a 70%, #060d17 100%)', grid1: 0x38bdf8, grid2: 0x1e293b },
    sky: { label: '맑은 하늘', bg: 0x38bdf8, cssBg: 'linear-gradient(180deg, #0284c7 0%, #38bdf8 55%, #bae6fd 100%)', grid1: 0xffffff, grid2: 0x7dd3fc },
    night: { label: '야간 격납고', bg: 0x030712, cssBg: 'radial-gradient(circle at 50% 30%, #111827 0%, #030712 80%)', grid1: 0x10b981, grid2: 0x111827 }
  };

  class GLBModelViewer {
    constructor() {
      this.canvasWrap = document.getElementById('viewer-canvas-wrap');
      this.modelListEl = document.getElementById('viewer-model-list');
      this.searchInput = document.getElementById('viewer-search-input');
      this.loadingEl = document.getElementById('viewer-loading');
      this.errorEl = document.getElementById('viewer-error');

      this.currentFilter = 'all';
      this.searchQuery = '';
      this.activeModelId = null;
      this.currentObject = null;
      this.mixer = null;
      this.movingPartsController = null;
      this.animationsPlaying = true;
      this.clock = typeof THREE !== 'undefined' ? new THREE.Clock() : null;

      // Inspection states
      this.autoRotate = true;
      this.wireframe = false;
      this.showGrid = true;
      this.themeKey = 'studio';

      // Orbit spherical state (current & target for smooth damping)
      this.orbit = {
        theta: Math.PI * 0.25,
        phi: Math.PI * 0.36,
        radius: 20,
        target: typeof THREE !== 'undefined' ? new THREE.Vector3(0, 0, 0) : null,
        curTheta: Math.PI * 0.25,
        curPhi: Math.PI * 0.36,
        curRadius: 20,
        curTarget: typeof THREE !== 'undefined' ? new THREE.Vector3(0, 0, 0) : null,
        minRadius: 1.5,
        maxRadius: 500,
        defaultRadius: 20,
        defaultTarget: typeof THREE !== 'undefined' ? new THREE.Vector3(0, 0, 0) : null
      };

      this.modelRadius = 10;
      this.glbBuffers = {};
      this.init();
    }

    init() {
      if (typeof THREE === 'undefined') {
        this.showError('Three.js 라이브러리를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
        return;
      }

      this.unpackBundle();
      this.setupThree();
      this.setupControls();
      this.renderCatalog();
      this.bindUI();

      // Load model from URL query ?model=... or default to a320
      const params = new URLSearchParams(window.location.search);
      const initialId = params.get('model') || 'a320';
      const exists = MODEL_CATALOG.some((m) => m.id === initialId);
      this.loadCatalogModel(exists ? initialId : 'a320');

      this.animate();
    }

    unpackBundle() {
      // Lazy unpack on-demand to prevent main-thread freeze with multi-megabyte GLB bundles
    }

    getGLBBuffer(key) {
      if (this.glbBuffers[key]) return this.glbBuffers[key];
      if (typeof window !== 'undefined' && window.GLB_BUNDLE && window.GLB_BUNDLE[key]) {
        try {
          const b64 = window.GLB_BUNDLE[key];
          const binStr = atob(b64);
          const len = binStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binStr.charCodeAt(i);
          }
          this.glbBuffers[key] = bytes.buffer;
          return this.glbBuffers[key];
        } catch (err) {
          console.warn('Failed to unpack GLB bundle key:', key, err);
        }
      }
      return null;
    }

    setupThree() {
      const width = this.canvasWrap.clientWidth || window.innerWidth;
      const height = this.canvasWrap.clientHeight || window.innerHeight;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: true
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.canvasWrap.appendChild(this.renderer.domElement);

      if (typeof THREE.GLTFLoader !== 'undefined') {
        this.loader = new THREE.GLTFLoader();
      }

      // Studio 3-point + hemisphere lighting
      this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.1);
      this.scene.add(this.hemiLight);

      this.keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
      this.keyLight.position.set(30, 50, 40);
      this.scene.add(this.keyLight);

      this.fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
      this.fillLight.position.set(-40, 20, -25);
      this.scene.add(this.fillLight);

      this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
      this.rimLight.position.set(0, 25, -45);
      this.scene.add(this.rimLight);

      this.helpersGroup = new THREE.Group();
      this.scene.add(this.helpersGroup);
      this.rebuildHelpers(20);
      this.applyTheme('studio');

      window.addEventListener('resize', () => this.onResize());
    }

    rebuildHelpers(size) {
      while (this.helpersGroup.children.length > 0) {
        const child = this.helpersGroup.children[0];
        this.helpersGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      }

      const theme = THEMES[this.themeKey] || THEMES.studio;
      const gridSize = Math.max(10, Math.pow(10, Math.ceil(Math.log10(Math.max(size * 2.4, 10)))));
      const grid = new THREE.GridHelper(gridSize, 24, theme.grid1, theme.grid2);
      grid.material.opacity = 0.32;
      grid.material.transparent = true;
      this.helpersGroup.add(grid);

      const axes = new THREE.AxesHelper(Math.max(2, size * 0.45));
      this.helpersGroup.add(axes);

      this.helpersGroup.visible = this.showGrid;
    }

    applyTheme(key) {
      const theme = THEMES[key] || THEMES.studio;
      this.themeKey = key;
      this.canvasWrap.style.background = theme.cssBg;
      this.rebuildHelpers(this.modelRadius);
      const themeBtn = document.getElementById('btn-theme');
      if (themeBtn) {
        themeBtn.textContent = `🌗 ${theme.label}`;
      }
    }

    onResize() {
      if (!this.renderer || !this.camera || !this.canvasWrap) return;
      const width = this.canvasWrap.clientWidth || window.innerWidth;
      const height = this.canvasWrap.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    setupControls() {
      const dom = this.renderer.domElement;
      let isDragging = false;
      let dragMode = 'orbit'; // 'orbit' | 'pan'
      let prevX = 0;
      let prevY = 0;

      // Touch state
      const activePointers = new Map();
      let prevPinchDist = 0;
      let prevPinchMid = null;

      dom.addEventListener('contextmenu', (e) => e.preventDefault());

      dom.addEventListener('pointerdown', (e) => {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        dom.setPointerCapture(e.pointerId);

        if (activePointers.size === 1) {
          isDragging = true;
          dragMode = (e.button === 2 || e.shiftKey) ? 'pan' : 'orbit';
          prevX = e.clientX;
          prevY = e.clientY;
        } else if (activePointers.size === 2) {
          isDragging = false;
          const pts = Array.from(activePointers.values());
          prevPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          prevPinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        }
      });

      dom.addEventListener('pointermove', (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.size === 2) {
          const pts = Array.from(activePointers.values());
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };

          if (prevPinchDist > 0) {
            const scale = prevPinchDist / Math.max(dist, 1);
            this.zoomByFactor(scale);
          }
          if (prevPinchMid) {
            this.panByPixels(mid.x - prevPinchMid.x, mid.y - prevPinchMid.y);
          }
          prevPinchDist = dist;
          prevPinchMid = mid;
          return;
        }

        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        if (dragMode === 'pan') {
          this.panByPixels(dx, dy);
        } else {
          this.orbit.theta -= dx * 0.008;
          this.orbit.phi = Math.max(0.06, Math.min(Math.PI - 0.06, this.orbit.phi - dy * 0.008));
        }
      });

      const endPointer = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) {
          prevPinchDist = 0;
          prevPinchMid = null;
        }
        if (activePointers.size === 0) {
          isDragging = false;
        }
      };

      dom.addEventListener('pointerup', endPointer);
      dom.addEventListener('pointercancel', endPointer);

      dom.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.12 : 0.89;
        this.zoomByFactor(factor);
      }, { passive: false });

      dom.addEventListener('dblclick', () => this.resetView());

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if (document.activeElement === this.searchInput) return;
        if (e.key === '+' || e.key === '=') this.zoomByFactor(0.82);
        else if (e.key === '-' || e.key === '_') this.zoomByFactor(1.22);
        else if (e.key === 'r' || e.key === 'R') this.resetView();
        else if (e.key === ' ') {
          e.preventDefault();
          this.toggleAutoRotate();
        }
      });
    }

    zoomByFactor(factor) {
      this.orbit.radius = Math.max(
        this.orbit.minRadius,
        Math.min(this.orbit.maxRadius, this.orbit.radius * factor)
      );
    }

    panByPixels(dx, dy) {
      if (!this.camera || !this.orbit.target) return;
      const panSpeed = this.orbit.curRadius * 0.0014;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();

      this.orbit.target.addScaledVector(right, -dx * panSpeed);
      this.orbit.target.addScaledVector(up, dy * panSpeed);
    }

    setPresetView(preset) {
      this.autoRotate = false;
      this.updateAutoRotateBtn();
      this.orbit.target.copy(this.orbit.defaultTarget);
      this.orbit.radius = this.orbit.defaultRadius;

      if (preset === 'front') {
        this.orbit.theta = 0;
        this.orbit.phi = Math.PI * 0.46;
      } else if (preset === 'side') {
        this.orbit.theta = Math.PI * 0.5;
        this.orbit.phi = Math.PI * 0.46;
      } else if (preset === 'top') {
        this.orbit.theta = 0;
        this.orbit.phi = 0.08;
      } else {
        this.orbit.theta = Math.PI * 0.25;
        this.orbit.phi = Math.PI * 0.36;
      }
    }

    resetView() {
      this.orbit.target.copy(this.orbit.defaultTarget);
      this.orbit.radius = this.orbit.defaultRadius;
      this.orbit.theta = Math.PI * 0.25;
      this.orbit.phi = Math.PI * 0.36;
    }

    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate;
      this.updateAutoRotateBtn();
    }

    updateAutoRotateBtn() {
      const btn = document.getElementById('btn-auto-rotate');
      if (btn) {
        btn.classList.toggle('active', this.autoRotate);
      }
    }

    toggleWireframe() {
      this.wireframe = !this.wireframe;
      if (this.currentObject) {
        this.currentObject.traverse((node) => {
          if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => { m.wireframe = this.wireframe; });
          }
        });
      }
      const btn = document.getElementById('btn-wireframe');
      if (btn) btn.classList.toggle('active', this.wireframe);
    }

    toggleGrid() {
      this.showGrid = !this.showGrid;
      if (this.helpersGroup) this.helpersGroup.visible = this.showGrid;
      const btn = document.getElementById('btn-grid');
      if (btn) btn.classList.toggle('active', this.showGrid);
    }

    cycleTheme() {
      const order = ['studio', 'sky', 'night'];
      const idx = (order.indexOf(this.themeKey) + 1) % order.length;
      this.applyTheme(order[idx]);
    }

    renderCatalog() {
      if (!this.modelListEl) return;
      const q = this.searchQuery.trim().toLowerCase();
      const filtered = MODEL_CATALOG.filter((item) => {
        if (this.currentFilter !== 'all' && item.category !== this.currentFilter) return false;
        if (q) {
          const hay = `${item.name} ${item.id} ${item.desc}`.toLowerCase();
          return hay.includes(q);
        }
        return true;
      });

      this.modelListEl.innerHTML = '';
      if (filtered.length === 0) {
        this.modelListEl.innerHTML = '<div class="viewer-empty">검색 결과가 없습니다.</div>';
        return;
      }

      filtered.forEach((item) => {
        const isBundled = Boolean((typeof window !== 'undefined' && window.GLB_BUNDLE && window.GLB_BUNDLE[item.id]) || this.glbBuffers[item.id]);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'viewer-model-card' + (this.activeModelId === item.id ? ' active' : '');
        card.dataset.modelId = item.id;
        card.innerHTML = `
          <span class="card-icon">${item.icon}</span>
          <span class="card-body">
            <span class="card-title-row">
              <strong>${item.name}</strong>
              <span class="card-badge ${isBundled ? 'bundled' : 'external'}">${isBundled ? '내장' : 'GLB'}</span>
            </span>
            <small>${item.desc}</small>
          </span>
        `;
        card.addEventListener('click', () => {
          this.loadCatalogModel(item.id);
          // Close mobile drawer automatically on selection
          const sidebar = document.getElementById('viewer-sidebar');
          if (sidebar && window.innerWidth <= 900) {
            sidebar.classList.remove('open');
          }
        });
        this.modelListEl.appendChild(card);
      });
    }

    bindUI() {
      // Category filter tabs
      document.querySelectorAll('.viewer-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.viewer-tab-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFilter = btn.dataset.filter || 'all';
          this.renderCatalog();
        });
      });

      if (this.searchInput) {
        this.searchInput.addEventListener('input', () => {
          this.searchQuery = this.searchInput.value || '';
          this.renderCatalog();
        });
      }

      // Mobile sidebar toggle
      const sidebarToggle = document.getElementById('viewer-sidebar-toggle');
      const sidebar = document.getElementById('viewer-sidebar');
      if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
          sidebar.classList.toggle('open');
        });
      }

      // Local file picker
      const fileInput = document.getElementById('viewer-file-input');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) this.loadLocalFile(file);
          fileInput.value = '';
        });
      }

      // Drag and drop
      const dragOverlay = document.getElementById('viewer-drag-overlay');
      let dragCount = 0;
      window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCount++;
        if (dragOverlay) dragOverlay.classList.add('active');
      });
      window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCount--;
        if (dragCount <= 0 && dragOverlay) {
          dragOverlay.classList.remove('active');
          dragCount = 0;
        }
      });
      window.addEventListener('dragover', (e) => e.preventDefault());
      window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCount = 0;
        if (dragOverlay) dragOverlay.classList.remove('active');
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) this.loadLocalFile(file);
      });
    }

    showLoading(show) {
      if (this.loadingEl) this.loadingEl.classList.toggle('hidden', !show);
    }

    showError(msg) {
      if (!this.errorEl) return;
      if (!msg) {
        this.errorEl.classList.add('hidden');
        this.errorEl.textContent = '';
      } else {
        this.errorEl.textContent = msg;
        this.errorEl.classList.remove('hidden');
      }
    }

    loadCatalogModel(id) {
      const meta = MODEL_CATALOG.find((m) => m.id === id);
      if (!meta) return;

      this.activeModelId = id;
      this.renderCatalog();
      this.showError('');
      this.showLoading(true);

      // 1. Offline memory bundle (0ms latency, works on file://)
      const bundledBuf = this.getGLBBuffer(id);
      if (bundledBuf) {
        try {
          this.loader.parse(bundledBuf.slice(0), '', (gltf) => {
            this.mountGLTF(gltf, meta, '내장 GLB 번들');
          }, (err) => {
            this.showLoading(false);
            this.showError(`모델 파싱 실패 (${meta.name}): ${err && err.message ? err.message : err}`);
          });
          return;
        } catch (err) {
          console.warn('Bundle parse error:', err);
        }
      }

      // 2. Fallback HTTP fetch from models/ or assets/models/
      const paths = [`models/${meta.file}`, `assets/models/${meta.file}`];
      const tryFetch = (idx) => {
        if (idx >= paths.length) {
          this.showLoading(false);
          this.showError(`"${meta.name}" (${meta.file}) 파일을 불러올 수 없습니다. (로컬 file:// 환경에서는 내장 번들 모델만 직접 로드됩니다.)`);
          return;
        }
        fetch(paths[idx])
          .then((res) => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.arrayBuffer();
          })
          .then((buf) => {
            this.loader.parse(buf, '', (gltf) => {
              this.mountGLTF(gltf, meta, paths[idx]);
            }, () => tryFetch(idx + 1));
          })
          .catch(() => tryFetch(idx + 1));
      };
      tryFetch(0);
    }

    loadLocalFile(file) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) {
        this.showError('.glb 또는 .gltf 파일만 열 수 있습니다.');
        return;
      }
      this.activeModelId = null;
      this.renderCatalog();
      this.showError('');
      this.showLoading(true);

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          this.loader.parse(ev.target.result, '', (gltf) => {
            this.mountGLTF(gltf, {
              id: 'local',
              name: file.name,
              icon: '📂',
              desc: `로컬 파일 (${(file.size / 1024).toFixed(1)} KB)`
            }, '로컬 파일');
          }, (err) => {
            this.showLoading(false);
            this.showError(`파일 파싱 오류: ${err && err.message ? err.message : err}`);
          });
        } catch (err) {
          this.showLoading(false);
          this.showError(`파일 로드 실패: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    disposeCurrentModel() {
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
      }
      if (this.movingPartsController) {
        this.movingPartsController.dispose();
        this.movingPartsController = null;
      }
      if (this.currentObject) {
        this.scene.remove(this.currentObject);
        this.currentObject.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => m.dispose());
          }
        });
        this.currentObject = null;
      }
    }

    mountGLTF(gltf, meta, sourceLabel) {
      this.disposeCurrentModel();
      const root = gltf.scene || gltf.scenes[0];
      if (!root) {
        this.showLoading(false);
        this.showError('GLB 파일에 표시할 3D 씬이 없습니다.');
        return;
      }

      // Apply wireframe state & compute stats
      let meshCount = 0;
      let triCount = 0;
      let vertCount = 0;
      const materials = new Set();

      root.traverse((node) => {
        if (node.isMesh) {
          meshCount++;
          if (node.geometry) {
            const pos = node.geometry.attributes && node.geometry.attributes.position;
            if (pos) vertCount += pos.count;
            if (node.geometry.index) triCount += node.geometry.index.count / 3;
            else if (pos) triCount += pos.count / 3;
          }
          if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              materials.add(m);
              m.wireframe = this.wireframe;
              const nameLower = (m.name || '').toLowerCase();
              const isWindowOrDecal = /window|glass|cockpit|windshield|decal|strip/i.test(nameLower) ||
                /Material\.(005|007|008|010|016|027|051|052)$/i.test(m.name || '');
              if (isWindowOrDecal) {
                m.polygonOffset = true;
                m.polygonOffsetFactor = -2.0;
                m.polygonOffsetUnits = -4.0;
              }
              if (m.transparent) {
                m.depthWrite = true;
                m.side = THREE.DoubleSide;
              }
              if (m.transmission > 0) {
                m.transmission = 0;
              }
              m.needsUpdate = true;
            });
          }
        }
      });

      // ★ 실물 스케일 정규화 (항공기는 GLBMovingPartsController의 표준 제원 적용)
      const isAircraft = (meta.category === 'aircraft');
      let size;
      if (isAircraft && typeof window !== 'undefined' && window.GLBMovingParts) {
        const norm = window.GLBMovingParts.normalizeAircraftScene(root, meta.id, { isViewer: true });
        size = norm.size;
      } else {
        const box = new THREE.Box3().setFromObject(root);
        size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        root.position.set(-center.x, -box.min.y, -center.z);
      }

      const wrapper = new THREE.Group();
      wrapper.add(root);
      this.scene.add(wrapper);
      wrapper.updateMatrixWorld(true);
      this.currentObject = wrapper;

      // ★ 통합 무빙 파츠 컨트롤러 연결 (갤러리 연속 가동 데모 루프 모드)
      if (typeof window !== 'undefined' && window.GLBMovingParts) {
        this.movingPartsController = new window.GLBMovingParts({
          scene: root,
          planeType: meta.id,
          planeGroup: wrapper,
          demoLoop: true,
          animations: gltf.animations
        });
      }

      // 기본 GLTF 키프레임 애니메이션 (컨트롤러가 미장착된 모델의 경우)
      const animCount = gltf.animations ? gltf.animations.length : 0;
      if (animCount > 0 && (!this.movingPartsController || !this.movingPartsController.mixer)) {
        this.mixer = new THREE.AnimationMixer(root);
        gltf.animations.forEach((clip) => {
          this.mixer.clipAction(clip).play();
        });
      }
      this.animationsPlaying = true;

      // Auto-frame camera to bounding sphere
      const maxDim = Math.max(size.x, size.y, size.z, 0.5);
      const sphere = new THREE.Sphere();
      new THREE.Box3().setFromObject(wrapper).getBoundingSphere(sphere);
      this.modelRadius = Math.max(sphere.radius, 0.5);

      const fovRad = (this.camera.fov * Math.PI) / 180;
      const fitDist = (this.modelRadius / Math.sin(fovRad / 2)) * 1.18;

      this.orbit.defaultTarget.set(0, size.y * 0.45, 0);
      this.orbit.defaultRadius = fitDist;
      this.orbit.minRadius = Math.max(0.2, this.modelRadius * 0.25);
      this.orbit.maxRadius = Math.max(100, this.modelRadius * 14);

      this.camera.near = Math.max(0.1, this.modelRadius * 0.01);
      this.camera.far = Math.max(2000, this.modelRadius * 40);
      this.camera.updateProjectionMatrix();

      this.orbit.target.copy(this.orbit.defaultTarget);
      this.orbit.curTarget.copy(this.orbit.defaultTarget);
      this.orbit.radius = fitDist;
      this.orbit.curRadius = fitDist;
      this.orbit.theta = Math.PI * 0.25;
      this.orbit.phi = Math.PI * 0.36;

      this.rebuildHelpers(maxDim);
      this.updateInfoHUD(meta, sourceLabel, size, meshCount, Math.round(triCount), vertCount, materials.size, animCount);
      this.showLoading(false);
    }

    updateInfoHUD(meta, sourceLabel, size, meshes, tris, verts, mats, anims) {
      const setText = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };
      setText('info-model-name', `${meta.icon || '📦'} ${meta.name}`);
      setText('info-model-desc', meta.desc || '');
      setText('info-source', sourceLabel);
      setText('info-dimensions', `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m`);
      setText('info-meshes', `${meshes}개`);
      setText('info-tris', `${tris.toLocaleString()} tris`);
      setText('info-verts', `${verts.toLocaleString()} verts`);
      setText('info-mats', `${mats}개`);

      const hasMoving = (this.movingPartsController && this.movingPartsController.hasMovingParts) || anims > 0;
      const animBtn = document.getElementById('btn-anim-toggle');
      if (animBtn) {
        animBtn.classList.toggle('hidden', !hasMoving);
        animBtn.textContent = this.animationsPlaying ? '⏸️ 무빙파츠 동작' : '▶️ 무빙파츠 일시정지';
      }
    }

    toggleAnimation() {
      this.animationsPlaying = !this.animationsPlaying;
      if (this.movingPartsController) {
        this.movingPartsController.enabled = this.animationsPlaying;
      }
      const animBtn = document.getElementById('btn-anim-toggle');
      if (animBtn) {
        animBtn.textContent = this.animationsPlaying ? '⏸️ 무빙파츠 동작' : '▶️ 무빙파츠 일시정지';
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      const dt = this.clock ? Math.min(this.clock.getDelta(), 0.1) : 0.016;

      if (this.mixer && this.animationsPlaying) {
        this.mixer.update(dt);
      }
      if (this.movingPartsController && this.animationsPlaying) {
        this.movingPartsController.update(dt);
      }

      if (this.autoRotate) {
        this.orbit.theta += dt * 0.45;
      }

      // Smooth exponential damping
      const damp = 1 - Math.exp(-10 * dt);
      this.orbit.curTheta += (this.orbit.theta - this.orbit.curTheta) * damp;
      this.orbit.curPhi += (this.orbit.phi - this.orbit.curPhi) * damp;
      this.orbit.curRadius += (this.orbit.radius - this.orbit.curRadius) * damp;
      this.orbit.curTarget.lerp(this.orbit.target, damp);

      const sinPhi = Math.sin(this.orbit.curPhi);
      const x = this.orbit.curTarget.x + this.orbit.curRadius * sinPhi * Math.sin(this.orbit.curTheta);
      const y = this.orbit.curTarget.y + this.orbit.curRadius * Math.cos(this.orbit.curPhi);
      const z = this.orbit.curTarget.z + this.orbit.curRadius * sinPhi * Math.cos(this.orbit.curTheta);

      this.camera.position.set(x, y, z);
      this.camera.lookAt(this.orbit.curTarget);

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.glbViewer = new GLBModelViewer();
  });
})();
