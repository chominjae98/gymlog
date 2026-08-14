import { ImageResponse } from "next/og";

/** PWA(홈 화면 추가)용 앱 아이콘을 요청 크기에 맞춰 즉석에서 그려준다. 별도 이미지 파일 불필요. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const dimension = Number(size) === 512 ? 512 : 192;
  const glyphSize = Math.round(dimension * 0.38);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // 마스커블 아이콘은 OS가 자체적으로 모양을 잘라내므로 배경은 항상 꽉 채운다.
          background: "linear-gradient(150deg, #35d98a 0%, #17914f 65%, #0f6b3a 100%)",
        }}
      >
        <div
          style={{
            fontSize: glyphSize,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          완
        </div>
      </div>
    ),
    { width: dimension, height: dimension }
  );
}
