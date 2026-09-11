"use client";

import { useEffect, useRef } from "react";
import { WEEKDAY_LABELS } from "@/lib/date";
import type { HeatmapCell } from "@/lib/heatmap-data";

/** GitHub 잔디밭 스타일로 최근 활동을 한눈에 보여주는 히트맵. 가로 스크롤로 지난 기록까지 볼 수 있다. */
export function HeatmapView({
  weeks,
  monthLabels,
}: {
  weeks: HeatmapCell[][];
  monthLabels: { weekIndex: number; label: string }[];
}) {
  const labelByWeekIndex = new Map(monthLabels.map((m) => [m.weekIndex, m.label]));
  const scrollRef = useRef<HTMLDivElement>(null);

  // 열자마자 최신(오늘 쪽, 오른쪽)이 보이도록 스크롤을 끝까지 이동해둔다.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  return (
    <div ref={scrollRef} className="overflow-x-auto overscroll-contain pb-1">
      <div className="inline-flex gap-[3px]">
        <div className="flex flex-col gap-[3px] pr-1 pt-[18px]">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={label}
              className="flex h-[13px] w-6 items-center text-[9px] font-medium text-muted"
            >
              {i % 2 === 0 ? label : ""}
            </span>
          ))}
        </div>

        {weeks.map((week, i) => (
          <div key={week[0]?.key ?? i} className="flex flex-col gap-[3px]">
            <span className="block h-[14px] text-[9px] font-medium leading-[14px] text-muted">
              {labelByWeekIndex.get(i) ?? ""}
            </span>
            {week.map((cell) => (
              <span
                key={cell.key}
                title={cell.key}
                className={[
                  "h-[13px] w-[13px] rounded-[3px]",
                  !cell.inRange
                    ? "bg-transparent"
                    : cell.achieved
                      ? "bg-brand"
                      : "bg-surface-muted",
                ].join(" ")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
