/* 방문 통계 (Google Analytics 4) — 누가 몇 명 들어와 얼마나 머무는지 보기 위한 것
   개인정보 처리방침: /privacy.html
   - www.ablefarm.co.kr 에서만 센다 (내 PC 미리보기·테스트는 세지 않음)
   - 직원 기기 빼기: 주소 끝에 ?notrack=1 을 붙여 한 번 열면 그 기기는 이후 안 셈 (?notrack=0 이면 다시 셈)
   - 광고용 구글 신호·광고 맞춤 신호는 끈다 */
(function () {
  var ID = 'G-K2X5EWR10H';
  if (!/(^|\.)ablefarm\.co\.kr$/.test(location.hostname)) return;
  try {
    if (/[?&]notrack=1\b/.test(location.search)) localStorage.setItem('af_notrack', '1');
    if (/[?&]notrack=0\b/.test(location.search)) localStorage.removeItem('af_notrack');
    if (localStorage.getItem('af_notrack') === '1') return;
  } catch (e) {}
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
})();
