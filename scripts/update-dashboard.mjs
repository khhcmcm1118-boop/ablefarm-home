#!/usr/bin/env node
/**
 * 「오늘 농업현황」(today/) 자료 모으기 — data/dashboard.json 을 만든다  (Node 18+ / 외부 패키지 없음)
 *
 *   DATA_GO_KR_KEY=공공데이터포털_일반인증키 node scripts/update-dashboard.mjs
 *
 * 공공데이터포털 (계정 하나 = 인증키 하나, 2026-11-21 활용 승인)
 *   기상청 단기예보 · 중기예보 · 기상특보 · 서리발생 가능성
 *   국립농업과학원 농업기상 관측지점 · 기본 관측데이터
 *   한국농어촌공사 농촌용수 저수지 수위
 *   aT 일별 도·소매 가격정보
 * 병해충은 농촌진흥청 「병해충 발생정보」(월 1회) 를 data/pest-month.json 에 사람이 옮겨 적는다.
 *
 * 한 칸이 실패해도 그 칸만 지난 값을 그대로 두고 나머지는 갱신한다.
 * 인증키를 이 파일에 적지 마세요. 저장소가 공개되어 있습니다.
 */

import { writeFile, readFile } from 'node:fs/promises';

const KEY = (process.env.DATA_GO_KR_KEY || '').trim();
const OUT = 'data/dashboard.json';

// ── 지역: 시군청 근처 좌표 · 중기예보 육상(land)·기온(ta) 구역 · 특보 이름 · 저수지 시군 ──
const REGIONS = [
  { name: '경기 · 이천시',   lat: 37.272, lon: 127.435, land: '11B00000', ta: '11B20701', prov: '경기도',   warn: ['이천'],        county: '이천시' },
  { name: '강원 · 춘천시',   lat: 37.881, lon: 127.730, land: '11D10000', ta: '11D10301', prov: '강원도',   warn: ['춘천'],        county: '춘천시' },
  { name: '강원 · 평창군',   lat: 37.370, lon: 128.390, land: '11D10000', ta: '11D20201', prov: '강원도',   warn: ['평창'],        county: '평창군' },
  { name: '충북 · 충주시',   lat: 36.991, lon: 127.926, land: '11C10000', ta: '11C10101', prov: '충청북도', warn: ['충주'],        county: '충주시' },
  { name: '충남 · 논산시',   lat: 36.187, lon: 127.099, land: '11C20000', ta: '11C20602', prov: '충청남도', warn: ['논산'],        county: '논산시' },
  { name: '충남 · 부여군',   lat: 36.276, lon: 126.910, land: '11C20000', ta: '11C20502', prov: '충청남도', warn: ['부여'],        county: '부여군' },
  { name: '전북 · 김제시',   lat: 35.804, lon: 126.881, land: '11F10000', ta: '21F10601', prov: '전라북도', warn: ['김제'],        county: '김제시' },
  { name: '전북 · 익산시',   lat: 35.948, lon: 126.957, land: '11F10000', ta: '21F10502', prov: '전라북도', warn: ['익산'],        county: '익산시' },
  { name: '전남 · 나주시',   lat: 35.016, lon: 126.711, land: '11F20000', ta: '11F20503', prov: '전라남도', warn: ['나주'],        county: '나주시' },
  { name: '전남 · 해남군',   lat: 34.573, lon: 126.599, land: '11F20000', ta: '21F20101', prov: '전라남도', warn: ['해남'],        county: '해남군' },
  { name: '경북 · 상주시',   lat: 36.411, lon: 128.159, land: '11H10000', ta: '11H10302', prov: '경상북도', warn: ['상주'],        county: '상주시' },
  { name: '경북 · 성주군',   lat: 35.919, lon: 128.283, land: '11H10000', ta: '11H10704', prov: '경상북도', warn: ['성주'],        county: '성주군' },
  { name: '경북 · 청송군',   lat: 36.436, lon: 129.057, land: '11H10000', ta: '11H10503', prov: '경상북도', warn: ['청송'],        county: '청송군' },
  { name: '경남 · 진주시',   lat: 35.180, lon: 128.108, land: '11H20000', ta: '11H20701', prov: '경상남도', warn: ['진주'],        county: '진주시' },
  { name: '경남 · 밀양시',   lat: 35.504, lon: 128.746, land: '11H20000', ta: '11H20601', prov: '경상남도', warn: ['밀양'],        county: '밀양시' },
  { name: '제주 · 서귀포시', lat: 33.253, lon: 126.560, land: '11G00000', ta: '11G00401', prov: '제주도',   warn: ['서귀포', '제주도남부'], county: '서귀포시' },
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
const k = (d) => new Date(d.getTime() + KST);                  // 한국 시각을 UTC 필드로 읽기 위한 값
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
  const res = await fetch(url + sep + 'serviceKey=' + encodeURIComponent(KEY), { signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
  if (!json) return text;
  try { return JSON.parse(text); } catch { throw new Error('JSON 아님: ' + text.replace(/\s+/g, ' ').slice(0, 160)); }
}
const items = (j) => { const it = j?.response?.body?.items?.item; return Array.isArray(it) ? it : it ? [it] : []; };
// 간단한 XML → [{태그:값}] (item 안의 1단계 태그만)
function xmlItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const o = {}; for (const t of m[1].matchAll(/<([A-Za-z_]+)>([^<]*)<\/\1>/g)) o[t[1]] = t[2].trim(); return o;
  });
}

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

