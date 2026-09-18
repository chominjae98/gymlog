"use client";

import { useState } from "react";
import { Check, Plus, Share2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRoom, joinRoomByCode } from "@/lib/rooms-data";
import { shareRoomInvite } from "@/lib/share";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import type { Room } from "@/types/database";

type Props = {
  rooms: Room[];
  activeRoomId: string;
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
  onRoomAdded: (roomId: string) => void;
};

export function RoomSwitcherSheet({ rooms, activeRoomId, onClose, onSelectRoom, onRoomAdded }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare(room: Room) {
    const result = await shareRoomInvite(room);
    showToast(result === "shared" ? "초대를 공유했어요" : "초대 문구를 클립보드에 복사했어요");
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("방 이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(createClient(), trimmed);
      showToast(`"${room.name}" 방을 만들었어요`);
      onRoomAdded(room.id);
    } catch {
      setError("방 생성에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("초대 코드를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await joinRoomByCode(createClient(), trimmed);
      showToast(`"${room.name}" 방에 참가했어요`);
      onRoomAdded(room.id);
    } catch {
      setError("코드를 찾을 수 없어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-background px-5 pt-4 pb-8 shadow-[var(--shadow-pop)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />

        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">내 방</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="flex flex-col gap-1.5">
          {rooms.map((room) => {
            const active = room.id === activeRoomId;
            return (
              <li
                key={room.id}
                className={[
                  "flex items-center gap-2 rounded-2xl px-3.5 py-3 transition",
                  active ? "bg-brand-soft" : "bg-surface-muted",
                ].join(" ")}
              >
                <button
                  onClick={() => {
                    onSelectRoom(room.id);
                    onClose();
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      active ? "bg-brand text-white" : "border border-border",
                    ].join(" ")}
                  >
                    {active && <Check size={12} />}
                  </span>
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {room.name}
                  </span>
                </button>
                <button
                  onClick={() => handleShare(room)}
                  aria-label="방 초대하기"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90"
                >
                  <Share2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>

        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted transition active:scale-[0.99]"
          >
            <Plus size={15} />
            새 방 만들기 · 참가하기
          </button>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5 rounded-2xl bg-surface-muted p-4">
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="새 방 이름"
                maxLength={30}
                className="min-w-0 flex-1 rounded-xl bg-background px-3.5 py-2.5 text-[13px] text-foreground outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={busy}
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-white active:scale-[0.97] disabled:opacity-60"
              >
                만들기
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="초대 코드"
                maxLength={8}
                className="min-w-0 flex-1 rounded-xl bg-background px-3.5 py-2.5 text-center text-[13px] font-bold tracking-[0.15em] text-foreground outline-none"
              />
              <button
                onClick={handleJoin}
                disabled={busy}
                className="shrink-0 rounded-xl bg-background px-4 py-2.5 text-[13px] font-semibold text-foreground active:scale-[0.97] disabled:opacity-60"
              >
                참가
              </button>
            </div>
            {error && <p className="text-center text-[12px] text-warn">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
