"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, Trophy, Users } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { RoomsTab } from "@/components/RoomsTab";
import { createClient } from "@/lib/supabase/client";
import { getMonthLogs, getMyWeeklyGoal, getWeeklyProgress } from "@/lib/dashboard-data";
import { getRoomMemberCount } from "@/lib/fine-exceptions";
import { nowInSeoul } from "@/lib/date";
import type {
  FineExceptionWithVotes,
  Profile,
  Room,
  WeeklyProgress,
  WorkoutLogWithProfile,
} from "@/types/database";

type RoomDashboardData = {
  monthLogs: WorkoutLogWithProfile[];
  weeklyProgress: WeeklyProgress[];
  myGoal: number | null;
  finePerDay: number;
  exceptions: FineExceptionWithVotes[];
  roomMemberCount: number;
};

type Props = {
  userId: string;
  profile: Profile;
  /** 모든 신규 가입자가 자동으로 속하는 공용 방 — "홈" 탭은 항상 이 방을 보여준다. */
  defaultRoom: Room | null;
  defaultRoomData: RoomDashboardData | null;
  /** 친구들끼리 따로 만든 방들("내 방" 탭에서 다룸). */
  otherRooms: Room[];
  selectedRoom: Room | null;
  selectedRoomData: RoomDashboardData | null;
  weekStart: string;
  joinCode?: string;
};

type Tab = "home" | "rooms" | "leaderboard";

/**
 * 하단 탭(홈/내 방/랭킹)을 소유하는 최상위 쉘.
 * - 홈: 로그인한 모두가 함께 보는 공용 방(is_default)의 대시보드. 고정.
 * - 내 방: 친구들끼리 따로 만든 방 목록 + 방을 골랐을 때 그 방의 대시보드.
 * - 랭킹: 전체 이용자 랭킹(기존 그대로).
 */
