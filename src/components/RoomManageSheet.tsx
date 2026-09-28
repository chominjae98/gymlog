"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, LogOut, Share2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRoomMembers, leaveRoom, type RoomMemberProfile } from "@/lib/rooms-data";
import { getRoomAccentClasses } from "@/lib/room-colors";
import { shareRoomInvite } from "@/lib/share";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import type { Room } from "@/types/database";

type Props = {
  room: Room;
  isActive: boolean;
  onClose: () => void;
  onSwitchClick: () => void;
  onLeft: () => void;
};

/** 방 하나를 관리하는 화면: 초대 코드 공유, 멤버 목록, 하루 벌금, 방 나가기. */
export function RoomManageSheet({ room, isActive, onClose, onSwitchClick, onLeft }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();
  const accent = getRoomAccentClasses(room.id);

  const [members, setMembers] = useState<RoomMemberProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRoomMembers(createClient(), room.id)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch((error) => {
        console.error("방 멤버 목록 조회 실패:", room.id, error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  async function handleShare() {
    const result = await shareRoomInvite(room);
    showToast(result === "shared" ? "초대를 공유했어요" : "초대 문구를 클립보드에 복사했어요");
  }

  async function handleLeave() {
    if (!window.confirm(`"${room.name}" 방에서 나갈까요?`)) return;
    setLeaving(true);
    try {
      await leaveRoom(createClient(), room.id);
      showToast(`"${room.name}" 방에서 나갔어요`);
      onLeft();
    } catch (error) {
      console.error("방 나가기 실패:", error);
      setLeaving(false);
      showToast("방 나가기에 실패했어요. 다시 시도해 주세요.", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-modal-pop relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accent.soft}`}
              >
                <span className={`text-[14px] font-bold ${accent.strong}`}>
                  {room.name.charAt(0)}
                </span>
              </span>
              <h3 className="truncate text-[17px] font-bold text-foreground">{room.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
          </div>
          {isActive && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-strong">
              <Check size={12} />
              지금 보고 있는 방
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <button
            onClick={handleShare}
            className="surface-card flex w-full items-center justify-between px-4 py-3.5 text-left transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">초대 코드</p>
              <p className="mt-0.5 text-[15px] font-bold tracking-[0.15em] text-brand-strong">
                {room.invite_code}
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground">
              <Share2 size={16} />
            </span>
          </button>

          <div className="mt-2.5 surface-card px-4 py-3.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-muted">하루 벌금</span>
              <span className="font-bold text-foreground">{room.fine_per_day.toLocaleString()}원</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-1.5 px-1">
            <Users size={14} className="text-muted" />
            <p className="text-[12.5px] font-semibold text-muted">
              멤버 {members ? members.length : ""}
            </p>
          </div>

          <ul className="mt-2 flex flex-col gap-1.5">
            {loadError ? (
              <li className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-[13px] text-muted">
                멤버 목록을 불러오지 못했어요.
              </li>
            ) : members === null ? (
              <li className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-[13px] text-muted">
                불러오는 중...
              </li>
            ) : (
              members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-2.5"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                    {m.avatar_url && (
                      <Image src={m.avatar_url} alt="" fill sizes="32px" className="object-cover" />
                    )}
                  </div>
                  <span className="truncate text-[13.5px] font-semibold text-foreground">
                    {m.nickname}
                  </span>
                </li>
              ))
            )}
          </ul>

          {!isActive && (
            <button
              onClick={onSwitchClick}
              className="mt-5 w-full rounded-2xl bg-brand py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
            >
              이 방으로 전환하기
            </button>
          )}

          <button
            onClick={handleLeave}
            disabled={leaving}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[13px] font-semibold text-warn transition active:scale-[0.98] disabled:opacity-60"
          >
            <LogOut size={15} />
            {leaving ? "나가는 중..." : "방 나가기"}
          </button>
        </div>
      </div>
    </div>
  );
}
