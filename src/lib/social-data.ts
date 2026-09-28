import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentWithProfile, Database, ReactionSummary } from "@/types/database";

type Client = SupabaseClient<Database>;

/** 게시물에 남길 수 있는 이모지 리액션 5종(고정 목록 — DB check 제약과 일치해야 함). */
export const REACTION_EMOJIS = ["🔥", "💪", "👏", "❤️", "😮"] as const;

export async function getCommentsForLogs(
  supabase: Client,
  logIds: string[]
): Promise<Map<string, CommentWithProfile[]>> {
  const map = new Map<string, CommentWithProfile[]>();
  if (logIds.length === 0) return map;

  const { data } = await supabase
    .from("workout_log_comments")
    .select("id, log_id, user_id, body, created_at, profile:profiles(id, nickname, avatar_url)")
    .in("log_id", logIds)
    .order("created_at", { ascending: true });

  for (const row of (data ?? []) as unknown as CommentWithProfile[]) {
    const arr = map.get(row.log_id) ?? [];
    arr.push(row);
    map.set(row.log_id, arr);
  }
  return map;
}

export async function addComment(supabase: Client, logId: string, userId: string, body: string) {
  return supabase
    .from("workout_log_comments")
    .insert({ log_id: logId, user_id: userId, body })
    .select("id, log_id, user_id, body, created_at, profile:profiles(id, nickname, avatar_url)")
    .single();
}

export async function deleteComment(supabase: Client, commentId: string) {
  return supabase.from("workout_log_comments").delete().eq("id", commentId);
}

export async function updateComment(supabase: Client, commentId: string, body: string) {
  return supabase
    .from("workout_log_comments")
    .update({ body })
    .eq("id", commentId)
    .select("id, log_id, user_id, body, created_at, profile:profiles(id, nickname, avatar_url)")
    .single();
}

/** 게시물 하나의 리액션을 이모지별 개수로 집계하고, 내가 고른 이모지가 있으면 함께 반환한다. */
export async function getReactionsForLog(
  supabase: Client,
  logId: string,
  currentUserId: string
): Promise<ReactionSummary> {
  const { data } = await supabase
    .from("workout_log_reactions")
    .select("user_id, emoji")
    .eq("log_id", logId);

  const counts: Record<string, number> = {};
  let myEmoji: string | null = null;
  for (const row of data ?? []) {
    counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
    if (row.user_id === currentUserId) myEmoji = row.emoji;
  }
  return { counts, myEmoji };
}

/**
 * 리액션을 남기거나 바꾼다(1인당 게시물 하나에 1개 — unique(log_id, user_id)).
 * 같은 이모지를 다시 고르면 취소하고 싶은 것이므로, 호출하는 쪽(ReactionBar)에서
 * 그 경우엔 이 함수 대신 removeReaction을 부른다.
 */
export async function setReaction(supabase: Client, logId: string, userId: string, emoji: string) {
  return supabase
    .from("workout_log_reactions")
    .upsert({ log_id: logId, user_id: userId, emoji }, { onConflict: "log_id,user_id" });
}

export async function removeReaction(supabase: Client, logId: string, userId: string) {
  return supabase
    .from("workout_log_reactions")
    .delete()
    .eq("log_id", logId)
    .eq("user_id", userId);
}
