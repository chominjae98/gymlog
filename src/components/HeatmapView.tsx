"use client";

import { useEffect, useRef } from "react";
import { WEEKDAY_LABELS } from "@/lib/date";
import type { HeatmapCell } from "@/lib/heatmap-data";

/**
 * GitHub 잔디밭 스타일로 최근 활동을 보여주는 히트맵.
 * 칸만 봐서는 며칠인지 알 수 없다는 피드백에 따라, 칸을 탭하면 그 날짜와 인증 여부를
 * 부모(HeatmapSheet)가 캡션으로 보여줄 수 있도록 onSelectCell을 지원한다.
 */
export function HeatmapView({
  weeks,
  monthLabels,
  selectedKey,
  onSelectCell,
}: {
  weeks: HeatmapCell[][];
  monthLabels: { weekIndex: number; label: string }[];
  selectedKey?: string | null;
  onSelectCell?: (cell: HeatmapCell) => void;
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
      <div className="inline-flex gap-[4px]">
        <div className="flex flex-col gap-[4px] pr-1.5 pt-[22px]">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={label}
              className="flex h-4 w-6 items-center text-[10px] font-medium text-muted"
            >
              {i % 2 === 0 ? label : ""}
            </span>
          ))}
        </div>

        {weeks.map((week, i) => {
          const label = labelByWeekIndex.get(i);
          return (
            <div key={week[0]?.key ?? i} className="flex flex-col gap-[4px]">
              <span
                className={[
                  "block h-[18px] whitespace-nowrap text-[11px] font-bold leading-[18px]",
                  label ? "text-foreground" : "",
                ].join(" ")}
              >
                {label ?? ""}
              </span>
              {week.map((cell) => {
                const isSelected = selectedKey === cell.key;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!cell.inRange}
                    onClick={() => onSelectCell?.(cell)}
                    aria-label={cell.key}
                    className={[
                      "h-4 w-4 rounded-[4px] transition",
                      !cell.inRange
                        ? "bg-transparent"
                        : cell.achieved
                          ? "bg-brand"
                          : "bg-surface-muted",
                      isSelected ? "ring-2 ring-offset-1 ring-foreground ring-offset-surface" : "",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
