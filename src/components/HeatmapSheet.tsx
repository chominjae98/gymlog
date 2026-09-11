"use client";

import { useEffect, useState } from "react";
import { Flame, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nowInSeoul } from "@/lib/date";
import {
  buildHeatmapWeeks,
  computeCurrentStreak,
  computeLongestStreak,
  getHeatmapLogDates,
} from "@/lib/heatmap-data";
import { HeatmapView } from "@/components/HeatmapView";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

export function HeatmapSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const [logDates, setLogDates] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getHeatmapLogDates(supabase, userId, nowInSeoul()).then((dates) => {
      if (!cancelled) setLogDates(dates);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const today = nowInSeoul();
  const currentStreak = logDates ? computeCurrentStreak(logDates, today) : 0;
  const longestStreak = logDates ? computeLongestStreak(logDates, today) : 0;
  const totalDays = logDates?.size ?? 0;
  const { weeks, monthLabels } = logDates
    ? buildHeatmapWeeks(logDates, today)
    : { weeks: [], monthLabels: [] };

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
          <h3 className="flex items-center gap-1.5 text-[17px] font-bold text-foreground">
            <Flame size={17} className="text-brand-strong" />
            내 활동 히트맵
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        {logDates === null ? (
          <div className="flex h-40 items-center justify-center text-[13px] text-muted">
            불러오는 중...
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatCard label="연속 인증" value={`${currentStreak}일`} emphasize />
              <StatCard label="최장 기록" value={`${longestStreak}일`} />
              <StatCard label="최근 약 5개월" value={`${totalDays}일`} />
            </div>

            <div className="mt-5 surface-card p-4">
              <HeatmapView weeks={weeks} monthLabels={monthLabels} />
              <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
                적음
                <span className="h-[11px] w-[11px] rounded-[3px] bg-surface-muted" />
                <span className="h-[11px] w-[11px] rounded-[3px] bg-brand" />
                많음
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-0.5 rounded-2xl py-3.5",
        emphasize ? "bg-brand-soft" : "bg-surface-muted",
      ].join(" ")}
    >
      <span
        className={[
          "text-[18px] font-bold",
          emphasize ? "text-brand-strong" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
