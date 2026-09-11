import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentWithProfile, Database, LogReactionSummary } from "@/types/database";

type Client = SupabaseClient<Database>;

export const REACTION_EMOJIS = ["🔥", "👏", "💪", "😂"] as const;

/** 게시물 여러 개(logIds)에 달린 리액션을 한 번에 불러와 게시물별로 집계한다. */
export async function getReactionsForLogs(
  supabase: Client,
  logIds: string[],
  currentUserId: string
): Promise<Map<string, LogReactionSummary>> {
  const map = new Map<string, LogReactionSummary>();
  if (logIds.length === 0) return map;

  const { data } = await supabase
    .from("workout_log_reactions")
    .select("log_id, user_id, emoji")
    .in("log_id", logIds);

  for (const row of data ?? []) {
    const summary = map.get(row.log_id) ?? { counts: {}, myEmoji: null };
    summary.counts[row.emoji] = (summary.counts[row.emoji] ?? 0) + 1;
    if (row.user_id === currentUserId) summary.myEmoji = row.emoji;
    map.set(row.log_id, summary);
  }
  return map;
}

/**
 * 같은 이모지를 다시 누르면 취소, 다른 이모지를 누르면 교체, 처음 누르면 추가.
 * 한 사람당 게시물 하나에 이모지 하나만 남도록 unique(log_id, user_id) 제약을 활용한다.
 */
export async function toggleReaction(
  supabase: Client,
  logId: string,
  userId: string,
  emoji: string,
  currentEmoji: string | null
) {
  if (currentEmoji === emoji) {
    const { error } = await supabase
      .from("workout_log_reactions")
      .delete()
      .eq("log_id", logId)
      .eq("user_id", userId);
    return { error, removed: true as const };
  }

  const { error } = await supabase
    .from("workout_log_reactions")
    .upsert({ log_id: logId, user_id: userId, emoji }, { onConflict: "log_id,user_id" });
  return { error, removed: false as const };
}

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
