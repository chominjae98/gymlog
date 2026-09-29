"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Settings } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { HeaderMenu } from "@/components/HeaderMenu";
import { CreateRoomSheet } from "@/components/CreateRoomSheet";
import { JoinRoomSheet } from "@/components/JoinRoomSheet";
import { RoomManageSheet } from "@/components/RoomManageSheet";
import { getRoomAccentClasses } from "@/lib/room-colors";
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
  rooms: Room[];
  selectedRoom: Room | null;
  selectedRoomData: RoomDashboardData | null;
  weekStart: string;
  joinCode?: string;
  onSelectRoom: (roomId: string) => void;
  onRoomMutated: () => void;
  isNavigating?: boolean;
  navigatingRoomId?: string | null;
  goalRoomId: string | null;
};

/**
 * "내 방" 탭 — 친구들끼리 따로 만든 방(모두가 함께 쓰는 "홈"과는 별개)을
 * 목록으로 보여주고, 하나를 고르면 그 방 전용 대시보드로 들어간다.
 * (목록으로 돌아가는 건 하단 탭의 "내 방"을 다시 누르면 된다 — AppShell이 처리)
 */
export function RoomsTab({
  userId,
  profile,
  rooms,
  selectedRoom,
  selectedRoomData,
  weekStart,
  joinCode,
  onSelectRoom,
  onRoomMutated,
  isNavigating = false,
  navigatingRoomId = null,
  goalRoomId,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(!!joinCode);
  const [manageRoom, setManageRoom] = useState<Room | null>(null);

  if (selectedRoom && selectedRoomData) {
    return (
      <Dashboard
        userId={userId}
        profile={profile}
        room={selectedRoom}
        showFinance
        goalRoomId={goalRoomId}
        roomMemberCount={selectedRoomData.roomMemberCount}
        initialMonthLogs={selectedRoomData.monthLogs}
        initialWeeklyProgress={selectedRoomData.weeklyProgress}
        initialMyGoal={selectedRoomData.myGoal}
        weeklyFine={selectedRoomData.finePerDay}
        weekStart={weekStart}
        initialExceptions={selectedRoomData.exceptions}
      />
    );
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background pb-40">
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
        <div>
          {rooms.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="text-[28px]">🤝</span>
              <p className="text-[13px] font-semibold text-foreground">아직 만든 방이 없어요</p>
              <p className="text-[12px] text-muted">
                친구들과 방을 만들거나, 초대 코드로 참가해 보세요
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {rooms.map((room) => {
                const accent = getRoomAccentClasses(room.id);
                const isThisPending = isNavigating && navigatingRoomId === room.id;
                return (
                  <li key={room.id} className="surface-card flex items-center gap-2.5 p-2.5">
                    <button
                      onClick={() => onSelectRoom(room.id)}
                      disabled={isNavigating}
                      className="flex flex-1 items-center gap-3 rounded-2xl px-1.5 py-1.5 text-left transition active:scale-[0.99] disabled:opacity-60"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent.soft}`}
                      >
                        {isThisPending ? (
                          <Loader2 size={18} className={`animate-spin ${accent.strong}`} />
                        ) : (
                          <span className={`text-[16px] font-bold ${accent.strong}`}>
                            {room.name.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-foreground">{room.name}</p>
                      </span>
                    </button>
                    <button
                      onClick={() => setManageRoom(room)}
                      disabled={isNavigating}
                      aria-label={`${room.name} 방 관리`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 disabled:opacity-40"
                    >
                      <Settings size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted transition active:scale-[0.98]"
            >
              <Plus size={15} />
              새 방 만들기
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted transition active:scale-[0.98]"
            >
              참가하기
            </button>
          </div>
        </div>
      </main>

      {showCreate && (
        <CreateRoomSheet
          onClose={() => setShowCreate(false)}
          onCreated={(roomId) => {
            setShowCreate(false);
            onSelectRoom(roomId);
          }}
        />
      )}

      {showJoin && (
        <JoinRoomSheet
          initialCode={joinCode}
          onClose={() => setShowJoin(false)}
          onJoined={(roomId) => {
            setShowJoin(false);
            onSelectRoom(roomId);
          }}
        />
      )}

      {manageRoom && (
        <RoomManageSheet
          room={manageRoom}
          userId={userId}
          onClose={() => setManageRoom(null)}
          onLeft={() => {
            setManageRoom(null);
            onRoomMutated();
          }}
        />
      )}
    </div>
  );
}
