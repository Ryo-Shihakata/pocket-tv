// NHK 番組表API（Ver.3）のレスポンスを、画面で使う最小の形にそろえる純粋関数群
// レスポンスの `list` は「サービスIDごとの配列」でも「番組の配列」でも受けられるようにしておく
// （Ver.3 の実レスポンスを実キーで確認するまでは、どちらの形でも壊れないことを優先する）

export const SERVICES = ['g1', 'e1'];
const JST = 9 * 60 * 60 * 1000;

// 日本時間の YYYY-MM-DD（offsetDays 日後）
export function jstDate(now, offsetDays = 0) {
  return new Date(now + JST + offsetDays * 86400000).toISOString().slice(0, 10);
}

function programsOf(body) {
  const list = body && body.list;
  if (Array.isArray(list)) return list;
  if (list && typeof list === 'object') return Object.values(list).flat();
  return [];
}

export function normalize(body, service) {
  return programsOf(body)
    .filter((p) => p && p.start_time && p.end_time && (!p.service || !p.service.id || p.service.id === service))
    .map((p) => ({
      start: Date.parse(p.start_time),
      end: Date.parse(p.end_time),
      title: String(p.title || ''),
      subtitle: String(p.subtitle || ''),
    }))
    .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start);
}

// 日付をまたいだ複数日分を、重複を除いて時刻順につなぐ
export function mergeDays(days) {
  const seen = new Set();
  const out = [];
  for (const p of days.flat()) {
    const k = `${p.start}|${p.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.sort((a, b) => a.start - b.start);
}
