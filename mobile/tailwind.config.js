/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // 웹앱 src/app/globals.css의 라이트모드 토큰과 동일한 값.
      // 다크모드는 웹에서도 시스템이 아니라 사용자가 직접 고르는 토글이라
      // 이번 포팅 범위에서는 우선 라이트 고정으로 둔다.
      colors: {
        background: "#faf9f5",
        surface: "#ffffff",
        "surface-muted": "#f1f0ea",
        foreground: "#1b1d1a",
        muted: "#7a7d74",
        border: "#e7e5db",
        brand: { DEFAULT: "#1fb872", strong: "#17914f", soft: "#e3f7ec" },
        warn: { DEFAULT: "#ff6a4d", soft: "#ffece7" },
        room: {
          blue: { DEFAULT: "#2f6fed", soft: "#e8f0ff" },
          purple: { DEFAULT: "#8452e0", soft: "#f1eafd" },
          amber: { DEFAULT: "#b5790a", soft: "#fdf1de" },
          rose: { DEFAULT: "#d1447a", soft: "#fdeaf1" },
          teal: { DEFAULT: "#0f8a82", soft: "#e3f6f4" },
        },
      },
    },
  },
  plugins: [],
};
