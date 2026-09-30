import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** expo-image-picker가 반환하는 asset 중 리사이즈에 필요한 부분만. */
export type PickedPhoto = {
  uri: string;
  width: number;
  height: number;
  mimeType?: string | null;
  fileName?: string | null;
};

export type ResizedPhoto = {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  mimeType: string;
};

function baseNameOf(photo: PickedPhoto) {
  return (photo.fileName ?? "photo").replace(/\.\w+$/, "");
}

/**
 * 사진 선택 직후 업로드에 쓸 원본을 화면에 보일 만큼만 축소·압축한다.
 * (웹 버전의 image-resize.ts와 동일한 목적 — 긴 변 1600px, JPEG 85%.)
 */
export async function resizeImageForUpload(photo: PickedPhoto): Promise<ResizedPhoto> {
  if (photo.mimeType === "image/gif") {
    // gif는 리사이즈하면 애니메이션이 깨지므로 원본 그대로 둔다.
    return {
      uri: photo.uri,
      width: photo.width,
      height: photo.height,
      fileName: photo.fileName ?? `${baseNameOf(photo)}.gif`,
      mimeType: "image/gif",
    };
  }

  const longEdge = Math.max(photo.width, photo.height);
  if (longEdge <= MAX_DIMENSION) {
    // 이미 충분히 작은 사진(스크린샷 등)은 그대로 둔다.
    return {
      uri: photo.uri,
      width: photo.width,
      height: photo.height,
      fileName: photo.fileName ?? `${baseNameOf(photo)}.jpg`,
      mimeType: photo.mimeType ?? "image/jpeg",
    };
  }

  const context = ImageManipulator.manipulate(photo.uri);
  if (photo.width >= photo.height) {
    context.resize({ width: MAX_DIMENSION });
  } else {
    context.resize({ height: MAX_DIMENSION });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileName: `${baseNameOf(photo)}.jpg`,
    mimeType: "image/jpeg",
  };
}

/** 여러 장을 병렬로 리사이즈한다. */
export async function resizeImagesForUpload(photos: PickedPhoto[]): Promise<ResizedPhoto[]> {
  return Promise.all(photos.map(resizeImageForUpload));
}
