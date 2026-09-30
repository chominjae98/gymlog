import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 같은 사람이 "이 방"에 과거에 올린 사진들의 해시 목록을 모두 가져온다 (동일 사진
 * 재업로드 방지용). room_id로 범위를 좁히는 이유: 한 사람이 여러 방(홈 + 친구 방)에
 * 동시에 속할 수 있는데, 같은 날 같은 운동을 했다는 증거로 같은 사진을 홈과 친구 방에
 * 각각 인증하는 것은 정당한 사용이다 — 방을 가리지 않고 전역으로 막으면 그 경우까지
 * "재사용"으로 잘못 걸러내게 된다.
 * excludeLogId를 주면 그 기록 자신은 제외한다 (게시물 수정 시, 이미 올려둔 자기 사진을
 * "재사용"으로 잘못 걸러내지 않기 위함).
 *
 * 이 검사는 실수로 예전 사진을 재사용하는 것을 막는 클라이언트 측 UX 안전장치일 뿐,
 * DB에는 photo_hashes에 대한 유니크 제약이 없다. 두 기기/탭에서 거의 동시에 올리면
 * 둘 다 통과할 수 있고, 클라이언트를 거치지 않고 직접 insert하면 우회된다 — 부정
 * 이용을 막는 보안 경계로 쓰면 안 된다.
 */
export async function getExistingPhotoHashes(
  supabase: SupabaseClient<Database>,
  userId: string,
  roomId: string,
  excludeLogId?: string
): Promise<Set<string>> {
  let query = supabase
    .from("workout_logs")
    .select("id, photo_hashes")
    .eq("user_id", userId)
    .eq("room_id", roomId);
  if (excludeLogId) {
    query = query.neq("id", excludeLogId);
  }
  const { data, error } = await query;

  if (error) {
    console.error("getExistingPhotoHashes 조회 실패:", userId, roomId, error);
  }

  const hashes = new Set<string>();
  for (const row of data ?? []) {
    for (const hash of row.photo_hashes ?? []) {
      if (hash) hashes.add(hash);
    }
  }
  return hashes;
}
