import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  differenceInCalendarDays,
} from "date-fns";
import { ko } from "date-fns/locale";

/** 월요일 시작 주 기준 헬퍼들 (KR 관례) */
export const WEEK_OPTS = { weekStartsOn: 1 as const };

const KST_TIME_ZONE = "Asia/Seoul";

/**
 * "지금"을 항상 한국 시간(KST) 기준으로 반환한다.
 * 서버(Vercel, 기본 UTC)와 클라이언트(사용자 기기 시간대)가 서로 다른 시간대에서
 * 돌아가더라도, 이 함수를 거쳐서 만든 Date는 어디서 읽든(getFullYear/getMonth/getDate 등
 * "로컬" getter로) 항상 한국 달력 기준 값을 돌려준다.
 * → 자정 전후(00:00~09:00 KST)에 서버는 아직 "어제"로 계산해서 오늘 올린 인증이
 *   "오늘 인증 현황"에서 빠지던 버그의 근본 원인이었다.
 */
export function nowInSeoul(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24, // 자정은 "24"로 나오는 로케일이 있어 보정
    get("minute"),
    get("second")
  );
}

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
  const todayKey = toDateKey(nowInSeoul());
  return eachDayOfInterval({ start, end }).map((date) => {
    const key = toDateKey(date);
    return {
      date,
      key,
      inCurrentMonth: isSameMonth(date, monthDate),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
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

/** created_at(UTC ISO 문자열)을 항상 한국 시간 기준 오전/오후 h:mm으로 표시한다. */
export function formatTime(dateIso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateIso));
}

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** 두 날짜가 같은 연/월인지 (다음 달 버튼 비활성화용) */
export function isSameMonthGuard(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
