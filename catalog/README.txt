에이블팜 플립북 카다로그 - 홈페이지 올리기 안내

1) 이 폴더(ablefarm-catalog)를 통째로 홈페이지 서버에 업로드합니다.
   예: www.ablefarm.co.kr/catalog/ 아래에 올리면 → www.ablefarm.co.kr/catalog/index.html

2) 기존 홈페이지에 메뉴/버튼으로 연결하려면 링크만 걸면 됩니다.
   <a href="/catalog/index.html" target="_blank">제품 카다로그 보기</a>

3) 홈페이지 한 섹션 안에 끼워 넣으려면 iframe을 사용합니다.
   <iframe src="/catalog/index.html" style="width:100%;height:90vh;border:0" title="에이블팜 제품 카다로그"></iframe>

4) 카다로그가 바뀌면 pages 폴더의 p01.webp ~ p24.webp 만 교체하면 됩니다.
   페이지 수가 달라지면 index.html 안의 TOTAL = 24 숫자를 고쳐 주세요.

※ index.html 파일을 PC에서 더블클릭해도 동작합니다(인터넷 연결 불필요).
※ 책장 넘김 라이브러리: StPageFlip (MIT 라이선스, page-flip.browser.js)
