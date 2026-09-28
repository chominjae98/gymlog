"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/date";
import { getMyNotifications, markAllNotificationsRead } from "@/lib/notifications-data";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import type { NotificationWithActor } from "@/types/database";

type Props = {
  userId: string;
  onClose: () => void;
};

export function NotificationSheet({ userId, onClose }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const [notifications, setNotifications] = useState<NotificationWithActor[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getMyNotifications(supabase)
      .then((data) => {
        if (cancelled) return;
        setNotifications(data);
        // 알림함을 열어본 시점에 지금까지 쌓인 알림을 전부 읽음 처리한다(항목별 읽음 관리는 안 함).
        markAllNotificationsRead(supabase, userId);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-modal-pop relative z-10 flex max-h-[75dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[17px] font-bold text-foreground">
              <Bell size={17} className="text-brand-strong" />
              알림
            </h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {loadError ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-[13px] text-muted">
              <p>알림을 불러오지 못했어요.</p>
              <p>잠시 후 다시 열어봐 주세요.</p>
            </div>
          ) : notifications === null ? (
            <div className="flex h-32 items-center justify-center text-[13px] text-muted">
              불러오는 중...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1.5 text-center">
              <span className="text-[24px]">🔔</span>
              <p className="text-[13px] text-muted">아직 알림이 없어요</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 py-3">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                    {n.actor.avatar_url && (
                      <Image src={n.actor.avatar_url} alt="" fill sizes="32px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-relaxed text-foreground">
                      <span className="font-semibold">{n.actor.nickname}</span>
                      {n.type === "reaction" ? (
                        <>님이 회원님 게시물에 공감했어요{n.reaction && ` ${n.reaction.emoji}`}</>
                      ) : (
                        <>
                          님이 댓글을 남겼어요
                          {n.comment && (
                            <span className="text-muted">: &ldquo;{n.comment.body}&rdquo;</span>
                          )}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatTime(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
