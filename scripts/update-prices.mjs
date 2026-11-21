#!/usr/bin/env node
/**
 * data/prices.json 자동 갱신 스크립트  (Node 18+ / 외부 패키지 없음)
 *
 * 출처: 공공데이터포털 「한국농수산식품유통공사_일별 도,소매 가격정보 조회」
 *       https://apis.data.go.kr/B552845/perDay/price  (2026-11-21 KAMIS 옛 주소에서 옮김)
 *
 * 사용법
 *   DATA_GO_KR_KEY=공공데이터포털_일반인증키 node scripts/update-prices.mjs
 *   (GitHub Actions 에서는 저장소 Secrets 의 DATA_GO_KR_KEY 를 씁니다)
 *
 * 하는 일
 *   서울 중도매 가격을 품목별로 불러와 WANTED 목록의 품목만
 *   홈페이지가 읽는 data/prices.json 형식으로 덮어씁니다.
 *   화면 코드는 수정할 필요가 없습니다.
 *
 * 주의: 인증키를 이 파일에 적지 마세요. 저장소가 공개되어 있습니다.
 */

import { writeFile, readFile } from 'node:fs/promises';

const KEY = (process.env.DATA_GO_KR_KEY || '').trim();
const OUT = 'data/prices.json';
const ENDPOINT = 'https://apis.data.go.kr/B552845/perDay/price';

// 홈페이지에 띄울 품목 (코드는 KAMIS 품목·품종 코드와 같음)
//   ctgry: 100 식량작물 · 200 채소류 · 400 과일류
//   건고추는 이 서비스에 도매 시세가 없어 뺐습니다 (2026-11-21)
const WANTED = [
  { label: '쌀(20kg)',     ctgry: '100', item: '111', vrty: '01' },
  { label: '감자(수미)',   ctgry: '100', item: '152', vrty: '01' },
  { label: '배추',         ctgry: '200', item: '211' },            // 계절에 따라 봄·여름·고랭지·가을·월동
  { label: '무',           ctgry: '200', item: '231' },
  { label: '양파',         ctgry: '200', item: '245', vrty: '00' },
  { label: '대파',         ctgry: '200', item: '246', vrty: '00' },
  { label: '마늘(깐마늘)', ctgry: '200', item: '258', vrty: '03' }, // 깐마늘(대서)
  { label: '토마토',       ctgry: '200', item: '225', vrty: '00' },
  { label: '오이(가시)',   ctgry: '200', item: '223', vrty: '02' }, // 다다기계통
  { label: '사과(후지)',   ctgry: '400', item: '411', vrty: '05' },
  { label: '포도(샤인)',   ctgry: '400', item: '414', vrty: '12' },
];

const num = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 한국 날짜 기준 YYYYMMDD
const kday = (d) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');

async function fetchItem(w, from, to) {
  // 이 서비스는 cond[...] 의 대괄호를 그대로 보내야 한다 (인코딩하면 결과가 0건)
  const q = [
    'serviceKey=' + encodeURIComponent(KEY),
    'pageNo=1', 'numOfRows=200', 'returnType=JSON',
    'cond[exmn_ymd::GTE]=' + from,
    'cond[exmn_ymd::LTE]=' + to,
    'cond[se_cd::EQ]=02',          // 중도매
    'cond[sgg_cd::EQ]=1101',       // 서울
    'cond[ctgry_cd::EQ]=' + w.ctgry,
    'cond[item_cd::EQ]=' + w.item,
  ];
  if (w.vrty) q.push('cond[vrty_cd::EQ]=' + w.vrty);

  const res = await fetch(ENDPOINT + '?' + q.join('&'), {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
  let j;
  try { j = JSON.parse(text); }
  catch { throw new Error(`응답이 JSON이 아님(인증키 확인): ${text.slice(0, 160)}`); }
  const head = j?.response?.header;
  if (head && String(head.resultCode) !== '0' && String(head.resultCode) !== '00') {
    throw new Error(`오류 ${head.resultCode} ${head.resultMsg || ''}`);
  }
  const it = j?.response?.body?.items?.item;
  return Array.isArray(it) ? it : it ? [it] : [];
}

// 상품 등급(없으면 첫 등급) · 가장 최근 날짜 = 오늘 값, 그 전 날짜 = 전일 값
function pick(rows) {
  const grades = [...new Set(rows.map((r) => r.grd_nm))];
  const grade = grades.includes('상품') ? '상품' : grades[0];
  const g = rows.filter((r) => r.grd_nm === grade && num(r.exmn_dd_prc));
  // 품종이 여러 개면(배추·무 계절 품종) 가장 최근 날짜에 값이 있는 품종 하나로 맞춘다
  g.sort((a, b) => String(b.exmn_ymd).localeCompare(String(a.exmn_ymd)));
  if (!g.length) return null;
  const vr = g[0].vrty_cd;
  const same = g.filter((r) => r.vrty_cd === vr);
  const days = [...new Set(same.map((r) => r.exmn_ymd))];
  const at = (d) => same.find((r) => r.exmn_ymd === d);
  const cur = at(days[0]);
  const prev = days[1] ? at(days[1]) : null;
  return {
    day: cur.exmn_ymd,
    unit: `${cur.unit_sz || ''}${cur.unit || ''}`.trim() || '-',
    price: num(cur.exmn_dd_prc),
    prev: prev ? num(prev.exmn_dd_prc) : null,
  };
}

async function main() {
  if (!KEY) {
    console.error('인증키가 없습니다. DATA_GO_KR_KEY 를 설정하세요 (GitHub 저장소 Settings → Secrets).');
    process.exit(1);
  }

  const now = new Date();
  const to = kday(now);
  const from = kday(new Date(now.getTime() - 14 * 864e5)); // 연휴가 길어도 2주 안에는 값이 있다

  const items = [];
  const dayCount = {};
  for (const w of WANTED) {
    try {
      const rows = await fetchItem(w, from, to);
      const p = pick(rows);
      if (!p || !p.price) { console.warn(`· 없음: ${w.label}`); continue; }
      items.push({ name: w.label, unit: p.unit, price: p.price, prev: p.prev ?? p.price });
      dayCount[p.day] = (dayCount[p.day] || 0) + 1;
      console.log(`  ✓ ${w.label} ${p.day} ${p.price}원`);
    } catch (e) {
      const code = e.cause?.code ? ` [${e.cause.code}]` : '';
      console.warn(`· 실패: ${w.label} — ${e.message}${code}`);
    }
    await new Promise((r) => setTimeout(r, 200)); // 호출 간격
  }

  if (items.length < 5) {
    console.error(`가져온 품목이 ${items.length}개뿐입니다. 기존 파일을 유지합니다.`);
    process.exit(1);
  }

  // 기준일 = 가장 많은 품목이 가진 최근 날짜
  const used = Object.entries(dayCount).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0][0];
  const usedIso = `${used.slice(0, 4)}-${used.slice(4, 6)}-${used.slice(6, 8)}`;

  let head = {};
  try { head = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

  const json = {
    '_사용법': head['_사용법'] || '이 파일은 scripts/update-prices.mjs 가 자동 갱신합니다.',
    '_출처': 'KAMIS 농산물유통정보 (서울 도매)',
    '_갱신시각': new Date().toISOString(),
    '기준일': usedIso,
    '품목': items,
  };

  await writeFile(OUT, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`✓ ${OUT} 갱신 — 기준일 ${usedIso}, ${items.length}개 품목`);
}

main().catch((e) => { console.error(e); process.exit(1); });
