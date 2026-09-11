"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitFineException } from "@/lib/fine-exceptions";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

const MAX_LENGTH = 500;

type Props = {
  userId: string;
  weekStart: string;
  onClose: () => void;
  onSubmitted: () => void;
};

/** "이번 주 벌금 위기" 상태인 사람이 피치 못할 사정을 적어 제출하는 사유서 시트.
 * 제출 즉시 벌금이 빠지는 게 아니라, 나머지 멤버들의 투표(다수결)로 승인되어야
 * 그 주 목표 달성일수에 +1로 카운트된다. */
export function ExceptionRequestSheet({ userId, weekStart, onClose, onSubmitted }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("사정을 적어 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await submitFineException(
      supabase,
      userId,
      weekStart,
      trimmed
    );

    setSubmitting(false);
    if (insertError) {
      setError("제출에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    showToast("사유서를 제출했어요. 친구들의 투표를 기다려 주세요.");
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-background px-6 pt-5 pb-10 shadow-[var(--shadow-pop)]">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-foreground">사유서 제출</h3>
            <p className="mt-0.5 text-[12px] text-muted">
              친구들이 투표로 인정해주면 벌금에서 빠져요
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted hover:bg-border/60"
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예) 이번 주 출장이 있어서 헬스장을 못 갔습니다"
          rows={4}
          maxLength={MAX_LENGTH}
          className="w-full resize-none rounded-2xl bg-surface-muted px-4 py-3.5 text-[14px] text-foreground outline-none"
          autoFocus
        />
        <p className="mt-1.5 text-right text-[11px] text-muted">
          {reason.length}/{MAX_LENGTH}
        </p>

        {error && <p className="mt-1 text-center text-[12px] text-warn">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 w-full rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "제출 중..." : "제출하기"}
        </button>
      </div>
    </div>
  );
}
