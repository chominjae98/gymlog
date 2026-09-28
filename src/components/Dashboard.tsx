"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Flame, Plus, Receipt, Target } from "lucide-react";
import { Header } from "@/components/Header";
import { CalendarGrid } from "@/components/CalendarGrid";
import { DayDrawer } from "@/components/DayDrawer";
import { FineSection } from "@/components/FineSection";
import { FineWatchlist } from "@/components/FineWatchlist";
import { FineExceptionPanel } from "@/components/FineExceptionPanel";
import { ExceptionRequestSheet } from "@/components/ExceptionRequestSheet";
import { WeeklyGoalSheet } from "@/components/WeeklyGoalSheet";
import { UploadSheet } from "@/components/UploadSheet";
import { HeatmapSheet } from "@/components/HeatmapSheet";
import { SettlementSheet } from "@/components/SettlementSheet";
import { getRoomAccentClasses } from "@/lib/room-colors";
import {
  computeWeeklyStatus,
  countUniquePeople,
  groupLogsByDate,
  todayKey,
  uniqueLogsByUser,
} from "@/lib/dashboard-data";
import { fetchMonthLogs } from "@/lib/client-data";
import { formatMonthTitle, isSameMonthGuard, nowInSeoul } from "@/lib/date";
import type {
  FineExceptionWithVotes,
  Profile,
  Room,
  WeeklyProgress,
  WorkoutLogWithProfile,
} from "@/types/database";

type Props = {
  userId: string;
  profile: Profile;
  room: Room;
  /** 정산 요약/주간 목표/벌금 관련 UI를 보여줄지 여부.
   * 모두가 함께 쓰는 공용 홈(is_default 방)에는 벌금이라는 개념 자체가 없어 false로 둔다.
   * 친구들끼리 따로 만든 방("내 방" 탭)에서는 true. */
  showFinance: boolean;
  /** 주간 목표를 저장/조회할 방(=홈). null이면 홈 방을 찾을 수 없는 예외 상황이라
   * 목표 설정 UI 자체를 숨긴다. WeeklyGoalSheet의 goalRoomId 설명 참고. */
  goalRoomId: string | null;
  roomMemberCount: number;
  initialMonthLogs: WorkoutLogWithProfile[];
  initialWeeklyProgress: WeeklyProgress[];
  initialMyGoal: number | null;
  weeklyFine: number;
  weekStart: string;
  initialExceptions: FineExceptionWithVotes[];
};

