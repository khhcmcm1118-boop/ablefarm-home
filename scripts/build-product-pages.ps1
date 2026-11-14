# 제품별 독립 페이지 생성기 — data/products.json → products/<slug>.html + products/index.html
# 사용법(저장소 루트에서):  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-product-pages.ps1
# 제품 자료(products.json)를 고친 뒤 다시 돌리면 페이지가 그대로 갱신된다.
# 새 쇼츠 안내 페이지가 생기면 아래 $Guides 에 한 줄 추가한다.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$site = 'https://www.ablefarm.co.kr'
$j = Get-Content (Join-Path $root 'data\products.json') -Raw -Encoding UTF8 | ConvertFrom-Json

# 작물별 살포량 — 희석 계산기(calc/index.html)의 G 표를 그대로 읽는다. 값을 여기로 복사하지 않는다(계산기만 고치면 제품 페이지도 따라온다)
# G 줄 형식: [작물, 10a 총량 최소, 최대, 1회 최소, 최대, 횟수, 시기, 방법]  (임팩트과립 6kg/8kg 같은 다른 형식은 건너뛴다)
$calcSrc = Get-Content (Join-Path $root 'calc\index.html') -Raw -Encoding UTF8
$CalcNames = @{}
$CalcRates = @{}  # 계산기 P 의 희석배수 — products.json 에 희석배수가 없는 제품만 이걸로 채운다(산소탱크·엔피씰·임팩트, 2026-10-10 사용자 지정 권장값)
foreach ($m in [regex]::Matches($calcSrc, '\{n:"([^"]+)",\s*rates:\[([\d,\s]+)\]')) {
  $CalcNames[$m.Groups[1].Value] = $true
  $CalcRates[$m.Groups[1].Value] = @($m.Groups[2].Value -split ',' | ForEach-Object { [int]$_.Trim() } | Sort-Object)
}
$Gran = @{}
foreach ($m in [regex]::Matches($calcSrc, '"([^"]+)":\s*\{bag:(\d+)([^\[]*)rows:\[([\s\S]*?)\]\]\}')) {
  $rows = @()
  foreach ($r in [regex]::Matches($m.Groups[4].Value + ']','\["([^"]+)",(\d+|null),(\d+|null),(\d+|null),(\d+|null),(\d+),"([^"]*)","([^"]*)"\]')) {
    $v = $r.Groups
    $rows += [pscustomobject]@{ 작물=$v[1].Value; 총min=$v[2].Value; 총max=$v[3].Value; 회min=$v[4].Value; 회max=$v[5].Value; 횟수=[int]$v[6].Value; 시기=$v[7].Value; 방법=$v[8].Value }
  }
  if ($rows.Count -gt 0) {
    $Gran[$m.Groups[1].Value] = [pscustomobject]@{ bag=[int]$m.Groups[2].Value; insoluble=($m.Groups[3].Value -match 'insoluble:true'); rows=$rows }
    $CalcNames[$m.Groups[1].Value] = $true
  }
}
function Rng($a, $b) { if ($a -eq 'null' -or $a -eq '') { return '' }; if ($a -eq $b) { return "$a" }; return "$a~$b" }
function Bags($a, $b, $bag) { $x = [double]$a / $bag; $y = [double]$b / $bag; if ($x -eq $y) { return "$x" }; return "$x~$y" }

