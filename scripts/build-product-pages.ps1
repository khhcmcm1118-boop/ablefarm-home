# 제품별 독립 페이지 생성기 — data/products.json → products/<slug>.html + products/index.html
# 사용법(저장소 루트에서):  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-product-pages.ps1
# 제품 자료(products.json)를 고친 뒤 다시 돌리면 페이지가 그대로 갱신된다.
# 새 쇼츠 안내 페이지가 생기면 아래 $Guides 에 한 줄 추가한다.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$site = 'https://www.ablefarm.co.kr'
$j = Get-Content (Join-Path $root 'data\products.json') -Raw -Encoding UTF8 | ConvertFrom-Json

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
  '임팩트과립' = @(@{t='벼 깨씨무늬병 — 원인은 흙 속에 있습니다'; u='../guide/rice-brown-spot.html'; v='cXLysImyLjk'})
  '칼슘탄'     = @(@{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '아미닥터'   = @(@{t='고추 탄저병 — 범인은 빗방울, 장마철 관리 순서'; u='../guide/pepper-anthracnose.html'; v='3HrCOXWGfPE'})
  '일소가드'   = @(@{t='사과 일소(햇볕 데임) — 데기 전에 막는 법'; u='../guide/apple-sunburn.html'; v='FUqkyk16ZXo'})
  '임팩트원'   = @(@{t='김장 무가 먼저 언다 — 배추·무 언 피해 대비'; u='../guide/kimjang-frost.html'; v='W7zAvaR1o1U'},
                   @{t='겨울 하우스, 병의 범인은 밤 이슬 — 결로·다습 관리'; u='../guide/greenhouse-winter.html'; v='OmfrclBgBHw'})
  '하이슈거'   = @(@{t='밍밍한 딸기, 범인은 따뜻한 밤 — 단계별 밤 온도'; u='../guide/strawberry-night-temp.html'; v='YLPreraNDtw'})
  '히미업'     = @(@{t='겨울 하우스, 병의 범인은 밤 이슬 — 결로·다습 관리'; u='../guide/greenhouse-winter.html'; v='OmfrclBgBHw'})
  '속딴딴'     = @(@{t='김장 무가 먼저 언다 — 배추·무 언 피해 대비'; u='../guide/kimjang-frost.html'; v='W7zAvaR1o1U'})
}
# 제품 → 제품 홍보 영상(가로, 유튜브 「동영상」)
$Videos = @{
  '하이슈거' = @{id='mhv9q9_zUME'; t='딸기 당도 관리 — 밤 온도로 지키고, 하이슈거로 채운다'; d='딸기 단계별 밤 온도(농촌진흥청)와 하이슈거의 성분·사용법(500~1,000배, 수확 30~50일 전 비대기·착색기 엽면살포)을 1분 20초로 정리한 에이블팜 제품 영상입니다.'; dur='PT1M21S'; date='2026-10-30'}
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
  (주)에이블팜 · <a href="https://www.ablefarm.co.kr">www.ablefarm.co.kr</a> · 고객센터 02-858-6229 (평일 09:00–17:00)<br>
  제품 사용 결과는 환경 조건에 따라 달라질 수 있습니다. 병해충은 해당 작물에 등록된 약제로 방제하고, 정확한 처방은 지역 농업기술센터 상담에 따르세요.
</footer>
</body>
</html>
'@

$outDir = Join-Path $root 'products'
New-Item -ItemType Directory -Force $outDir | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$all = @($j.제품)

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
  $v = $Videos[$name]
  $vidLd = ''
  if ($v) { $vidLd = '{"@type":"VideoObject","name":"' + (J $v.t) + '","description":"' + (J $v.d) + '","thumbnailUrl":"https://i.ytimg.com/vi/' + $v.id + '/hqdefault.jpg","uploadDate":"' + $v.date + '","duration":"' + $v.dur + '","contentUrl":"https://www.youtube.com/watch?v=' + $v.id + '","embedUrl":"https://www.youtube-nocookie.com/embed/' + $v.id + '","about":{"@id":"' + $canon + '#product"},"publisher":{"@type":"Organization","name":"(주)에이블팜"}},' }
  $ld = '{"@context":"https://schema.org","@graph":[' +
    '{"@type":"Product","@id":"' + $canon + '#product","name":"' + (J $name) + '","description":"' + (J $desc) + '","image":"' + $img + '","category":"' + (J $p.분류) + '","brand":{"@type":"Brand","name":"에이블팜"},"manufacturer":{"@type":"Organization","name":"(주)에이블팜","url":"' + $site + '"},"url":"' + $canon + '"' + $subjectOf + '},' + $vidLd +
    '{"@type":"FAQPage","mainEntity":[' + $faqLd + ']},' +
    '{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"에이블팜","item":"' + $site + '/"},{"@type":"ListItem","position":2,"name":"제품","item":"' + $site + '/products/"},{"@type":"ListItem","position":3,"name":"' + (J $name) + '"}]}' +
    ']}'

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append((Header $title $desc $canon $img $ld))
  [void]$sb.Append("<main>`n<p class=""crumb""><a href=""../"">에이블팜</a> › <a href=""./"">제품</a> › $(E $name)</p>`n")
  [void]$sb.Append("<div class=""hero""><img src=""../$($p.이미지)"" alt=""에이블팜 $(E $name) 제품 사진""><div><div class=""cat"">$(E $p.분류)</div><h1>$(E $name)</h1><p class=""tag"">$(E $p.한줄설명)</p><p class=""sum"">$(E $p.요약)</p></div></div>`n")
  [void]$sb.Append("<h2>사용 방법</h2>`n<dl class=""spec""><dt>희석 배수</dt><dd>$(E $p.희석배수)</dd><dt>사용 시기</dt><dd>$(E $p.사용시기)</dd><dt>사용 횟수·규격</dt><dd>$(E $p.사용횟수)</dd><dt>적용 작물</dt><dd>$(E $p.적용작물)</dd><dt>규격</dt><dd>$(E $p.규격)</dd></dl>`n")
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
  if ($v) {
    [void]$sb.Append("<h2>제품 영상</h2>`n<div style=""position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000;margin:10px 0""><iframe src=""https://www.youtube-nocookie.com/embed/$($v.id)"" title=""$(E $v.t)"" loading=""lazy"" style=""position:absolute;inset:0;width:100%;height:100%;border:0"" allow=""accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"" referrerpolicy=""strict-origin-when-cross-origin"" allowfullscreen></iframe></div>`n<p>$(E $v.d)</p>`n")
  }
  if ($g) {
    [void]$sb.Append("<h2>관련 재배 안내 · 에팜티비 쇼츠</h2>`n")
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
  [IO.File]::WriteAllText((Join-Path $outDir "$slug.html"), $sb.ToString(), $utf8)
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
"생성 완료: $($all.Count)개 제품 + 목록"
