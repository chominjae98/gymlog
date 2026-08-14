"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatMonthTitle,
  getMonthGrid,
  isSameMonthGuard,
  WEEKDAY_LABELS,
} from "@/lib/date";
import { countUniquePeople } from "@/lib/dashboard-data";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  monthDate: Date;
  onMonthChange: (date: Date) => void;
  logsByDate: Map<string, WorkoutLogWithProfile[]>;
  selectedKey: string;
  onSelectDate: (key: string) => void;
};

export function CalendarGrid({
  monthDate,
  onMonthChange,
  logsByDate,
  selectedKey,
  onSelectDate,
}: Props) {
  const grid = getMonthGrid(monthDate);
  const canGoNext = !isSameMonthGuard(monthDate, new Date());

  return (
    <div className="surface-card overflow-hidden px-1 pb-3">
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <button
          aria-label="이전 달"
          onClick={() =>
            onMonthChange(
              new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
            )
          }
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted active:scale-95"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-[16px] font-bold tracking-tight text-foreground">
          {formatMonthTitle(monthDate)}
        </h2>
        <button
          aria-label="다음 달"
          disabled={!canGoNext}
          onClick={() =>
            onMonthChange(
              new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
            )
          }
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 px-3">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-2 text-center text-[11px] font-semibold text-muted"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 px-3 pt-1">
        {grid.map(({ date, key, inCurrentMonth, isToday, isFuture }) => {
          const dayLogs = logsByDate.get(key) ?? [];
          const isSelected = key === selectedKey;
          const people = countUniquePeople(dayLogs);

          return (
            <button
              key={key}
              disabled={isFuture}
              onClick={() => onSelectDate(key)}
              className="group flex flex-col items-center gap-1 py-0.5"
            >
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition",
                  isSelected
                    ? "bg-foreground text-background shadow-sm"
                    : isToday
                      ? "text-brand-strong ring-2 ring-brand ring-inset"
                      : inCurrentMonth
                        ? "text-foreground"
                        : "text-muted/35",
                  isFuture
                    ? "opacity-30"
                    : !isSelected && "group-active:scale-90 group-hover:bg-surface-muted",
                ].join(" ")}
              >
                {date.getDate()}
              </span>
              <span className="flex h-3 items-center justify-center gap-0.5">
                {people > 0 &&
                  Array.from({ length: Math.min(people, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={[
                        "h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-foreground" : "bg-brand",
                      ].join(" ")}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
