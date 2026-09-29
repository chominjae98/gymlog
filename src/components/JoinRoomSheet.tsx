"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { joinRoomByCode } from "@/lib/rooms-data";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  onClose: () => void;
  onJoined: (roomId: string) => void;
  initialCode?: string;
};

/** 초대 코드로 기존 방에 참가하는 시트. */
export function JoinRoomSheet({ onClose, onJoined, initialCode }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();

  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (busy) return;
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
      onJoined(room.id);
    } catch (error) {
      console.error("방 참가 실패:", error);
      setBusy(false);
      setError("초대 코드를 찾을 수 없어요. 다시 확인해 주세요.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-modal-pop relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[28px] bg-background px-5 pt-5 pb-6 shadow-[var(--shadow-pop)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">초대 코드로 참가하기</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="surface-card p-5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
            placeholder="8자리 코드 입력"
            maxLength={8}
            autoFocus
            // 입력값이 없을 때 text-center를 그대로 두면, 빈 입력창의 커서가 가운데
            // 정렬된 placeholder 텍스트 한가운데에 겹쳐서 찍혀 마치 깨진 것처럼 보인다.
            // 값이 없을 땐 왼쪽 정렬로 커서를 자연스러운 시작 위치에 두고, 실제로
            // 입력을 시작하면(코드 입력 느낌을 살리기 위해) 가운데 정렬로 바꾼다.
            className={`w-full rounded-xl bg-surface-muted px-4 py-3 text-[16px] font-bold tracking-[0.2em] text-foreground outline-none ${
              code ? "text-center" : "text-left"
            }`}
          />
          {error && <p className="mt-2 text-center text-[12px] text-warn">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-brand py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "참가하는 중..." : "참가하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
