import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, FineExceptionWithVotes } from "@/types/database";

type Client = SupabaseClient<Database>;

/** 이번 주 벌금 예외 사유서 목록을, 각 사유서에 달린 투표까지 함께 불러온다. */
export async function getFineExceptionsForWeek(
  supabase: Client,
  weekStart: string,
  roomId: string
): Promise<FineExceptionWithVotes[]> {
  const { data } = await supabase
    .from("fine_exceptions")
    .select(
      "id, user_id, week_start, reason, status, created_at, resolved_at, profile:profiles(id, nickname, avatar_url), votes:fine_exception_votes(id, exception_id, voter_id, vote, created_at)"
    )
    .eq("room_id", roomId)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as FineExceptionWithVotes[];
}

export async function submitFineException(
  supabase: Client,
  userId: string,
  weekStart: string,
  reason: string,
  roomId: string
) {
  return supabase.from("fine_exceptions").insert({
    user_id: userId,
    week_start: weekStart,
    reason,
    room_id: roomId,
  });
}

/** 이 방의 멤버 수(벌금 예외 다수결 threshold 표시용). */
export async function getRoomMemberCount(supabase: Client, roomId: string) {
  const { count } = await supabase
    .from("room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);
  return count ?? 0;
}

export async function castFineExceptionVote(
  supabase: Client,
  exceptionId: string,
  voterId: string,
  vote: "approve" | "reject"
) {
  return supabase.from("fine_exception_votes").insert({
    exception_id: exceptionId,
    voter_id: voterId,
    vote,
  });
}

/**
 * 화면에 "과반 n표 필요"를 참고용으로 보여주기 위한 계산.
 * 실제 승인/반려 확정은 클라이언트가 아니라 DB 트리거(resolve_fine_exception)가
 * 서버에서 계산하므로, 여기 값이 실제 결과를 좌우하지는 않는다.
 */
export function majorityThreshold(totalMembers: number) {
  const eligible = Math.max(totalMembers - 1, 0);
  return Math.floor(eligible / 2) + 1;
}
