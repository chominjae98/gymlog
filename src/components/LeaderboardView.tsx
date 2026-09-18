"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getGlobalLeaderboard } from "@/lib/rooms-data";
import type { LeaderboardEntry } from "@/types/database";

type Props = {
  currentUserId: string;
};

/**
 * 방과 무관한 전체 이용자 랭킹. 누적 인증 일수 기준으로, 어느 방에 속했는지와
 * 무관하게 전체 이용자 중 내 순위를 보여준다(사진·벌금 등 민감 정보는 없음).
 */
export function LeaderboardView({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGlobalLeaderboard(createClient())
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background pb-28">
      <header className="safe-top sticky top-0 z-30 bg-background/80 px-4 pb-3 backdrop-blur-md">
        <div className="mx-auto max-w-md pt-3">
          <h1 className="text-[19px] font-bold text-foreground">전체 랭킹</h1>
          <p className="mt-0.5 text-[12px] text-muted">방과 무관하게, 누적 인증 일수 기준이에요</p>
        </div>
      </header>

      <main className="relative mx-auto max-w-md px-4 pt-2">
        {loadError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-[13px] text-muted">
            <p>랭킹을 불러오지 못했어요.</p>
            <p>잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : entries === null ? (
          <div className="flex h-40 items-center justify-center text-[13px] text-muted">
            불러오는 중...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[13px] text-muted">
            아직 랭킹에 오른 사람이 없어요
          </div>
        ) : (
          <ul className="flex flex-col">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isMe = entry.user_id === currentUserId;
              return (
                <li
                  key={entry.user_id}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-3 py-3",
                    isMe ? "bg-brand-soft" : "",
                  ].join(" ")}
                >
                  <span className="w-6 shrink-0 text-center text-[13px] font-bold text-muted">
                    {rank}
                  </span>
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                    {entry.avatar_url && (
                      <Image
                        src={entry.avatar_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">
                    {entry.nickname}
                    {isMe && <span className="ml-1.5 text-[11px] font-medium text-brand-strong">나</span>}
                  </span>
                  <span className="shrink-0 text-[13px] font-bold text-foreground">
                    {entry.total_days}일
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
