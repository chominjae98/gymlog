"use client";

import { useState } from "react";
import { X } from "lucide-react";
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

const OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function WeeklyGoalSheet({ userId, currentGoal, onClose, onSaved }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const [selected, setSelected] = useState(currentGoal ?? 3);
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

        <div className="mt-5 grid grid-cols-4 gap-2">
          {OPTIONS.map((day) => (
            <button
              key={day}
              onClick={() => setSelected(day)}
              className={[
                "flex flex-col items-center justify-center rounded-2xl py-3.5 transition active:scale-95",
                selected === day
                  ? "bg-brand-soft ring-2 ring-brand shadow-[var(--shadow-soft)]"
                  : "bg-surface-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[18px] font-bold",
                  selected === day ? "text-brand-strong" : "text-foreground",
                ].join(" ")}
              >
                {day}
              </span>
              <span className="text-[11px] text-muted">일</span>
            </button>
          ))}
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
