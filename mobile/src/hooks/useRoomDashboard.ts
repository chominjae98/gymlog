import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMonthLogs, getMyWeeklyGoal, getWeeklyProgress } from "@/lib/dashboard-data";
import { getFineExceptionsForWeek, getRoomMemberCount } from "@/lib/fine-exceptions";
import { getWeekStartKey, nowInSeoul } from "@/lib/date";
import { supabase } from "@/lib/supabase/client";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function useMonthLogs(roomId: string, monthDate: Date) {
  return useQuery({
    queryKey: ["monthLogs", roomId, monthKey(monthDate)],
    queryFn: () => getMonthLogs(supabase, monthDate, roomId),
  });
}

export function useWeeklyProgress(roomId: string, goalRoomId: string) {
  const today = nowInSeoul();
  return useQuery({
    queryKey: ["weeklyProgress", roomId, goalRoomId, getWeekStartKey(today)],
    queryFn: () => getWeeklyProgress(supabase, today, roomId, goalRoomId),
  });
}

export function useMyWeeklyGoal(userId: string, goalRoomId: string) {
  const today = nowInSeoul();
  return useQuery({
    queryKey: ["myWeeklyGoal", userId, goalRoomId, getWeekStartKey(today)],
    queryFn: () => getMyWeeklyGoal(supabase, userId, today, goalRoomId),
  });
}

export function useFineExceptions(roomId: string, weekStart: string) {
  return useQuery({
    queryKey: ["fineExceptions", roomId, weekStart],
    queryFn: () => getFineExceptionsForWeek(supabase, weekStart, roomId),
  });
}

export function useRoomMemberCount(roomId: string) {
  return useQuery({
    queryKey: ["roomMemberCount", roomId],
    queryFn: () => getRoomMemberCount(supabase, roomId),
  });
}

/**
 * 방 하나의 대시보드에 필요한 데이터 묶음. showFinance=false(홈)일 때는
 * 벌금 예외 사유서를 조회하지 않는다(웹 버전의 getHomeBundle과 동일).
 */
export function useRoomDashboard(
  userId: string,
  roomId: string,
  goalRoomId: string,
  monthDate: Date,
  showFinance: boolean
) {
  const weekStart = getWeekStartKey(nowInSeoul());
  const monthLogs = useMonthLogs(roomId, monthDate);
  const weeklyProgress = useWeeklyProgress(roomId, goalRoomId);
  const myGoal = useMyWeeklyGoal(userId, goalRoomId);
  const roomMemberCount = useRoomMemberCount(roomId);
  const exceptions = useFineExceptions(roomId, weekStart);

  const isLoading =
    monthLogs.isLoading ||
    weeklyProgress.isLoading ||
    myGoal.isLoading ||
    roomMemberCount.isLoading ||
    (showFinance && exceptions.isLoading);
  const isError = monthLogs.isError || weeklyProgress.isError || myGoal.isError || roomMemberCount.isError;

  return {
    isLoading,
    isError,
    monthLogs: monthLogs.data ?? [],
    weeklyProgress: weeklyProgress.data ?? [],
    myGoal: myGoal.data ?? null,
    roomMemberCount: roomMemberCount.data ?? 0,
    exceptions: showFinance ? exceptions.data ?? [] : [],
    weekStart,
  };
}

/** 대시보드 쓰기 동작(업로드/목표변경/투표 등) 이후 관련 쿼리를 한 번에 무효화한다. */
export function useInvalidateRoomDashboard() {
  const queryClient = useQueryClient();
  return (roomId: string) => {
    queryClient.invalidateQueries({ queryKey: ["monthLogs", roomId] });
    queryClient.invalidateQueries({ queryKey: ["weeklyProgress", roomId] });
    queryClient.invalidateQueries({ queryKey: ["myWeeklyGoal"] });
    queryClient.invalidateQueries({ queryKey: ["fineExceptions", roomId] });
    queryClient.invalidateQueries({ queryKey: ["roomMemberCount", roomId] });
  };
}
