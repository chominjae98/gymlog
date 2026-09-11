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
