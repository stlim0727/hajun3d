import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('web/js/landmarks.js', 'utf8');

function createService(fetchImpl) {
  const sandbox = {
    console,
    fetch: fetchImpl,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const service = sandbox.window.NearbyLandmarks;
  service.clearCache();
  return service;
}

const geoSearchPayload = {
  query: {
    pages: {
      100: {
        pageid: 100,
        title: 'Haeundae LCT The Sharp',
        extract: 'A landmark tower in Busan.',
        coordinates: [{ lat: 35.1603056, lon: 129.169 }],
        thumbnail: { source: 'https://example.test/thumb.jpg' }
      },
      200: {
        pageid: 200,
        title: 'Haeundae Beach',
        extract: 'A beach in Busan.',
        coordinates: [{ lat: 35.1587, lon: 129.1603 }]
      },
      300: {
        pageid: 300,
        title: 'Far away place',
        extract: 'Outside the search radius.',
        coordinates: [{ lat: 36.0, lon: 129.0 }]
      }
    }
  }
};

test('maps Wikipedia geosearch pages to distance-sorted nearby landmarks', async () => {
  let requestedUrl = '';
  const service = createService(async (url) => {
    requestedUrl = String(url);
    return { ok: true, status: 200, json: async () => geoSearchPayload };
  });

  const result = await service.load({ lat: 35.1603056, lon: 129.169, radiusM: 8000, limit: 6, language: 'ko' });

  assert.equal(result.source, 'online');
  assert.deepEqual(Array.from(result.items, item => item.title), ['Haeundae LCT The Sharp', 'Haeundae Beach']);
  assert.equal(result.items[0].url, 'https://ko.wikipedia.org/?curid=100');
  assert.equal(result.items[0].extract, 'A landmark tower in Busan.');
  assert.ok(result.items[0].distanceKm < 0.01);
  assert.ok(result.items[1].distanceKm > 0.5 && result.items[1].distanceKm < 2);
  assert.match(requestedUrl, /generator=geosearch/);
  assert.match(requestedUrl, /origin=\*/);
});

test('falls back to bundled landmarks when the network request fails', async () => {
  const service = createService(async () => { throw new Error('offline'); });

  const result = await service.load({ lat: 35.1603056, lon: 129.169, radiusM: 8000, limit: 6, language: 'ko' });

  assert.equal(result.source, 'local');
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every(item => item.source === 'local'));
  assert.ok(result.items.some(item => item.title === '해운대 LCT 더샵'));
});

test('distance and bearing helpers work without AirportIndicators', () => {
  const service = createService(async () => { throw new Error('unused'); });
  const from = { lat: 35.1603056, lon: 129.169 };
  const to = { lat: 35.1587, lon: 129.1603 };

  const km = service.distanceKm(from, to);
  const bearing = service.bearingDeg(from, to);

  assert.ok(km > 0.5 && km < 2, `expected sub-2 km separation, got ${km}`);
  assert.ok(bearing >= 0 && bearing < 360);
});