const SKY = { 1: '맑음', 3: '구름많음', 4: '흐림' };
const PTY = { 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' };

// ── 단기예보: 오늘~3일 ──
async function shortFcst(r) {
  const { nx, ny } = toGrid(r.lat, r.lon);
  const base = hourK >= 6 ? today : addDays(today, -1);
  const baseTime = hourK >= 6 ? '0500' : '2300';
  const j = await get(`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1200&dataType=JSON&base_date=${base}&base_time=${baseTime}&nx=${nx}&ny=${ny}`);
  const rows = items(j);
  if (!rows.length) throw new Error('단기예보 0건');
  const by = {};
  for (const x of rows) { (by[x.fcstDate] ||= []).push(x); }
  const days = {};
  for (const [d, xs] of Object.entries(by)) {
    // 마지막 날은 자정 몇 시간치만 오는 일이 있다 → 하루치(시간 예보 12개 이상)가 아니면 중기예보에 맡긴다
    if (xs.filter((x) => x.category === 'TMP').length < 12) continue;
    const v = (cat) => xs.filter((x) => x.category === cat).map((x) => num(x.fcstValue)).filter((n) => n != null);
    const tmp = v('TMP'), pop = v('POP'), wsd = v('WSD'), reh = v('REH');
    const tmx = v('TMX')[0] ?? (tmp.length ? Math.max(...tmp) : null);
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
  // 지금 기온 = 지금 시각에 가장 가까운 예보 시각의 기온
  const t0 = days[today]?._tmp || [];
  const hh = String(Math.max(0, Math.min(23, hourK))).padStart(2, '0') + '00';
  const cur = t0.find(([t]) => t >= hh) || t0[t0.length - 1];
  Object.values(days).forEach((x) => delete x._tmp);
  return { now: cur ? cur[1] : null, days };
}

// ── 중기예보: 4~10일 ──
async function midFcst(r) {
  const tmDay = hourK >= 7 ? today : addDays(today, -1);
  const tmFc = tmDay + (hourK >= 7 ? '0600' : '1800');
  const land = items(await get(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst?pageNo=1&numOfRows=5&dataType=JSON&regId=${r.land}&tmFc=${tmFc}`))[0];
  await sleep(150);
  const ta = items(await get(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa?pageNo=1&numOfRows=5&dataType=JSON&regId=${r.ta}&tmFc=${tmFc}`))[0];
  if (!land || !ta) throw new Error('중기예보 0건');
  const out = {};
  for (let n = 4; n <= 10; n++) {
    const d = addDays(tmDay, n);
    const pop = n <= 7 ? Math.max(num(land[`rnSt${n}Am`]) ?? 0, num(land[`rnSt${n}Pm`]) ?? 0) : num(land[`rnSt${n}`]);
    const wf = n <= 7 ? (land[`wf${n}Pm`] || land[`wf${n}Am`] || '') : (land[`wf${n}`] || '');
    out[d] = { d, hi: num(ta[`taMax${n}`]), lo: num(ta[`taMin${n}`]), pop, wf };
  }
  return out;
}

// ── 서리 가능성 (1~3일 뒤) ──
async function frost(r) {
  const base = hourK >= 6 ? today : addDays(today, -1);
  const j = await get(`https://apis.data.go.kr/1360000/FrstFcstInfoServiceV2/getFrstOcurFcstV2?pageNo=1&numOfRows=5&dataType=JSON&BASE_DATE=${base}&BASE_TIME=0500&LAT=${r.lat}&LON=${r.lon}&VAR=frost_occurrence_rate`);
  return items(j).map((x) => ({ d: x.FCST_DATE, v: num(x.VALUE) })).filter((x) => x.v != null);
}

// ── 기상특보 (전국 특보현황 1번 호출 → 지역별로 나눔) ──
async function warnAll() {
  const it = items(await get('https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus?pageNo=1&numOfRows=10&dataType=JSON'))[0];
  if (!it) throw new Error('특보현황 0건');
  const parse = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.replace(/^o\s*/, '').trim())
    .filter((l) => l && l !== '없음' && l.includes(':'))
    .map((l) => { const i = l.indexOf(':'); return { name: l.slice(0, i).trim(), area: l.slice(i + 1).trim() }; });
  return { tm: String(it.tmFc), now: parse(it.t6), pre: parse(it.t7) };
}
const PROV_ALIAS = {
  '경기도': ['경기'], '강원도': ['강원'], '충청북도': ['충청북', '충북'], '충청남도': ['충청남', '충남'],
  '전라북도': ['전라북', '전북'], '전라남도': ['전라남', '전남'], '경상북도': ['경상북', '경북'], '경상남도': ['경상남', '경남'], '제주도': ['제주'],
};
function warnFor(r, w) {
  const hit = (area) => {
    // 「경기도(가평), 강원도(태백, …)」 → 시도별 덩어리
    for (const m of area.matchAll(/([가-힣]+?)(?:\(([^)]*)\))?(?:,\s*|$)/g)) {
      const prov = m[1], inner = m[2];
      if (!prov || prov.includes('바다')) continue; // 바다 구역(앞바다·먼바다)은 육지 지역에 붙이지 않는다
      // 시도 이름이 바뀌어도(전북특별자치도·강원특별자치도 등) 잡히도록 줄임말도 본다
      const provOk = (PROV_ALIAS[r.prov] || [r.prov]).some((a) => prov.startsWith(a));
      if (!provOk) continue;
      if (!inner) return true; // 시도 전체
      if (inner.split(/,\s*/).some((s) => r.warn.some((n) => s.trim().startsWith(n)))) return true;
    }
    return false;
  };
  const land = (x) => !/풍랑|해일/.test(x.name);
  return { now: w.now.filter((x) => land(x) && hit(x.area)).map((x) => x.name), pre: w.pre.filter((x) => land(x) && hit(x.area)).map((x) => x.name), tm: w.tm };
}

