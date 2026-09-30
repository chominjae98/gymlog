import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { resizeImageForUpload, type ResizedPhoto } from "@/lib/image-resize";
import { hashPhoto } from "@/lib/photo-hash";

/**
 * 웹 버전의 `<input type="file" multiple>`는 OS가 "카메라로 촬영 / 사진첩에서 선택"
 * 액션시트를 자동으로 띄워줬지만, RN에는 그런 통합 피커가 없어 직접 골라야 한다.
 */
export function pickPhotos(remaining: number): Promise<ImagePicker.ImagePickerAsset[]> {
  return new Promise((resolve) => {
    Alert.alert("사진 선택", undefined, [
      { text: "취소", style: "cancel", onPress: () => resolve([]) },
      {
        text: "카메라로 촬영",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("카메라 권한이 필요해요", "설정에서 카메라 접근을 허용해 주세요.");
            return resolve([]);
          }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 1 });
          resolve(result.canceled ? [] : result.assets);
        },
      },
      {
        text: "사진첩에서 선택",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("사진첩 권한이 필요해요", "설정에서 사진 접근을 허용해 주세요.");
            return resolve([]);
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
          });
          resolve(result.canceled ? [] : result.assets);
        },
      },
    ]);
  });
}

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
