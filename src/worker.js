// /api/epg だけを持つ Worker。それ以外は静的アセット（public/）が返す
// NHK 番組表API は 1日300回まで。KV に (サービス, 日付) ごとに TTL 付きで置き、
// 見る人が何人いても NHK を叩く回数は「TTL ごとに 2サービス × 2日分」に収まるようにする
import { SERVICES, jstDate, normalize, mergeDays } from './epg.js';

const AREA = '400'; // 福岡
const TTL = 2 * 60 * 60; // 秒。データ更新は毎朝5時頃なので2時間で十分
const FAIL_TTL = 10 * 60; // 秒
const API = 'https://program-api.nhk.jp/v3/papiPgDateTv'; // 動作確認ではモックへ NHK_API_URL で差し替える

async function day(env, service, date) {
  const key = `pg:${AREA}:${service}:${date}`;
  const hit = await env.EPG.get(key, 'json');
  if (hit) return hit;
  // 失敗直後は叩き直さない（上限超過の 403 にリロードのたびに追い打ちをかけないため）
  const failed = await env.EPG.get(`fail:${key}`);
  if (failed) throw new Error(failed);
  const url = `${env.NHK_API_URL || API}?service=${service}&area=${AREA}&date=${date}&key=${encodeURIComponent(env.NHK_API_KEY)}`;
  let res;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' } });
  } catch {
    res = { ok: false, status: 'network' }; // 例外文にURL（=APIキー）が混ざらないよう、中身は捨てる
  }
  if (!res.ok) {
    const msg = `NHK API ${res.status}`;
    await env.EPG.put(`fail:${key}`, msg, { expirationTtl: FAIL_TTL });
    throw new Error(msg);
  }
  const programs = normalize(await res.json(), service);
  await env.EPG.put(key, JSON.stringify(programs), { expirationTtl: TTL });
  return programs;
}

async function epg(env) {
  if (!env.NHK_API_KEY) return json({ configured: false });
  const now = Date.now();
  const dates = [jstDate(now), jstDate(now, 1)];
  const services = {};
  const errors = [];
  await Promise.all(
    SERVICES.map(async (s) => {
      try {
        services[s] = mergeDays(await Promise.all(dates.map((d) => day(env, s, d))));
      } catch (e) {
        services[s] = [];
        errors.push(`${s}: ${e.message}`);
      }
    })
  );
  // ブラウザ側は数分だけ使い回す（番組の切り替わりは画面側の時計で判定する）
  return json({ configured: true, services, errors, fetchedAt: now }, 300);
}

function json(data, maxAge = 0) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAge ? `private, max-age=${maxAge}` : 'no-store',
    },
  });
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/epg') {
      if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      return epg(env);
    }
    return env.ASSETS.fetch(req);
  },
};
