import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import type { ResizedPhoto } from "@/lib/image-resize";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 파일 내용을 SHA-256으로 해시한다. 같은 사진(바이트가 완전히 같은 파일)인지
 * 판별하는 데 쓴다 — resizeImagesForUpload를 거친 "업로드 직전 파일" 기준으로
 * 해시를 계산해야, 같은 원본을 다시 골랐을 때 결정적으로 같은 해시가 나온다.
 */
export async function hashPhoto(photo: ResizedPhoto): Promise<string> {
  const bytes = await new File(photo.uri).bytes();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return toHex(digest);
}

export async function hashPhotos(photos: ResizedPhoto[]): Promise<string[]> {
  return Promise.all(photos.map(hashPhoto));
}