export function Dashboard({
  userId,
  profile,
  room,
  showFinance,
  goalRoomId,
  roomMemberCount,
  initialMonthLogs,
  initialWeeklyProgress,
  initialMyGoal,
  weeklyFine,
  weekStart,
  initialExceptions,
}: Props) {
  const roomId = room.id;
  const roomAccent = getRoomAccentClasses(roomId);
  const router = useRouter();
  const today = nowInSeoul();

  const [monthDate, setMonthDate] = useState(today);
  // 오늘이 속한 달은 서버에서 내려온 최신 값을 그대로 쓰고,
  // 다른 달로 이동했을 때만 브라우저에서 별도로 불러온 값을 보여준다.
  const [otherMonthLogs, setOtherMonthLogs] = useState<WorkoutLogWithProfile[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showGoal, setShowGoal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDateKey, setUploadDateKey] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showExceptionRequest, setShowExceptionRequest] = useState(false);

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

  // 방금 올린 사진이 router.refresh()로 서버 데이터가 갱신되기 전(약 1~2초) 동안에도
  // 바로 화면에 보이도록 하는 낙관적 업데이트용 임시 기록.
  // 서버에서 새 monthLogs가 도착하면(진짜 기록이 포함되어 있으므로) 즉시 버린다.
  const [prevInitialMonthLogs, setPrevInitialMonthLogs] = useState(initialMonthLogs);
  const [optimisticLog, setOptimisticLog] = useState<WorkoutLogWithProfile | null>(null);
  if (initialMonthLogs !== prevInitialMonthLogs) {
    setPrevInitialMonthLogs(initialMonthLogs);
    setOptimisticLog(null);
  }

  const viewingCurrentMonth = isSameMonthGuard(monthDate, today);
  const baseMonthLogs = viewingCurrentMonth ? initialMonthLogs : otherMonthLogs ?? [];
  const monthLogs =
    optimisticLog && isSameMonthGuard(new Date(`${optimisticLog.log_date}T00:00:00`), monthDate)
      ? [optimisticLog, ...baseMonthLogs]
      : baseMonthLogs;

  async function handleMonthChange(next: Date) {
    setMonthDate(next);
    if (isSameMonthGuard(next, today)) {
      setOtherMonthLogs(null);
      return;
    }
    const logs = await fetchMonthLogs(next, roomId);
    setOtherMonthLogs(logs);
  }

  const logsByDate = groupLogsByDate(monthLogs);
  const tKey = todayKey(today);

  // "오늘"에 관한 통계(오늘 인증 현황 카드, 아바타 미리보기)는 달력에서 다른 달을
  // 넘겨봐도(monthLogs가 그 달의 기록으로 바뀌어도) 항상 실제 오늘 기준으로 정확해야 하므로,
  // 달력 탐색과 무관하게 서버가 내려준 initialMonthLogs를 기준으로 삼는다.
  // 단, 방금 "+"로 올린 사진이 오늘 날짜라면(달력을 다른 달로 넘긴 상태여도) 새로고침을
  // 기다리지 않고 바로 반영되도록 낙관적 기록만 예외적으로 합쳐준다.
  const homeLogs =
    optimisticLog && optimisticLog.log_date === tKey
      ? [optimisticLog, ...initialMonthLogs]
      : initialMonthLogs;
  const homeLogsByDate = groupLogsByDate(homeLogs);
  const todayLogs = homeLogsByDate.get(tKey) ?? [];
  const todayLogsCount = countUniquePeople(todayLogs);
  const todayAvatarLogs = uniqueLogsByUser(todayLogs);

  // 앱(웹뷰로 감싼 PWA 형태)을 강제종료했다가 다시 열면, OS/웹뷰가 이전 화면을
  // 네트워크 요청 없이 그대로(bfcache 또는 그에 준하는 캐시) 복원하는 경우가 있다.
  // 그 상태에서는 이 페이지의 props가 앱을 나갈 당시(예: 아직 아무도 인증하지 않았을 때)의
  // 값 그대로라서 "인증한 사람이 없어요"로 잘못 보인다.
  //
  // 웹뷰마다 e.persisted 플래그를 신뢰할 수 없게 보고하는 경우가 있어(항상 false로
  // 오보하거나, 리스너가 붙기도 전에 이벤트가 지나가버리는 경우 등) persisted 여부로
  // 분기하지 않고, pageshow/포그라운드 전환 시점마다 무조건 새로고침을 시도한다.
  // MIN_INTERVAL_MS로 스로틀되어 있어 정상적인 최초 로드 직후에는 실질적으로
  // 추가 요청이 발생하지 않는다.
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
      <div className={`pointer-events-none absolute -top-16 right-[-4rem] h-64 w-64 rounded-full ${roomAccent.soft} opacity-60 blur-3xl`} />
      <div className="pointer-events-none absolute top-72 -left-20 h-56 w-56 rounded-full bg-warn-soft/40 blur-3xl" />

      <Header
        profile={profile}
        userId={userId}
        myGoal={goalRoomId ? myGoal : undefined}
        onGoalClick={goalRoomId ? () => setShowGoal(true) : undefined}
        onHeatmapClick={() => setShowHeatmap(true)}
      />

      <main className="relative mx-auto flex max-w-md flex-col gap-5 px-4 pt-6 sm:px-5">
        {showFinance && (
          <button
            onClick={() => setShowSettlement(true)}
            className="surface-card flex items-center justify-between px-4 py-3.5 text-left transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft">
                <Receipt size={18} className="text-warn" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {formatMonthTitle(monthDate)} 정산 요약
                </p>
                <p className="mt-0.5 text-[12px] text-muted">벌금 얼마 모였는지 한눈에 보기</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-bold text-foreground">
              보기
            </span>
          </button>
        )}

        <button
          onClick={() => setSelectedKey(tKey)}
          className="surface-card flex items-center justify-between gap-3 px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">오늘 인증 현황</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {todayLogsCount > 0
                ? `${todayLogsCount}명이 오늘 운동을 인증했어요`
                : "아직 오늘 인증한 사람이 없어요"}
            </p>
            {!showFinance && todayAvatarLogs.length > 0 && (
              <AvatarStack logs={todayAvatarLogs} totalCount={todayLogsCount} />
            )}
          </div>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-[12px] font-bold text-brand-strong">
            보기
          </span>
        </button>

        {!showFinance && <WeeklyReport progress={weeklyProgress} currentUserId={userId} />}

        {showFinance && (
          <>
            <FineWatchlist progress={weeklyProgress} weeklyFine={weeklyFine} />

            <FineExceptionPanel
              exceptions={initialExceptions}
              currentUserId={userId}
              totalMembers={roomMemberCount}
              myStatus={weeklyProgress.find((p) => p.profile.id === userId)?.status}
              onRequestClick={() => setShowExceptionRequest(true)}
              onMutated={() => router.refresh()}
            />
          </>
        )}

        <CalendarGrid
          monthDate={monthDate}
          onMonthChange={handleMonthChange}
          logsByDate={logsByDate}
          selectedKey={selectedKey ?? ""}
          onSelectDate={setSelectedKey}
        />

        {showFinance && <FineSection progress={weeklyProgress} weeklyFine={weeklyFine} />}
      </main>

      <button
        onClick={() => {
          setUploadDateKey(tKey);
          setShowUpload(true);
        }}
        className="safe-bottom fixed bottom-24 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/25 transition active:scale-95"
        aria-label="운동 인증하기"
      >
        <Plus size={28} />
      </button>

      {selectedKey && (
        <DayDrawer
          dateKey={selectedKey}
          // 달력에서 고른 날짜는 보통 logsByDate(현재 보고 있는 달)에 있지만, "오늘 인증
          // 현황"이나 "최근 인증" 미리보기는 달력을 다른 달로 넘겨본 상태에서도 항상 오늘
          // 기준 최신 데이터(homeLogsByDate)를 가리킬 수 있어 그 경우를 대비해 폴백한다.
          logs={logsByDate.get(selectedKey) ?? homeLogsByDate.get(selectedKey) ?? []}
          currentUserId={userId}
          onClose={() => setSelectedKey(null)}
          isToday={selectedKey === tKey}
          onUploadClick={() => {
            // 드로어는 닫지 않고 그대로 둔 채 업로드 시트를 그 위에 띄운다(z-index로 겹침).
            // 드로어를 먼저 닫고 업로드 시트를 여는 방식은 전체 화면 블러 오버레이 두 개가
            // 같은 프레임에 교체되면서 화면이 순간적으로 깜빡이는 원인이 되었다.
            setUploadDateKey(selectedKey);
            setShowUpload(true);
          }}
          onMutated={() => router.refresh()}
        />
      )}

      {showGoal && goalRoomId && (
        <WeeklyGoalSheet
          userId={userId}
          goalRoomId={goalRoomId}
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
          roomId={roomId}
          initialDateKey={uploadDateKey ?? tKey}
          onClose={() => setShowUpload(false)}
          onUploaded={(uploadedDateKey, photoUrls, memo) => {
            // 서버 새로고침(router.refresh)이 끝나기 전까지 방금 올린 사진을 바로 화면에 보여준다.
            setOptimisticLog({
              id: `optimistic-${Date.now()}`,
              user_id: userId,
              room_id: roomId,
              log_date: uploadedDateKey,
              photo_urls: photoUrls,
              photo_hashes: [],
              memo,
              created_at: new Date().toISOString(),
              profile: { id: userId, nickname: profile.nickname, avatar_url: profile.avatar_url },
            });

            // 업로드한 날짜가 "오늘"일 때만 이번 주 달성 현황에 즉시 +1로 낙관적 반영한다.
            // 과거 날짜는 이번 주 범위가 아닐 수도 있어 서버 새로고침 결과를 그대로 신뢰한다.
            // 단, achievedDays는 "인증한 날짜 수"이므로 오늘 이미 인증한 기록이 있다면
            // (같은 날 두 번째 업로드) 날짜 수는 늘지 않으므로 +1 하지 않는다.
            const alreadyLoggedToday = monthLogs.some(
              (log) => log.user_id === userId && log.log_date === uploadedDateKey
            );
            if (uploadedDateKey === tKey && !alreadyLoggedToday) {
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
            }

            // "+" 버튼으로 업로드했을 때는 업로드 시트만 닫고 홈 화면으로 돌아간다
            // (토스트로 완료만 알려주면 충분 — 굳이 그날 기록 화면을 다시 열 필요는 없음).
            // 드로어를 이미 보고 있던 상태에서 그 안에서 업로드한 경우엔 드로어를 닫지 않았으므로
            // (onUploadClick 참고) 그대로 유지된다.
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}

      {showExceptionRequest && (
        <ExceptionRequestSheet
          userId={userId}
          weekStart={weekStart}
          roomId={roomId}
          onClose={() => setShowExceptionRequest(false)}
          onSubmitted={() => {
            setShowExceptionRequest(false);
            router.refresh();
          }}
        />
      )}

      {showHeatmap && <HeatmapSheet userId={userId} onClose={() => setShowHeatmap(false)} />}

      {showSettlement && (
        <SettlementSheet
          monthDate={monthDate}
          weeklyFine={weeklyFine}
          room={room}
          userId={userId}
          onClose={() => setShowSettlement(false)}
        />
      )}
    </div>
  );
}

/** "오늘 인증 현황" 카드 안에 보여주는, 오늘 인증한 사람들의 겹친 아바타 미리보기. */
function AvatarStack({
  logs,
  totalCount,
}: {
  logs: WorkoutLogWithProfile[];
  totalCount: number;
}) {
  const MAX_VISIBLE = 4;
  const visible = logs.slice(0, MAX_VISIBLE);
  const overflow = totalCount - visible.length;

  return (
    <div className="mt-2 flex items-center">
      {visible.map((log, i) => (
        <div
          key={log.user_id}
          className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-brand-soft ring-2 ring-surface"
          style={{ marginLeft: i === 0 ? 0 : -8 }}
        >
          {log.profile.avatar_url && (
            <Image src={log.profile.avatar_url} alt="" fill sizes="24px" className="object-cover" />
          )}
        </div>
      ))}
      {overflow > 0 && (
        <span
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-muted ring-2 ring-surface"
          style={{ marginLeft: -8 }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

/**
 * 홈 화면 전용 "주간 리포트". 홈은 전체 이용자가 함께 기록을 올리는 곳이므로,
 * 개인 통계 대신 "이번 주에 가장 많이 운동한 사람"과 "목표 달성률이 높은 사람"(예:
 * 주 4일 목표에 3일 가면 75%, 4일 다 채우면 100%, 5일이면 125% — 초과분도 그대로
 * 반영한다)을 전체 이용자 기준으로 보여준다.
 */
function WeeklyReport({
  progress,
  currentUserId,
}: {
  progress: WeeklyProgress[];
  currentUserId: string;
}) {
  const mostWorkouts = [...progress]
    .filter((p) => p.achievedDays > 0)
    .sort((a, b) => b.achievedDays - a.achievedDays)
    .slice(0, 3);

  const goalAchievers = progress
    .filter((p) => p.targetDays != null && p.targetDays > 0)
    .map((p) => ({ ...p, rate: p.achievedDays / p.targetDays! }))
    .sort((a, b) => b.rate - a.rate || b.achievedDays - a.achievedDays)
    .slice(0, 3);

  return (
    <div className="surface-card px-4 py-3.5">
      <p className="text-[13px] font-semibold text-foreground">주간 리포트</p>

      {mostWorkouts.length === 0 && goalAchievers.length === 0 ? (
        <p className="mt-0.5 text-[12px] text-muted">
          아직 이번 주 기록이 없어요. 가장 먼저 운동을 인증해 보세요!
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {mostWorkouts.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Flame size={13} className="text-warn" />
                가장 많이 운동한 사람
              </div>
              <ul className="flex flex-col gap-2.5">
                {mostWorkouts.map((p, i) => (
                  <ReportRow
                    key={p.profile.id}
                    rank={i + 1}
                    nickname={p.profile.nickname}
                    avatarUrl={p.profile.avatar_url}
                    isMe={p.profile.id === currentUserId}
                    stat={`${p.achievedDays}일`}
                  />
                ))}
              </ul>
            </div>
          )}

          {goalAchievers.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Target size={13} className="text-brand-strong" />
                목표 달성률 TOP
              </div>
              <ul className="flex flex-col gap-2.5">
                {goalAchievers.map((p, i) => (
                  <ReportRow
                    key={p.profile.id}
                    rank={i + 1}
                    nickname={p.profile.nickname}
                    avatarUrl={p.profile.avatar_url}
                    isMe={p.profile.id === currentUserId}
                    stat={`${Math.round(p.rate * 100)}%`}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportRow({
  rank,
  nickname,
  avatarUrl,
  isMe,
  stat,
}: {
  rank: number;
  nickname: string;
  avatarUrl: string | null;
  isMe: boolean;
  stat: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="w-4 shrink-0 text-center text-[12px] font-bold text-muted">{rank}</span>
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-muted">
        {avatarUrl && <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" />}
      </div>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {nickname}
        {isMe && <span className="ml-1.5 text-[11px] font-medium text-brand-strong">나</span>}
      </span>
      <span className="shrink-0 text-[12.5px] font-bold text-foreground">{stat}</span>
    </li>
  );
}
