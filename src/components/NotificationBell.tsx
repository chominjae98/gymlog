"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasUnreadNotifications } from "@/lib/notifications-data";
import { NotificationSheet } from "@/components/NotificationSheet";

/** 헤더의 종 아이콘. 안 읽은 알림이 있으면 빨간 점, 누르면 알림함(NotificationSheet)을 연다. */
export function NotificationBell({ userId }: { userId: string }) {
  const [hasUnread, setHasUnread] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasUnreadNotifications(createClient()).then((unread) => {
      if (!cancelled) setHasUnread(unread);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setHasUnread(false);
        }}
        aria-label="알림"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-muted transition active:scale-95"
      >
        <Bell size={16} />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn ring-2 ring-background" />
        )}
      </button>

      {/* Header가 sticky + backdrop-blur라 그 안에서 position:fixed를 쓰면 브라우저가
          뷰포트가 아니라 Header를 기준으로 잡아버려(backdrop-filter가 fixed 자손의
          containing block을 만듦) 알림창이 화면 상단에 눌린 것처럼 보였다.
          body로 포털을 띄워 이 문제를 근본적으로 피한다. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(<NotificationSheet userId={userId} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
