"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Receipt, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMonthTitle, nowInSeoul } from "@/lib/date";
import { getMonthlySettlement } from "@/lib/settlement-data";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import type { MonthlySettlement } from "@/types/database";

type Props = {
  monthDate: Date;
  weeklyFine: number;
  onClose: () => void;
};

export function SettlementSheet({ monthDate, weeklyFine, onClose }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const [settlement, setSettlement] = useState<MonthlySettlement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getMonthlySettlement(supabase, monthDate, nowInSeoul(), weeklyFine).then((data) => {
      if (!cancelled) setSettlement(data);
    });
    return () => {
      cancelled = true;
    };
  }, [monthDate, weeklyFine]);

  const sorted = settlement
    ? [...settlement].sort((a, b) => b.totalFine - a.totalFine)
    : [];
  const totalPot = sorted.reduce((sum, s) => sum + s.totalFine, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[17px] font-bold text-foreground">
              <Receipt size={17} className="text-brand-strong" />
              {formatMonthTitle(monthDate)} 정산 요약
            </h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {settlement === null ? (
            <div className="flex h-40 items-center justify-center text-[13px] text-muted">
              불러오는 중...
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-muted py-10 text-center">
              <span className="text-2xl">🧾</span>
              <p className="text-[13px] text-muted">이 달에는 정산할 내역이 없어요</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((s) => (
                <li key={s.profile.id} className="surface-card flex items-center gap-3 px-4 py-3.5">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                    {s.profile.avatar_url && (
                      <Image
                        src={s.profile.avatar_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {s.profile.nickname}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 text-[14px] font-bold",
                      s.totalFine > 0 ? "text-warn" : "text-muted",
                    ].join(" ")}
                  >
                    {s.totalFine.toLocaleString()}원
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="shrink-0 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-muted">이 달 총액</span>
              <span className="font-bold text-foreground">{totalPot.toLocaleString()}원</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
