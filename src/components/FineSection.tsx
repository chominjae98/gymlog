"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import { DayDots } from "@/components/DayDots";
import { computeFineAmount } from "@/lib/dashboard-data";
import type { WeeklyProgress } from "@/types/database";

const STATUS_META: Record<
  WeeklyProgress["status"],
  { label: string; badgeClass: string }
> = {
  "no-goal": { label: "목표 미설정", badgeClass: "bg-surface-muted text-muted" },
  safe: { label: "순항 중", badgeClass: "bg-brand-soft text-brand-strong" },
  "at-risk": { label: "막판 스퍼트", badgeClass: "bg-amber-100 text-amber-700" },
  fined: { label: "벌금 확정", badgeClass: "bg-warn-soft text-warn" },
};

export function FineSection({
  progress,
  weeklyFine,
}: {
  progress: WeeklyProgress[];
  weeklyFine: number;
}) {
  const sorted = [...progress].sort((a, b) => {
    const order = { fined: 0, "at-risk": 1, safe: 2, "no-goal": 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="surface-card p-5">
      <div className="mb-3.5 flex items-center gap-1.5">
        <Users size={15} className="text-muted" />
        <h2 className="text-[16px] font-bold text-foreground">이번 주 현황</h2>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-muted py-8 text-center">
          <span className="text-2xl">👀</span>
          <p className="text-[13px] text-muted">
            아직 아무도 이번 주 목표를 정하지 않았어요
          </p>
        </div>
      ) : (
      <ul className="flex flex-col gap-2">
        {sorted.map((p) => {
          const meta = STATUS_META[p.status];
          const fine = computeFineAmount(p.status, weeklyFine);

          return (
            <li
              key={p.profile.id}
              className="flex items-center gap-3 rounded-2xl px-1 py-3 transition hover:bg-surface-muted/50"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                {p.profile.avatar_url && (
                  <Image
                    src={p.profile.avatar_url}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className="truncate text-[14px] font-semibold text-foreground">
                  {p.profile.nickname}
                </span>
                {p.targetDays != null ? (
                  <div className="mt-1.5">
                    <DayDots
                      target={p.targetDays}
                      achieved={p.achievedDays}
                      tone="brand"
                    />
                  </div>
                ) : (
                  <p className="mt-0.5 text-[12px] text-muted">
                    아직 목표를 정하지 않았어요
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
                {fine > 0 && (
                  <span className="text-[11px] font-medium text-warn">
                    예상 벌금 {fine.toLocaleString()}원
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
