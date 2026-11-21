#!/usr/bin/env node
/**
 * 「오늘 농업현황」(today/) 자료 모으기 — data/dashboard.json 을 만든다  (Node 18+ / 외부 패키지 없음)
 *
 *   DATA_GO_KR_KEY=공공데이터포털_일반인증키 node scripts/update-dashboard.mjs
 *
 * 지역 = 전국 농업기상 관측소(국립농업과학원, 약 200곳)가 있는 시·군 전부 (2026-11-21 전국 확대).
 *   관측소 목록을 매번 받아 시·군별로 묶고, 그 좌표로 예보·서리를 부르고, 그 관측소의 어제 관측값을 쓴다.
 *
 * 공공데이터포털 (계정 하나 = 인증키 하나)
 *   기상청 단기예보 · 중기예보 · 기상특보 · 서리발생 가능성
 *   국립농업과학원 농업기상 관측지점 · 기본 관측데이터
 *   한국농어촌공사 농촌용수 저수지 수위
 *   aT 일별 도·소매 가격정보
 * 병해충은 농촌진흥청 「병해충 발생정보」(월 1회)를 data/pest-month.json 에 옮겨 적는다(예약 작업).
 *
 * 한 칸이 실패해도 그 칸만 지난 값을 그대로 두고 나머지는 갱신한다.
 * 인증키를 이 파일에 적지 마세요. 저장소가 공개되어 있습니다.
 */

import { writeFile, readFile } from 'node:fs/promises';

const KEY = (process.env.DATA_GO_KR_KEY || '').trim();
const OUT = 'data/dashboard.json';
const POOL = 4; // 동시에 처리할 지역 수

// ── 시도 이름 정리 ──
function provShort(p) {
  if (/^경기/.test(p)) return '경기';
  if (/^강원/.test(p)) return '강원';
  if (/^충청북|^충북/.test(p)) return '충북';
  if (/^충청남|^충남/.test(p)) return '충남';
  if (/^전라북|^전북/.test(p)) return '전북';
  if (/^전라남|^전남/.test(p)) return '전남';
  if (/^경상북|^경북/.test(p)) return '경북';
  if (/^경상남|^경남/.test(p)) return '경남';
  if (/^제주/.test(p)) return '제주';
  if (/^세종/.test(p)) return '세종';
  return p.replace(/(특별자치시|특별시|광역시)$/, '');
}
const PROV_ORDER = ['경기', '강원', '충북', '충남', '세종', '전북', '전남', '경북', '경남', '제주', '서울', '인천', '대전', '광주', '대구', '울산', '부산'];
// 특보 문장 속 시도 이름(바뀐 이름·줄임말까지)
function provAliases(s) {
  return { 경기: ['경기'], 강원: ['강원'], 충북: ['충청북', '충북'], 충남: ['충청남', '충남'], 전북: ['전라북', '전북'], 전남: ['전라남', '전남'],
    경북: ['경상북', '경북'], 경남: ['경상남', '경남'], 제주: ['제주'], 세종: ['세종'] }[s] || [s];
}
// 중기예보 육상(land) 구역
const YEONGDONG = ['강릉', '동해', '삼척', '속초', '고성', '양양', '태백'];
function landOf(ps, city) {
  if (ps === '강원') return YEONGDONG.some((n) => city.startsWith(n)) ? '11D20000' : '11D10000';
  return { 경기: '11B00000', 서울: '11B00000', 인천: '11B00000', 충북: '11C10000', 충남: '11C20000', 대전: '11C20000', 세종: '11C20000',
    전북: '11F10000', 전남: '11F20000', 광주: '11F20000', 경북: '11H10000', 대구: '11H10000', 경남: '11H20000', 부산: '11H20000', 울산: '11H20000', 제주: '11G00000' }[ps] || null;
}
// 중기예보 기온(ta) 지점 — 2026-11-21 하나씩 불러 확인한 코드. 지역마다 같은 육상 구역 안에서 가장 가까운 지점을 쓴다
const TA = [
  ['이천', '11B20701'], ['수원', '11B20601'], ['서울', '11B10101'], ['인천', '11B20201'],
  ['춘천', '11D10301'], ['원주', '11D10401'], ['평창', '11D20201'], ['강릉', '11D20501'],
  ['충주', '11C10101'], ['청주', '11C10301'], ['천안', '11C20301'], ['대전', '11C20401'], ['논산', '11C20602'], ['부여', '11C20502'], ['보령', '11C20201'],
  ['전주', '11F10201'], ['익산', '21F10502'], ['김제', '21F10601'], ['광주', '11F20501'], ['나주', '11F20503'], ['해남', '21F20101'], ['목포', '21F20801'], ['순천', '11F20603'],
  ['안동', '11H10501'], ['상주', '11H10302'], ['청송', '11H10503'], ['대구', '11H10701'], ['포항', '11H10201'], ['성주', '11H10704'],
  ['진주', '11H20701'], ['밀양', '11H20601'], ['창원', '11H20301'], ['제주', '11G00201'], ['서귀포', '11G00401'],
];

