// 局カードを描き、NHK だけは /api/epg の番組表で「いま」と「次」を出す
// 番組名などの外部データは必ず textContent で入れる（innerHTML は使わない）

const NHK = [
  { id: 'g1', name: 'NHK総合', aff: '福岡', url: 'https://www.web.nhk/tv/g1', hue: 210 },
  { id: 'e1', name: 'NHK Eテレ', aff: '', url: 'https://www.web.nhk/tv/e1', hue: 150 },
];
// TVer は在京キー局の放送。福岡での系列局名を添えて、どの局の番組か分かるようにする
const TVER = [
  { id: 'ntv', name: '日本テレビ', aff: 'FBS系列' , hue: 30 },
  { id: 'ex', name: 'テレビ朝日', aff: 'KBC系列', hue: 350 },
  { id: 'tbs', name: 'TBS', aff: 'RKB系列', hue: 230 },
  { id: 'tx', name: 'テレビ東京', aff: 'TVQ系列', hue: 270 },
  { id: 'cx', name: 'フジテレビ', aff: 'TNC系列', hue: 100 },
].map((c) => ({ ...c, url: `https://tver.jp/live/${c.id}` }));

const REFETCH_MS = 10 * 60 * 1000;
const $ = (s, el = document) => el.querySelector(s);
const tpl = $('#tpl-card');
const hm = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
const t = (ms) => hm.format(ms);

let epg = null; // { configured, services: { g1: [...], e1: [...] }, fetchedAt }
let lastFetch = 0;
const cards = new Map();

function makeCard(ch, root) {
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.style.setProperty('--hue', ch.hue);
  $('.ch', el).textContent = ch.name;
  $('.aff', el).textContent = ch.aff;
  const a = $('.watch', el);
  a.href = ch.url;
  a.setAttribute('aria-label', `${ch.name}を見る`);
  const now = $('.now', el);
  const sched = $('.sched', el);
  now.addEventListener('click', () => {
    const open = sched.hidden;
    sched.hidden = !open;
    now.setAttribute('aria-expanded', String(open));
  });
  root.append(el);
  cards.set(ch.id, el);
  return el;
}

function renderNhk(id) {
  const el = cards.get(id);
  const list = epg?.services?.[id] || [];
  const nowMs = Date.now();
  const i = list.findIndex((p) => p.start <= nowMs && nowMs < p.end);
  const cur = list[i];
  const nxt = i >= 0 ? list[i + 1] : list.find((p) => p.start > nowMs);

  $('.now-time', el).textContent = cur ? `${t(cur.start)}–${t(cur.end)}` : '';
  $('.now-title', el).textContent = cur ? cur.title : epg ? (epg.configured ? '番組情報なし' : '番組表は未設定') : '読み込み中…';
  $('.now-sub', el).textContent = cur ? cur.subtitle : '';
  $('.bar i', el).style.setProperty('--p', cur ? Math.min(1, (nowMs - cur.start) / (cur.end - cur.start)) : 0);
  $('.bar', el).hidden = !cur;
  $('.next', el).textContent = nxt ? `次 ${t(nxt.start)}  ${nxt.title}` : '';

  // 今日の残り（いまの番組から最大12本）
  const sched = $('.sched', el);
  const rest = list.slice(Math.max(0, i), Math.max(0, i) + 12).filter((p) => p.end > nowMs);
  sched.replaceChildren(
    ...rest.map((p) => {
      const li = document.createElement('li');
      if (p === cur) li.className = 'on';
      const tm = document.createElement('time');
      tm.textContent = t(p.start);
      const tt = document.createElement('span');
      tt.textContent = p.title;
      li.append(tm, tt);
      return li;
    })
  );
  $('.now', el).disabled = rest.length === 0;
}

function renderTver(ch) {
  const el = cards.get(ch.id);
  el.classList.add('plain');
  $('.now', el).disabled = true;
}

function renderAll() {
  NHK.forEach((c) => renderNhk(c.id));
  const status = $('#status');
  if (epg && !epg.configured) status.textContent = 'NHK番組表APIのキーが未設定です（wrangler secret put NHK_API_KEY）。';
  else if (epg?.errors?.length) status.textContent = `番組表の取得に一部失敗: ${epg.errors.join(' / ')}`;
  else status.textContent = '';
}

async function load() {
  lastFetch = Date.now();
  try {
    const res = await fetch('/api/epg');
    if (!res.ok) throw new Error(res.status);
    epg = await res.json();
  } catch {
    if (!epg) epg = { configured: true, services: {}, errors: ['通信できませんでした'] };
  }
  renderAll();
}

function tick() {
  $('#clock').textContent = t(Date.now());
  renderAll();
  if (Date.now() - lastFetch > REFETCH_MS) load();
}

NHK.forEach((c) => makeCard(c, $('#nhk')));
TVER.forEach((c) => { makeCard(c, $('#tver')); renderTver(c); });
tick();
load();
setInterval(tick, 30 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
