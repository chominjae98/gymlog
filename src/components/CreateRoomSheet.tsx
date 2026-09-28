"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRoom } from "@/lib/rooms-data";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  onClose: () => void;
  onCreated: (roomId: string) => void;
};

/** 이미 방이 있는 사용자가 홈의 + 버튼 메뉴에서 "방 만들기"를 눌렀을 때 뜨는 시트. */
export function CreateRoomSheet({ onClose, onCreated }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onCreated(room.id);
    } catch {
      setBusy(false);
      setError("방 생성에 실패했어요. 다시 시도해 주세요.");
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
          <h3 className="text-[17px] font-bold text-foreground">새 방 만들기</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="surface-card p-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="예) 우리 헬스 모임"
            maxLength={30}
            autoFocus
            className="w-full rounded-xl bg-surface-muted px-4 py-3 text-[14px] text-foreground outline-none"
          />
          {error && <p className="mt-2 text-[12px] text-warn">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "만드는 중..." : "방 만들기"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
