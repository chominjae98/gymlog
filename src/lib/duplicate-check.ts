import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 같은 사람이 과거에 올린 사진들의 해시 목록을 모두 가져온다 (동일 사진 재업로드 방지용).
 * excludeLogId를 주면 그 기록 자신은 제외한다 (게시물 수정 시, 이미 올려둔 자기 사진을
 * "재사용"으로 잘못 걸러내지 않기 위함).
 */
export async function getExistingPhotoHashes(
  supabase: SupabaseClient<Database>,
  userId: string,
  excludeLogId?: string
): Promise<Set<string>> {
  let query = supabase
    .from("workout_logs")
    .select("id, photo_hashes")
    .eq("user_id", userId);
  if (excludeLogId) {
    query = query.neq("id", excludeLogId);
  }
  const { data } = await query;

  const hashes = new Set<string>();
  for (const row of data ?? []) {
    for (const hash of row.photo_hashes ?? []) {
      if (hash) hashes.add(hash);
    }
  }
  return hashes;
}
