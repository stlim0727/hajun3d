(function(ns) {
  'use strict';

  const UNITS = [
    ['year', 31557600],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];

  const FALLBACK_BUILD_INFO = {
    version: 'unknown',
    branch: 'unknown',
    commit: 'unknown',
    commitDate: 'unknown',
    revision: 'unknown',
    builtAt: 'unknown',
  };

  /**
   * Localized "merged N ago" phrase for a build-time commit date, or null when unavailable.
   */
  function describeCommitAge(commitDate, now = Date.now(), lang = 'ko') {
    const landed = Date.parse(commitDate);
    if (!Number.isFinite(landed)) return null;
    const elapsed = Math.max(0, Math.floor((now - landed) / 1000));
    const match = UNITS.find(([, seconds]) => elapsed >= seconds);
    const [unit, seconds] = match ?? ['second', 1];
    const age = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
      .format(-Math.floor(elapsed / seconds), unit);
    return lang === 'en' ? `Merged ${age}` : `${age} 병합`;
  }

  function renderBuildInfoElement(element, info) {
    const branchEl = element.querySelector('[data-build-branch]');
    if (branchEl) {
      branchEl.textContent = info.branch || 'unknown';
    }

    const commitEl = element.querySelector('[data-build-commit]');
    if (commitEl) {
      commitEl.textContent = info.revision || 'unknown';
      if (/^[a-f0-9]{40}$/.test(info.commit || '')) {
        commitEl.href = `https://github.com/stlim0727/hajun3d/commit/${info.commit}`;
      } else {
        commitEl.removeAttribute('href');
      }
    }

    const ageEl = element.querySelector('[data-build-age]');
    if (ageEl) {
      ageEl.textContent = describeCommitAge(info.commitDate) ?? 'unknown';
    }
  }

  let refreshTimerId = null;

  function initBuildInfo(buildInfo = globalThis.__BUILD_INFO__) {
    if (typeof document === 'undefined') return;
    const info = buildInfo || FALLBACK_BUILD_INFO;
    const updateAll = () => {
      for (const element of document.querySelectorAll('[data-build-info]')) {
        renderBuildInfoElement(element, info);
      }
    };

    updateAll();
    if (refreshTimerId === null && typeof setInterval === 'function') {
      refreshTimerId = setInterval(updateAll, 30000);
    }
  }

  ns.describeCommitAge = describeCommitAge;
  ns.initBuildInfo = initBuildInfo;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initBuildInfo(), { once: true });
    } else {
      initBuildInfo();
    }
  }
})(globalThis.HajunBuildInfo = globalThis.HajunBuildInfo || {});
