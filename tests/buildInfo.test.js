import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/js/build_info_ui.js';
import { collectBuildInfo } from '../scripts/generate-build-info.mjs';

const { describeCommitAge } = globalThis.HajunBuildInfo;

const NOW = Date.parse('2026-10-29T00:00:00Z');
const minutes = 60_000;
const hours = 60 * minutes;
const days = 24 * hours;
const age = (offset, lang = 'ko') => describeCommitAge(new Date(NOW - offset).toISOString(), NOW, lang);

test('Korean commit ages use the largest whole unit', () => {
  assert.equal(age(23 * minutes, 'ko'), '23분 전 병합');
  assert.equal(age(11 * hours, 'ko'), '11시간 전 병합');
  assert.equal(age(4 * days, 'ko'), '4일 전 병합');
});

test('English commit ages use the largest whole unit', () => {
  assert.equal(age(23 * minutes, 'en'), 'Merged 23 minutes ago');
  assert.equal(age(11 * hours, 'en'), 'Merged 11 hours ago');
  assert.equal(age(4 * days, 'en'), 'Merged 4 days ago');
  assert.equal(age(14 * days, 'en'), 'Merged 2 weeks ago');
});

test('sub-minute and future builds stay non-negative instead of counting backwards', () => {
  assert.equal(age(40_000, 'en'), 'Merged 40 seconds ago');
  assert.equal(age(-5 * minutes, 'en'), 'Merged now');
  assert.equal(age(0, 'en'), 'Merged now');
});

test('missing or unparsable commit dates produce no age claim', () => {
  for (const value of ['unknown', '', undefined, null, 'not-a-date']) {
    assert.equal(describeCommitAge(value, NOW), null, String(value));
  }
});

test('collectBuildInfo returns git metadata with 12-char revision', () => {
  const info = collectBuildInfo();
  assert.ok(info.version);
  assert.ok(info.branch && info.branch !== 'unknown');
  assert.match(info.commit, /^[a-f0-9]{40}$/);
  assert.equal(info.revision, info.commit.slice(0, 12));
  assert.ok(Number.isFinite(Date.parse(info.commitDate)));
  assert.ok(Number.isFinite(Date.parse(info.builtAt)));
});
