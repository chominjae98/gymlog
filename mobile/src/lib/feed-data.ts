import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WorkoutLogWithProfile } from "@/types/database";

type Client = SupabaseClient<Database>;

export const FEED_PAGE_SIZE = 10;

/**
 * 홈 피드(인스타그램 스타일)용: 특정 방의 인증 기록을 최신순으로 페이지 단위로 불러온다.
 * before는 커서로 쓰는 이전 페이지 마지막 게시물의 created_at — 오프셋이 아니라
 * 타임스탬프 기준이라, 페이지를 불러오는 중간에 새 게시물이 올라와도 다음 페이지
 * 결과가 밀리거나 중복되지 않는다.
 */
export async function getFeedLogs(
  supabase: Client,
  roomId: string,
  before?: string
): Promise<WorkoutLogWithProfile[]> {
  let query = supabase
    .from("workout_logs")
    .select(
      "id, user_id, room_id, log_date, photo_urls, photo_hashes, memo, created_at, profile:profiles(id, nickname, avatar_url)"
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getFeedLogs 조회 실패:", roomId, error);
    throw error;
  }
  return (data ?? []) as unknown as WorkoutLogWithProfile[];
}
