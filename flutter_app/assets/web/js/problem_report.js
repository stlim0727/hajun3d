/**
 * Sky Jet Explorer 3D - Problem Report Archive
 * Captures a screenshot, geodetic/flight state, console history and environment
 * details into a dependency-free ZIP downloaded from the browser.
 */
(function () {
  'use strict';

  const MAX_LOG_ENTRIES = 300;
  const logs = [];

  function formatValue(value) {
    if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack || ''}`;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || value == null) return String(value);
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (_key, item) => {
        if (item && typeof item === 'object') {
          if (seen.has(item)) return '[circular]';
          seen.add(item);
        }
        return item;
      });
    } catch (err) {
      return `[unserializable] ${err}`;
    }
  }

  function pushLog(entry) {
    logs.push(entry);
    if (logs.length > MAX_LOG_ENTRIES) logs.shift();
  }

  ['log', 'info', 'warn', 'error'].forEach((level) => {
    const original = console[level];
    if (typeof original !== 'function') return;
    console[level] = function () {
      const args = Array.prototype.slice.call(arguments);
      pushLog({
        time: new Date().toISOString(),
        level,
        message: args.map(formatValue).join(' ').slice(0, 4000),
        stack: level === 'error' ? new Error().stack : undefined
      });
      return original.apply(console, args);
    };
  });

  window.addEventListener('error', (event) => {
    pushLog({
      time: new Date().toISOString(),
      level: 'error',
      message: `${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`,
      stack: event.error && event.error.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    pushLog({
      time: new Date().toISOString(),
      level: 'error',
      message: `Unhandled rejection: ${formatValue(event.reason)}`
    });
  });

  window.problemReportLogs = logs;

  const encoder = new TextEncoder();
  let crcTable = null;

  function getCrcTable() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[i] = c >>> 0;
    }
    return crcTable;
  }

  function crc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date) {
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
      day: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  function asBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (typeof data === 'string') return encoder.encode(data);
    throw new TypeError('ZIP entry must be a string or Uint8Array');
  }

  // Store-only ZIP (no compression dependency); PNG screenshots are already compressed.
  function createZip(files) {
    const { time, day } = dosDateTime(new Date());
    const parts = [];
    const central = [];
    let offset = 0;

    files.forEach((file) => {
      const name = encoder.encode(file.name);
      const data = asBytes(file.data);
      const crc = crc32(data);

      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, time, true);
      localView.setUint16(12, day, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, name.length, true);
      localView.setUint16(28, 0, true);
      local.set(name, 30);
      parts.push(local, data);

      const directory = new Uint8Array(46 + name.length);
      const dirView = new DataView(directory.buffer);
      dirView.setUint32(0, 0x02014b50, true);
      dirView.setUint16(4, 20, true);
      dirView.setUint16(6, 20, true);
      dirView.setUint16(8, 0x0800, true);
      dirView.setUint16(10, 0, true);
      dirView.setUint16(12, time, true);
      dirView.setUint16(14, day, true);
      dirView.setUint32(16, crc, true);
      dirView.setUint32(20, data.length, true);
      dirView.setUint32(24, data.length, true);
      dirView.setUint16(28, name.length, true);
      dirView.setUint16(30, 0, true);
      dirView.setUint16(32, 0, true);
      dirView.setUint16(34, 0, true);
      dirView.setUint16(36, 0, true);
      dirView.setUint32(38, 0, true);
      dirView.setUint32(42, offset, true);
      directory.set(name, 46);
      central.push(directory);
      offset += local.length + data.length;
    });

    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    const chunks = parts.concat(central, [end]);
    const total = chunks.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(total);
    let cursor = 0;
    chunks.forEach((part) => {
      output.set(part, cursor);
      cursor += part.length;
    });
    return output;
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function section(title, value) {
    const body = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return `\n===== ${title} =====\n${body}\n`;
  }

  Object.assign(AirplaneGame.prototype, {
    captureProblemScreenshot() {
      if (!this.renderer || !this.scene || !this.camera) return null;
      try {
        if (this.renderer.xr && this.renderer.xr.isPresenting) return null;
        // Draw immediately so the WebGL drawing buffer still contains this frame.
        this.renderer.render(this.scene, this.camera);
        const glCanvas = this.renderer.domElement;
        if (!glCanvas) return null;

        // Overlay visible DOM UI controls on top of 3D frame for rich diagnosis
        try {
          const compCanvas = document.createElement('canvas');
          compCanvas.width = glCanvas.width;
          compCanvas.height = glCanvas.height;
          const ctx = compCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(glCanvas, 0, 0);

            const scaleX = glCanvas.width / (window.innerWidth || glCanvas.clientWidth || 1);
            const scaleY = glCanvas.height / (window.innerHeight || glCanvas.clientHeight || 1);

            const selectors = [
              '#hud-top .hud-card',
              '#target-indicator',
              '.flight-instruments',
              '.hud-top-right .icon-btn',
              '#problem-report-float-btn',
              '.touch-throttle-card',
              '#touch-btn-brake',
              '#touch-rudder-card',
              '#touch-rudder-thumb',
              '.touch-quick-actions .mini-action-btn',
              '.touch-stick-card',
              '#joystick-zone',
              '#joystick-stick',
              '#gpws-banner:not(.hidden)',
              '#passenger-reaction-box:not(.hidden)',
              '.emergency-panel:not(.hidden)',
              '.mobile-menu-modal:not(.hidden)',
              '.modal-card'
            ];

            const drawnRects = [];
            const seen = new Set();
            document.querySelectorAll(selectors.join(', ')).forEach((el) => {
              if (seen.has(el)) return;
              seen.add(el);
              const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
              if (style && (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0)) return;

              const r = el.getBoundingClientRect();
              if (r.width <= 0 || r.height <= 0) return;

              const x = r.left * scaleX;
              const y = r.top * scaleY;
              const w = r.width * scaleX;
              const h = r.height * scaleY;

              ctx.save();
              ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
              ctx.strokeStyle = el.id === 'problem-report-float-btn'
                ? 'rgba(250, 204, 21, 0.9)'
                : 'rgba(56, 189, 248, 0.75)';
              ctx.lineWidth = Math.max(1, 1.5 * scaleX);

              const radius = Math.min(6 * scaleX, w / 2, h / 2);
              if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, radius);
                ctx.fill();
                ctx.stroke();
              } else {
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);
              }

              const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
              if (text && w > 14 * scaleX && h > 8 * scaleY) {
                const fontSize = Math.max(7, Math.min(12 * scaleX, h * 0.5));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = '#f8fafc';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';

                let displayText = text;
                if (displayText.length > 24) displayText = displayText.slice(0, 22) + '…';
                ctx.fillText(displayText, x + w / 2, y + h / 2, Math.max(0, w - 4 * scaleX));
              }
              ctx.restore();

              drawnRects.push({
                id: el.id || null,
                className: el.className || null,
                left: Math.round(r.left),
                top: Math.round(r.top),
                width: Math.round(r.width),
                height: Math.round(r.height),
                text: text.slice(0, 60)
              });
            });

            this._lastCapturedUIRects = drawnRects;
            return compCanvas.toDataURL('image/png');
          }
        } catch (uiErr) {
          pushLog({ time: new Date().toISOString(), level: 'warn', message: `UI overlay composite failed, falling back to WebGL: ${formatValue(uiErr)}` });
        }

        return glCanvas.toDataURL('image/png');
      } catch (err) {
        pushLog({ time: new Date().toISOString(), level: 'error', message: `Screenshot failed: ${formatValue(err)}` });
        return null;
      }
    },

    collectProblemReportData() {
      const pos = this.planeGroup ? this.planeGroup.position : null;
      const vel = this.velocity || null;
      const nav = window.AirportIndicators || null;
      const destination = nav && nav.byIcao ? nav.byIcao[this.selectedDestinationIcao] : null;
      const jeju = typeof this.getJejuLocalPosition === 'function' ? this.getJejuLocalPosition() : null;
      const anchorBase = this.geoSimAnchorBase || (typeof window !== 'undefined' && window.GEO_SIM_ANCHOR) || { x: 160, z: 0 };
      const latLon = (pos && typeof window.geoLocalToLatLon === 'function')
        ? window.geoLocalToLatLon(pos.x - anchorBase.x, pos.z - (anchorBase.z || 0))
        : null;
      const providerReady = Boolean(pos && this.terrainProvider && typeof this.terrainProvider.isReady === 'function'
        && this.terrainProvider.isReady(pos.x, pos.z));
      const providerHeight = providerReady ? this.terrainProvider.getHeight(pos.x, pos.z) : null;

      let webgl = null;
      try {
        const gl = this.renderer && this.renderer.getContext ? this.renderer.getContext() : null;
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          webgl = {
            version: gl.getParameter(gl.VERSION),
            vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
          };
        }
      } catch (err) {
        webgl = { error: formatValue(err) };
      }

      const glbStatus = {};
      document.querySelectorAll('[id^="glb-status-"]').forEach((el) => {
        glbStatus[el.id] = el.textContent.trim();
      });

      return {
        generatedAt: new Date().toISOString(),
        build: globalThis.__BUILD_INFO__ || null,
        geo: {
          url: location.href,
          anchor: this.geoAnchor || null,
          azimuthDeg: this.geoAzimuth,
          geoPoints: window.GEO_POINTS || null,
          jejuLocal: jeju,
          aircraftLatLon: latLon,
          position: pos ? { x: pos.x, y: pos.y, z: pos.z } : null,
          destination: destination || null,
          selectedDestinationIcao: this.selectedDestinationIcao || null,
          geoTilesEnabled: Boolean(this.geoLayer),
          geoTilesStats: this.geoLayer ? this.geoLayer.stats : null,
          geoTilesDebug: this.geoLayer && typeof this.geoLayer.debug === 'function' ? this.geoLayer.debug() : null,
          floatingOrigin: this.floatingOrigin && typeof this.floatingOrigin.debug === 'function'
            ? this.floatingOrigin.debug() : null,
          terrainProviderReady: providerReady,
          terrainProviderHeightM: providerHeight,
          terrainProviderWater: providerReady && typeof this.terrainProvider.isWater === 'function'
            ? this.terrainProvider.isWater(pos.x, pos.z)
            : null
        },
        flight: {
          phase: this.flightPhase,
          phaseLabel: this.phaseDisplay ? this.phaseDisplay.textContent : null,
          aircraft: this.currentPlaneType,
          isPlaying: this.isPlaying,
          isDestroyed: this.isDestroyed,
          isOnGround: this.isOnGround,
          isJejuFlyover: Boolean(this.isJejuFlyover),
          speed: this.speed,
          groundSpeed: this.groundSpeed,
          verticalSpeed: this.verticalSpeed,
          velocity: vel ? { x: vel.x, y: vel.y, z: vel.z } : null,
          throttle: this.throttle,
          n1: this.n1,
          gear: this.gearPhase,
          flapsIndex: this.flapIndex,
          spoilers: this.spoilerExtended,
          reverseThrust: this.reverseThrustActive,
          cameraMode: this.cameraMode,
          timeOfDay: this.timeOfDay,
          cruiseMultiplier: this.cruiseMultiplier,
          emergency: this.currentEmergency,
          soundEnabled: this.soundEnabled,
          micActive: this.isMicActive,
          gyroActive: this.gyroActive,
          hotasConnected: this.hotasState ? this.hotasState.connected : null
        },
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screen: { width: screen.width, height: screen.height, pixelRatio: window.devicePixelRatio },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          hardwareConcurrency: navigator.hardwareConcurrency || null,
          deviceMemory: navigator.deviceMemory || null,
          onLine: navigator.onLine,
          webgl,
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : null,
          localStorageKeys: (() => {
            try { return Object.keys(localStorage); } catch (err) { return []; }
          })(),
          glbStatus,
          buildInfoText: (() => {
            const el = document.querySelector('[data-build-info]');
            return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
          })()
        },
        logs: logs.slice(-MAX_LOG_ENTRIES)
      };
    },

    downloadProblemReport() {
      try {
        const report = this.collectProblemReportData();
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const files = [
          { name: 'README.txt', data: 'Hajun Plane 3D problem report\n\n' +
            'screenshot.png - composite screenshot including 3D world + on-screen UI overlay\n' +
            'ui-layout.json - on-screen DOM UI layout bounds, coordinates and text\n' +
            'report.json - full structured diagnostics\n' +
            'geo.txt - geodetic position / terrain / tile state\n' +
            'flight.txt - flight and aircraft state\n' +
            'environment.txt - browser, GPU and build details\n' +
            'logs.txt - recent console messages and errors\n\n' +
            'Review the files before sharing: they can include your browser details and local URLs.\n' },
          { name: 'ui-layout.json', data: JSON.stringify(this._lastCapturedUIRects || [], null, 2) },
          { name: 'report.json', data: JSON.stringify(report, null, 2) },
          { name: 'geo.txt', data: section('GEO', report.geo) },
          { name: 'flight.txt', data: section('FLIGHT', report.flight) },
          { name: 'environment.txt', data: section('ENVIRONMENT', report.environment) },
          { name: 'logs.txt', data: report.logs.map((entry) =>
            `${entry.time} [${entry.level}] ${entry.message}${entry.stack ? `\n${entry.stack}` : ''}`).join('\n') || '(no console activity captured)' }
        ];

        const screenshot = this.captureProblemScreenshot();
        if (screenshot && screenshot.startsWith('data:image/png;base64,')) {
          files.push({ name: 'screenshot.png', data: base64ToBytes(screenshot.split(',')[1]) });
        } else {
          files.push({ name: 'screenshot.txt', data: 'Screenshot unavailable (WebGL context or renderer missing).\n' });
        }

        const archive = createZip(files);
        const blob = new Blob([archive], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hajun3d-problem-${stamp}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.showPopup(`🧾 문제 보고서 아카이브를 저장했습니다 (${files.length}개 파일, ${Math.round(archive.length / 1024)}KB)`);
        return { files: files.length, bytes: archive.length, screenshot: Boolean(screenshot) };
      } catch (err) {
        pushLog({ time: new Date().toISOString(), level: 'error', message: `Problem report failed: ${formatValue(err)}` });
        this.showPopup('❌ 문제 보고서를 만들지 못했습니다. 콘솔 로그를 확인하세요.');
        return null;
      }
    }
  });
})();
