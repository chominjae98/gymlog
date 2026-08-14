import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg, #35d98a 0%, #17914f 65%, #0f6b3a 100%)",
          color: "#ffffff",
          fontSize: 19,
          fontWeight: 700,
        }}
      >
        완
      </div>
    ),
    { ...size }
  );
}