// ── 시세 (서울 중도매) ──
const PRICES = [
  { label: '쌀',           ctgry: '100', item: '111', vrty: '01' },
  { label: '감자 (수미)',  ctgry: '100', item: '152', vrty: '01' },
  { label: '배추',         ctgry: '200', item: '211' },
  { label: '무',           ctgry: '200', item: '231' },
  { label: '양파',         ctgry: '200', item: '245', vrty: '00' },
  { label: '깐마늘 (대서)',ctgry: '200', item: '258', vrty: '03' },
  { label: '대파',         ctgry: '200', item: '246', vrty: '00' },
  { label: '토마토',       ctgry: '200', item: '225', vrty: '00' },
  { label: '오이 (다다기)',ctgry: '200', item: '223', vrty: '02' },
  { label: '딸기 (설향)',  ctgry: '200', item: '226', vrty: '00' },
  { label: '청양고추',     ctgry: '200', item: '242', vrty: '03' },
  { label: '사과 (후지)',  ctgry: '400', item: '411', vrty: '05' },
  { label: '배 (신고)',    ctgry: '400', item: '412', vrty: '01' },
];

// ── 시간 (한국 시간) ──
const KST = 9 * 3600e3;
const now = new Date();
const k = (d) => new Date(d.getTime() + KST);
const ymd = (d) => k(d).toISOString().slice(0, 10).replace(/-/g, '');
const dash = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
const addDays = (s, n) => { const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8) + n)); return d.toISOString().slice(0, 10).replace(/-/g, ''); };
const today = ymd(now);
const hourK = k(now).getUTCHours();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null; };
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

async function get(url, { json = true } = {}) {
  const sep = url.includes('?') ? '&' : '?';
  let last;
  for (let t = 0; t < 2; t++) { // 일시 오류는 한 번 더
    try {
      const res = await fetch(url + sep + 'serviceKey=' + encodeURIComponent(KEY), { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
      if (!json) return text;
      try { return JSON.parse(text); } catch { throw new Error('JSON 아님: ' + text.replace(/\s+/g, ' ').slice(0, 160)); }
    } catch (e) { last = e; await sleep(800); }
  }
  throw last;
}
const items = (j) => { const it = j?.response?.body?.items?.item; return Array.isArray(it) ? it : it ? [it] : []; };
function xmlItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const o = {}; for (const t of m[1].matchAll(/<([A-Za-z_]+)>([^<]*)<\/\1>/g)) o[t[1]] = t[2].trim(); return o;
  });
}
const dist2 = (a, b) => (a.lat - b.lat) ** 2 + ((a.lon - b.lon) * Math.cos(a.lat * Math.PI / 180)) ** 2;

// ── 기상청 격자 (람베르트 정각원추) ──
function toGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30, SLAT2 = 60, OLON = 126, OLAT = 38, XO = 43, YO = 136, D = Math.PI / 180;
  const re = RE / GRID, s1 = SLAT1 * D, s2 = SLAT2 * D, olon = OLON * D, olat = OLAT * D;
  let sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(Math.tan(Math.PI * 0.25 + s2 * 0.5) / Math.tan(Math.PI * 0.25 + s1 * 0.5));
  let sf = Math.pow(Math.tan(Math.PI * 0.25 + s1 * 0.5), sn) * Math.cos(s1) / sn;
  let ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);
  let ra = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * D * 0.5), sn);
  let th = lon * D - olon; if (th > Math.PI) th -= 2 * Math.PI; if (th < -Math.PI) th += 2 * Math.PI; th *= sn;
  return { nx: Math.floor(ra * Math.sin(th) + XO + 0.5), ny: Math.floor(ro - ra * Math.cos(th) + YO + 0.5) };
}

