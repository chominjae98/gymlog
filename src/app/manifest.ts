import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "오운완 — 우리끼리 운동 인증",
    short_name: "오운완",
    description: "친구들과 함께하는 주간 운동 목표와 인증 기록",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f5",
    theme_color: "#faf9f5",
    icons: [
      { src: "/pwa-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
