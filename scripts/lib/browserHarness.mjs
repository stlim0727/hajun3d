// Shared self-contained headless Chrome + CDP + static server harness for Hajun Plane 3D.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, extname, normalize } from 'node:path';

export function detectGpuAngle() {
  if (process.env.GPU_ANGLE) return process.env.GPU_ANGLE;
  if (process.env.FORCE_GPU === '0') return 'swiftshader';
  if (process.platform === 'win32') return 'd3d11';
  return existsSync('/dev/dri/renderD128') ? 'vulkan' : 'swiftshader';
}

export function findChromeBin() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return process.env.CHROME_PATH || 'google-chrome-stable';
}

export function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(err => (err ? reject(err) : resolvePort(port)));
    });
    srv.on('error', reject);
  });
}

export function startStaticServer(rootDir, port) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.gltf': 'model/gltf+json',
    '.glb': 'model/gltf-binary',
    '.bin': 'application/octet-stream',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.wasm': 'application/wasm',
  };

  const server = createHttpServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(parsedUrl.pathname);
      if (pathname === '/' || pathname === '/index.html') {
        pathname = '/web/index.html';
      }

      const safePath = normalize(join(rootDir, pathname));
      if (!safePath.startsWith(normalize(rootDir))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const st = await stat(safePath).catch(() => null);
      if (!st || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not Found: ${pathname}`);
        return;
      }

      const ext = extname(safePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = await readFile(safePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${err.message}`);
    }
  });

  return new Promise((resolveServer, rejectServer) => {
    server.listen(port, '127.0.0.1', () => {
      resolveServer(server);
    });
    server.on('error', rejectServer);
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

export async function withBrowserSession(options = {}, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = {};
  }
  const width = options.width ?? 1440;
  const height = options.height ?? 900;
  const mobile = Boolean(options.mobile);
  const deviceScaleFactor = options.deviceScaleFactor ?? 1;
  const cdpPort = Number(options.cdpPort || process.env.CDP_PORT || (await getFreePort()));
  const gpuAngle = detectGpuAngle();
  const profileDir = await mkdtemp(join(tmpdir(), 'hajun-cdp-'));
  const chromeBin = findChromeBin();

  let server = null;
  let origin = options.origin || process.env.APP_URL || '';
  if (!origin && options.startServer !== false) {
    const serverPort = await getFreePort();
    origin = `http://127.0.0.1:${serverPort}`;
    const rootDir = options.rootDir || resolve(process.cwd());
    server = await startStaticServer(rootDir, serverPort);
  }

  const chromeArgs = [
    '--headless=new',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${cdpPort}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    `--use-angle=${gpuAngle}`,
    ...(gpuAngle === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : []),
    'about:blank',
  ];

  let chromeStderr = '';
  const chromeProc = spawn(chromeBin, chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  chromeProc.stderr?.on('data', chunk => { chromeStderr = (chromeStderr + chunk).slice(-4000); });
  let socket = null;
  let seq = 0;
  const pending = new Map();
  const exceptions = [];
  const consoleMessages = [];

  const send = (method, params = {}) =>
    new Promise((resolveSend, rejectSend) => {
      const id = ++seq;
      const defaultTimeout = gpuAngle === 'swiftshader' ? 120000 : 60000;
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectSend(new Error(`CDP timeout: ${method}`));
      }, options.timeoutMs ?? defaultTimeout);
      pending.set(id, msg => {
        clearTimeout(timer);
        if (msg.error) rejectSend(new Error(JSON.stringify(msg.error)));
        else resolveSend(msg.result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (exprOrFn, arg) => {
    const expression = typeof exprOrFn === 'function'
      ? `(${exprOrFn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})`
      : String(exprOrFn);
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  };

  const screenshot = async (filePath, screenshotOptions = {}) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', ...screenshotOptions });
    const resolved = resolve(filePath);
    await mkdir(resolve(resolved, '..'), { recursive: true });
    await writeFile(resolved, Buffer.from(data, 'base64'));
    return resolved;
  };

  try {
    let target = null;
    for (let i = 0; i < 150; i++) {
      try {
        const pages = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json();
        target = pages.find(p => p.type === 'page');
        if (!target && pages.length === 0) {
          const created = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new`, { method: 'PUT' })).json();
          if (created?.type === 'page') target = created;
        }
      } catch { /* starting */ }
      if (target) break;
      await delay(100);
    }
    if (!target) throw new Error(`Chrome CDP page target not available on port ${cdpPort}. Chrome stderr:\n${chromeStderr}`);

    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener('open', resolveOpen, { once: true });
      socket.addEventListener('error', rejectOpen, { once: true });
    });
    socket.addEventListener('message', ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.text);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push(msg.params);
      }
      if (pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile });
    if (mobile || options.touch) {
      await send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: options.maxTouchPoints ?? 5,
      });
    }

    if (options.path || options.url) {
      const targetUrl = options.url || `${origin}${options.path.startsWith('/') ? '' : '/'}${options.path}`;
      await send('Page.navigate', { url: targetUrl });
      await send('Page.bringToFront');
    }

    return await fn({ origin, cdpPort, gpuAngle, send, evaluate, screenshot, exceptions, consoleMessages, delay });
  } finally {
    try { socket?.close(); } catch { /* ignore */ }
    try { chromeProc.kill('SIGKILL'); } catch { /* ignore */ }
    try { server?.close(); } catch { /* ignore */ }
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
