"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import { CalendarGrid } from "@/components/CalendarGrid";
import { HeaderMenu } from "@/components/HeaderMenu";
import { RoomOnboardingSheet } from "@/components/RoomOnboardingSheet";
import { nowInSeoul } from "@/lib/date";
import type { Profile } from "@/types/database";

type Props = {
  profile: Profile;
  joinCode?: string;
};

/**
 * 방이 하나도 없는 사용자에게 보여주는 홈 화면.
 * 달력이 있는 일반 홈 화면과 같은 모양을 유지하고, + 버튼을 누르면
 * 방 만들기/참가하기 시트가 그 위에 뜬다(화면 전체가 바뀌지 않는다).
 */
export function EmptyHome({ profile, joinCode }: Props) {
  const router = useRouter();
  const [monthDate, setMonthDate] = useState(nowInSeoul());
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 앱(웹뷰로 감싼 PWA 형태)을 강제종료했다가 다시 열면 OS/웹뷰가 이전 화면을
  // 네트워크 요청 없이 그대로 복원하는 경우가 있다. 방을 새로 만들거나 초대
  // 코드로 참가한 뒤 다시 홈으로 돌아왔을 때 이 "방 없음" 화면이 캐시된 채로
  // 남아있지 않도록, Dashboard와 동일하게 포그라운드 전환 시점마다 새로고침한다.
  useEffect(() => {
    let lastRefresh = Date.now();
    const MIN_INTERVAL_MS = 5000;

    function refreshThrottled() {
      const now = Date.now();
      if (now - lastRefresh < MIN_INTERVAL_MS) return;
      lastRefresh = now;
      router.refresh();
    }
    function handlePageShow() {
      refreshThrottled();
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") refreshThrottled();
    }
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background pb-40">
      <div className="pointer-events-none absolute -top-16 right-[-4rem] h-64 w-64 rounded-full bg-brand-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute top-72 -left-20 h-56 w-56 rounded-full bg-warn-soft/40 blur-3xl" />

      <header className="safe-top sticky top-0 z-30 bg-background/80 px-4 pb-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 pt-3">
          <div className="flex min-w-0 items-center gap-2.5 py-1">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-soft ring-1 ring-border">
              {profile.avatar_url && (
                <Image src={profile.avatar_url} alt="" fill sizes="40px" className="object-cover" />
              )}
            </div>
            <p className="truncate text-[15px] font-bold leading-tight text-foreground">
              {profile.nickname}님
            </p>
          </div>
          <HeaderMenu />
        </div>
      </header>

      <main className="relative mx-auto flex max-w-md flex-col gap-5 px-4 pt-6 sm:px-5">
        <div className="surface-card px-4 py-3.5">
          <p className="text-[13px] font-semibold text-foreground">아직 참여한 방이 없어요</p>
          <p className="mt-0.5 text-[12px] text-muted">
            오른쪽 아래 + 버튼으로 방을 만들거나 초대 코드로 참가해 보세요
          </p>
        </div>

        <CalendarGrid
          monthDate={monthDate}
          onMonthChange={setMonthDate}
          logsByDate={new Map()}
          selectedKey=""
          onSelectDate={() => {}}
        />
      </main>

      <button
        onClick={() => setShowOnboarding(true)}
        className="safe-bottom fixed bottom-24 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/25 transition active:scale-95"
        aria-label="방 만들기 · 참가하기"
      >
        <Plus size={28} />
      </button>

      {showOnboarding && (
        <RoomOnboardingSheet initialCode={joinCode} onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
