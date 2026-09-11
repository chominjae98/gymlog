const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * 사진 선택 직후 미리보기(preview)와 업로드에 쓸 원본을, 화면에 보일 만큼만
 * 축소·압축한다.
 *
 * 요즘 스마트폰 카메라 사진은 원본이 3000~4000px, 수 MB에 달해서 리사이즈 없이
 * 그대로 <Image>로 미리보기 3~5장을 동시에 렌더링하거나, 업로드 후 그 원본을 그대로
 * 다시 내려받아 디코딩하면 브라우저가 한 번에 여러 장의 고해상도 이미지를 디코딩하느라
 * 메인 스레드/GPU가 밀려서 화면이 잠깐 검게 깨지는(지지직거리는) 현상의 근본 원인이었다.
 * 화면에서 실제로 보여줄 크기(긴 변 기준 1600px)로 미리 줄여두면 이 문제가 사라진다.
 */
export async function resizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    // gif는 캔버스로 그리면 애니메이션이 깨지므로 원본 그대로 둔다.
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return file; // 디코딩 자체가 안 되는 형식이면 원본 그대로 업로드 시도
    }
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  if (scale === 1) {
    bitmap.close();
    return file; // 이미 충분히 작은 사진(스크린샷 등)은 그대로 둔다.
  }

  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

/** 여러 장을 병렬로 리사이즈한다. */
export async function resizeImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map(resizeImageForUpload));
}
