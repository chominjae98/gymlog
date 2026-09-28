/**
 * 파일 내용을 SHA-256으로 해시한다. 같은 사진(바이트가 완전히 같은 파일)인지
 * 판별하는 데 쓴다 — resizeImagesForUpload를 거친 "업로드 직전 파일" 기준으로
 * 해시를 계산해야, 같은 원본을 다시 골랐을 때 결정적으로 같은 해시가 나온다.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFiles(files: File[]): Promise<string[]> {
  return Promise.all(files.map(hashFile));
}

/**
 * 파일별로 리사이즈와 해시 계산을 이어서 처리한다. "전체 리사이즈 완료 → 전체 해시 시작"처럼
 * 파일 개수만큼의 작업을 두 단계로 나눠 순서대로 기다리지 않고, 파일 하나가 리사이즈되는 대로
 * 바로 그 파일의 해시 계산을 시작해 전체 처리 시간을 줄인다.
 */
export async function resizeAndHashFiles(
  files: File[],
  resizeOne: (file: File) => Promise<File>
): Promise<{ files: File[]; hashes: string[] }> {
  const results = await Promise.all(
    files.map(async (file) => {
      const resized = await resizeOne(file);
      const hash = await hashFile(resized);
      return { file: resized, hash };
    })
  );
  return { files: results.map((r) => r.file), hashes: results.map((r) => r.hash) };
}
