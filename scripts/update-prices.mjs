#!/usr/bin/env node
/**
 * data/prices.json 자동 갱신 스크립트  (Node 18+ / 외부 패키지 없음)
 *
 * 사용법
 *   KAMIS_CERT_KEY=발급키 KAMIS_CERT_ID=발급아이디 node scripts/update-prices.mjs
 *
 * 하는 일
 *   KAMIS 일별 도매가격을 호출해 WANTED 목록의 품목만 골라
 *   홈페이지가 읽는 data/prices.json 형식으로 덮어씁니다.
 *   화면 코드는 수정할 필요가 없습니다.
 */

import { writeFile, readFile } from 'node:fs/promises';

// 발급받은 인증키. 환경변수로 덮어쓸 수 있습니다.
const CERT_KEY = process.env.KAMIS_CERT_KEY || '8a7b56e7-fe8b-4bff-9650-6b994668d409';
// KAMIS 가입 시 사용한 아이디(대개 이메일). 반드시 채워야 합니다.
const CERT_ID = process.env.KAMIS_CERT_ID || 'khhcmcm1118@gmail.com';
const OUT = 'data/prices.json';

// 홈페이지에 띄울 품목. category = KAMIS 부류코드
//   100 식량작물 · 200 채소류 · 300 특용작물 · 400 과일류
// item / kind 는 KAMIS 응답의 item_name / kind_name 과 일치해야 합니다.
// kind 를 비우면 해당 품목의 첫 번째 품종을 씁니다.
const WANTED = [
  { label: '쌀(20kg)',    category: '100', item: '쌀',     kind: '일반계' },
  { label: '감자(수미)',  category: '100', item: '감자',   kind: '수미' },
  { label: '배추',        category: '200', item: '배추',   kind: '고랭지' },
  { label: '무',          category: '200', item: '무',     kind: '고랭지' },
  { label: '양파',        category: '200', item: '양파',   kind: '양파' },
  { label: '대파',        category: '200', item: '대파',   kind: '대파(일반)' },
  { label: '마늘(깐마늘)',category: '200', item: '마늘',   kind: '깐마늘(국산)' },
  { label: '토마토',      category: '200', item: '토마토', kind: '일반토마토' },
  { label: '오이(가시)',  category: '200', item: '오이',   kind: '가시계통' },
  { label: '건고추',      category: '300', item: '건고추', kind: '화건' },
  { label: '사과(후지)',  category: '400', item: '사과',   kind: '후지' },
  { label: '포도(샤인)',  category: '400', item: '포도',   kind: '샤인머스캇' },
];

const num = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 최근 영업일 (주말·공휴일은 데이터가 없어 하루씩 되짚습니다)
const ymd = (d) => d.toISOString().slice(0, 10);

// KAMIS 도메인 후보 (https 우선, 실패 시 http → 구도메인 순서로 재시도)
const ENDPOINTS = [
  'https://www.kamis.or.kr/service/price/xml.do',
  'http://www.kamis.or.kr/service/price/xml.do',
  'https://www.kamis.co.kr/service/price/xml.do',
];

async function fetchCategory(category, regday) {
  const qs = new URLSearchParams({
    action: 'dailyPriceByCategoryList',
    p_product_cls_code: '02',        // 02 = 도매
    p_country_code: '1101',          // 1101 = 서울
    p_regday: regday,
    p_convert_kg_yn: 'N',
    p_item_category_code: category,
    p_cert_key: CERT_KEY,
    p_cert_id: CERT_ID,
    p_returntype: 'json',
  }).toString();

  let lastErr = null;
  for (const base of ENDPOINTS) {
    try {
      return await fetchOnce(base + '?' + qs, category);
    } catch (e) {
      const cause = e.cause ? ` (${e.cause.code || e.cause.message})` : '';
      console.warn(`    ✗ ${new URL(base).protocol}//${new URL(base).host} — ${e.message}${cause}`);
      lastErr = e;
    }
  }
  throw lastErr;
}

