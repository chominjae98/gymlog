"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Trophy, Users } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { RoomsTab } from "@/components/RoomsTab";
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

  function selectRoom(roomId: string) {
    router.push(`/?room=${roomId}`);
    router.refresh();
  }

  function clearRoomSelection() {
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-background">
      {tab === "home" &&
        (props.defaultRoom && props.defaultRoomData ? (
          <Dashboard
            userId={props.userId}
            profile={props.profile}
            room={props.defaultRoom}
            roomMemberCount={props.defaultRoomData.roomMemberCount}
            initialMonthLogs={props.defaultRoomData.monthLogs}
            initialWeeklyProgress={props.defaultRoomData.weeklyProgress}
            initialMyGoal={props.defaultRoomData.myGoal}
            weeklyFine={props.defaultRoomData.finePerDay}
            weekStart={props.weekStart}
            initialExceptions={props.defaultRoomData.exceptions}
          />
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
          weekStart={props.weekStart}
          joinCode={props.joinCode}
          onSelectRoom={selectRoom}
          onClearSelection={clearRoomSelection}
          onRoomMutated={() => router.refresh()}
        />
      )}

      {tab === "leaderboard" && <LeaderboardView currentUserId={props.userId} />}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          <TabButton label="홈" active={tab === "home"} onClick={() => setTab("home")} icon={<Home size={20} />} />
          <TabButton
            label="내 방"
            active={tab === "rooms"}
            onClick={() => setTab("rooms")}
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