// ── 지역 목록: 농업기상 관측소를 시·군별로 묶는다 ──
async function buildRegions() {
  let all = [];
  for (let p = 1; p <= 5; p++) {
    const xs = xmlItems(await get(`https://apis.data.go.kr/1390802/AgriWeather/getObsrSpotList?Page_Size=100&Page_No=${p}`, { json: false }));
    all = all.concat(xs); if (xs.length < 100) break; await sleep(150);
  }
  const groups = {};
  for (const s of all) {
    const lat = num(s.Instl_La), lon = num(s.Instl_Lo);
    const a = (s.Instl_Adres || '').replace(/\s+/g, ' ').trim().split(' ');
    if (!lat || !lon || a.length < 2) continue;
    const prov = a[0];
    const metro = /(특별시|광역시|특별자치시)$/.test(prov);
    const city = metro ? prov : a[1];
    if (!metro && !/(시|군)$/.test(city)) continue;
    const ps = provShort(prov);
    const name = `${ps} · ${metro ? ps + '시' : city}`;
    (groups[name] ||= { name, prov, ps, city, stations: [] }).stations.push({ code: s.Obsr_Spot_Code, nm: s.Obsr_Spot_Nm, lat, lon });
  }
  const regions = Object.values(groups).map((g) => {
    const lat = g.stations.reduce((x, s) => x + s.lat, 0) / g.stations.length;
    const lon = g.stations.reduce((x, s) => x + s.lon, 0) / g.stations.length;
    const stem = g.city.replace(/(특별자치시|특별시|광역시|시|군)$/, '');
    return { ...g, lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000, stem, land: landOf(g.ps, g.city) };
  }).filter((r) => r.land);
  // 기온 지점: 이름이 같은 지역의 좌표 → 같은 육상 구역 안에서 가장 가까운 지점
  const taPts = TA.map(([n, code]) => { const r = regions.find((x) => x.stem === n); return r ? { n, code, lat: r.lat, lon: r.lon, land: r.land } : null; }).filter(Boolean);
  for (const r of regions) {
    const pool = taPts.filter((t) => t.land === r.land);
    const pick = (pool.length ? pool : taPts).slice().sort((a, b) => dist2(r, a) - dist2(r, b))[0];
    r.ta = pick ? pick.code : null; r.taName = pick ? pick.n : null;
  }
  regions.sort((a, b) => (PROV_ORDER.indexOf(a.ps) - PROV_ORDER.indexOf(b.ps)) || a.city.localeCompare(b.city, 'ko'));
  return regions;
}

