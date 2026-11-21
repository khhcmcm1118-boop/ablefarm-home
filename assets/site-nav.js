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
    ['today', '오늘 농업현황', R + 'today/'],
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
    '@media (max-width:760px){.afn-in{gap:12px;padding:8px 0 8px 14px}.afn-logo img{height:34px}.afn-cta{display:none}',
    '.afn-links{gap:18px;font-size:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-right:16px;mask-image:linear-gradient(90deg,#000 88%,transparent)}',
    '.afn-links::-webkit-scrollbar{display:none}',
    '.afn-menu{position:fixed;top:56px;left:12px;right:12px;min-width:0}}'
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
        ITEMS.map(function (x) { return '<a href="' + x[2] + '"' + (x[0] === now ? ' class="on" aria-current="page"' : '') + '>' + esc(x[1]) + '</a>'; }).join('') +
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
  // 휴대폰에서 지금 페이지 메뉴가 화면 밖에 있을 때만 살짝 밀어 보여 준다
  var on = nav.querySelector('.afn-links > a.on');
  if (on) { var box = nav.querySelector('.afn-links'); var right = on.offsetLeft - box.offsetLeft + on.offsetWidth; if (right > box.clientWidth - 24) box.scrollLeft = right - box.clientWidth + 40; }
})();
