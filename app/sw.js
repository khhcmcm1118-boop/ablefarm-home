/* ═══════════════════ 에이블팜 출하앱 — 휴대폰 알림 담당 (서비스 워커) ═══════════════════
 * 앱이 꺼져 있어도 카톡처럼 알림을 띄우고, 아이콘에 알림 숫자를 단다.
 * 서버(Code.gs pushSend_)는 내용 없는 푸시만 보낸다 → 여기서 깨어나 api_pushPeek 로 문구를 받아 띄운다.
 * 서버 주소는 index.html 이 등록할 때 sw.js?api=… 로 넘겨준다 (주소가 바뀌어도 이 파일은 안 고친다).
 * 홈페이지용-만들기.ps1 이 앱바로가기\sw.js 를 홈페이지 app 폴더로 복사한다.
 */
var API = new URL(self.location.href).searchParams.get('api') || '';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function peek() {
  return self.registration.pushManager.getSubscription().then(function (sub) {
    if (!sub || !API) return null;
    return fetch(API, {
      method: 'POST', credentials: 'omit', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: 'api_pushPeek', args: [sub.endpoint] })
    }).then(function (r) { return r.json(); })
      .then(function (r) { return r && r.ok ? r.data : null; });
  }).catch(function () { return null; });
}

/** 떠 있는 알림 개수를 아이콘 숫자로 (안드로이드는 알림 개수가 저절로 숫자가 된다 — 아이폰·PC용) */
function badge() {
  return self.registration.getNotifications().then(function (list) {
    var nav = self.navigator;
    if (!nav || !nav.setAppBadge) return;
    return (list.length ? nav.setAppBadge(list.length) : nav.clearAppBadge()).catch(function () {});
  }).catch(function () {});
}

self.addEventListener('push', function (e) {
  e.waitUntil(peek().then(function (m) {
    m = m || { title: '에이블팜 출하앱', body: '새 알림이 있습니다. 눌러서 확인하세요.' };
    return self.registration.showNotification(m.title, {
      body: m.body,
      tag: m.tag || ('af-' + Date.now()),   // 주문마다 다른 이름 → 알림이 쌓여 숫자가 늘어난다
      renotify: true,
      icon: 'icon-192.png',
      vibrate: [300, 120, 300],
      timestamp: Date.now(),
      data: { url: m.url || './' }
    });
  }).then(badge));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) return list[i].focus();
    }
    return self.clients.openWindow(url);
  }).then(badge));
});

self.addEventListener('notificationclose', function (e) { e.waitUntil(badge()); });
