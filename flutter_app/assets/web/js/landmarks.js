/**
 * landmarks.js — nearby landmark info from Wikimedia geosearch.
 *
 * One CORS-enabled Wikipedia API call returns titles, coordinates, one-line
 * extracts and thumbnails around the aircraft. Failed/offline requests fall
 * back to a small bundled list so the HUD panel is never empty.
 */
(function (root) {
  'use strict';

  const DEFAULT_RADIUS_M = 8000;
  const DEFAULT_LIMIT = 6;
  const CACHE_TTL_MS = 10 * 60 * 1000;
  const LOCAL_TTL_MS = 60 * 1000;
  const REQUEST_TIMEOUT_MS = 15000;
  const CELL_DEG = 0.05;

  const cache = new Map();
  const inflight = new Map();

  const BUNDLED_LANDMARKS = [
    { id: 'haeundae-lct', title: '해운대 LCT 더샵', lat: 35.1603056, lon: 129.1690,
      extract: '해운대 해변 앞에 세워진 초고층 주상복합 랜드마크.', source: 'local' },
    { id: 'haeundae-beach', title: '해운대해수욕장', lat: 35.1587, lon: 129.1603,
      extract: '부산을 대표하는 해수욕장.', source: 'local' },
    { id: 'gwangandaegyo', title: '광안대교', lat: 35.1535, lon: 129.1297,
      extract: '수영만을 가로지르는 부산의 해상 교량.', source: 'local' },
    { id: 'namsan-tower', title: 'N서울타워', lat: 37.5512, lon: 126.9882,
      extract: '서울 남산 정상에 있는 통신·전망 타워.', source: 'local' },
    { id: 'gyeongbokgung', title: '경복궁', lat: 37.5796, lon: 126.9770,
      extract: '조선 시대의 법궁, 서울 종로구에 위치.', source: 'local' },
    { id: 'hallasan', title: '한라산', lat: 33.3625, lon: 126.5335,
      extract: '제주도의 중심에 솟은 대한민국 최고봉.', source: 'local' }
  ];

  function indicators() {
    return root.AirportIndicators || null;
  }

  function distanceKm(from, to) {
    const nav = indicators();
    if (nav && typeof nav.distanceKm === 'function') return nav.distanceKm(from, to);
    const deg = Math.PI / 180;
    const lat1 = from.lat * deg;
    const lat2 = to.lat * deg;
    const dLat = lat2 - lat1;
    const dLon = (to.lon - from.lon) * deg;
    const half = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(half)));
  }

  function bearingDeg(from, to) {
    const nav = indicators();
    if (nav && typeof nav.bearingDeg === 'function') return nav.bearingDeg(from, to);
    const deg = Math.PI / 180;
    const lat1 = from.lat * deg;
    const lat2 = to.lat * deg;
    const dLon = (to.lon - from.lon) * deg;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) / deg + 360) % 360;
  }

  function languageOf(value) {
    const language = String(value || 'ko').toLowerCase().replace(/[^a-z-]/g, '');
    return language || 'ko';
  }

  function localLandmarks() {
    const list = BUNDLED_LANDMARKS.slice();
    const nav = indicators();
    if (nav && Array.isArray(nav.airports)) {
      for (const airport of nav.airports) {
        if (!airport || !Number.isFinite(airport.lat) || !Number.isFinite(airport.lon)) continue;
        list.push({
          id: airport.icao,
          title: airport.name,
          lat: airport.lat,
          lon: airport.lon,
          extract: `${airport.iata || ''} ${airport.icao} · ${airport.name}`,
          source: 'local'
        });
      }
    }
    return list;
  }

  function nearbyFrom(list, from, radiusM, limit, allowNearest) {
    const measured = list
      .filter(item => item && Number.isFinite(item.lat) && Number.isFinite(item.lon))
      .map(item => Object.assign({}, item, {
        distanceKm: distanceKm(from, item),
        bearingDeg: bearingDeg(from, item)
      }));
    let selected = measured.filter(item => item.distanceKm * 1000 <= radiusM);
    if (!selected.length && allowNearest) {
      selected = measured.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
    }
    return selected.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
  }

  function normalizePage(page, language) {
    if (!page || typeof page !== 'object') return null;
    const coordinates = Array.isArray(page.coordinates) ? page.coordinates : [];
    const point = coordinates.find(coord => coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lon));
    const pageid = String(page.pageid || '');
    if (!point || !/^\d+$/.test(pageid)) return null;
    const extract = typeof page.extract === 'string'
      ? page.extract.replace(/\s+/g, ' ').trim().slice(0, 180)
      : '';
    return {
      id: pageid,
      title: String(page.title || `Wikipedia ${pageid}`),
      lat: point.lat,
      lon: point.lon,
      extract,
      thumbnail: page.thumbnail && typeof page.thumbnail.source === 'string' ? page.thumbnail.source : null,
      url: `https://${language}.wikipedia.org/?curid=${pageid}`,
      source: 'online',
      language
    };
  }

  function apiUrl(from, radiusM, limit, language) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'geosearch',
      ggscoord: `${from.lat}|${from.lon}`,
      ggsradius: String(Math.max(100, Math.min(10000, Math.round(radiusM)))),
      ggslimit: String(Math.max(12, Math.min(30, limit * 3))),
      prop: 'extracts|coordinates|pageimages',
      exintro: '1',
      explaintext: '1',
      exchars: '200',
      piprop: 'thumbnail',
      pithumbsize: '64'
    });
    return `https://${language}.wikipedia.org/w/api.php?${params.toString()}`;
  }

  async function fetchOnline(from, radiusM, limit, language) {
    if (typeof root.fetch !== 'function') throw new Error('fetch is unavailable');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
    try {
      const response = await root.fetch(apiUrl(from, radiusM, limit, language), {
        mode: 'cors',
        credentials: 'omit',
        signal: controller ? controller.signal : undefined
      });
      if (!response || !response.ok) {
        throw new Error(`Wikipedia API returned ${response ? response.status : 'no response'}`);
      }
      const payload = await response.json();
      const pages = payload && payload.query && payload.query.pages;
      const list = Array.isArray(pages) ? pages : Object.values(pages || {});
      const items = list.map(page => normalizePage(page, language)).filter(Boolean);
      return nearbyFrom(items, from, radiusM, limit, false);
    } finally {
      clearTimeout(timer);
    }
  }

  function cacheKey(from, radiusM, language) {
    return `${language}:${Math.floor(from.lat / CELL_DEG)}:${Math.floor(from.lon / CELL_DEG)}:${Math.round(radiusM)}`;
  }

  /** Resolve nearby landmarks; cached results first, network second, bundled list last. */
  function load(options) {
    const opts = Object.assign({
      lat: root.GEO_ANCHOR ? root.GEO_ANCHOR.lat : 0,
      lon: root.GEO_ANCHOR ? root.GEO_ANCHOR.lon : 0,
      radiusM: DEFAULT_RADIUS_M,
      limit: DEFAULT_LIMIT,
      language: 'ko',
      force: false
    }, options || {});
    const from = { lat: Number(opts.lat), lon: Number(opts.lon) };
    if (!Number.isFinite(from.lat) || !Number.isFinite(from.lon)) {
      throw new TypeError('NearbyLandmarks.load requires finite lat/lon');
    }
    const radiusM = Math.max(100, Number(opts.radiusM) || DEFAULT_RADIUS_M);
    const limit = Math.max(1, Math.min(12, Number(opts.limit) || DEFAULT_LIMIT));
    const language = languageOf(opts.language);
    const key = cacheKey(from, radiusM, language);
    const cached = cache.get(key);
    if (!opts.force && cached && Date.now() - cached.at < (cached.source === 'online' ? CACHE_TTL_MS : LOCAL_TTL_MS)) {
      return Promise.resolve({ items: cached.items.slice(0, limit), source: cached.source, at: cached.at });
    }
    if (inflight.has(key)) return inflight.get(key);

    const fallback = () => nearbyFrom(localLandmarks(), from, radiusM, limit, true);
    const task = (async () => {
      try {
        let items = await fetchOnline(from, radiusM, limit, language);
        if (!items.length && language !== 'en') items = await fetchOnline(from, radiusM, limit, 'en');
        if (items.length) {
          cache.set(key, { at: Date.now(), source: 'online', items });
          return { items, source: 'online' };
        }
        const local = fallback();
        cache.set(key, { at: Date.now(), source: 'local', items: local });
        return { items: local, source: 'local' };
      } catch (error) {
        const local = fallback();
        cache.set(key, { at: Date.now(), source: 'local', items: local });
        return { items: local, source: 'local', error };
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, task);
    return task;
  }

  const api = {
    DEFAULT_RADIUS_M,
    DEFAULT_LIMIT,
    distanceKm,
    bearingDeg,
    localLandmarks,
    load,
    clearCache() {
      cache.clear();
      inflight.clear();
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NearbyLandmarks = api;
})(typeof window !== 'undefined' ? window : globalThis);