const SKY = { 1: '맑음', 3: '구름많음', 4: '흐림' };
const PTY = { 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' };

// ── 단기예보: 오늘~3일 ──
async function shortFcst(r) {
  const { nx, ny } = toGrid(r.lat, r.lon);
  const base = hourK >= 6 ? today : addDays(today, -1);
  const baseTime = hourK >= 6 ? '0500' : '2300';
  const j = await get(`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1500&dataType=JSON&base_date=${base}&base_time=${baseTime}&nx=${nx}&ny=${ny}`);
  const rows = items(j);
  if (!rows.length) throw new Error('단기예보 0건');
  const by = {};
  for (const x of rows) { (by[x.fcstDate] ||= []).push(x); }
  const days = {};
  for (const [d, xs] of Object.entries(by)) {
    const nT = xs.filter((x) => x.category === 'TMP').length;
    // 마지막 날은 아침 몇 시간치만 오는 일이 있다: 6시간치 미만이면 버리고, 낮 시간이 없으면 최고기온은 비워 둔다
    if (nT < 6) continue;
    const v = (cat) => xs.filter((x) => x.category === cat).map((x) => num(x.fcstValue)).filter((n) => n != null);
    const tmp = v('TMP'), pop = v('POP'), wsd = v('WSD'), reh = v('REH');
    const tmx = v('TMX')[0] ?? (nT >= 12 && tmp.length ? Math.max(...tmp) : null);
    const tmn = v('TMN')[0] ?? (tmp.length ? Math.min(...tmp) : null);
    const noon = xs.filter((x) => x.fcstTime === '1200');
    const sky = SKY[num(noon.find((x) => x.category === 'SKY')?.fcstValue)] || '';
    const pty = PTY[num(noon.find((x) => x.category === 'PTY')?.fcstValue)] || '';
    days[d] = { d, hi: tmx != null ? Math.round(tmx) : null, lo: tmn != null ? Math.round(tmn) : null,
      pop: pop.length ? Math.max(...pop) : null, wf: pty || sky,
      wind: wsd.length ? round1(wsd.reduce((a, b) => a + b, 0) / wsd.length) : null,
      hum: reh.length ? Math.round(reh.reduce((a, b) => a + b, 0) / reh.length) : null,
      _tmp: xs.filter((x) => x.category === 'TMP').map((x) => [x.fcstTime, num(x.fcstValue)]) };
  }
  const t0 = days[today]?._tmp || [];
  const hh = String(Math.max(0, Math.min(23, hourK))).padStart(2, '0') + '00';
  const cur = t0.find(([t]) => t >= hh) || t0[t0.length - 1];
  Object.values(days).forEach((x) => delete x._tmp);
  return { now: cur ? cur[1] : null, days };
}

// ── 중기예보: 4~10일 (구역별로 한 번만 부른다) ──
const midCache = {};
function midFcst(r) {
  const tmDay = hourK >= 7 ? today : addDays(today, -1);
  const tmFc = tmDay + (hourK >= 7 ? '0600' : '1800');
  const keyL = 'L' + r.land, keyT = 'T' + r.ta;
  midCache[keyL] ||= get(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst?pageNo=1&numOfRows=5&dataType=JSON&regId=${r.land}&tmFc=${tmFc}`).then((j) => items(j)[0]);
  midCache[keyT] ||= get(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa?pageNo=1&numOfRows=5&dataType=JSON&regId=${r.ta}&tmFc=${tmFc}`).then((j) => items(j)[0]);
  return Promise.all([midCache[keyL], midCache[keyT]]).then(([land, ta]) => {
    if (!land || !ta) throw new Error('중기예보 0건');
    const out = {};
    for (let n = 4; n <= 10; n++) {
      const d = addDays(tmDay, n);
      const pop = n <= 7 ? Math.max(num(land[`rnSt${n}Am`]) ?? 0, num(land[`rnSt${n}Pm`]) ?? 0) : num(land[`rnSt${n}`]);
      const wf = n <= 7 ? (land[`wf${n}Pm`] || land[`wf${n}Am`] || '') : (land[`wf${n}`] || '');
      out[d] = { d, hi: num(ta[`taMax${n}`]), lo: num(ta[`taMin${n}`]), pop, wf };
    }
    return out;
  });
}

// ── 서리 가능성 (1~3일 뒤) ──
async function frost(r) {
  const base = hourK >= 6 ? today : addDays(today, -1);
  const j = await get(`https://apis.data.go.kr/1360000/FrstFcstInfoServiceV2/getFrstOcurFcstV2?pageNo=1&numOfRows=5&dataType=JSON&BASE_DATE=${base}&BASE_TIME=0500&LAT=${r.lat}&LON=${r.lon}&VAR=frost_occurrence_rate`);
  return items(j).map((x) => ({ d: x.FCST_DATE, v: num(x.VALUE) })).filter((x) => x.v != null);
}

// ── 기상특보 (전국 특보현황 1번 → 지역별로 나눔) ──
async function warnAll() {
  const it = items(await get('https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus?pageNo=1&numOfRows=10&dataType=JSON'))[0];
  if (!it) throw new Error('특보현황 0건');
  const parse = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.replace(/^o\s*/, '').trim())
    .filter((l) => l && l !== '없음' && l.includes(':'))
    .map((l) => { const i = l.indexOf(':'); return { name: l.slice(0, i).trim(), area: l.slice(i + 1).trim() }; });
  return { tm: String(it.tmFc), now: parse(it.t6), pre: parse(it.t7) };
}
function warnFor(r, w) {
  const al = provAliases(r.ps);
  const keys = [r.stem, ...(r.ps === '제주' && r.stem === '서귀포' ? ['제주도남부'] : []), ...(r.ps === '제주' && r.stem === '제주' ? ['제주도북부'] : [])];
  const hit = (area) => {
    for (const m of area.matchAll(/([가-힣]+?)(?:\(([^)]*)\))?(?:,\s*|$)/g)) {
      const prov = m[1], inner = m[2];
      if (!prov || prov.includes('바다')) continue;                 // 바다 구역은 육지 지역에 붙이지 않는다
      if (!al.some((a) => prov.startsWith(a))) continue;
      if (!inner) return true;                                       // 시도 전체
      if (inner.split(/,\s*/).some((s) => keys.some((n) => s.trim().startsWith(n)))) return true;
    }
    return false;
  };
  const land = (x) => !/풍랑|해일/.test(x.name);
  return { now: w.now.filter((x) => land(x) && hit(x.area)).map((x) => x.name), pre: w.pre.filter((x) => land(x) && hit(x.area)).map((x) => x.name), tm: w.tm };
}