async function fetchOnce(url, category) {
  // 응답이 없을 때 무한 대기하지 않도록 20초 제한
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ablefarm-price-bot/1.0)',
      'Accept': 'application/json,text/plain,*/*',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let j;
  try { j = JSON.parse(text); }
  catch { throw new Error(`응답이 JSON이 아님: ${text.slice(0, 200)}`); }

  // 인증 실패 시 KAMIS 는 문자열로 에러를 돌려준다
  if (typeof j === 'string' || j?.data === '000') {
    throw new Error(`KAMIS 인증 실패 또는 오류: ${JSON.stringify(j).slice(0, 200)}`);
  }

  // 정상 응답은 { data: { item: [...] } }, 데이터 없으면 { data: [] }
  const items = j?.data?.item;
  return Array.isArray(items) ? items : [];
}

async function collect(regday) {
  const cats = [...new Set(WANTED.map((w) => w.category))];
  const byCat = {};
  for (const c of cats) {
    console.log(`  · 부류 ${c} 조회 중…`);
    byCat[c] = await fetchCategory(c, regday);
    console.log(`    → ${byCat[c].length}건`);
    await new Promise((r) => setTimeout(r, 300)); // 호출 간격
  }

  const out = [];
  for (const w of WANTED) {
    const pool = byCat[w.category] || [];
    const row = pool.find((r) =>
      String(r.item_name || '').trim() === w.item &&
      (!w.kind || String(r.kind_name || '').trim() === w.kind)
    ) || pool.find((r) => String(r.item_name || '').trim() === w.item);

    if (!row) { console.warn(`· 없음: ${w.label}`); continue; }

    const price = num(row.dpr1);   // 당일
    const prev = num(row.dpr2);    // 1일전
    if (!price) { console.warn(`· 가격없음: ${w.label}`); continue; }

    out.push({
      name: w.label,
      unit: String(row.unit || '').trim() || '-',
      price,
      prev: prev ?? price,
    });
  }
  return out;
}

async function main() {
  if (!CERT_KEY) {
    console.error('인증키가 없습니다. KAMIS_CERT_KEY 를 설정하세요.');
    process.exit(1);
  }
  if (!CERT_ID) {
    console.error('KAMIS 가입 아이디가 필요합니다.');
    console.error('  KAMIS_CERT_ID=가입아이디 node scripts/update-prices.mjs');
    console.error('KAMIS 는 인증키(certkey)와 아이디(certid) 두 개를 함께 요구합니다.');
    process.exit(1);
  }

  let items = [];
  let used = null;
  const today = new Date();

  // 오늘 하루만 먼저 시도 (연결 자체가 안 되면 재시도 의미 없음)
  let netFail = false;
  for (let back = 0; back < 3 && items.length === 0 && !netFail; back++) {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    const day = ymd(d);
    console.log(`▶ ${day} 조회`);
    try {
      items = await collect(day);
      if (items.length) used = day;
    } catch (e) {
      const code = e.cause?.code || '';
      console.warn(`· ${day} 실패: ${e.message}${code ? ' [' + code + ']' : ''}`);
      // 연결 자체가 실패하면 다른 날짜로 재시도해도 소용없다
      if (e.message === 'fetch failed' || ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)) {
        netFail = true;
        console.error('');
        console.error('⚠ KAMIS 서버에 연결하지 못했습니다.');
        console.error('  GitHub 서버(해외 IP)에서의 접속을 KAMIS가 차단할 수 있습니다.');
        console.error('  국내에서 실행하거나 국내 서버/프록시가 필요할 수 있습니다.');
      }
    }
  }

  if (!items.length) {
    console.error('가져온 품목이 없습니다. 기존 파일을 유지합니다.');
    process.exit(1);
  }

  // 기존 파일의 안내 문구는 그대로 살립니다
  let head = {};
  try { head = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

  const json = {
    '_사용법': head['_사용법'] || '이 파일은 scripts/update-prices.mjs 가 자동 갱신합니다.',
    '_출처': 'KAMIS 농산물유통정보 (서울 도매)',
    '_갱신시각': new Date().toISOString(),
    '기준일': used,
    '품목': items,
  };

  await writeFile(OUT, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`✓ ${OUT} 갱신 — 기준일 ${used}, ${items.length}개 품목`);
}

main().catch((e) => { console.error(e); process.exit(1); });
