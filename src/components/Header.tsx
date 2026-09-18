"use client";

import Image from "next/image";
import { ChevronDown, Flame, Target } from "lucide-react";
import { HeaderMenu } from "@/components/HeaderMenu";
import type { Profile, Room } from "@/types/database";

export function Header({
  profile,
  room,
  myGoal,
  onGoalClick,
  onHeatmapClick,
  onRoomClick,
}: {
  profile: Profile;
  room: Room;
  myGoal: number | null;
  onGoalClick: () => void;
  onHeatmapClick: () => void;
  onRoomClick: () => void;
}) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-background/80 px-4 pb-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 pt-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <button
            onClick={onHeatmapClick}
            className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-2 text-left transition active:scale-[0.98]"
            aria-label="내 활동 히트맵 보기"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-soft ring-1 ring-border">
              {profile.avatar_url && (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="truncate text-[15px] font-bold leading-tight text-foreground">
              {profile.nickname}님
            </p>
          </button>

          <button
            onClick={onRoomClick}
            className="ml-1 flex min-w-0 items-center gap-0.5 text-left transition active:opacity-70"
            aria-label="방 전환하기"
          >
            <span className="truncate text-[12px] font-medium text-muted">{room.name}</span>
            <ChevronDown size={12} className="shrink-0 text-muted" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onHeatmapClick}
            aria-label="내 활동 히트맵"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-brand-strong transition active:scale-95"
          >
            <Flame size={16} />
          </button>
          <button
            onClick={onGoalClick}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-2 text-[12px] font-semibold text-foreground transition active:scale-95"
          >
            <Target size={13} className="text-brand-strong" />
            {myGoal ? `주 ${myGoal}일` : "목표 설정"}
          </button>
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
