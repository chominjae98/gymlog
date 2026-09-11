// 운동 인증 리마인더 웹 푸시용 최소 서비스워커.
// 캐싱/오프라인 기능은 다루지 않고, 푸시 수신 표시와 알림 클릭 처리만 담당한다.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "오운완", body: event.data.text() };
  }

  const title = payload.title || "오운완";
  const options = {
    body: payload.body || "",
    icon: "/pwa-icon.png",
    badge: "/pwa-icon.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
