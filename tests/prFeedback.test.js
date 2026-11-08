import test from 'node:test';
import assert from 'node:assert/strict';
import { marker, prepareReview, publishReview, validateReview, formatReview } from '../scripts/pr-feedback.mjs';

const base = 'a'.repeat(40);
const head = 'b'.repeat(40);
const report = { summary: '착륙 상태 및 플랩 물리 검토', findings: [], limitations: ['브라우저 렌더링 확인 필요'] };
const raw = JSON.stringify(report);

function harness({ comments = [], pr = {}, expected = {} } = {}) {
  const calls = [];
  const current = { number: 12, state: 'open', draft: false, base: { sha: base }, head: { sha: head }, ...pr };
  const context = {
    repo: { owner: 'stlim0727', repo: 'hajun-plane-3d' },
    serverUrl: 'https://github.com',
    runId: 42,
    payload: { pull_request: { ...current, ...expected } }
  };
  const github = {
    paginate: async () => comments,
    rest: {
      pulls: { get: async () => ({ data: current }) },
      issues: {
        listComments() {},
        createComment: async args => calls.push(['create', args]),
        updateComment: async args => calls.push(['update', args])
      },
    },
  };
  return { github, context, calls, core: { info() {} }, raw };
}

const botComment = body => ({ id: 7, user: { login: 'github-actions[bot]', type: 'Bot' }, body });
const body = () => formatReview(report, { base, head, serverUrl: 'https://github.com',
  repo: { owner: 'stlim0727', repo: 'hajun-plane-3d' }, runId: 42 });

test('new review posts once; a repeated snapshot skips publishing', async () => {
  const first = harness();
  assert.deepEqual(await prepareReview(first), { number: 12, base, head });
  await publishReview(first);
  assert.equal(first.calls.length, 1);
  assert.equal(first.calls[0][0], 'create');
  assert.match(first.calls[0][1].body, /정적 코드 검토/);

  const repeated = harness({ comments: [botComment(first.calls[0][1].body)] });
  assert.equal(await prepareReview(repeated), null);
  await publishReview(repeated);
  assert.equal(repeated.calls.length, 0);
});

test('next head updates the bot comment; user marker spoofing is not edited', async () => {
  const userComment = { ...botComment(body()), id: 8, user: { login: 'human', type: 'User' } };
  const next = harness({
    comments: [botComment(body()), userComment],
    pr: { head: { sha: 'c'.repeat(40) } }
  });
  assert.ok(await prepareReview(next));
  await publishReview(next);
  assert.equal(next.calls[0][0], 'update');
  assert.equal(next.calls[0][1].comment_id, 7);
  assert.match(next.calls[0][1].body, new RegExp('c'.repeat(40)));

  const spoof = harness({ comments: [userComment] });
  assert.ok(await prepareReview(spoof));
  await publishReview(spoof);
  assert.equal(spoof.calls[0][0], 'create');
});

test('base changes trigger a new review even if head is unchanged', async () => {
  const next = harness({ comments: [botComment(body())], pr: { base: { sha: 'd'.repeat(40) } } });
  assert.ok(await prepareReview(next));
  await publishReview(next);
  assert.equal(next.calls[0][0], 'update');
});

test('stale head/base, closed and draft PRs cannot publish', async () => {
  for (const options of [
    { expected: { head: { sha: 'c'.repeat(40) } } },
    { expected: { base: { sha: 'd'.repeat(40) } } },
    { pr: { state: 'closed' } },
    { pr: { draft: true } },
  ]) {
    const h = harness(options);
    assert.equal(await prepareReview(h), null);
    await publishReview(h);
    assert.equal(h.calls.length, 0);
  }
});

test('malformed, empty and incomplete model outputs fail closed', async () => {
  for (const value of [
    '',
    'null',
    '{}',
    'not JSON',
    JSON.stringify({ ...report, summary: ' ' }),
    JSON.stringify({ ...report, limitations: [] }),
    JSON.stringify({ ...report, findings: [{}] })
  ]) {
    assert.throws(() => validateReview(value));
    const h = harness();
    await assert.rejects(publishReview({ ...h, raw: value }));
    assert.equal(h.calls.length, 0);
  }
});

test('findings require safe paths and valid lines, render head permalinks and neutralize mentions/HTML', () => {
  const finding = {
    priority: 'P2',
    path: 'web/js/physics.js',
    line: 45,
    title: '@someone <test>',
    body: '역추력 상태에서 힘 방향 확인'
  };
  const value = { ...report, findings: [finding] };
  assert.deepEqual(validateReview(JSON.stringify(value)), value);
  const rendered = formatReview(value, {
    base,
    head,
    serverUrl: 'https://github.com',
    repo: { owner: 'stlim0727', repo: 'hajun-plane-3d' },
    runId: 42
  });
  assert.ok(rendered.startsWith(marker));
  assert.ok(rendered.includes(`/blob/${head}/web/js/physics.js#L45`));
  assert.ok(!rendered.includes('@someone'));
  assert.ok(!rendered.includes('<test>'));
});
