"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getWeekStartKey } from "@/lib/date";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  userId: string;
  currentGoal: number | null;
  onClose: () => void;
  onSaved: (targetDays: number) => void;
};

const MIN_DAYS = 1;
const MAX_DAYS = 7;

export function WeeklyGoalSheet({ userId, currentGoal, onClose, onSaved }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const [selected, setSelected] = useState(currentGoal ?? 4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const weekStart = getWeekStartKey(new Date());

    const { error: upsertError } = await supabase
      .from("weekly_goals")
      .upsert(
        {
          user_id: userId,
          week_start: weekStart,
          target_days: selected,
        },
        { onConflict: "user_id,week_start" }
      );

    setSaving(false);
    if (upsertError) {
      setError("저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    showToast(`이번 주 목표를 주 ${selected}일로 설정했어요`);
    onSaved(selected);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-background px-5 pt-4 pb-8 shadow-[var(--shadow-pop)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />

        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">
            이번 주 목표
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-center text-[13px] text-muted">
          일주일에 며칠 운동할지 정해주세요
        </p>

        <div className="mt-4 flex items-center justify-center gap-6">
          <button
            onClick={() => setSelected((v) => Math.max(MIN_DAYS, v - 1))}
            disabled={selected <= MIN_DAYS}
            aria-label="하루 줄이기"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground transition active:scale-90 disabled:opacity-30"
          >
            <Minus size={20} />
          </button>

          <div className="flex w-24 flex-col items-center justify-center rounded-3xl bg-brand-soft py-4">
            <span className="text-[36px] font-bold leading-none text-brand-strong">
              {selected}
            </span>
            <span className="mt-1 text-[12px] font-medium text-brand-strong">일</span>
          </div>

          <button
            onClick={() => setSelected((v) => Math.min(MAX_DAYS, v + 1))}
            disabled={selected >= MAX_DAYS}
            aria-label="하루 늘리기"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground transition active:scale-90 disabled:opacity-30"
          >
            <Plus size={20} />
          </button>
        </div>

        {error && (
          <p className="mt-3 text-center text-[12px] text-warn">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "저장 중..." : `주 ${selected}일로 목표 설정`}
        </button>
      </div>
    </div>
  );
}
