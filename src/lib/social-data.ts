import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentWithProfile, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

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
