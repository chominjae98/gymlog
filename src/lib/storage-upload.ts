import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const BUCKET = "workout-photos";
const STORAGE_MARKER = `/${BUCKET}/`;

/**
 * 운동 인증 사진들을 workout-photos 버킷의 `${userId}/...` 경로에 업로드하고
 * 공개 URL 목록을 반환한다. 하나라도 업로드에 실패하면 그 시점에서 멈추고
 * 에러를 던진다 (UploadSheet / EditPostSheet 둘 다에서 공용으로 사용).
 */
export async function uploadWorkoutPhotos(
  supabase: SupabaseClient<Database>,
  userId: string,
  dateKey: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${dateKey}-${Date.now()}-${urls.length}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      throw new Error("사진 업로드에 실패했어요. 다시 시도해 주세요.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(publicUrl);
  }

  return urls;
}

/** 공개 URL에서 버킷 내부 경로만 추출한다 (삭제 시 storage.remove에 필요). */
export function storagePathFromPublicUrl(url: string) {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx === -1 ? null : url.slice(idx + STORAGE_MARKER.length);
}

/** best-effort로 사진 파일들을 정리한다. 실패해도 호출부의 DB 반영은 이미 끝난 상태이므로 무시. */
export async function removeWorkoutPhotos(
  supabase: SupabaseClient<Database>,
  urls: string[]
) {
  const paths = urls
    .map(storagePathFromPublicUrl)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}
