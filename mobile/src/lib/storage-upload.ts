import type { SupabaseClient } from "@supabase/supabase-js";
import { File } from "expo-file-system";
import type { Database } from "@/types/database";
import type { ResizedPhoto } from "@/lib/image-resize";

const BUCKET = "workout-photos";
const STORAGE_MARKER = `/${BUCKET}/`;

/**
 * 운동 인증 사진들을 workout-photos 버킷의 `${userId}/...` 경로에 업로드하고
 * 공개 URL 목록을 반환한다. 하나라도 업로드에 실패하면 그 시점까지 이미 올라간
 * 파일들을 정리(best-effort)한 뒤 에러를 던진다 (UploadSheet / EditPostSheet 둘 다에서 공용으로 사용).
 *
 * supabase-js의 upload()는 Blob/File(전역 Blob 인스턴스)이 아니면 ArrayBufferView를
 * 그대로 fetch body로 쓴다 — expo-file-system의 File이 RN 전역 Blob과 instanceof로
 * 일치한다는 보장이 없으므로, 바이트(Uint8Array)를 직접 읽어 넘기는 쪽이 안전하다.
 */
export async function uploadWorkoutPhotos(
  supabase: SupabaseClient<Database>,
  userId: string,
  dateKey: string,
  photos: ResizedPhoto[]
): Promise<string[]> {
  const uploadedPaths: string[] = [];
  const urls: string[] = [];

  for (const photo of photos) {
    const dotIndex = photo.fileName.lastIndexOf(".");
    const ext = dotIndex === -1 ? "jpg" : photo.fileName.slice(dotIndex + 1);
    const path = `${userId}/${dateKey}-${Date.now()}-${urls.length}.${ext}`;

    const bytes = await new File(photo.uri).bytes();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { cacheControl: "3600", upsert: false, contentType: photo.mimeType });

    if (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths);
      }
      throw new Error("사진 업로드에 실패했어요. 다시 시도해 주세요.");
    }
    uploadedPaths.push(path);

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
export async function removeWorkoutPhotos(supabase: SupabaseClient<Database>, urls: string[]) {
  const paths = urls.map(storagePathFromPublicUrl).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}
