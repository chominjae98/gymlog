"use client";

import Image from "next/image";
import { AlertTriangle, PartyPopper } from "lucide-react";
import { DayDots } from "@/components/DayDots";
import { computeFineAmount } from "@/lib/dashboard-data";
import type { WeeklyProgress } from "@/types/database";

/**
 * 홈 화면 상단에 노출되는 "이번 주 벌금 위기" 리스트.
 * weeklyProgress는 서버에서 실시간 집계된 값이라(달성 일수 vs 목표, 남은 요일 계산),
 * 누군가 인증샷을 올려 목표를 채우는 순간 status가 'fined'/'at-risk'에서 빠지면서
 * 새로고침(router.refresh) 시 이 리스트에서 자동으로 사라진다.
 */
export function FineWatchlist({
  progress,
  weeklyFine,
}: {
  progress: WeeklyProgress[];
  weeklyFine: number;
}) {
  const atRisk = progress.filter(
    (p) => p.status === "fined" || p.status === "at-risk"
  );

  if (atRisk.length === 0) {
    return (
      <div className="surface-card flex items-center gap-2.5 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PartyPopper size={15} className="text-brand-strong" />
        </div>
        <p className="text-[13px] font-medium text-foreground">
          벌금 위기인 사람이 없어요 · 모두 순항 중이에요 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5">
        <AlertTriangle size={14} className="text-warn" />
        <p className="text-[13px] font-bold text-warn">
          이번 주 벌금 위기 {atRisk.length}명
        </p>
      </div>

      <ul className="flex flex-col px-3 pb-1">
        {atRisk.map((p) => {
          const isFined = p.status === "fined";
          const fineAmount = computeFineAmount(p.status, weeklyFine);

          return (
            <li key={p.profile.id} className="flex items-center gap-2.5 py-2">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                {p.profile.avatar_url && (
                  <Image
                    src={p.profile.avatar_url}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {p.profile.nickname}
                  </span>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                      isFined ? "bg-warn-soft text-warn" : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {isFined ? `${fineAmount.toLocaleString()}원` : "목표 미달성"}
                  </span>
                </div>
                {p.targetDays != null && (
                  <div className="mt-1.5">
                    <DayDots
                      target={p.targetDays}
                      achieved={p.achievedDays}
                      tone="brand"
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
