import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // iOS가 알아서 둥근 모서리로 잘라주므로 배경은 꽉 채운다.
          background: "linear-gradient(150deg, #35d98a 0%, #17914f 65%, #0f6b3a 100%)",
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          완
        </div>
      </div>
    ),
    { ...size }
  );
}
