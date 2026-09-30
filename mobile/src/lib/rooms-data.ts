import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeaderboardEntry, MyLeaderboardRankRow, Profile, Room } from "@/types/database";

type Client = SupabaseClient<Database>;

export type RoomMemberProfile = Pick<Profile, "id" | "nickname" | "avatar_url"> & {
  joinedAt: string;
};

/** 내가 속한 방 목록 (가입일 오름차순 — 가장 먼저 들어간 방이 기본으로 앞에 오도록). */
export async function getMyRooms(supabase: Client, userId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("joined_at, room:rooms(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("getMyRooms 조회 실패:", userId, error);
  }

  return ((data ?? []) as unknown as { room: Room | null }[])
    .map((r) => r.room)
    .filter((room): room is Room => room !== null);
}

/** 새 방을 만들고 내가 자동으로 첫 멤버가 된다. */
export async function createRoom(supabase: Client, name: string, finePerDay = 5000) {
  const { data, error } = await supabase.rpc("create_room", {
    name,
    fine_per_day: finePerDay,
  });
  if (error) throw error;
  return data as Room;
}

/** 초대 코드로 방에 참가한다. */
export async function joinRoomByCode(supabase: Client, code: string) {
  const { data, error } = await supabase.rpc("join_room_by_code", { code });
  if (error) throw error;
  return data as Room;
}

/** 이 방의 멤버 목록(가입일 오름차순). */
export async function getRoomMembers(supabase: Client, roomId: string): Promise<RoomMemberProfile[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("joined_at, profile:profiles(id, nickname, avatar_url)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("getRoomMembers 조회 실패:", roomId, error);
  }

  return ((data ?? []) as unknown as {
    joined_at: string;
    profile: Pick<Profile, "id" | "nickname" | "avatar_url"> | null;
  }[])
    .filter((row): row is typeof row & { profile: Pick<Profile, "id" | "nickname" | "avatar_url"> } =>
      row.profile !== null
    )
    .map((row) => ({ ...row.profile, joinedAt: row.joined_at }));
}

/** 방을 나간다 (본인 멤버십만 삭제). */
export async function leaveRoom(supabase: Client, roomId: string) {
  const { error } = await supabase.rpc("leave_room", { target_room_id: roomId });
  if (error) throw error;
}

const LEADERBOARD_LIMIT = 100;

export type LeaderboardPeriod = "week" | "month" | "all";

/** "홈"(기본) 방에서의 인증 일수 기준 전체 이용자 랭킹(기간별). 상위 100명까지만 보여준다. */
export async function getLeaderboard(
  supabase: Client,
  period: LeaderboardPeriod
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    period,
    limit_count: LEADERBOARD_LIMIT,
  });
  if (error) {
    console.error("getLeaderboard 조회 실패:", period, error);
  }
  return (data ?? []) as LeaderboardEntry[];
}

/**
 * 내 순위. get_leaderboard가 상위 100명까지만 보여주는 것과 달리 전체 순위 기준으로
 * 매겨서, 100등 밖이어도 몇 등인지 알 수 있다. 이번 기간에 기록이 하나도 없으면 null.
 */
export async function getMyLeaderboardRank(
  supabase: Client,
  userId: string,
  period: LeaderboardPeriod
): Promise<MyLeaderboardRankRow | null> {
  const { data, error } = await supabase.rpc("get_my_leaderboard_rank", {
    period,
    target_user_id: userId,
  });
  if (error) {
    console.error("getMyLeaderboardRank 조회 실패:", period, error);
    return null;
  }
  return (data as MyLeaderboardRankRow[] | null)?.[0] ?? null;
}
