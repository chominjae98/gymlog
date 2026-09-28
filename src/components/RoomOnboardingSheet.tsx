"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRoom, joinRoomByCode } from "@/lib/rooms-data";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  initialCode?: string;
  onClose: () => void;
};

/**
 * 방이 하나도 없는 사용자가 홈 화면의 + 버튼을 눌렀을 때 뜨는 방 만들기/참가하기 시트.
 * ?join=코드 로 들어오면(초대 딥링크) 참가 코드 입력칸을 미리 채워둔다.
 */
export function RoomOnboardingSheet({ initialCode, onClose }: Props) {
  const router = useRouter();
  const showToast = useToast();
  useLockBodyScroll();
  useCloseOnBackButton(onClose);

  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = roomName.trim();
    if (trimmed.length === 0) {
      setCreateError("방 이름을 입력해 주세요.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const room = await createRoom(createClient(), trimmed);
      showToast(`"${room.name}" 방을 만들었어요`);
      router.push(`/?room=${room.id}`);
      router.refresh();
    } catch {
      setCreating(false);
      setCreateError("방 생성에 실패했어요. 다시 시도해 주세요.");
    }
  }

  async function handleJoin() {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setJoinError("초대 코드를 입력해 주세요.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const room = await joinRoomByCode(createClient(), trimmed);
      showToast(`"${room.name}" 방에 참가했어요`);
      router.push(`/?room=${room.id}`);
      router.refresh();
    } catch {
      setJoining(false);
      setJoinError("코드를 찾을 수 없어요. 다시 확인해 주세요.");
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

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">같이 인증할 친구들과 방을 만들어보세요</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="surface-card p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <Plus size={15} className="text-brand-strong" />
            <h2 className="text-[14px] font-bold text-foreground">새 방 만들기</h2>
          </div>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="예) 우리 헬스 모임"
            maxLength={30}
            className="w-full rounded-xl bg-surface-muted px-4 py-3 text-[14px] text-foreground outline-none"
          />
          {createError && <p className="mt-2 text-[12px] text-warn">{createError}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {creating ? "만드는 중..." : "방 만들기"}
            {!creating && <ArrowRight size={15} />}
          </button>
        </div>

        <div className="my-4 flex items-center gap-3 px-1 text-[11px] text-muted">
          <span className="h-px flex-1 bg-border" />
          또는
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="surface-card p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <KeyRound size={15} className="text-brand-strong" />
            <h2 className="text-[14px] font-bold text-foreground">초대 코드로 참가하기</h2>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="8자리 코드 입력"
            maxLength={8}
            className="w-full rounded-xl bg-surface-muted px-4 py-3 text-center text-[16px] font-bold tracking-[0.2em] text-foreground outline-none"
          />
          {joinError && <p className="mt-2 text-[12px] text-warn">{joinError}</p>}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="mt-3 w-full rounded-xl bg-surface-muted py-3 text-[14px] font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {joining ? "참가하는 중..." : "참가하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
