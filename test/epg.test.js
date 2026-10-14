import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jstDate, normalize, mergeDays } from '../src/epg.js';

const prog = (sid, start, end, title) => ({
  id: 'x', event_id: 'y', start_time: start, end_time: end,
  area: { id: '400', name: '福岡' }, service: { id: sid, name: sid },
  title, subtitle: `${title}の内容`, genres: [],
});

test('jstDate は日本時間で日付を切り替える', () => {
  const t = Date.parse('2026-10-13T14:59:00Z'); // JST 23:59
  assert.equal(jstDate(t), '2026-10-13');
  assert.equal(jstDate(t + 60000), '2026-10-14'); // JST 0:00
  assert.equal(jstDate(t, 1), '2026-10-14');
});

test('list がサービスIDごとのオブジェクトでも読める', () => {
  const body = { list: { g1: [prog('g1', '2026-10-13T19:00:00+09:00', '2026-10-13T19:30:00+09:00', 'ニュース7')] } };
  const out = normalize(body, 'g1');
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'ニュース7');
  assert.equal(out[0].start, Date.parse('2026-10-13T10:00:00Z'));
});

test('list が配列でも読め、別サービスの番組は除く', () => {
  const body = { list: [
    prog('g1', '2026-10-13T19:00:00+09:00', '2026-10-13T19:30:00+09:00', '総合'),
    prog('e1', '2026-10-13T19:00:00+09:00', '2026-10-13T19:30:00+09:00', 'Eテレ'),
  ] };
  assert.deepEqual(normalize(body, 'e1').map((p) => p.title), ['Eテレ']);
});

test('壊れた番組・空のレスポンスは捨てる', () => {
  assert.deepEqual(normalize({}, 'g1'), []);
  assert.deepEqual(normalize({ list: null }, 'g1'), []);
  const body = { list: [prog('g1', 'bad', '2026-10-13T19:30:00+09:00', 'x'), prog('g1', '2026-10-13T19:30:00+09:00', '2026-10-13T19:00:00+09:00', 'y')] };
  assert.deepEqual(normalize(body, 'g1'), []);
});

test('mergeDays は日をまたぐ重複を除いて時刻順に並べる', () => {
  const a = { start: 2, end: 3, title: 'B', subtitle: '' };
  const b = { start: 1, end: 2, title: 'A', subtitle: '' };
  assert.deepEqual(mergeDays([[a], [b, { ...a }]]).map((p) => p.title), ['A', 'B']);
});
