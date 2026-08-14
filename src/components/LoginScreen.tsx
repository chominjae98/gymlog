"use client";

import { useState } from "react";
import { signInWithKakao } from "@/lib/auth";

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.58-.8 2.98-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.65.1 1.32.15 2 .15 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5z"
        fill="#1B1D1A"
      />
    </svg>
  );
}

export function LoginScreen({ authError }: { authError?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signInWithKakao();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* 아주 은은한 포인트 컬러 글로우. 헤드라인 뒤에만 살짝, 화면 전체를 덮지 않는다. */}
      <div className="pointer-events-none absolute left-1/2 top-[14%] h-56 w-[85%] -translate-x-1/2 rounded-full bg-brand-soft/70 blur-[64px]" />

      <div className="safe-top relative flex flex-1 flex-col justify-center px-6 py-10">
        <div className="animate-fade-up mx-auto w-full max-w-sm text-center">
          <h1 className="text-[30px] font-bold leading-[1.25] tracking-tight text-foreground">
            오늘 운동,
            <br />
            <span className="text-brand-strong">친구들이랑 같이</span> 인증해요
          </h1>

          <div className="mt-10 grid grid-cols-3 gap-2.5 text-left">
            <FeatureChip label="달력 인증" emoji="🗓️" />
            <FeatureChip label="주간 목표" emoji="🎯" />
            <FeatureChip label="벌금 리스트" emoji="💸" />
          </div>
        </div>

        <div className="animate-fade-up mx-auto mt-14 w-full max-w-sm" style={{ animationDelay: "0.1s" }}>
          {authError && (
            <p className="mb-3 rounded-xl bg-warn-soft px-4 py-2.5 text-center text-[13px] font-medium text-warn">
              로그인에 실패했어요. 다시 시도해 주세요.
            </p>
          )}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] py-4 text-[15px] font-semibold text-[#1B1D1A] shadow-[0_8px_20px_-8px_rgba(254,229,0,0.7)] transition active:scale-[0.98] disabled:opacity-60"
          >
            <KakaoIcon />
            {loading ? "이동 중..." : "카카오로 3초 만에 시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 px-2 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-base">
        {emoji}
      </span>
      <span className="text-[11px] font-semibold text-muted">{label}</span>
    </div>
  );
}
