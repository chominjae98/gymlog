"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Flame, Plus, Settings } from "lucide-react";
import { HeaderMenu } from "@/components/HeaderMenu";
import { CreateRoomSheet } from "@/components/CreateRoomSheet";
import { JoinRoomSheet } from "@/components/JoinRoomSheet";
import { RoomManageSheet } from "@/components/RoomManageSheet";
import { HeatmapView } from "@/components/HeatmapView";
import { createClient } from "@/lib/supabase/client";
import { nowInSeoul } from "@/lib/date";
import {
  buildHeatmapWeeks,
  computeCurrentStreak,
  getHeatmapLogDates,
  getTotalLogDays,
} from "@/lib/heatmap-data";
import { getRoomAccentClasses } from "@/lib/room-colors";
import type { Profile, Room } from "@/types/database";

type Props = {
  profile: Profile;
  rooms: Room[];
  onEnterRoom: (roomId: string) => void;
  onRoomCreated: (roomId: string) => void;
  onRoomLeft: () => void;
  joinCode?: string;
};

/**
 * "홈" 탭의 기본 화면 — 특정 방에 속하지 않는, 모두가 보는 공용 허브.
 * 내 전체(방 무관) 활동 히트맵과, 참여 중인 방 목록(+ 만들기/참가하기)만 보여준다.
 * 정산 요약/오늘 인증 현황처럼 "방 안"의 정보는 여기 없고, 방을 선택해 들어가야 보인다.
 */
export function RoomsHub({ profile, rooms, onEnterRoom, onRoomCreated, onRoomLeft, joinCode }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(!!joinCode);
  const [manageRoom, setManageRoom] = useState<Room | null>(null);

  const [logDates, setLogDates] = useState<Set<string> | null>(null);
  const [totalDays, setTotalDays] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const today = nowInSeoul();
    Promise.all([getHeatmapLogDates(supabase, profile.id, today), getTotalLogDays(supabase, profile.id)]).then(
      ([dates, total]) => {
        if (cancelled) return;
        setLogDates(dates);
        setTotalDays(total);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  // 앱을 강제종료했다가 다시 열었을 때 방 목록이 그대로 캐시된 채 남아있지 않도록,
  // Dashboard와 동일하게 포그라운드 전환 시점마다 새로고침한다.
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

  const today = nowInSeoul();
  const currentStreak = logDates ? computeCurrentStreak(logDates, today) : 0;
  const { weeks, monthLabels } = logDates ? buildHeatmapWeeks(logDates, today) : { weeks: [], monthLabels: [] };

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
        <div className="surface-card p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
              <Flame size={15} className="text-brand-strong" />내 활동
            </p>
            <p className="text-[12px] text-muted">
              {currentStreak > 0 ? `연속 ${currentStreak}일` : "누적"} · {totalDays ?? 0}일
            </p>
          </div>
          <div className="mt-3">
            <HeatmapView weeks={weeks} monthLabels={monthLabels} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-bold text-foreground">참여 중인 방</h2>
            <span className="text-[12px] text-muted">{rooms.length}개</span>
          </div>

          {rooms.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="text-[28px]">🏠</span>
              <p className="text-[13px] font-semibold text-foreground">아직 참여한 방이 없어요</p>
              <p className="text-[12px] text-muted">
                친구들과 방을 만들거나, 초대 코드로 참가해 보세요
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {rooms.map((room) => {
                const accent = getRoomAccentClasses(room.id);
                return (
                  <li key={room.id} className="surface-card flex items-center gap-2.5 p-2.5">
                    <button
                      onClick={() => onEnterRoom(room.id)}
                      className="flex flex-1 items-center gap-3 rounded-2xl px-1.5 py-1.5 text-left transition active:scale-[0.99]"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent.soft}`}
                      >
                        <span className={`text-[16px] font-bold ${accent.strong}`}>
                          {room.name.charAt(0)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-foreground">{room.name}</p>
                        <p className="mt-0.5 text-[12px] text-muted">들어가서 보기</p>
                      </span>
                    </button>
                    <button
                      onClick={() => setManageRoom(room)}
                      aria-label={`${room.name} 방 관리`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90"
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
            onRoomCreated(roomId);
          }}
        />
      )}

      {showJoin && (
        <JoinRoomSheet
          initialCode={joinCode}
          onClose={() => setShowJoin(false)}
          onJoined={(roomId) => {
            setShowJoin(false);
            onRoomCreated(roomId);
          }}
        />
      )}

      {manageRoom && (
        <RoomManageSheet
          room={manageRoom}
          onClose={() => setManageRoom(null)}
          onEnterClick={() => {
            const roomId = manageRoom.id;
            setManageRoom(null);
            onEnterRoom(roomId);
          }}
          onLeft={() => {
            setManageRoom(null);
            onRoomLeft();
          }}
        />
      )}
    </div>
  );
}
