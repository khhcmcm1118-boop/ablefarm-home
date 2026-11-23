/*
 * 에이블팜 공통 맨 위 메뉴 (2026-11-21)
 * 어느 페이지든 <body> 바로 뒤에 한 줄만 넣으면 홈페이지와 같은 메뉴가 맨 위에 붙어 있게 된다.
 *   <script src="/assets/site-nav.js" data-now="today"></script>
 * data-now: 지금 페이지 = info · today · qna · calendar · garden · buy (해당 메뉴를 굵게)
 * 메뉴 순서·이름을 바꾸려면 아래 ITEMS 만 고치면 모든 페이지가 같이 바뀐다.
 * 홈페이지(index.html)의 메뉴도 같은 순서로 맞춰 둔다.
 */
(function () {
  if (window.__afNav) return; window.__afNav = 1;
  var me = document.currentScript;
  var now = (me && me.getAttribute('data-now')) || '';
  var R = '/'; // 사이트 맨 위 (www.ablefarm.co.kr/)
  var INFO = [
    ['회사소개', R + '#about', '에이블팜은 어떤 회사인가요'],
    ['주요제품', R + '#detail', '대표 제품 한눈에 보기'],
    ['제품소개', R + '#products', '작물별 전체 제품'],
    ['카다로그', R + 'catalog/index.html', '제품 카탈로그 펼쳐 보기'],
    ['희석 계산기', R + 'calc/', '물에 몇 배로 타나요']
  ];
  var ITEMS = [
    ['today', '오늘 농업현황', R + 'today/', '농업현황'], // 네 번째 = 휴대폰에서 줄여 쓰는 이름
    ['qna', '농사문의', R + '#qna'],
    ['calendar', '재배력', R + 'calendar/'],
    ['garden', '텃밭', R + 'garden/'],
    ['buy', '구매문의', R + '#buy']
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var css = [
    '.afn{position:fixed;top:0;left:0;right:0;z-index:55;background:#faf7ef;border-bottom:1px solid #dcd8c7;font-family:"Pretendard",system-ui,-apple-system,"Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased}',
    '.afn *{box-sizing:border-box}',
    '.afn-in{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:44px;padding:14px 40px}',
    '.afn-logo{display:flex;flex:none}.afn-logo img{height:46px;width:auto;display:block;mix-blend-mode:multiply}',
    '.afn-links{display:flex;align-items:center;gap:26px;font-size:15px;font-weight:600;color:#4c554a}',
    '.afn-links>a,.afn-info>button{color:inherit;text-decoration:none;padding:7px 0;white-space:nowrap;background:none;border:0;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px}',
    '.afn-links>a:hover,.afn-info>button:hover{color:#1E5C1E}',
    '.afn-links .on{color:#1E5C1E;font-weight:800;box-shadow:inset 0 -2px 0 #1E5C1E}',
    '.afn-info{position:relative}',
    '.afn-cta{margin-left:auto;flex:none;white-space:nowrap;padding:11px 22px;background:#16271c;color:#fff;border-radius:100px;font-weight:700;font-size:13.5px;text-decoration:none}',
    '.afn-cta:hover{background:#1E5C1E}',
    '.afn-info>button i{font-style:normal;font-size:10px;transition:transform .2s}',
    '.afn-info.open>button i{transform:rotate(180deg)}',
    '.afn-menu{position:absolute;top:calc(100% + 12px);left:-18px;min-width:236px;padding:8px;background:#fffdf8;border:1px solid #e2ddcb;border-radius:16px;box-shadow:0 18px 40px -12px rgba(22,39,28,.28);display:none}',
    '.afn-info.open .afn-menu{display:block}',
    '.afn-menu a{display:block;padding:10px 12px;border-radius:10px;color:#16241a;text-decoration:none}',
    '.afn-menu a:hover{background:#f1ede2}.afn-menu b{display:block;font-size:14.5px}.afn-menu small{display:block;font-size:12px;color:#6b7565;font-weight:500;margin-top:2px}',
    /* 휴대폰: 한 줄 — 로고 + 옆으로 밀리는 메뉴 */
    '@media (max-width:1024px){.afn-in{gap:24px;padding:12px 20px}.afn-links{gap:18px;font-size:14.5px}}',
    '.afn-s{display:none}',
    /* 휴대폰: 메뉴 6개가 한 줄에 다 보이게 — 글자·간격을 줄이고 「오늘 농업현황」은 「농업현황」으로 (2026-11-23)
       (전에는 폭이 넘쳐 페이지에 따라 「회사정보」나 「텃밭·구매문의」가 화면 밖으로 밀렸다) */
    '@media (max-width:760px){.afn-in{gap:8px;padding:8px 8px 8px 10px}.afn-logo img{height:30px}.afn-cta{display:none}',
    '.afn-l{display:none}.afn-s{display:inline}.afn-info>button i{font-size:8px}',
    /* 375px 이상이면 다 들어간다. 그보다 좁은 휴대폰에서만 옆으로 밀어 볼 수 있게 남겨 둔다 */
    '.afn-links{gap:11px;font-size:13.5px;letter-spacing:-.02em;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
    '.afn-links::-webkit-scrollbar{display:none}',
    /* 「회사정보」를 펼치면 오른쪽 흐림 효과(mask)가 펼친 목록까지 잘라 안 보였다 → 펼쳤을 때는 흐림을 끈다 (2026-11-23) */
    '.afn-links.afn-open{mask-image:none;-webkit-mask-image:none}',
    '.afn-menu{position:fixed;top:52px;left:12px;right:12px;min-width:0}}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var nav = document.createElement('nav');
  nav.className = 'afn'; nav.setAttribute('aria-label', '에이블팜 주요 메뉴');
  nav.innerHTML =
    '<div class="afn-in">' +
      '<a class="afn-logo" href="' + R + '"><img src="' + R + 'assets/logo-full.jpg" alt="(주)에이블팜 Able FARM · 메인으로"></a>' +
      '<div class="afn-links">' +
        '<span class="afn-info"><button type="button" aria-expanded="false"' + (now === 'info' ? ' class="on"' : '') + '>회사정보<i>▼</i></button>' +
          '<div class="afn-menu">' + INFO.map(function (x) { return '<a href="' + x[1] + '"><b>' + esc(x[0]) + '</b><small>' + esc(x[2]) + '</small></a>'; }).join('') + '</div></span>' +
        ITEMS.map(function (x) { return '<a href="' + x[2] + '"' + (x[0] === now ? ' class="on" aria-current="page"' : '') + (x[3] ? ' aria-label="' + esc(x[1]) + '"' : '') + '>' +
          (x[3] ? '<span class="afn-l">' + esc(x[1]) + '</span><span class="afn-s">' + esc(x[3]) + '</span>' : esc(x[1])) + '</a>'; }).join('') +
      '</div>' +
      '<a class="afn-cta" href="' + R + '#qna">문의하기 →</a>' +
    '</div>';
  document.body.insertBefore(nav, document.body.firstChild);
  // 메뉴가 화면 맨 위에 고정되므로, 그 높이만큼 빈칸을 두어 본문이 가려지지 않게 한다
  var spacer = document.createElement('div'); spacer.className = 'afn-space';
  nav.parentNode.insertBefore(spacer, nav.nextSibling);
  function fit() { var h = nav.offsetHeight; spacer.style.height = h + 'px'; document.documentElement.style.scrollPaddingTop = (h + 8) + 'px'; }
  fit(); window.addEventListener('resize', fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(nav);

  // 홈페이지 안에서는 #qna·#buy 등을 눌러도 새로고침 없이 그 화면으로 (index.html 의 window.afGo)
  var isHome = /^\/(index\.html)?$/.test(location.pathname);
  nav.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/#"]');
    if (!a || !isHome) return;
    var id = a.getAttribute('href').slice(2);
    if (window.afGo && window.afGo(id)) { e.preventDefault(); info.classList.remove('open'); }
  });

  var info = nav.querySelector('.afn-info'), btn = info.querySelector('button');
  btn.addEventListener('click', function (e) { e.stopPropagation(); var o = info.classList.toggle('open'); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  document.addEventListener('click', function (e) { if (!info.contains(e.target)) { info.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  // 펼침 상태를 메뉴 줄에도 표시해 휴대폰 흐림 효과를 끈다(위 CSS .afn-open)
  var linksBox = info.parentElement;
  new MutationObserver(function () { linksBox.classList.toggle('afn-open', info.classList.contains('open')); }).observe(info, { attributes: true, attributeFilter: ['class'] });
  // 휴대폰에서도 메뉴는 늘 맨 앞 「회사정보」부터 보이게 둔다 (2026-11-23 사용자: 휴대폰에서 회사정보 메뉴가 안 보인다)
  // — 전에는 지금 페이지 메뉴(예: 텃밭) 쪽으로 저절로 밀어서 「회사정보」가 왼쪽 밖으로 숨었다.
  //   11-23 오후부터는 휴대폰(375px 이상)에서 메뉴 6개가 한 줄에 다 들어가 밀 필요가 없다.
  var box = nav.querySelector('.afn-links'); if (box) box.scrollLeft = 0;
})();
