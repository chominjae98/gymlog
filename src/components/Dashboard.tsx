"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { CalendarGrid } from "@/components/CalendarGrid";
import { DayDrawer } from "@/components/DayDrawer";
import { FineSection } from "@/components/FineSection";
import { FineWatchlist } from "@/components/FineWatchlist";
import { WeeklyGoalSheet } from "@/components/WeeklyGoalSheet";
import { UploadSheet } from "@/components/UploadSheet";
import {
  computeWeeklyStatus,
  countUniquePeople,
  groupLogsByDate,
  todayKey,
} from "@/lib/dashboard-data";
import { fetchMonthLogs } from "@/lib/client-data";
import { isSameMonthGuard } from "@/lib/date";
import type { Profile, WeeklyProgress, WorkoutLogWithProfile } from "@/types/database";

type Props = {
  userId: string;
  profile: Profile;
  initialMonthLogs: WorkoutLogWithProfile[];
  initialWeeklyProgress: WeeklyProgress[];
  initialMyGoal: number | null;
  weeklyFine: number;
};

export function Dashboard({
  userId,
  profile,
  initialMonthLogs,
  initialWeeklyProgress,
  initialMyGoal,
  weeklyFine,
}: Props) {
  const router = useRouter();
  const today = new Date();

  const [monthDate, setMonthDate] = useState(today);
  // 오늘이 속한 달은 서버에서 내려온 최신 값을 그대로 쓰고,
  // 다른 달로 이동했을 때만 브라우저에서 별도로 불러온 값을 보여준다.
  const [otherMonthLogs, setOtherMonthLogs] = useState<WorkoutLogWithProfile[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showGoal, setShowGoal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // 서버가 새로 내려준 값(props)을 기본값 삼아 로컬 상태로 들고 있다가,
  // 사용자가 방금 한 행동(목표 변경 등)을 router.refresh() 응답을 기다리지 않고
  // 화면에 바로 반영(낙관적 업데이트)하기 위한 override 상태.
  const [prevInitialProgress, setPrevInitialProgress] = useState(initialWeeklyProgress);
  const [progressOverride, setProgressOverride] = useState<WeeklyProgress[] | null>(null);
  if (initialWeeklyProgress !== prevInitialProgress) {
    // 서버에서 새 데이터가 도착 → 로컬 추측(override)은 버리고 서버 값을 신뢰한다.
    setPrevInitialProgress(initialWeeklyProgress);
    setProgressOverride(null);
  }
  const weeklyProgress = progressOverride ?? initialWeeklyProgress;

  const [prevInitialGoal, setPrevInitialGoal] = useState(initialMyGoal);
  const [myGoalOverride, setMyGoalOverride] = useState<number | null | undefined>(undefined);
  if (initialMyGoal !== prevInitialGoal) {
    setPrevInitialGoal(initialMyGoal);
    setMyGoalOverride(undefined);
  }
  const myGoal = myGoalOverride !== undefined ? myGoalOverride : initialMyGoal;

  const viewingCurrentMonth = isSameMonthGuard(monthDate, today);
  const monthLogs = viewingCurrentMonth ? initialMonthLogs : otherMonthLogs ?? [];

  async function handleMonthChange(next: Date) {
    setMonthDate(next);
    if (isSameMonthGuard(next, today)) {
      setOtherMonthLogs(null);
      return;
    }
    const logs = await fetchMonthLogs(next);
    setOtherMonthLogs(logs);
  }

  const logsByDate = groupLogsByDate(monthLogs);
  const tKey = todayKey(today);

  const todayLogsCount = countUniquePeople(logsByDate.get(tKey) ?? []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background pb-28">
      <div className="pointer-events-none absolute -top-16 right-[-4rem] h-64 w-64 rounded-full bg-brand-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute top-72 -left-20 h-56 w-56 rounded-full bg-warn-soft/40 blur-3xl" />

      <Header profile={profile} myGoal={myGoal} onGoalClick={() => setShowGoal(true)} />

      <main className="relative mx-auto flex max-w-md flex-col gap-5 px-4 pt-6 sm:px-5">
        <button
          onClick={() => setSelectedKey(tKey)}
          className="surface-card flex items-center justify-between px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <div>
            <p className="text-[13px] font-semibold text-foreground">오늘 인증 현황</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {todayLogsCount > 0
                ? `${todayLogsCount}명이 오늘 운동을 인증했어요`
                : "아직 오늘 인증한 사람이 없어요"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-[12px] font-bold text-brand-strong">
            보기
          </span>
        </button>

        <FineWatchlist progress={weeklyProgress} weeklyFine={weeklyFine} />

        <CalendarGrid
          monthDate={monthDate}
          onMonthChange={handleMonthChange}
          logsByDate={logsByDate}
          selectedKey={selectedKey ?? ""}
          onSelectDate={setSelectedKey}
        />

        <FineSection progress={weeklyProgress} weeklyFine={weeklyFine} />
      </main>

      <button
        onClick={() => setShowUpload(true)}
        className="safe-bottom fixed bottom-6 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/25 transition active:scale-95"
        aria-label="오늘 운동 인증하기"
      >
        <Plus size={28} />
      </button>

      {selectedKey && (
        <DayDrawer
          dateKey={selectedKey}
          logs={logsByDate.get(selectedKey) ?? []}
          currentUserId={userId}
          onClose={() => setSelectedKey(null)}
          isToday={selectedKey === tKey}
          onUploadClick={() => {
            setSelectedKey(null);
            setShowUpload(true);
          }}
          onMutated={() => router.refresh()}
        />
      )}

      {showGoal && (
        <WeeklyGoalSheet
          userId={userId}
          currentGoal={myGoal}
          onClose={() => setShowGoal(false)}
          onSaved={(targetDays) => {
            // 버튼 누르자마자 바로 화면에 반영 (서버 응답 기다리지 않음)
            setMyGoalOverride(targetDays);
            setProgressOverride(
              weeklyProgress.map((p) =>
                p.profile.id === userId
                  ? {
                      ...p,
                      targetDays,
                      status: computeWeeklyStatus(p.achievedDays, targetDays, p.remainingDaysInWeek),
                    }
                  : p
              )
            );
            setShowGoal(false);
            router.refresh();
          }}
        />
      )}

      {showUpload && (
        <UploadSheet
          userId={userId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            // 업로드 즉시 "오늘 달성 +1"로 가정하고 먼저 반영, 서버 새로고침으로 뒤이어 확정
            setProgressOverride(
              weeklyProgress.map((p) => {
                if (p.profile.id !== userId) return p;
                const achievedDays = p.achievedDays + 1;
                return {
                  ...p,
                  achievedDays,
                  status: computeWeeklyStatus(achievedDays, p.targetDays, p.remainingDaysInWeek),
                };
              })
            );
            setShowUpload(false);
            setSelectedKey(tKey);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
