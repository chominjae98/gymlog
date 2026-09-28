"use client";

import { useEffect, useState } from "react";
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

      {open && <NotificationSheet userId={userId} onClose={() => setOpen(false)} />}
    </>
  );
}