// ── 농업기상 관측 (그 시·군 관측소, 어제) ──
async function agriObs(r) {
  const from = dash(addDays(today, -3)), to = dash(addDays(today, -1));
  for (const s of r.stations.slice(0, 3)) {
    const xs = xmlItems(await get(`https://apis.data.go.kr/1390802/AgriWeather/WeatherObsrInfo/V3/GnrlWeather/getWeatherTermDayList3?Page_No=1&Page_Size=5&begin_Date=${from}&end_Date=${to}&obsr_Spot_Cd=${s.code}`, { json: false }));
    const last = xs.filter((x) => num(x.temp) != null).pop();
    if (last) {
      return { stn: s.nm, date: last.date, ground: num(last.gr_Temp), solar: num(last.srqty), dewH: last.condens_Time ? round1(num(last.condens_Time) / 60) : null,
        soil: num(last.soil_Wt), hum: num(last.hum), rain: num(last.rn), tmin: num(last.lowst_Artmp), tmax: num(last.hghst_Artmp) };
    }
  }
  throw new Error('관측소 자료 없음');
}

// ── 저수율 (시·군 저수지 최대 5곳 평균, 작년 같은 때와 비교) ──
async function reservoir(r) {
  const codes = xmlItems(await get(`https://apis.data.go.kr/B552149/reserviorWaterLevel/reservoircode/?pageNo=1&numOfRows=200&county=${encodeURIComponent(r.city)}`, { json: false }))
    .filter((x) => (x.county || '').includes(r.city)).slice(0, 5);
  if (!codes.length) return null; // 농어촌공사 관리 저수지 없음
  const last = async (code, s, e) => {
    const xs = xmlItems(await get(`https://apis.data.go.kr/B552149/reserviorWaterLevel/reservoirlevel/?pageNo=1&numOfRows=10&fac_code=${code}&date_s=${s}&date_e=${e}`, { json: false }));
    const v = xs.filter((x) => num(x.rate) != null).pop(); return v ? num(v.rate) : null;
  };
  const lyEnd = String(+today.slice(0, 4) - 1) + today.slice(4);
  const nowR = [], lyR = [];
  for (const c of codes) {
    const a = await last(c.fac_code, addDays(today, -4), today);
    if (a == null) continue;
    nowR.push(a);
    const b = await last(c.fac_code, addDays(lyEnd, -4), lyEnd);
    if (b != null) lyR.push(b);
  }
  if (!nowR.length) throw new Error('저수율 자료 없음');
  const avg = (a) => (a.length ? round1(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return { rate: avg(nowR), lastYear: lyR.length === nowR.length ? avg(lyR) : null, n: nowR.length };
}

// ── 시세 ──
async function prices() {
  const from = addDays(today, -14);
  const out = [];
  for (const w of PRICES) {
    try {
      const q = [`pageNo=1`, `numOfRows=200`, `returnType=JSON`, `cond[exmn_ymd::GTE]=${from}`, `cond[exmn_ymd::LTE]=${today}`,
        `cond[se_cd::EQ]=02`, `cond[sgg_cd::EQ]=1101`, `cond[ctgry_cd::EQ]=${w.ctgry}`, `cond[item_cd::EQ]=${w.item}`];
      if (w.vrty) q.push(`cond[vrty_cd::EQ]=${w.vrty}`);
      const rows = items(await get('https://apis.data.go.kr/B552845/perDay/price?' + q.join('&')));
      const grades = [...new Set(rows.map((r) => r.grd_nm))];
      const grade = grades.includes('상품') ? '상품' : grades[0];
      const g = rows.filter((r) => r.grd_nm === grade && num(r.exmn_dd_prc)).sort((a, b) => String(b.exmn_ymd).localeCompare(String(a.exmn_ymd)));
      if (!g.length) { console.warn('· 시세 없음: ' + w.label); continue; }
      const same = g.filter((r) => r.vrty_cd === g[0].vrty_cd);
      const days = [...new Set(same.map((r) => r.exmn_ymd))];
      const at = (d) => num(same.find((r) => r.exmn_ymd === d)?.exmn_dd_prc);
      out.push({ name: w.label, unit: `${same[0].unit_sz || ''}${same[0].unit || ''}`, day: same[0].exmn_ymd,
        price: at(days[0]), prev: days[1] ? at(days[1]) : null, week: days[5] ? at(days[5]) : (days.length > 1 ? at(days[days.length - 1]) : null) });
    } catch (e) { console.warn('· 시세 실패: ' + w.label + ' — ' + e.message); }
    await sleep(120);
  }
  return out;
}

async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const x = list[i++]; await fn(x); } }));
}

