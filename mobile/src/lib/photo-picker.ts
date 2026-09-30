import * as ImagePicker from "expo-image-picker";
import { resizeImageForUpload, type ResizedPhoto } from "@/lib/image-resize";
import { hashPhoto } from "@/lib/photo-hash";

// "카메라로 촬영 / 사진첩에서 선택" 소스 선택 UI는
// @/components/ui/PhotoSourceSheet의 usePhotoSourcePicker()가 맡는다.

/**
 * 고른 사진들을 리사이즈 → 해시 순으로 처리하고, 이미 본 해시(과거에 올린 사진 +
 * 이번에 같이 고른 사진)와 겹치면 걸러낸다. seenHashes는 호출부가 누적해서 넘긴다
 * (다음 호출에서도 중복 판정에 계속 쓰기 위함).
 */
export async function processPickedAssets(
  assets: ImagePicker.ImagePickerAsset[],
  seenHashes: Set<string>
): Promise<{ accepted: { photo: ResizedPhoto; hash: string }[]; duplicateCount: number }> {
  const accepted: { photo: ResizedPhoto; hash: string }[] = [];
  let duplicateCount = 0;
  for (const asset of assets) {
    const resized = await resizeImageForUpload({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });
    const hash = await hashPhoto(resized);
    if (seenHashes.has(hash)) {
      duplicateCount += 1;
      continue;
    }
    seenHashes.add(hash);
    accepted.push({ photo: resized, hash });
  }
  return { accepted, duplicateCount };
}
