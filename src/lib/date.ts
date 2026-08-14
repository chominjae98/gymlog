import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isAfter,
  differenceInCalendarDays,
} from "date-fns";
import { ko } from "date-fns/locale";

/** 월요일 시작 주 기준 헬퍼들 (KR 관례) */
export const WEEK_OPTS = { weekStartsOn: 1 as const };

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function getWeekStartKey(date: Date) {
  return toDateKey(startOfWeek(date, WEEK_OPTS));
}

/** 달력 그리드에 표시할 날짜들 (주 시작이 이전 달이면 그 날짜도 포함) */
export function getMonthGrid(monthDate: Date) {
  const start = startOfWeek(startOfMonth(monthDate), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(monthDate), WEEK_OPTS);
  return eachDayOfInterval({ start, end }).map((date) => ({
    date,
    key: toDateKey(date),
    inCurrentMonth: isSameMonth(date, monthDate),
    isToday: isToday(date),
    isFuture: isAfter(date, new Date()) && !isToday(date),
  }));
}

export function getMonthRangeKeys(monthDate: Date) {
  return {
    start: toDateKey(startOfWeek(startOfMonth(monthDate), WEEK_OPTS)),
    end: toDateKey(endOfWeek(endOfMonth(monthDate), WEEK_OPTS)),
  };
}

export function getWeekRangeKeys(date: Date) {
  return {
    start: toDateKey(startOfWeek(date, WEEK_OPTS)),
    end: toDateKey(endOfWeek(date, WEEK_OPTS)),
  };
}

/** 오늘 포함, 이번 주 일요일까지 남은 일수 (오늘 포함해서 셈) */
export function remainingDaysInWeekIncludingToday(date: Date) {
  const weekEnd = endOfWeek(date, WEEK_OPTS);
  return differenceInCalendarDays(weekEnd, date) + 1;
}

export function formatMonthTitle(date: Date) {
  return format(date, "yyyy년 M월", { locale: ko });
}

export function formatDayTitle(date: Date) {
  return format(date, "M월 d일 (EEEE)", { locale: ko });
}

export function formatTime(dateIso: string) {
  return format(new Date(dateIso), "a h:mm", { locale: ko });
}

/** "8.4 - 8.10" 같은 주간 범위 라벨 (정산 내역 화면용) */
export function formatWeekRange(weekStartKey: string) {
  const start = new Date(`${weekStartKey}T00:00:00`);
  const end = endOfWeek(start, WEEK_OPTS);
  return `${format(start, "M.d")} - ${format(end, "M.d")}`;
}

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** 두 날짜가 같은 연/월인지 (다음 달 버튼 비활성화용) */
export function isSameMonthGuard(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
