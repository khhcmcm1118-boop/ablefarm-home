/*
 * 지원사업·행사 게시판 공통 (2026-11-25)
 * /data/jiwon.json 을 읽어 상태(접수 중·마감 임박·마감 / 진행 중·예정·끝남)와 남은 날을 붙여 준다.
 * 화면(시안 A·B·C)은 JW.load().then(function (d) { ... }) 로 받아 그린다.
 */
(function () {
  var SIDO = ['전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  function kstToday() { var n = new Date(Date.now() + 9 * 3600e3); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())); }
  function day(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function diff(a, b) { return Math.round((a - b) / 864e5); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { var p = s.split('-'); return (+p[1]) + '.' + (+p[2]); }

  function status(it, today) {
    var s = day(it.start), e = day(it.end), toEnd = diff(e, today), toStart = diff(s, today);
    if (it.kind === '행사') {
      if (toEnd < 0) return { key: 'done', label: '끝남', d: '', rank: 9 };
      if (toStart <= 0) return { key: 'live', label: '진행 중', d: '~' + md(it.end), rank: 1 };
      return { key: 'soon', label: '예정', d: 'D-' + toStart, rank: 3, left: toStart };
    }
    if (toEnd < 0) return { key: 'done', label: '마감', d: '', rank: 9 };
    if (toStart > 0) return { key: 'soon', label: '접수 예정', d: md(it.start) + ' 시작', rank: 4 };
    if (toEnd <= 7) return { key: 'hot', label: '마감 임박', d: toEnd === 0 ? '오늘 마감' : 'D-' + toEnd, rank: 0, left: toEnd };
    return { key: 'open', label: '접수 중', d: 'D-' + toEnd, rank: 2, left: toEnd };
  }

  function load() {
    return fetch('/data/jiwon.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (d) {
      var t = kstToday();
      d.items.forEach(function (it) { it.st = status(it, t); it.sido = it.sido || '전국'; });
      // 기본 순서: 마감 임박 → 진행 중 행사 → 접수 중(마감 빠른 순) → 예정 → 끝난 것
      d.items.sort(function (a, b) { return a.st.rank - b.st.rank || (a.end < b.end ? -1 : a.end > b.end ? 1 : 0); });
      d.today = t;
      return d;
    });
  }

  // 출처 배지: 공식 공고 / 보도 기준 / 2차 게시
  function srcBadge(it) {
    var m = { '공식': ['공식 공고', 'jw-s1'], '보도': ['보도 기준', 'jw-s2'], '2차': ['2차 게시', 'jw-s3'] }[it.src] || ['출처', 'jw-s3'];
    return '<span class="jw-src ' + m[1] + '" title="' + esc(it.srcName) + '">' + m[0] + '</span>';
  }
  function srcLink(it) {
    return '<a class="jw-go" href="' + esc(it.url) + '" target="_blank" rel="noopener">원문 보기 · ' + esc(it.srcName) + ' ↗</a>';
  }

  window.JW = { load: load, esc: esc, md: md, SIDO: SIDO, srcBadge: srcBadge, srcLink: srcLink };
})();
