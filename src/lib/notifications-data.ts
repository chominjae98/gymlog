import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationWithActor } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * 내 알림 목록(최근 30개). 댓글/리액션을 남긴 사람의 프로필과 그 내용(댓글 본문 또는
 * 리액션 이모지)을 함께 가져온다. notifications의 user_id/actor_id가 둘 다 profiles를
 * 참조하고 있어, 어느 쪽으로 join할지 애매하지 않도록 외래키 이름
 * (notifications_actor_id_fkey)을 명시한다.
 */
export async function getMyNotifications(supabase: Client): Promise<NotificationWithActor[]> {
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, user_id, actor_id, log_id, comment_id, reaction_id, type, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, nickname, avatar_url), comment:workout_log_comments(body), reaction:workout_log_reactions(emoji)"
    )
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []) as unknown as NotificationWithActor[];
}

/** 안 읽은 알림이 있는지만 가볍게 확인한다(종 아이콘 빨간 점 표시용). */
export async function hasUnreadNotifications(supabase: Client): Promise<boolean> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return (count ?? 0) > 0;
}

/** 알림함을 열었을 때, 그 시점까지 온 알림을 전부 읽음 처리한다. */
export async function markAllNotificationsRead(supabase: Client, userId: string) {
  return supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