// ── 농업기상 관측 (가장 가까운 관측지점, 어제) ──
let STATIONS = null;
async function stations() {
  if (STATIONS) return STATIONS;
  let all = [];
  for (let p = 1; p <= 4; p++) {
    const xs = xmlItems(await get(`https://apis.data.go.kr/1390802/AgriWeather/getObsrSpotList?Page_Size=100&Page_No=${p}`, { json: false }));
    all = all.concat(xs); if (xs.length < 100) break; await sleep(150);
  }
  STATIONS = all.map((s) => ({ code: s.Obsr_Spot_Code, name: s.Obsr_Spot_Nm, lat: num(s.Instl_La), lon: num(s.Instl_Lo) })).filter((s) => s.lat && s.lon);
  return STATIONS;
}
async function agriObs(r) {
  const st = await stations();
  const dist = (s) => (s.lat - r.lat) ** 2 + ((s.lon - r.lon) * Math.cos(r.lat * Math.PI / 180)) ** 2;
  const near = [...st].sort((a, b) => dist(a) - dist(b)).slice(0, 3);
  const from = dash(addDays(today, -3)), to = dash(addDays(today, -1));
  for (const s of near) {
    const xs = xmlItems(await get(`https://apis.data.go.kr/1390802/AgriWeather/WeatherObsrInfo/V3/GnrlWeather/getWeatherTermDayList3?Page_No=1&Page_Size=5&begin_Date=${from}&end_Date=${to}&obsr_Spot_Cd=${s.code}`, { json: false }));
    const last = xs.filter((x) => num(x.temp) != null).pop();
    if (last) {
      return { stn: s.name, date: last.date, ground: num(last.gr_Temp), solar: num(last.srqty), dewH: last.condens_Time ? round1(num(last.condens_Time) / 60) : null,
        soil: num(last.soil_Wt), hum: num(last.hum), rain: num(last.rn), tmin: num(last.lowst_Artmp), tmax: num(last.hghst_Artmp) };
    }
    await sleep(150);
  }
  throw new Error('가까운 관측지점에 자료 없음');
}