$SlugMap = @{
  '구근짱'='gugeunjjang'; '산소탱크'='oxygentank'; '속딴딴'='sokddanddan'; '아미닥터'='amidoctor'; '아미루트'='amiroot'
  '엔피씰'='npseal'; '엔피칼마'='npcalma'; '원팩트'='onepact'; '유니NK칼'='uninkcal'; '유니NK칼마'='uninkcalma'
  '임팩트규산'='impactsilica'; '임팩트규산 골드'='impactsilicagold'; '일소가드'='ilsoguard'; '임팩트'='impact'
  '임팩트골드'='impactgold'; '임팩트과립'='impactgranule'; '임팩트원'='impactone'; '칼슘탄'='calciumtan'
  '토탈그로'='totalgro'; '파이널솔루션'='finalsolution'; '하이그로퍼 골드'='higrowpergold'; '하이슈거'='hisugar'
  '황실'='hwangsil'; '히미업'='himiup'
}
# 제품 → 관련 재배 안내(쇼츠 포함)
$Guides = @{
  '임팩트과립' = @(@{t='벼 깨씨무늬병 — 원인은 흙 속에 있습니다'; u='../guide/rice-brown-spot.html'; v='cXLysImyLjk'},
                   @{t='보리·밀 겨울 농사, 세 번만 챙기세요 — 배수로·밟기·재생기'; u='../guide/barley-wheat-winter.html'; v='zcgAl1TObhU'})
  '칼슘탄'     = @(@{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '아미닥터'   = @(@{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '일소가드'   = @(@{t='사과 일소(햇볕 데임) — 데기 전에 막는 법'; u='../guide/apple-sunburn.html'; v='FUqkyk16ZXo'})
  '임팩트원'   = @(@{t='김장 무가 먼저 언다 — 배추·무 언 피해 대비'; u='../guide/kimjang-frost.html'; v='W7zAvaR1o1U'},
                   @{t='겨울 하우스, 병의 범인은 밤 이슬 — 결로·다습 관리'; u='../guide/greenhouse-winter.html'; v='OmfrclBgBHw'},
                   @{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'},
                   @{t='찌그러진 첫 딸기, 범인은 수정 불량 — 개화기 벌 관리'; u='../guide/strawberry-malformed.html'; v='5UCcYgcnzHU'},
                   @{t='꽃은 피는데 안 달린다면? 겨울 토마토·오이 착과 관리'; u='../guide/winter-fruit-set.html'; v='NTbxT8zcVb4'})
  '하이슈거'   = @(@{t='밍밍한 딸기, 범인은 따뜻한 밤 — 단계별 밤 온도'; u='../guide/strawberry-night-temp.html'; v='YLPreraNDtw'})
  '임팩트골드' = @(@{t='겨울 하우스, 병의 범인은 밤 이슬 — 결로·다습 관리'; u='../guide/greenhouse-winter.html'; v='OmfrclBgBHw'},
                   @{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '히미업'     = @(@{t='겨울 하우스, 병의 범인은 밤 이슬 — 결로·다습 관리'; u='../guide/greenhouse-winter.html'; v='OmfrclBgBHw'},
                   @{t='겨울에 솟는 양파, 범인은 서릿발 — 아주심기·월동 관리'; u='../guide/onion-frost-heave.html'; v='-3Qi2kdRrE4'})
  '아미루트'   = @(@{t='겨울에 솟는 양파, 범인은 서릿발 — 아주심기·월동 관리'; u='../guide/onion-frost-heave.html'; v='-3Qi2kdRrE4'})
  '구근짱'     = @(@{t='겨울에 솟는 양파, 범인은 서릿발 — 아주심기·월동 관리'; u='../guide/onion-frost-heave.html'; v='-3Qi2kdRrE4'},
                   @{t='내년 마늘 크기와 모양, 심는 날 좌우된다 — 씨마늘·심는 깊이'; u='../guide/garlic-planting.html'; v='7OPvxOSjk8U'})
  '속딴딴'     = @(@{t='김장 무가 먼저 언다 — 배추·무 언 피해 대비'; u='../guide/kimjang-frost.html'; v='W7zAvaR1o1U'},
                   @{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '임팩트규산' = @(@{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '임팩트규산 골드' = @(@{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
}
# 고추 장마철 관리 5제품 영상(쇼츠 3HrCOXWGfPE 연결)
$PepperVid = @{id='ykLigc4psRY'; t='고추 탄저병 장마철 관리 — 잎·줄기는 임팩트규산, 뿌리는 임팩트골드, 껍질은 칼슘탄·속딴딴, 꽃은 임팩트원'; d='고추 탄저병 쇼츠(빗물 튀김 → 표면 부착 → 껍질 침투 → 병든 과실 제거)에 이어, 비가림·등록 약제 방제를 기본으로 잎·줄기(임팩트규산, 유기농은 임팩트규산 골드), 뿌리(임팩트골드 5L 하우스 관주), 껍질(칼슘탄·속딴딴), 꽃(임팩트원)을 단계별로 관리하는 방법과 사용법을 2분 36초로 정리한 에이블팜 제품 영상입니다. 비료는 병을 막는 약이 아니며 탄저병은 등록 약제로 방제합니다.'; dur='PT2M36S'; date='2026-10-30'}
# 아미노산 원료(혈분 효소분해) 영상 — 임팩트과립·임팩트골드·임팩트원 공통
$AminoRawVid = @{id='aZVt9QTNht8'; t='같은 아미노산일까? 원료와 분해 방식이 다릅니다'; d='국내산 식품용 돼지 혈액을 효소분해한 원료로 L형 아미노산 형태를 지킨다는 점을, 산분해·단순 건조 원료와 비교해 35초로 정리한 에이블팜 영상입니다. 같은 원료를 임팩트과립·임팩트골드·임팩트원에 씁니다.'; dur='PT35S'; date='2026-11-06'}
$AminoEduVid = @{id='zStBmYupXVM'; t='아미노산이 들어있는 비료 비싸고 싼 차이? 이걸로 확인하세요'; d='단백질 원료와 분해 방식(효소분해·산분해)에 따라 아미노산 비료가 어떻게 달라지는지 연구 자료로 정리한 1분 30초 교육 영상입니다. 효소분해 아미노산을 고르는 기준을 담았습니다.'; dur='PT1M30S'; date='2026-11-03'}
$ImpactOneHowVid = @{id='dYugMCVmhlI'; t='임팩트원 사용법 — 작물별 사용 시기'; d='꽃이 많아야 열매가 많이 달립니다. 임팩트원의 성분과 과채·과수·벼 사용 시기를 30초로 정리한 에이블팜 제품 영상입니다.'; dur='PT30S'; date='2026-11-02'}
# 제품 → 제품 홍보 영상(가로, 유튜브 「동영상」)
$Videos = @{
  '하이슈거' = @{id='Wzy5nSeGdYo'; t='딸기 단계별 관리 — 임팩트원으로 맺고, 하이슈거로 채운다'; d='세종시 연동면 딸기 농가 사례와 함께, 단계별 밤 온도(농촌진흥청)와 꽃 필 때 임팩트원·열매 클 때 하이슈거(500~1,000배, 수확 30~50일 전 비대기·착색기 엽면살포) 사용법을 2분으로 정리한 에이블팜 제품 영상입니다.'; dur='PT2M'; date='2026-10-30'}
  '임팩트원' = @(@{id='Wzy5nSeGdYo'; t='딸기 단계별 관리 — 임팩트원으로 맺고, 하이슈거로 채운다'; d='세종시 연동면 딸기 농가 사례와 함께, 튼실한 꽃과 고른 수정이 큰 딸기를 만드는 원리와 개화·착과기 임팩트원(1,000배 엽면살포), 비대·착색기 하이슈거 사용법을 2분으로 정리한 에이블팜 제품 영상입니다.'; dur='PT2M'; date='2026-10-30'},
                 @{id='13nt6XeAgAE'; t='겨울 하우스 시설채소 관리 — 뿌리는 임팩트골드, 잎은 히미업, 꽃은 임팩트원'; d='겨울 하우스 결로·저온·일조 부족(농촌진흥청) 속에서 뿌리는 임팩트골드 관주, 잎은 히미업, 꽃은 임팩트원(1,000배, 개화·착과기 엽면살포)으로 관리하는 방법을 1분 48초로 정리한 에이블팜 제품 영상입니다.'; dur='PT1M48S'; date='2026-10-30'}, $PepperVid, $ImpactOneHowVid, $AminoRawVid, $AminoEduVid)
  '임팩트규산' = $PepperVid
  '임팩트규산 골드' = $PepperVid
  '칼슘탄' = $PepperVid
  '속딴딴' = $PepperVid
  '임팩트골드' = @(@{id='13nt6XeAgAE'; t='겨울 하우스 시설채소 관리 — 뿌리는 임팩트골드, 잎은 히미업, 꽃은 임팩트원'; d='겨울 하우스에서 염류가 쌓이고 차가운 흙 속 뿌리를 위해 임팩트골드(유기농업자재 공시-2-3-802, 1,000배 관주, 7~10일 간격 1~3회, 5L 하우스 관주용)를 쓰는 방법을 잎(히미업)·꽃(임팩트원) 관리와 함께 1분 48초로 정리한 에이블팜 제품 영상입니다.'; dur='PT1M48S'; date='2026-10-30'}, $PepperVid, $AminoRawVid, $AminoEduVid)
  '임팩트과립' = @(@{id='vhQvKhXcjr4'; t='임팩트과립 보리·밀 사용법 — 사용 시기와 양'; d='보리·밀에 임팩트과립을 쓰는 시기(싹이 5cm쯤 올라왔을 때 또는 2월 중순 재생기)와 양(1,200평에 6kg 2봉, 전층시비)을 31초로 정리한 에이블팜 제품 영상입니다.'; dur='PT31S'; date='2026-11-04'},
                   @{id='eeWXBePGP3U'; t='내년 사과꽃은 지금 준비됩니다 — 수확 후 감사비료'; d='수확 뒤 가을 뿌리와 저장양분(농촌진흥청), 감사비료 줄 때 임팩트과립을 나무 그늘 아래 흙 위에 1그루 100~200g 뿌리는 방법을 34초로 정리한 에이블팜 제품 영상입니다.'; dur='PT34S'; date='2026-11-09'},
                   $AminoRawVid, $AminoEduVid)
  '히미업' = @(@{id='xEbIWUCs1Wo'; t='모종에 히미나는 히미업 — 육묘기·정식 초기 영양 관리'; d='육묘기와 정식 초기 모종 관리에 히미업을 쓰는 방법을 24초로 정리한 에이블팜 제품 영상입니다.'; dur='PT24S'; date='2026-10-31'},
             @{id='13nt6XeAgAE'; t='겨울 하우스 시설채소 관리 — 뿌리는 임팩트골드, 잎은 히미업, 꽃은 임팩트원'; d='추위와 흐린 날에 지친 시설채소 잎에 히미업(액상 아미노산 영양제, 1,000배 엽면살포)을 쓰는 방법을 뿌리(임팩트골드)·꽃(임팩트원) 관리와 함께 1분 48초로 정리한 에이블팜 제품 영상입니다.'; dur='PT1M48S'; date='2026-10-30'})
}

function E([string]$s) { if ($null -eq $s) { return '' }; return [System.Net.WebUtility]::HtmlEncode($s) }
function J([string]$s) { if ($null -eq $s) { return '' }; return ($s -replace '\\','\\' -replace '"','\"' -replace "`r",'' -replace "`n",'\n') }

$css = @'
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
:root { --dk:#1E5C1E; --md:#2E7D32; --lm:#7DB82A; --pale:#EEF5E6; --ink:#1b2a1d; --mut:#56645a; --line:#d7e2d0; --bg:#faf8f2; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); }
body { font-family: 'Pretendard', 'Noto Sans CJK KR', 'Malgun Gothic', sans-serif; color: var(--ink); font-size: 17px; line-height: 1.7; word-break: keep-all; }
a { color: var(--md); }
.top { background: #16271c; position: sticky; top: 0; z-index: 5; }
.top .in { max-width: 820px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 16px; }
.top img { height: 34px; width: auto; background: #fff; border-radius: 8px; padding: 3px 6px; display: block; }
.top nav { display: flex; gap: 6px; flex-wrap: wrap; }
.top nav a { color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 7px 11px; border-radius: 10px; background: rgba(255,255,255,.12); }
.top nav a.bot { background: #a9d18a; color: #16271c; }
main { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; }
.crumb { font-size: 13px; color: var(--mut); margin: 16px 0 0; }
.hero { display: flex; gap: 20px; align-items: flex-start; margin: 14px 0 0; }
.hero img { width: 240px; height: 240px; object-fit: contain; background: #fff; border: 1px solid var(--line); border-radius: 16px; flex: none; }
.cat { font-size: 14px; font-weight: 700; color: var(--md); }
h1 { font-size: 32px; line-height: 1.2; margin: 4px 0 0; font-weight: 900; }
.tag { font-size: 18px; font-weight: 700; color: var(--dk); margin: 6px 0 0; }
.sum { margin: 10px 0 0; }
h2 { font-size: 21px; color: var(--dk); margin: 32px 0 10px; padding-left: 10px; border-left: 5px solid var(--lm); }
.spec { display: grid; grid-template-columns: 110px 1fr; gap: 6px 12px; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
.spec dt { font-weight: 700; color: var(--mut); }
.spec dd { margin: 0; }
.note { font-size: 14.5px; color: var(--mut); margin: 8px 0; }
.tblwrap { overflow-x: auto; background: #fff; border: 1px solid var(--line); border-radius: 14px; }
table.crop { width: 100%; border-collapse: collapse; font-size: 15px; }
table.crop th { background: var(--pale); color: var(--dk); text-align: left; padding: 9px 10px; white-space: nowrap; }
table.crop td { padding: 8px 10px; border-top: 1px solid var(--line); vertical-align: top; }
table.crop td:first-child { font-weight: 700; white-space: nowrap; }
table.crop small { display: block; font-size: 12.5px; color: var(--mut); }
.more { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; }
.more a { font-weight: 700; text-decoration: none; background: var(--pale); border-radius: 10px; padding: 8px 12px; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.card b { display: block; color: var(--dk); }
.card span { font-size: 15.5px; }
.guide { display: flex; gap: 14px; align-items: center; background: #fff; border: 2px solid var(--lm); border-radius: 14px; padding: 12px; margin: 8px 0; text-decoration: none; color: var(--ink); }
.guide img { width: 90px; height: 120px; object-fit: cover; border-radius: 10px; flex: none; background: #000; }
.guide b { display: block; font-size: 17px; color: var(--dk); }
details { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 8px 0; }
summary { font-weight: 800; cursor: pointer; }
details p { margin: 8px 0 0; }
.others { display: flex; flex-wrap: wrap; gap: 6px; }
.others a { font-size: 14px; text-decoration: none; background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; color: var(--dk); }
.cta { display: flex; gap: 10px; flex-wrap: wrap; margin: 24px 0 0; }
.cta a { flex: 1 1 220px; text-align: center; text-decoration: none; font-weight: 800; padding: 14px; border-radius: 14px; background: var(--md); color: #fff; }
.cta a.ghost { background: #fff; color: var(--dk); border: 2px solid var(--md); }
footer { max-width: 820px; margin: 0 auto; padding: 18px 16px 40px; font-size: 13px; color: var(--mut); border-top: 1px solid var(--line); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; margin: 16px 0; }
.grid a { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 10px; text-decoration: none; color: var(--ink); }
.grid img { width: 100%; height: 140px; object-fit: contain; display: block; }
.grid b { display: block; margin: 6px 0 0; color: var(--dk); }
.grid span { font-size: 13.5px; color: var(--mut); }
@media (max-width: 620px) { h1 { font-size: 27px; } .hero { flex-direction: column; } .hero img { width: 100%; height: 220px; } .cards { grid-template-columns: 1fr; } .spec { grid-template-columns: 90px 1fr; } }
'@

function Header([string]$title, [string]$desc, [string]$canon, [string]$img, [string]$ld) {
@"
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$(E $title)</title>
<meta name="description" content="$(E $desc)">
<link rel="canonical" href="$canon">
<meta property="og:type" content="product">
<meta property="og:title" content="$(E $title)">
<meta property="og:description" content="$(E $desc)">
<meta property="og:url" content="$canon">
<meta property="og:image" content="$img">
<link rel="icon" href="../assets/logo.png">
<script type="application/ld+json">
$ld
</script>
<style>
$css
</style>
<script src="/ga.js"></script>
</head>
<body>
<div class="top"><div class="in">
  <a href="../"><img src="../assets/logo-full.jpg" alt="(주)에이블팜 홈으로"></a>
  <nav><a href="./">전체 제품</a><a href="../calc/">계산기</a><a class="bot" href="../crop-advisor.html?from=product">작물 상담봇</a></nav>
</div></div>
"@
}
$footer = @'
<footer>
  (주)에이블팜 · <a href="https://www.ablefarm.co.kr">www.ablefarm.co.kr</a> · 고객센터 02-858-6229 (평일 09:00–17:00) · <a href="/privacy.html">개인정보 처리방침</a><br>
  제품 사용 결과는 환경 조건에 따라 달라질 수 있습니다. 병해충은 해당 작물에 등록된 약제로 방제하고, 정확한 처방은 지역 농업기술센터 상담에 따르세요.
</footer>
</body>
</html>
'@

$outDir = Join-Path $root 'products'
New-Item -ItemType Directory -Force $outDir | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$all = @($j.제품)

$skipped = @()   # 덮어쓰지 않고 넘어간 페이지 (영상 등 이 스크립트가 모르는 내용이 있는 것)
foreach ($p in $all) {
  $name = $p.제품명; $slug = $SlugMap[$name]
  if (-not $slug) { Write-Warning "슬러그 없음: $name"; continue }
  $canon = "$site/products/$slug.html"
  $img = "$site/" + $p.이미지
  $title = "$name — $($p.한줄설명) | 에이블팜"
  $desc = $p.요약

  $faqLd = @($p.자주묻는질문 | ForEach-Object { '{"@type":"Question","name":"' + (J $_.질문) + '","acceptedAnswer":{"@type":"Answer","text":"' + (J $_.답변) + '"}}' }) -join ','
  $g = $Guides[$name]
  $subjectOf = ''
  if ($g) { $subjectOf = ',"subjectOf":[' + (@($g | ForEach-Object { '{"@type":"Article","name":"' + (J $_.t) + '","url":"' + $site + '/guide/' + ($_.u -replace '\.\./guide/','') + '"}' }) -join ',') + ']' }
  $vs = @($Videos[$name] | Where-Object { $_ })
  $vidLd = ''
  foreach ($v in $vs) { $vidLd += '{"@type":"VideoObject","name":"' + (J $v.t) + '","description":"' + (J $v.d) + '","thumbnailUrl":"https://i.ytimg.com/vi/' + $v.id + '/hqdefault.jpg","uploadDate":"' + $v.date + '","duration":"' + $v.dur + '","contentUrl":"https://www.youtube.com/watch?v=' + $v.id + '","embedUrl":"https://www.youtube-nocookie.com/embed/' + $v.id + '","about":{"@id":"' + $canon + '#product"},"publisher":{"@type":"Organization","name":"(주)에이블팜"}},' }
  $ld = '{"@context":"https://schema.org","@graph":[' +
    '{"@type":"Product","@id":"' + $canon + '#product","name":"' + (J $name) + '","description":"' + (J $desc) + '","image":"' + $img + '","category":"' + (J $p.분류) + '","brand":{"@type":"Brand","name":"에이블팜"},"manufacturer":{"@type":"Organization","name":"(주)에이블팜","url":"' + $site + '"},"url":"' + $canon + '"' + $subjectOf + '},' + $vidLd +
    '{"@type":"FAQPage","mainEntity":[' + $faqLd + ']},' +
    '{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"에이블팜","item":"' + $site + '/"},{"@type":"ListItem","position":2,"name":"제품","item":"' + $site + '/products/"},{"@type":"ListItem","position":3,"name":"' + (J $name) + '"}]}' +
    ']}'

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append((Header $title $desc $canon $img $ld))
  [void]$sb.Append("<main>`n<p class=""crumb""><a href=""../"">에이블팜</a> › <a href=""./"">제품</a> › $(E $name)</p>`n")
  [void]$sb.Append("<div class=""hero""><img src=""../$($p.이미지)"" alt=""에이블팜 $(E $name) 제품 사진""><div><div class=""cat"">$(E $p.분류)</div><h1>$(E $name)</h1><p class=""tag"">$(E $p.한줄설명)</p><p class=""sum"">$(E $p.요약)</p></div></div>`n")
  # 사용 방법 — products.json 칸이 비어 있으면 계산기 G 표에서 채우고, 그래도 빈 줄은 아예 그리지 않는다
  $gr = $Gran[$name]
  $spec = [ordered]@{ '희석 배수'=$p.희석배수; '사용 시기'=$p.사용시기; '사용 횟수·규격'=$p.사용횟수; '적용 작물'=$p.적용작물 }
  if ($gr) {
    if (-not $p.희석배수) {
      $spec.Remove('희석 배수')
      if ($gr.insoluble) { $spec.Insert(0, '쓰는 법', '물에 녹지 않는 비료 · 흙에 뿌려 씁니다') }
      else { $spec.Insert(0, '쓰는 법', '웃거름(추비) 전용 · 포기 사이·이랑 옆 흙에 뿌립니다. 관주는 10a(300평)당 3~5kg을 물 1톤 이상에 녹여 줍니다') }
    }
    if (-not $p.사용시기) { $spec['사용 시기'] = '작물마다 다릅니다 — 아래 작물별 살포량 표' }
    if (-not $p.적용작물) { $spec['적용 작물'] = (@($gr.rows | ForEach-Object { $_.작물 }) -join ', ') }
  }
  $cr = $CalcRates[$name]
  if (-not $p.희석배수 -and $cr) {
    # 물 20ℓ당 원액 ㎖ = 20000 / 배수 (다른 제품 표기와 같은 꼴)
    $lo = $cr[0]; $hi = $cr[-1]
    $fmt = { param($n) $n.ToString('N0') }
    if ($lo -eq $hi) { $spec['희석 배수'] = "$(& $fmt $lo)배 권장 (물 20ℓ당 $([math]::Round(20000 / $lo))㎖)" }
    else { $spec['희석 배수'] = "$(& $fmt $lo)~$(& $fmt $hi)배 권장 (물 20ℓ당 $([math]::Round(20000 / $lo))~$([math]::Round(20000 / $hi))㎖)" }
  }
  $spec['규격'] = $p.규격
  [void]$sb.Append("<h2>사용 방법</h2>`n<dl class=""spec"">")
  foreach ($k in $spec.Keys) { if ($spec[$k]) { [void]$sb.Append("<dt>$(E $k)</dt><dd>$(E $spec[$k])</dd>") } }
  [void]$sb.Append("</dl>`n")
  if ($gr) {
    $hasOnce = @($gr.rows | Where-Object { $_.회min -ne 'null' }).Count -gt 0
    [void]$sb.Append("<h2>작물별 살포량</h2>`n<p class=""note"">10a = 300평 = 1,000㎡ 기준 · $($gr.bag)kg 포대</p>`n<div class=""tblwrap""><table class=""crop""><thead><tr><th>작물</th><th>300평당 총량</th>")
    if ($hasOnce) { [void]$sb.Append("<th>1회량</th><th>시기·횟수</th>") }
    [void]$sb.Append("</tr></thead><tbody>")
    foreach ($r in $gr.rows) {
      [void]$sb.Append("<tr><td>$(E $r.작물)</td><td>$(Rng $r.총min $r.총max)kg<small>$(Bags $r.총min $r.총max $gr.bag)포</small></td>")
      if ($hasOnce) {
        $once = Rng $r.회min $r.회max
        $onceTxt = if ($once) { "${once}kg" } else { '' }
        if ($r.방법 -eq '관주' -and $onceTxt) { $onceTxt += '<small>물에 녹여 관주</small>' }
        [void]$sb.Append("<td>$onceTxt</td><td>$(E $r.시기)</td>")
      }
      [void]$sb.Append("</tr>")
    }
    [void]$sb.Append("</tbody></table></div>`n")
    if (-not $gr.insoluble) { [void]$sb.Append("<p class=""note"">비료가 잎·줄기에 닿지 않게 하세요. 염류가 쌓인 하우스는 양을 절반으로 줄이세요. 인산 비료·황산염 비료와 한 통에 섞지 마세요.</p>`n") }
  }
  $links = @()
  if ($CalcNames[$name]) { $links += "<a href=""../calc/?p=$([uri]::EscapeDataString($name))"">우리 밭 면적으로 사용량 계산하기 →</a>" }
  if ($name -eq '유니NK칼' -or $name -eq '유니NK칼마') { $links += "<a href=""../guide/uni-nk.html"">유니NK칼·칼마 살포 안내 (인쇄용 A4) →</a>" }
  if ($links.Count -gt 0) { [void]$sb.Append("<p class=""more"">" + ($links -join '') + "</p>`n") }
  if ($p.효과) {
    [void]$sb.Append("<h2>주요 효과</h2>`n<div class=""cards"">")
    foreach ($e in $p.효과) { [void]$sb.Append("<div class=""card""><b>$(E $e.항목)</b><span>$(E $e.설명)</span></div>") }
    [void]$sb.Append("</div>`n")
  }
  if ($p.성분) {
    [void]$sb.Append("<h2>주요 성분</h2>`n<div class=""cards"">")
    foreach ($e in $p.성분) { [void]$sb.Append("<div class=""card""><b>$(E $e.성분명)</b><span>$(E $e.작용)</span></div>") }
    [void]$sb.Append("</div>`n")
  }
  if ($vs.Count -gt 0) { [void]$sb.Append("<h2>제품 영상</h2>`n") }
  foreach ($v in $vs) {
    [void]$sb.Append("<h3>$(E $v.t)</h3>`n<div style=""position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000;margin:10px 0""><iframe src=""https://www.youtube-nocookie.com/embed/$($v.id)"" title=""$(E $v.t)"" loading=""lazy"" style=""position:absolute;inset:0;width:100%;height:100%;border:0"" allow=""accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"" referrerpolicy=""strict-origin-when-cross-origin"" allowfullscreen></iframe></div>`n<p>$(E $v.d)</p>`n")
  }
  if ($g) {
    [void]$sb.Append("<h2>관련 재배 안내 · 에이농티비 쇼츠</h2>`n")
    foreach ($x in $g) { [void]$sb.Append("<a class=""guide"" href=""$($x.u)""><img src=""https://i.ytimg.com/vi/$($x.v)/hqdefault.jpg"" alt="""" loading=""lazy""><div><b>$(E $x.t)</b><span>원인과 관리 순서를 국가기관 자료로 정리하고 30초 쇼츠로 담았습니다 →</span></div></a>`n") }
  }
  if ($p.자주묻는질문) {
    [void]$sb.Append("<h2>자주 묻는 질문</h2>`n")
    $first = $true
    foreach ($q in $p.자주묻는질문) { $o = if ($first) { ' open' } else { '' }; $first = $false; [void]$sb.Append("<details$o><summary>$(E $q.질문)</summary><p>$(E $q.답변)</p></details>`n") }
  }
  [void]$sb.Append("<div class=""cta""><a href=""../crop-advisor.html?from=product-$slug"">우리 작물 증상 상담봇에 물어보기</a><a class=""ghost"" href=""tel:0228586229"">구매·사용 문의 02-858-6229</a></div>`n")
  [void]$sb.Append("<h2>다른 제품</h2>`n<div class=""others"">")
  foreach ($o in $all) { if ($o.제품명 -ne $name -and $SlugMap[$o.제품명]) { [void]$sb.Append("<a href=""$($SlugMap[$o.제품명]).html"">$(E $o.제품명)</a>") } }
  [void]$sb.Append("</div>`n</main>`n")
  [void]$sb.Append($footer)

  # ── 손으로 덧붙인 내용 지키기 ───────────────────────────────────────────
  # 「제품 영상」과 .more 줄의 추가 링크(인쇄용 안내·쇼츠 등)는 이 스크립트가
  # 모르는 내용이다. 영상 연결 작업이 나중에 페이지에 직접 붙이기 때문이다.
  # 그냥 덮어쓰면 사라진다 — 2026-11-14 실제로 6개 페이지에서 제품 영상이
  # 지워지는 것을 확인하고 이 장치를 넣었다.
  $outPath = Join-Path $outDir "$slug.html"
  $page = $sb.ToString()
  $old = ''
  if (Test-Path -LiteralPath $outPath) { $old = [IO.File]::ReadAllText($outPath, $utf8) }

  if ($old) {
    # ① 제품 영상 블록 — <h2>제품 영상</h2> 부터 상담봇 버튼(.cta) 앞까지
    $mv = [regex]::Match($old, '(?s)<h2>제품 영상</h2>.*?(?=<div class="cta">|</main>)')
    if ($mv.Success -and $page -notmatch '<h2>제품 영상</h2>') {
      $at = $page.IndexOf('<div class="cta">')
      if ($at -ge 0) { $page = $page.Insert($at, $mv.Value) }
    }

    # ② .more 줄에 손으로 더한 링크 (스크립트가 만든 계산기 링크 말고 더 있는 것)
    $mo = [regex]::Match($old,  '(?s)<p class="more">(.*?)</p>')
    $mn = [regex]::Match($page, '(?s)<p class="more">(.*?)</p>')
    if ($mo.Success -and $mn.Success) {
      $extra = ''
      foreach ($a in [regex]::Matches($mo.Groups[1].Value, '(?s)<a\s.*?</a>')) {
        if (-not $mn.Groups[1].Value.Contains($a.Value)) { $extra += $a.Value }
      }
      if ($extra) {
        $page = $page.Remove($mn.Index, $mn.Length).Insert($mn.Index, '<p class="more">' + $mn.Groups[1].Value + $extra + '</p>')
      }
    }

    # ③ 그래도 잃는 게 있으면 아예 덮어쓰지 않는다.
    #    조용히 지워지는 것보다, 안 바꾸고 알려주는 쪽이 낫다.
    #    (영상이 둘 이상인 페이지, 구조화 데이터의 VideoObject 등)
    $lost = @()
    foreach ($u in [regex]::Matches($old, 'youtube-nocookie\.com/embed/[A-Za-z0-9_-]+')) {
      if (-not $page.Contains($u.Value)) { $lost += "영상 $($u.Value -replace '.*/','')" }
    }
    foreach ($g in [regex]::Matches($old, 'href="\.\./guide/[^"]+"')) {
      if (-not $page.Contains($g.Value)) { $lost += "안내 $($g.Value -replace '.*guide/','' -replace '"','')" }
    }
    if ($old.Contains('"VideoObject"') -and -not $page.Contains('"VideoObject"')) { $lost += 'VideoObject(구조화 데이터)' }
    $lost = @($lost | Select-Object -Unique)
    if ($lost.Count -gt 0) {
      Write-Warning "$slug.html - 덮어쓰지 않았습니다. 이 페이지에만 있는 내용이 지워집니다: $($lost -join ', '). 영상·안내 연결 작업에서 다시 붙여 주세요."
      $skipped += "$slug.html"
      continue
    }
  }
  [IO.File]::WriteAllText($outPath, $page, $utf8)
}

# 목록 페이지
$listLd = '{"@context":"https://schema.org","@type":"ItemList","name":"에이블팜 제품","itemListElement":[' + (@(for ($i = 0; $i -lt $all.Count; $i++) { $s = $SlugMap[$all[$i].제품명]; '{"@type":"ListItem","position":' + ($i + 1) + ',"url":"' + $site + '/products/' + $s + '.html","name":"' + (J $all[$i].제품명) + '"}' }) -join ',') + ']}'
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append((Header '에이블팜 제품 전체 — 작물별 액상 영양·유기농업자재' '(주)에이블팜의 작물별 액상 영양제·유기농업자재 전 제품. 제품별 성분·효과·희석배수·사용 시기·자주 묻는 질문.' "$site/products/" "$site/assets/logo-full.jpg" $listLd))
[void]$sb.Append("<main>`n<p class=""crumb""><a href=""../"">에이블팜</a> › 제품</p>`n<h1>에이블팜 제품 전체</h1>`n<div class=""grid"">")
foreach ($p in $all) { $s = $SlugMap[$p.제품명]; if ($s) { [void]$sb.Append("<a href=""$s.html""><img src=""../$($p.이미지)"" alt=""$(E $p.제품명)"" loading=""lazy""><b>$(E $p.제품명)</b><span>$(E $p.한줄설명)</span></a>") } }
[void]$sb.Append("</div>`n</main>`n")
[void]$sb.Append($footer)
[IO.File]::WriteAllText((Join-Path $outDir 'index.html'), $sb.ToString(), $utf8)
"생성 완료: $($all.Count - $skipped.Count)개 제품 + 목록"
if ($skipped.Count -gt 0) {
  ""
  "덮어쓰지 않고 넘어간 페이지 $($skipped.Count)개 — 이 스크립트가 모르는 내용(제품 영상 등)이 들어 있습니다:"
  $skipped | ForEach-Object { "  - $_" }
  "이 페이지들을 바꾸려면, 영상 연결 작업에서 영상을 다시 붙이거나 이 스크립트가 영상까지 만들도록 고쳐야 합니다."
}
