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
          background: "#1b1d1a",
          color: "#faf9f5",
          fontSize: 84,
          fontWeight: 700,
        }}
      >
        완
      </div>
    ),
    { ...size }
  );
}
