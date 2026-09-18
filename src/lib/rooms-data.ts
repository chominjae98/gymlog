import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeaderboardEntry, Room } from "@/types/database";

type Client = SupabaseClient<Database>;

/** 내가 속한 방 목록 (가입일 오름차순 — 가장 먼저 들어간 방이 기본으로 앞에 오도록). */
export async function getMyRooms(supabase: Client, userId: string): Promise<Room[]> {
  const { data } = await supabase
    .from("room_members")
    .select("joined_at, room:rooms(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  return ((data ?? []) as unknown as { room: Room }[]).map((r) => r.room);
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

/** 방과 무관한 전체 이용자 랭킹(누적 인증 일수 기준). */
export async function getGlobalLeaderboard(supabase: Client): Promise<LeaderboardEntry[]> {
  const { data } = await supabase.rpc("get_global_leaderboard", {});
  return (data ?? []) as LeaderboardEntry[];
}
