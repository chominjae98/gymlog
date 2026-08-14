"use client";

import Image from "next/image";
import { Target } from "lucide-react";
import { HeaderMenu } from "@/components/HeaderMenu";
import type { Profile } from "@/types/database";

export function Header({
  profile,
  myGoal,
  onGoalClick,
  onOpenSettlement,
}: {
  profile: Profile;
  myGoal: number | null;
  onGoalClick: () => void;
  onOpenSettlement: () => void;
}) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-background/80 px-4 pb-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
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
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onGoalClick}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-2 text-[12px] font-semibold text-foreground transition active:scale-95"
          >
            <Target size={13} className="text-brand-strong" />
            {myGoal ? `주 ${myGoal}일` : "목표 설정"}
          </button>
          <HeaderMenu onOpenSettlement={onOpenSettlement} />
        </div>
      </div>
    </header>
  );
}
