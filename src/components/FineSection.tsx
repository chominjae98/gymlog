"use client";

import Image from "next/image";
import { Users } from "lucide-react";
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

function fineAmount(p: WeeklyProgress, finePerDay: number) {
  if (p.status !== "fined" || p.targetDays == null) return 0;
  return (p.targetDays - p.achievedDays) * finePerDay;
}

export function FineSection({
  progress,
  finePerDay,
}: {
  progress: WeeklyProgress[];
  finePerDay: number;
}) {
  const fined = progress.filter((p) => p.status === "fined");
  const totalFine = fined.reduce((sum, p) => sum + fineAmount(p, finePerDay), 0);
  const sorted = [...progress].sort((a, b) => {
    const order = { fined: 0, "at-risk": 1, safe: 2, "no-goal": 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="surface-card p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users size={15} className="text-muted" />
          <h2 className="text-[16px] font-bold text-foreground">이번 주 현황</h2>
        </div>
        {fined.length > 0 && (
          <span className="text-[13px] font-semibold text-warn">
            벌금 {fined.length}명 · {totalFine.toLocaleString()}원
          </span>
        )}
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
          const fine = fineAmount(p, finePerDay);
          const pct =
            p.targetDays != null
              ? Math.min(100, Math.round((p.achievedDays / p.targetDays) * 100))
              : 0;

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
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {p.profile.nickname}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </div>
                {p.targetDays != null ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${
                          p.status === "fined" ? "bg-warn" : "bg-brand"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">
                      {p.achievedDays}/{p.targetDays}일
                    </span>
                  </div>
                ) : (
                  <p className="mt-0.5 text-[12px] text-muted">
                    아직 목표를 정하지 않았어요
                  </p>
                )}
                {fine > 0 && (
                  <p className="mt-1 text-[12px] font-medium text-warn">
                    예상 벌금 {fine.toLocaleString()}원
                  </p>
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