async function main() {
  if (!KEY) { console.error('인증키가 없습니다. DATA_GO_KR_KEY 를 설정하세요.'); process.exit(1); }
  let old = {}; try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
  const oldR = old.regions || {};
  const fails = [];
  const t0 = Date.now();

  let REGIONS;
  try { REGIONS = await buildRegions(); }
  catch (e) { console.error('관측소 목록 실패: ' + e.message); process.exit(1); }
  console.log(`지역 ${REGIONS.length}곳`);

  let warn = null;
  try { warn = await warnAll(); } catch (e) { fails.push('특보 ' + e.message); }

  const regions = {};
  await pool(REGIONS, POOL, async (r) => {
    const cur = { ...(oldR[r.name] || {}) };
    const tryIt = async (label, fn) => { try { return await fn(); } catch (e) { fails.push(`${r.name} ${label}: ${e.message}`); return undefined; } };
    const sf = await tryIt('단기예보', () => shortFcst(r));
    const mf = r.ta ? await tryIt('중기예보', () => midFcst(r)) : undefined;
    if (sf || mf) {
      const all = { ...(mf || {}), ...(sf ? sf.days : {}) };
      const days = Object.values(all).filter((x) => x.d >= today).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 10);
      if (days.length >= 3) cur.days = days;
      if (sf) { const t = sf.days[today] || {}; cur.weather = { now: sf.now, sky: t.wf || '', hi: t.hi, lo: t.lo, pop: t.pop, wind: t.wind, hum: t.hum }; }
    }
    const fr = await tryIt('서리', () => frost(r)); if (fr) cur.frost = fr;
    if (warn) cur.warn = warnFor(r, warn);
    const ob = await tryIt('농업기상', () => agriObs(r)); if (ob) cur.obs = ob;
    const rs = await tryIt('저수율', () => reservoir(r)); if (rs !== undefined) cur.res = rs;
    cur.ta = r.taName;
    regions[r.name] = cur;
  });

  let pr = [];
  try { pr = await prices(); } catch (e) { fails.push('시세 ' + e.message); }

  // 화면의 도 → 시·군 순서대로
  const ordered = {};
  for (const r of REGIONS) if (regions[r.name]) ordered[r.name] = regions[r.name];

  const json = {
    '_설명': '「오늘 농업현황」(today/) 이 읽는 파일. scripts/update-dashboard.mjs 가 하루 세 번 자동 갱신합니다.',
    '_출처': '기상청 · 농촌진흥청 국립농업과학원 · 한국농어촌공사 · 한국농수산식품유통공사(aT) — 공공데이터포털',
    updated: new Date().toISOString(),
    base: dash(today),
    regions: ordered,
    prices: pr.length >= 5 ? pr : (old.prices || pr),
  };
  await writeFile(OUT, JSON.stringify(json) + '\n', 'utf8');
  if (fails.length) { console.warn(`\n⚠ 실패 ${fails.length}건 (해당 칸은 지난 값 유지)`); fails.slice(0, 80).forEach((f) => console.warn('  - ' + f)); }
  const ok = Object.values(ordered).filter((x) => x.days && x.weather).length;
  console.log(`✓ ${OUT} — 지역 ${ok}/${REGIONS.length}, 시세 ${pr.length}개, ${Math.round((Date.now() - t0) / 1000)}초`);
  if (ok < REGIONS.length / 2) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
