"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EllipsisVertical, Pencil, Trash2, X } from "lucide-react";
import { formatDayTitle, formatTime } from "@/lib/date";
import { countUniquePeople } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/client";
import { removeWorkoutPhotos } from "@/lib/storage-upload";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import { EditPostSheet } from "@/components/EditPostSheet";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  dateKey: string;
  logs: WorkoutLogWithProfile[];
  currentUserId: string;
  onClose: () => void;
  isToday: boolean;
  onUploadClick: () => void;
  onMutated: () => void;
};

export function DayDrawer({
  dateKey,
  logs,
  currentUserId,
  onClose,
  isToday,
  onUploadClick,
  onMutated,
}: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();
  const date = new Date(`${dateKey}T00:00:00`);
  const peopleCount = countUniquePeople(logs);

  const [editingLog, setEditingLog] = useState<WorkoutLogWithProfile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deleteLog(log: WorkoutLogWithProfile) {
    if (!window.confirm("이 인증 기록을 삭제할까요?")) return;
    setBusyId(log.id);
    const supabase = createClient();
    const { error } = await supabase.from("workout_logs").delete().eq("id", log.id);

    if (error) {
      setBusyId(null);
      showToast("삭제에 실패했어요. 다시 시도해 주세요.", "error");
      return;
    }

    // 사진 파일도 함께 정리 (best-effort, 실패해도 기록 삭제는 이미 반영됨)
    await removeWorkoutPhotos(supabase, log.photo_urls);

    setBusyId(null);
    showToast("게시물을 삭제했어요");
    onMutated();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 bg-background px-5 pb-3 pt-4">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[19px] font-bold tracking-tight text-foreground">
                {formatDayTitle(date)}
              </h3>
              <p className="mt-0.5 text-[13px] text-muted">
                {peopleCount > 0
                  ? `${peopleCount}명이 운동을 인증했어요 🔥`
                  : "아직 인증한 사람이 없어요"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted transition hover:bg-border/60 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="flex min-h-[52dvh] flex-col items-center justify-center gap-5 px-8 pb-12 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-[44px]">
              🏃
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[15px] font-semibold text-foreground">
                {isToday
                  ? "오늘 첫 인증의 주인공이 되어보세요"
                  : "이 날은 아무도 인증하지 않았어요"}
              </p>
              {!isToday && (
                <p className="text-[13px] text-muted">
                  다른 날짜를 눌러 인증 기록을 확인해보세요
                </p>
              )}
            </div>
            {isToday && (
              <button
                onClick={onUploadClick}
                className="mt-2 rounded-full bg-brand px-6 py-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] transition active:scale-95"
              >
                운동 인증하기
              </button>
            )}
          </div>
        ) : (
          // 인스타그램 피드처럼 세로로 스크롤하며 카드 하나씩 보여준다.
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
            <div className="flex flex-col gap-5 pt-2">
              {logs.map((log, i) => (
                <article
                  key={log.id}
                  className="surface-card animate-fade-up overflow-hidden"
                  style={{ animationDelay: `${Math.min(i, 4) * 0.06}s` }}
                >
                  <div className="flex items-center gap-2.5 px-4 py-3.5">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-soft ring-2 ring-brand/25">
                      {log.profile.avatar_url && (
                        <Image
                          src={log.profile.avatar_url}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="truncate text-[14px] font-semibold text-foreground">
                      {log.profile.nickname}
                    </span>
                    <span className="ml-auto shrink-0 text-[11px] font-medium text-muted">
                      {formatTime(log.created_at)}
                    </span>
                    {log.user_id === currentUserId && (
                      <PostMenu
                        disabled={busyId === log.id}
                        onEdit={() => setEditingLog(log)}
                        onDelete={() => deleteLog(log)}
                      />
                    )}
                  </div>

                  <PhotoCarousel photoUrls={log.photo_urls} nickname={log.profile.nickname} />

                  {log.memo && (
                    <p className="px-4 py-3.5 text-[13px] leading-relaxed text-foreground">
                      {log.memo}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {editingLog && (
        <EditPostSheet
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={() => {
            setEditingLog(null);
            onMutated();
          }}
        />
      )}
    </div>
  );
}

/**
 * 사진이 여러 장이면 옆으로 스와이프하며 볼 수 있는 캐러셀, 한 장이면 그냥 보여준다.
 *
 * 브라우저의 네이티브 가로 스크롤(overflow-x-auto + scroll-snap)에 맡기지 않고,
 * 터치 이벤트를 직접 읽어서 "이 제스처가 가로인지 세로인지"를 코드로 직접 판별한다.
 * (touch-action CSS로 브라우저에게 위임하는 방식은 iOS 등 일부 환경에서 세로 스크롤을
 *  여전히 가로채가는 문제가 있어서, 아예 판단 자체를 우리 코드가 하도록 바꿨다.)
 * 가로로 확정된 제스처만 우리가 preventDefault로 가져가고, 세로로 확정되면 아무것도
 * 안 하고 그대로 둬서 바깥의 세로 스크롤 영역이 정상적으로 스크롤되게 한다.
 */
function PhotoCarousel({ photoUrls, nickname }: { photoUrls: string[]; nickname: string }) {
  const multi = photoUrls.length > 1;
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);

  // 인덱스가 바뀌면(스와이프 완료 등) 트랙 위치를 그 사진으로 맞추고, ref도 최신화한다.
  useEffect(() => {
    indexRef.current = index;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    track.style.transition = "none";
    track.style.transform = `translateX(${-index * container.clientWidth}px)`;
  }, [index]);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track || !multi) return;

    let direction: "x" | "y" | null = null;
    let startX = 0;
    let startY = 0;
    let width = 0;
    let dx = 0;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      direction = null;
      dx = 0;
      width = container!.clientWidth;
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const moveX = t.clientX - startX;
      const moveY = t.clientY - startY;

      if (direction === null) {
        // 아주 미세한 흔들림(8px 미만)은 아직 방향을 정하지 않고 지켜본다.
        if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) return;
        direction = Math.abs(moveX) > Math.abs(moveY) ? "x" : "y";
      }
      if (direction !== "x") return; // 세로로 판정 → 브라우저 기본 스크롤에 그대로 맡김

      e.preventDefault(); // 가로로 판정된 동안에만 페이지가 같이 스크롤되지 않도록 막는다
      dx = moveX;
      track!.style.transition = "none";
      track!.style.transform = `translateX(${-indexRef.current * width + dx}px)`;
    }

    function handleTouchEnd() {
      if (direction !== "x") {
        direction = null;
        return;
      }
      const threshold = width * 0.2;
      let next = indexRef.current;
      if (dx <= -threshold && indexRef.current < photoUrls.length - 1) next = indexRef.current + 1;
      else if (dx >= threshold && indexRef.current > 0) next = indexRef.current - 1;

      track!.style.transition = "transform 0.25s ease-out";
      track!.style.transform = `translateX(${-next * width}px)`;
      if (next !== indexRef.current) setIndex(next);
      direction = null;
      dx = 0;
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [multi, photoUrls.length]);

  return (
    <div ref={containerRef} className="relative aspect-[4/5] w-full overflow-hidden bg-surface-muted">
      <div ref={trackRef} className="flex h-full will-change-transform">
        {photoUrls.map((url, i) => (
          <div key={url} className="relative h-full w-full shrink-0 [backface-visibility:hidden]">
            <Image
              src={url}
              alt={`${nickname}의 운동 인증 ${i + 1}`}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {photoUrls.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {photoUrls.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostMenu({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative ml-1 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="게시물 메뉴"
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted disabled:opacity-40"
      >
        <EllipsisVertical size={16} />
      </button>
      {open && (
        <div className="animate-fade-up absolute right-0 top-8 z-10 w-32 overflow-hidden rounded-2xl bg-surface py-1 shadow-[var(--shadow-pop)]">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-foreground hover:bg-surface-muted"
          >
            <Pencil size={13} />
            수정하기
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-warn hover:bg-surface-muted"
          >
            <Trash2 size={13} />
            삭제하기
          </button>
        </div>
      )}
    </div>
  );
}
