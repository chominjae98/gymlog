"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Trophy } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { RoomSwitcherSheet } from "@/components/RoomSwitcherSheet";
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
  rooms: Room[];
  roomMemberCount: number;
  initialMonthLogs: WorkoutLogWithProfile[];
  initialWeeklyProgress: WeeklyProgress[];
  initialMyGoal: number | null;
  weeklyFine: number;
  weekStart: string;
  initialExceptions: FineExceptionWithVotes[];
};

type Tab = "home" | "leaderboard";

/**
 * 하단 탭(홈/랭킹) + 방 전환 시트를 소유하는 최상위 쉘.
 * 방을 바꾸면 URL의 ?room= 쿼리를 바꿔 서버 컴포넌트(page.tsx)가 새 방 데이터를 다시 내려주게 한다.
 */
export function AppShell(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const [showRoomSwitcher, setShowRoomSwitcher] = useState(false);

  function switchRoom(roomId: string) {
    if (roomId === props.room.id) return;
    router.push(`/?room=${roomId}`);
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-background">
      {tab === "home" ? (
        <Dashboard
          userId={props.userId}
          profile={props.profile}
          room={props.room}
          roomMemberCount={props.roomMemberCount}
          onSwitchRoomClick={() => setShowRoomSwitcher(true)}
          initialMonthLogs={props.initialMonthLogs}
          initialWeeklyProgress={props.initialWeeklyProgress}
          initialMyGoal={props.initialMyGoal}
          weeklyFine={props.weeklyFine}
          weekStart={props.weekStart}
          initialExceptions={props.initialExceptions}
        />
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

      {showRoomSwitcher && (
        <RoomSwitcherSheet
          rooms={props.rooms}
          activeRoomId={props.room.id}
          onClose={() => setShowRoomSwitcher(false)}
          onSelectRoom={switchRoom}
          onRoomAdded={(roomId) => {
            setShowRoomSwitcher(false);
            switchRoom(roomId);
          }}
        />
      )}
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
