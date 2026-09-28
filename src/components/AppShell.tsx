"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Trophy } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { RoomsHub } from "@/components/RoomsHub";
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
  room: Room | null;
  rooms: Room[];
  roomMemberCount: number;
  initialMonthLogs: WorkoutLogWithProfile[];
  initialWeeklyProgress: WeeklyProgress[];
  initialMyGoal: number | null;
  weeklyFine: number;
  weekStart: string;
  initialExceptions: FineExceptionWithVotes[];
  joinCode?: string;
};

type Tab = "home" | "leaderboard";

/**
 * 하단 탭(홈/랭킹)을 소유하는 최상위 쉘.
 * "홈" 탭은 특정 방이 URL의 ?room=으로 명시됐을 때만 그 방의 대시보드(Dashboard)를
 * 보여주고, 그렇지 않으면 모두가 공유하는 방 목록 허브(RoomsHub)를 보여준다.
 */
export function AppShell(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");

  function enterRoom(roomId: string) {
    router.push(`/?room=${roomId}`);
    router.refresh();
  }

  function backToHub() {
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-background">
      {tab === "home" ? (
        props.room ? (
          <Dashboard
            userId={props.userId}
            profile={props.profile}
            room={props.room}
            roomMemberCount={props.roomMemberCount}
            onBackToHub={backToHub}
            initialMonthLogs={props.initialMonthLogs}
            initialWeeklyProgress={props.initialWeeklyProgress}
            initialMyGoal={props.initialMyGoal}
            weeklyFine={props.weeklyFine}
            weekStart={props.weekStart}
            initialExceptions={props.initialExceptions}
          />
        ) : (
          <RoomsHub
            profile={props.profile}
            rooms={props.rooms}
            onEnterRoom={enterRoom}
            onRoomCreated={enterRoom}
            onRoomLeft={() => router.refresh()}
            joinCode={props.joinCode}
          />
        )
      ) : (
        <LeaderboardView currentUserId={props.userId} />
      )}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          <TabButton label="홈" active={tab === "home"} onClick={() => setTab("home")} icon={<Home size={20} />} />
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
