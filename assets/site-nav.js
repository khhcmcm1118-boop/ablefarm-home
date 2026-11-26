/*
 * 에이블팜 공통 맨 위 메뉴 (2026-11-21)
 * 어느 페이지든 <body> 바로 뒤에 한 줄만 넣으면 홈페이지와 같은 메뉴가 맨 위에 붙어 있게 된다.
 *   <script src="/assets/site-nav.js" data-now="today"></script>
 * data-now: 지금 페이지 = info · today · week · qna · calendar · garden · buy · jiwon (해당 메뉴를 굵게)
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
  // 「오늘 농업현황 ▼」를 누르면 펼쳐지는 목록 (2026-11-23 사용자 지시). 네 번째 = 그 페이지의 data-now
  var TODAY = [
    ['오늘 농업현황', R + 'today/', '날씨·물·시세·병해충 한눈에', 'today'],
    ['이번 달 할 일', R + 'calendar/', '작물별 이번 달 일과 한 해 재배력', 'calendar'],
    ['이번 주 꼭 할 일', R + 'week/', '농촌진흥청 주간농사정보 기준', 'week']
  ];
  var ITEMS = [
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
    /* 「지원사업·행사」 — 구매문의 오른쪽에 조금 떨어뜨린 별도 칸 (2026-11-25 사용자 지시) */
    '.afn-links>a.afn-sup{margin-left:14px;padding:7px 15px;border:1px solid #cfd9c6;border-radius:100px;background:#eef4ea;color:#1E5C1E;position:relative}',
    '.afn-links>a.afn-sup::before{content:"";position:absolute;left:-21px;top:50%;width:1px;height:18px;margin-top:-9px;background:#d4cfbd}',
    '.afn-links>a.afn-sup.on{box-shadow:none;background:#1E5C1E;color:#fff;border-color:#1E5C1E}',
    /* 벤처인증기업 배지 (2026-11-25 사용자 지시, 메달 = 사용자가 준 확인서 메달 그림) — 문의하기 왼쪽 */
    '.afn-vb{margin-left:auto;flex:none;display:flex;align-items:center;gap:8px;text-decoration:none}',
    '.afn-vb img{height:44px;width:auto;display:block;filter:drop-shadow(0 2px 3px rgba(120,84,10,.3))}',
    '.afn-vb b{font-size:14.5px;font-weight:800;letter-spacing:-.01em;white-space:nowrap;background:linear-gradient(180deg,#a7791c,#6f4b0c);-webkit-background-clip:text;background-clip:text;color:transparent}',
    '@media (max-width:1180px){.afn-vb b{display:none}}',
    '.afn-vb+.afn-cta{margin-left:-26px}@media (max-width:1024px){.afn-vb+.afn-cta{margin-left:-10px}}',
    /* ISO 인증기업 배지 (2026-11-26 사용자 지시, 로고 = 한국기업인증원 인증서의 ISO 인증 마크) — 벤처 배지 오른쪽.
       두 배지는 누르면 인증서 창(.afn-cert)이 열린다. ※ 「afc」 같은 광고 이름은 광고 차단기가 숨기므로 쓰지 않는다 (11-26) */
    'button.afn-vb{background:none;border:0;padding:0;font:inherit;cursor:pointer}',
    '.afn-vb:hover b{filter:brightness(1.25)}',
    '.afn-vb.afn-iso{margin-left:-26px}.afn-iso img{height:40px}',
    '@media (max-width:1024px){.afn-vb.afn-iso{margin-left:-10px}}',
    /* 태블릿 폭(761~960px)은 메뉴가 넘쳐 「문의하기」가 잘린다 → 숨김 (농사문의 메뉴로 같은 곳에 갈 수 있다) */
    '@media (max-width:960px){.afn-cta{display:none}.afn-in{gap:18px}.afn-links{gap:15px}}',
    '.afn-cta{margin-left:0;flex:none;white-space:nowrap;padding:11px 22px;background:#16271c;color:#fff;border-radius:100px;font-weight:700;font-size:13.5px;text-decoration:none}',
    '.afn-cta:hover{background:#1E5C1E}',
    '.afn-info>button i{font-style:normal;font-size:10px;transition:transform .2s}',
    '.afn-info.open>button i{transform:rotate(180deg)}',
    '.afn-menu{position:absolute;top:calc(100% + 12px);left:-18px;min-width:236px;padding:8px;background:#fffdf8;border:1px solid #e2ddcb;border-radius:16px;box-shadow:0 18px 40px -12px rgba(22,39,28,.28);display:none}',
    '.afn-info.open .afn-menu{display:block}',
    '.afn-menu a{display:block;padding:10px 12px;border-radius:10px;color:#16241a;text-decoration:none}',
    '.afn-menu a[aria-current]{background:#eef4ea}.afn-menu a[aria-current] b{color:#1E5C1E}',
    '.afn-menu a:hover{background:#f1ede2}.afn-menu b{display:block;font-size:14.5px}.afn-menu small{display:block;font-size:12px;color:#6b7565;font-weight:500;margin-top:2px}',
    /* 휴대폰: 한 줄 — 로고 + 옆으로 밀리는 메뉴 */
    '@media (max-width:1024px){.afn-in{gap:24px;padding:12px 20px}.afn-links{gap:18px;font-size:14.5px}}',
    '.afn-s{display:none}',
    /* 휴대폰: 메뉴 6개가 한 줄에 다 보이게 — 글자·간격을 줄이고 「오늘 농업현황」은 「농업현황」으로 (2026-11-23)
       (전에는 폭이 넘쳐 페이지에 따라 「회사정보」나 「텃밭·구매문의」가 화면 밖으로 밀렸다) */
    '@media (max-width:760px){.afn-in{gap:8px;padding:8px 8px 8px 10px}.afn-logo img{height:30px}.afn-cta{display:none}.afn-vb{display:none}',
    '.afn-l{display:none}.afn-s{display:inline}.afn-info>button{gap:2px}.afn-info>button i{font-size:8px}',
    /* 375px 이상이면 다 들어간다. 그보다 좁은 휴대폰에서만 옆으로 밀어 볼 수 있게 남겨 둔다 */
    '.afn-links{gap:10px;font-size:13.5px;letter-spacing:-.03em;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
    '.afn-links::-webkit-scrollbar{display:none}',
    /* 「회사정보」를 펼치면 오른쪽 흐림 효과(mask)가 펼친 목록까지 잘라 안 보였다 → 펼쳤을 때는 흐림을 끈다 (2026-11-23) */
    '.afn-links.afn-open{mask-image:none;-webkit-mask-image:none}',
    /* 휴대폰은 메뉴 줄이 꽉 차서 「지원사업·행사」를 메뉴 아래 얇은 띠로 따로 보여 준다 */
    '.afn-links>a.afn-sup{display:none}.afn-sup2{display:flex}}',
    '.afn-sup2{display:none;align-items:center;justify-content:center;gap:6px;padding:6px 12px;background:#eef4ea;border-top:1px solid #dfe8d8;color:#1E5C1E;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:-.01em}',
    '.afn-sup2.on{background:#1E5C1E;color:#fff}',
    '@media (max-width:760px){.afn-sup2{display:flex}',
    '.afn-menu{position:fixed;top:52px;left:12px;right:12px;min-width:0}}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var nav = document.createElement('nav');
  nav.className = 'afn'; nav.setAttribute('aria-label', '에이블팜 주요 메뉴');
  // 펼침 메뉴 하나 (회사정보 · 오늘 농업현황 공통)
  function dd(key, label, short, list, onKeys) {
    var on = onKeys.indexOf(now) >= 0;
    return '<span class="afn-info" data-dd="' + key + '"><button type="button" aria-expanded="false"' + (on ? ' class="on"' : '') + (short ? ' aria-label="' + esc(label) + '"' : '') + '>' +
      (short ? '<span class="afn-l">' + esc(label) + '</span><span class="afn-s">' + esc(short) + '</span>' : esc(label)) + '<i>▼</i></button>' +
      '<div class="afn-menu">' + list.map(function (x) { return '<a href="' + x[1] + '"' + (x[3] && x[3] === now ? ' aria-current="page"' : '') + '><b>' + esc(x[0]) + '</b><small>' + esc(x[2]) + '</small></a>'; }).join('') + '</div></span>';
  }
  nav.innerHTML =
    '<div class="afn-in">' +
      '<a class="afn-logo" href="' + R + '"><img src="' + R + 'assets/logo-full.jpg" alt="(주)에이블팜 Able FARM · 메인으로"></a>' +
      '<div class="afn-links">' +
        dd('info', '회사정보', '', INFO, ['info']) +
        dd('today', '오늘 농업현황', '농업현황', TODAY, ['today', 'week']) +
        ITEMS.map(function (x) { return '<a href="' + x[2] + '"' + (x[0] === now ? ' class="on" aria-current="page"' : '') + '>' + esc(x[1]) + '</a>'; }).join('') +
        '<a class="afn-sup' + (now === 'jiwon' ? ' on" aria-current="page' : '') + '" href="' + R + 'jiwon/"><span class="afn-l">지원사업·행사</span><span class="afn-s">지원·행사</span></a>' +
      '</div>' +
      '<button type="button" class="afn-vb" data-cert="venture" title="벤처기업확인서 보기 · 유효기간 2026.11.24 ~ 2029.11.23"><img src="' + R + 'assets/venture-medal.png" alt="벤처기업확인 메달"><b>벤처인증기업</b></button>' +
      '<button type="button" class="afn-vb afn-iso" data-cert="iso" title="ISO 9001·14001·45001 인증서 보기 · 한국기업인증원"><img src="' + R + 'assets/iso-seal.png" alt="ISO 인증 마크"><b>ISO 인증기업</b></button>' +
      '<a class="afn-cta" href="' + R + '#qna">문의하기 →</a>' +
    '</div>' +
    '<a class="afn-sup2' + (now === 'jiwon' ? ' on" aria-current="page' : '') + '" href="' + R + 'jiwon/">🌱 농업 지원사업·행사 모아보기 →</a>';
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
    if (window.afGo && window.afGo(id)) { e.preventDefault(); closeAll(); }
  });

  // 펼침 메뉴: 하나를 열면 다른 것은 닫힌다. 메뉴 밖을 누르면 모두 닫힌다
  var dds = [].slice.call(nav.querySelectorAll('.afn-info'));
  var linksBox = nav.querySelector('.afn-links');
  function setOpen(d, o) { d.classList.toggle('open', o); d.querySelector('button').setAttribute('aria-expanded', o ? 'true' : 'false'); }
  function closeAll() { dds.forEach(function (d) { setOpen(d, false); }); linksBox.classList.remove('afn-open'); }
  dds.forEach(function (d) {
    d.querySelector('button').addEventListener('click', function (e) {
      e.stopPropagation();
      var o = !d.classList.contains('open');
      closeAll(); setOpen(d, o);
      linksBox.classList.toggle('afn-open', o); // 휴대폰 흐림 효과 끄기(위 CSS .afn-open)
    });
  });
  document.addEventListener('click', function (e) { if (!dds.some(function (d) { return d.contains(e.target); })) closeAll(); });
  // 휴대폰에서도 메뉴는 늘 맨 앞 「회사정보」부터 보이게 둔다 (2026-11-23 사용자: 휴대폰에서 회사정보 메뉴가 안 보인다)
  // — 전에는 지금 페이지 메뉴(예: 텃밭) 쪽으로 저절로 밀어서 「회사정보」가 왼쪽 밖으로 숨었다.
  //   11-23 오후부터는 휴대폰(375px 이상)에서 메뉴 6개가 한 줄에 다 들어가 밀 필요가 없다.
  var box = nav.querySelector('.afn-links'); if (box) box.scrollLeft = 0;

  // ── 인증서 보기 창 (2026-11-26) ──────────────────────────────
  // data-cert="venture" 또는 "iso" 가 붙은 것을 누르면 열린다 (맨 위 메뉴 배지, 홈페이지 휴대폰 첫 화면 배지 공통)
  var CERTS = {
    venture: { t: '벤처기업확인서', s: '혁신성장유형 · 유효기간 2026.11.24 ~ 2029.11.23 · 벤처기업확인기관',
      tabs: [['벤처기업확인서', [['', 'venture.jpg']]]] },
    iso: { t: 'ISO 경영시스템 인증서', s: '한국기업인증원(KOCI) · 유효기간 2026.11.24 ~ 2029.11.23 · 인증범위: 비료 및 유기농업자재의 개발, 제조(OEM), 유통·판매 및 농작물 기술지원 서비스',
      tabs: [['ISO 9001 품질', [['국문', 'iso9001-ko.jpg'], ['영문', 'iso9001-en.jpg']]],
             ['ISO 14001 환경', [['국문', 'iso14001-ko.jpg'], ['영문', 'iso14001-en.jpg']]],
             ['ISO 45001 안전보건', [['국문', 'iso45001-ko.jpg'], ['영문', 'iso45001-en.jpg']]]] }
  };
  var ccss = [
    '.afn-cert{position:fixed;inset:0;z-index:200;background:rgba(10,20,14,.72);display:none;align-items:flex-start;justify-content:center;padding:28px 16px;overflow-y:auto;font-family:"Pretendard",system-ui,-apple-system,"Malgun Gothic",sans-serif}',
    '.afn-cert.open{display:flex}',
    '.afn-cert *{box-sizing:border-box}',
    '.afn-cert-box{position:relative;width:100%;max-width:760px;background:#fffdf8;border-radius:20px;padding:20px 20px 18px;box-shadow:0 30px 70px -20px rgba(0,0,0,.6)}',
    '.afn-cert-x{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:50%;border:0;background:#f1ede2;font-size:20px;cursor:pointer;color:#16241a}',
    '.afn-cert h2{margin:0 44px 4px 0;font-size:20px;color:#16241a;letter-spacing:-.01em}',
    '.afn-cert p{margin:0 0 12px;font-size:13px;line-height:1.55;color:#6b7565}',
    '.afn-cert-tabs,.afn-cert-lang{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
    '.afn-cert-tabs button,.afn-cert-lang button{font:inherit;font-size:14px;font-weight:700;border:1px solid #dcd8c7;background:#fff;color:#4c554a;padding:7px 14px;border-radius:100px;cursor:pointer}',
    '.afn-cert-tabs button.on{background:#16271c;border-color:#16271c;color:#fff}',
    '.afn-cert-lang button{font-size:12.5px;padding:5px 11px}.afn-cert-lang button.on{background:#eef4ea;border-color:#1E5C1E;color:#1E5C1E}',
    '.afn-cert-img{display:block;width:100%;height:auto;border:1px solid #e2ddcb;border-radius:8px;background:#fff}',
    '.afn-cert-big{display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:#1E5C1E;text-decoration:none}',
    '@media (max-width:760px){.afn-cert{padding:12px 8px}.afn-cert-box{padding:16px 12px 14px;border-radius:16px}.afn-cert h2{font-size:17px}}'
  ].join('');
  var cst = document.createElement('style'); cst.textContent = ccss; document.head.appendChild(cst);
  var cw = document.createElement('div'); cw.className = 'afn-cert'; cw.setAttribute('role', 'dialog'); cw.setAttribute('aria-modal', 'true');
  cw.innerHTML = '<div class="afn-cert-box"><button type="button" class="afn-cert-x" aria-label="닫기">✕</button><h2></h2><p></p><div class="afn-cert-tabs"></div><div class="afn-cert-lang"></div>' +
    '<img class="afn-cert-img" alt=""><a class="afn-cert-big" target="_blank" rel="noopener">원본 크기로 보기 ↗</a></div>';
  document.body.appendChild(cw);
  var cur = null, ti = 0, li = 0, lastFocus = null;
  function drawCert() {
    var c = CERTS[cur], tab = c.tabs[ti], pg = tab[1][li], src = R + 'assets/cert/' + pg[1];
    cw.querySelector('h2').textContent = c.t; cw.querySelector('p').textContent = c.s;
    cw.querySelector('.afn-cert-tabs').innerHTML = c.tabs.length > 1 ? c.tabs.map(function (x, i) { return '<button type="button" data-t="' + i + '"' + (i === ti ? ' class="on"' : '') + '>' + esc(x[0]) + '</button>'; }).join('') : '';
    cw.querySelector('.afn-cert-lang').innerHTML = tab[1].length > 1 ? tab[1].map(function (x, i) { return '<button type="button" data-l="' + i + '"' + (i === li ? ' class="on"' : '') + '>' + esc(x[0]) + '</button>'; }).join('') : '';
    var im = cw.querySelector('.afn-cert-img'); im.style.aspectRatio = cur === 'venture' ? '1240/1680' : '1240/1754'; im.src = src; // 그림이 오기 전에도 자리를 잡아 둔다 im.alt = '(주)에이블팜 ' + tab[0] + (pg[0] ? ' ' + pg[0] : '') + ' 인증서';
    cw.querySelector('.afn-cert-big').href = src;
  }
  function openCert(k) { if (!CERTS[k]) return; cur = k; ti = 0; li = 0; lastFocus = document.activeElement; drawCert(); closeAll(); cw.classList.add('open'); cw.scrollTop = 0; document.documentElement.style.overflow = 'hidden'; cw.querySelector('.afn-cert-x').focus(); }
  function closeCert() { cw.classList.remove('open'); document.documentElement.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  cw.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (e.target === cw || (b && b.classList.contains('afn-cert-x'))) return closeCert();
    if (b && b.hasAttribute('data-t')) { ti = +b.getAttribute('data-t'); li = 0; drawCert(); }
    else if (b && b.hasAttribute('data-l')) { li = +b.getAttribute('data-l'); drawCert(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cw.classList.contains('open')) closeCert(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-cert]');
    if (t && !cw.contains(t)) { e.preventDefault(); openCert(t.getAttribute('data-cert')); }
  });
})();
