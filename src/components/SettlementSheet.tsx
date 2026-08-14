"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Wallet, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSettlementWeeks, type SettlementRow } from "@/lib/dashboard-data";
import { formatWeekRange } from "@/lib/date";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  finePerDay: number;
  onClose: () => void;
};

export function SettlementSheet({ finePerDay, onClose }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const [rows, setRows] = useState<SettlementRow[] | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    getSettlementWeeks(supabase, new Date(), finePerDay).then(setRows);
  }, [finePerDay]);

  async function togglePaid(row: SettlementRow) {
    const key = `${row.profile.id}_${row.weekStart}`;
    setPendingKey(key);
    const supabase = createClient();
    const nextPaid = !row.paid;

    const { error } = await supabase.from("fine_payments").upsert(
      {
        user_id: row.profile.id,
        week_start: row.weekStart,
        paid: nextPaid,
        paid_at: nextPaid ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,week_start" }
    );

    setPendingKey(null);
    if (error) {
      showToast("정산 상태 변경에 실패했어요", "error");
      return;
    }
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.profile.id === row.profile.id && r.weekStart === row.weekStart
              ? { ...r, paid: nextPaid }
              : r
          )
        : prev
    );
    showToast(nextPaid ? "정산 완료로 표시했어요" : "미정산으로 되돌렸어요");
  }

  const unpaidTotal = (rows ?? []).filter((r) => !r.paid).length * finePerDay;

  // 주차별로 묶기
  const weeks = new Map<string, SettlementRow[]>();
  for (const r of rows ?? []) {
    const arr = weeks.get(r.weekStart) ?? [];
    arr.push(r);
    weeks.set(r.weekStart, arr);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 bg-background px-5 pb-3 pt-4">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-[18px] font-bold tracking-tight text-foreground">
                <Wallet size={17} className="text-brand-strong" />
                벌금 정산
              </h3>
              <p className="mt-0.5 text-[13px] text-muted">
                {rows === null
                  ? "불러오는 중..."
                  : unpaidTotal > 0
                    ? `아직 안 걷은 벌금 ${unpaidTotal.toLocaleString()}원`
                    : "밀린 벌금이 없어요"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted transition hover:bg-border/60 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
          {rows === null ? (
            <div className="py-14 text-center text-[13px] text-muted">불러오는 중...</div>
          ) : weeks.size === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-muted py-12 text-center">
              <span className="text-2xl">🙌</span>
              <p className="text-[13px] text-muted">지난 12주간 정산할 벌금이 없어요</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 pt-1">
              {[...weeks.entries()].map(([weekStart, weekRows]) => (
                <div key={weekStart}>
                  <p className="mb-2 px-1 text-[12px] font-semibold text-muted">
                    {formatWeekRange(weekStart)}
                  </p>
                  <div className="surface-card overflow-hidden">
                    <ul className="flex flex-col divide-y divide-border/40 px-4">
                      {weekRows.map((row) => {
                        const key = `${row.profile.id}_${row.weekStart}`;
                        return (
                          <li key={key} className="flex items-center gap-3 py-3">
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                              {row.profile.avatar_url && (
                                <Image
                                  src={row.profile.avatar_url}
                                  alt=""
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold text-foreground">
                                {row.profile.nickname}
                              </p>
                              <p className="text-[12px] text-muted">
                                {row.achievedDays}/{row.targetDays}일 · {row.amount.toLocaleString()}원
                              </p>
                            </div>
                            <button
                              onClick={() => togglePaid(row)}
                              disabled={pendingKey === key}
                              className={[
                                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition active:scale-95 disabled:opacity-50",
                                row.paid
                                  ? "bg-brand-soft text-brand-strong"
                                  : "bg-warn-soft text-warn",
                              ].join(" ")}
                            >
                              {row.paid && <Check size={13} />}
                              {row.paid ? "정산완료" : "미정산"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