// ── 저수율 (시군 저수지 평균, 작년 같은 때와 비교) ──
async function reservoir(r) {
  const codes = xmlItems(await get(`https://apis.data.go.kr/B552149/reserviorWaterLevel/reservoircode/?pageNo=1&numOfRows=200&county=${encodeURIComponent(r.county)}`, { json: false }))
    .filter((x) => (x.county || '').includes(r.county)).slice(0, 8);
  if (!codes.length) return null; // 해당 시군에 농어촌공사 관리 저수지 없음
  const last = async (code, s, e) => {
    const xs = xmlItems(await get(`https://apis.data.go.kr/B552149/reserviorWaterLevel/reservoirlevel/?pageNo=1&numOfRows=10&fac_code=${code}&date_s=${s}&date_e=${e}`, { json: false }));
    const v = xs.filter((x) => num(x.rate) != null).pop(); return v ? { rate: num(v.rate), date: v.check_date } : null;
  };
  const now = [], ly = [];
  const lyEnd = String(+today.slice(0, 4) - 1) + today.slice(4);
  for (const c of codes) {
    const a = await last(c.fac_code, addDays(today, -4), today); await sleep(120);
    if (!a) continue;
    now.push(a.rate);
    const b = await last(c.fac_code, addDays(lyEnd, -4), lyEnd); await sleep(120);
    if (b) ly.push(b.rate);
  }
  if (!now.length) throw new Error('저수율 자료 없음');
  const avg = (a) => (a.length ? round1(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return { rate: avg(now), lastYear: ly.length === now.length ? avg(ly) : null, n: now.length };
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
    await sleep(150);
  }
  return out;
}

async function main() {
  if (!KEY) { console.error('인증키가 없습니다. DATA_GO_KR_KEY 를 설정하세요.'); process.exit(1); }
  let old = {}; try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
  const oldR = old.regions || {};
  const fails = [];

  let warn = null;
  try { warn = await warnAll(); } catch (e) { fails.push('특보 ' + e.message); }

  const regions = {};
  for (const r of REGIONS) {
    const o = oldR[r.name] || {};
    const cur = { ...o };
    const tryIt = async (label, fn) => { try { return await fn(); } catch (e) { fails.push(`${r.name} ${label}: ${e.message}`); return undefined; } };

    const sf = await tryIt('단기예보', () => shortFcst(r)); await sleep(150);
    const mf = await tryIt('중기예보', () => midFcst(r)); await sleep(150);
    if (sf || mf) {
      const all = { ...(mf || {}), ...(sf ? sf.days : {}) };
      const days = Object.values(all).filter((x) => x.d >= today).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 10);
      if (days.length >= 3) cur.days = days;
      if (sf) {
        const t = sf.days[today] || {};
        cur.weather = { now: sf.now, sky: t.wf || '', hi: t.hi, lo: t.lo, pop: t.pop, wind: t.wind, hum: t.hum };
      }
    }
    const fr = await tryIt('서리', () => frost(r)); if (fr) cur.frost = fr; await sleep(150);
    if (warn) cur.warn = warnFor(r, warn);
    const ob = await tryIt('농업기상', () => agriObs(r)); if (ob) cur.obs = ob; await sleep(150);
    const rs = await tryIt('저수율', () => reservoir(r)); if (rs !== undefined) cur.res = rs;
    regions[r.name] = cur;
    console.log(`✓ ${r.name}`);
  }

  let pr = [];
  try { pr = await prices(); } catch (e) { fails.push('시세 ' + e.message); }

  const json = {
    '_설명': '「오늘 농업현황」(today/) 이 읽는 파일. scripts/update-dashboard.mjs 가 하루 세 번 자동 갱신합니다.',
    '_출처': '기상청 · 농촌진흥청 국립농업과학원 · 한국농어촌공사 · 한국농수산식품유통공사(aT) — 공공데이터포털',
    updated: new Date().toISOString(),
    base: dash(today),
    regions,
    prices: pr.length >= 5 ? pr : (old.prices || pr),
  };
  await writeFile(OUT, JSON.stringify(json, null, 1) + '\n', 'utf8');
  if (fails.length) { console.warn(`\n⚠ 실패 ${fails.length}건 (해당 칸은 지난 값 유지)`); fails.forEach((f) => console.warn('  - ' + f)); }
  const okRegions = Object.values(regions).filter((x) => x.days && x.weather).length;
  console.log(`✓ ${OUT} — 지역 ${okRegions}/${REGIONS.length}, 시세 ${pr.length}개`);
  if (okRegions < REGIONS.length / 2) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