export function AppShell(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  // router.push만으로도 이 페이지(검색 파라미터에 따라 서버 데이터가 달라지는 동적 라우트)는
  // 항상 최신 데이터를 새로 받아온다. 예전엔 여기서 router.refresh()도 같이 불러서
  // 서버 왕복이 두 번(=지연이 거의 두 배) 일어나고 있었다 — 방 전환이 유독 느리게
  // 느껴진 원인. isPending으로 그 왕복이 끝나기 전까지 즉시 로딩 피드백을 보여준다.
  const [isPending, startTransition] = useTransition();
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  // 주간 목표는 방마다 따로가 아니라 사람마다 하나, "홈" 기준으로 통일해서 보여준다
  // (Dashboard의 goalRoomId 설명 참고). 홈 방이 아직 없는 예외적인 상황(설정 누락 등)엔
  // null로 두어 목표 설정 버튼 자체를 숨긴다.
  const goalRoomId = props.defaultRoom?.id ?? null;

  // 특정 방을 보는 중(?room=)엔 서버가 홈 데이터 묶음(월별 기록·주간 리포트 등,
  // 쿼리 7~8개)을 아예 조회하지 않는다(page.tsx 참고) — 어차피 안 보여줄 화면을
  // 방 전환마다 매번 다시 계산하던 게 "방 들어갈 때 2초" 지연의 가장 큰 원인이었다.
  // 그래서 마지막으로 받은 홈 데이터를 여기 들고 있다가, 서버가 이번엔 생략했으면
  // (null) 그대로 유지하고, 새로 받으면(홈을 볼 때) 최신 값으로 교체한다.
  const [defaultRoomData, setDefaultRoomData] = useState(props.defaultRoomData);
  const [prevPropsDefaultRoomData, setPrevPropsDefaultRoomData] = useState(props.defaultRoomData);
  if (props.defaultRoomData !== prevPropsDefaultRoomData) {
    setPrevPropsDefaultRoomData(props.defaultRoomData);
    if (props.defaultRoomData !== null) setDefaultRoomData(props.defaultRoomData);
  }

  // 위에서 서버가 홈 데이터를 생략했는데(방 화면으로 바로 들어온 딥링크 등) 캐시된
  // 값도 전혀 없는 드문 경우엔, 홈 탭을 실제로 볼 때 브라우저에서 직접 한 번 받아온다
  // (그렇지 않으면 "불러오는 중..."에서 영영 멈춰버림).
  useEffect(() => {
    if (defaultRoomData || !props.defaultRoom || tab !== "home") return;
    let cancelled = false;
    const supabase = createClient();
    const today = nowInSeoul();
    const roomId = props.defaultRoom.id;
    Promise.all([
      getMonthLogs(supabase, today, roomId),
      getWeeklyProgress(supabase, today, roomId),
      getMyWeeklyGoal(supabase, props.userId, today, roomId),
      getRoomMemberCount(supabase, roomId),
    ]).then(([monthLogs, weeklyProgress, myGoal, roomMemberCount]) => {
      if (cancelled) return;
      setDefaultRoomData({ monthLogs, weeklyProgress, myGoal, finePerDay: 0, exceptions: [], roomMemberCount });
    });
    return () => {
      cancelled = true;
    };
  }, [defaultRoomData, props.defaultRoom, props.userId, tab]);

  function selectRoom(roomId: string) {
    setPendingRoomId(roomId);
    startTransition(() => {
      router.push(`/?room=${roomId}`);
    });
  }

  function clearRoomSelection() {
    setPendingRoomId(null);
    startTransition(() => {
      router.push("/");
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      {tab === "home" &&
        (props.defaultRoom && defaultRoomData ? (
          <Dashboard
            userId={props.userId}
            profile={props.profile}
            room={props.defaultRoom}
            showFinance={false}
            goalRoomId={goalRoomId}
            roomMemberCount={defaultRoomData.roomMemberCount}
            initialMonthLogs={defaultRoomData.monthLogs}
            initialWeeklyProgress={defaultRoomData.weeklyProgress}
            initialMyGoal={defaultRoomData.myGoal}
            weeklyFine={defaultRoomData.finePerDay}
            weekStart={props.weekStart}
            initialExceptions={defaultRoomData.exceptions}
          />
        ) : props.defaultRoom ? (
          <div className="flex min-h-dvh items-center justify-center px-6 text-center text-[13px] text-muted">
            불러오는 중...
          </div>
        ) : (
          <div className="flex min-h-dvh items-center justify-center px-6 text-center text-[13px] text-muted">
            공용 홈 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </div>
        ))}

      {tab === "rooms" && (
        <RoomsTab
          userId={props.userId}
          profile={props.profile}
          rooms={props.otherRooms}
          selectedRoom={props.selectedRoom}
          selectedRoomData={props.selectedRoomData}
          goalRoomId={goalRoomId}
          weekStart={props.weekStart}
          joinCode={props.joinCode}
          onSelectRoom={selectRoom}
          onRoomMutated={() => router.refresh()}
          isNavigating={isPending}
          navigatingRoomId={pendingRoomId}
        />
      )}

      {tab === "leaderboard" && <LeaderboardView currentUserId={props.userId} />}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          <TabButton label="홈" active={tab === "home"} onClick={() => setTab("home")} icon={<Home size={20} />} />
          <TabButton
            label="내 방"
            active={tab === "rooms"}
            onClick={() => {
              // 이미 "내 방" 탭에서 특정 방을 보고 있을 때 다시 누르면 방 목록으로 돌아간다
              // (다른 탭에 있을 때 누르면 그냥 탭 전환만 한다).
              if (tab === "rooms" && props.selectedRoom) {
                clearRoomSelection();
              } else {
                setTab("rooms");
              }
            }}
            icon={<Users size={20} />}
          />
          <TabButton
            label="랭킹"
            active={tab === "leaderboard"}
            onClick={() => setTab("leaderboard")}
            icon={<Trophy size={20} />}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition",
        active ? "text-brand-strong" : "text-muted",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
