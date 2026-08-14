import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "오운완 — 우리끼리 운동 인증",
  description: "친구들과 함께하는 주간 운동 목표와 인증 기록, 오운완.",
  // iOS에서 "홈 화면에 추가" 했을 때 브라우저 주소창 없이 앱처럼 뜨게 함
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "오운완",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f5",
};

// 화면이 그려지기 전에 저장된 테마를 적용해 깜빡임(FOUC)을 막는다.
// 저장된 값이 없으면 기본값은 라이트 모드 (시스템 설정을 따르지 않음).
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark") document.documentElement.dataset.theme = "dark";
  } catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
