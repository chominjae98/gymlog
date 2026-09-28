"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getGlobalLeaderboard } from "@/lib/rooms-data";
import type { LeaderboardEntry } from "@/types/database";

type Props = {
  currentUserId: string;
};

const PODIUM_RANK_STYLE = [
  { ring: "ring-[#e0b23c]", badge: "bg-[#e0b23c]", size: "h-[72px] w-[72px]", order: "order-2" },
  { ring: "ring-[#adb2bd]", badge: "bg-[#adb2bd]", size: "h-14 w-14", order: "order-1" },
  { ring: "ring-[#c98a56]", badge: "bg-[#c98a56]", size: "h-14 w-14", order: "order-3" },
] as const;

/**
 * 전체 이용자 랭킹. "홈"(모두가 함께 쓰는 공용 방)에서의 누적 인증 일수 기준으로,
 * 전체 이용자 중 내 순위를 보여준다(사진·벌금 등 민감 정보는 없음).
 */
export function LeaderboardView({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const myRowRef = useRef<HTMLLIElement>(null);

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

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];
  const myRank = entries ? entries.findIndex((e) => e.user_id === currentUserId) + 1 : 0;

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background pb-28">
      <header className="safe-top sticky top-0 z-30 bg-background/80 px-4 pb-3 backdrop-blur-md">
        <div className="mx-auto max-w-md pt-3">
          <h1 className="text-[19px] font-bold text-foreground">전체 랭킹</h1>
          <p className="mt-0.5 text-[12px] text-muted">홈에서 누적 인증한 일수 기준이에요</p>
        </div>
      </header>

      <main className="relative mx-auto max-w-md px-4 pt-3">
        {loadError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-[13px] text-muted">
            <p>랭킹을 불러오지 못했어요.</p>
            <p>잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : entries === null ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-muted" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
            <span className="text-[28px]">🏆</span>
            <p className="text-[13px] text-muted">아직 랭킹에 오른 사람이 없어요</p>
          </div>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="mb-6 flex items-end justify-center gap-3 pt-2">
                {top3.map((entry, i) => {
                  const style = PODIUM_RANK_STYLE[i];
                  const isMe = entry.user_id === currentUserId;
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex flex-col items-center gap-1.5 ${style.order}`}
                    >
                      <div className="relative">
                        <div
                          className={`relative ${style.size} shrink-0 overflow-hidden rounded-full bg-surface-muted ring-[3px] ${style.ring}`}
                        >
                          {entry.avatar_url && (
                            <Image src={entry.avatar_url} alt="" fill sizes="72px" className="object-cover" />
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white ${style.badge}`}
                        >
                          {i + 1}
                        </span>
                      </div>
                      <p className="mt-1 max-w-[72px] truncate text-center text-[12.5px] font-semibold text-foreground">
                        {entry.nickname}
                        {isMe && <span className="text-brand-strong"> · 나</span>}
                      </p>
                      <p className="text-[11px] font-bold text-muted">{entry.total_days}일</p>
                    </div>
                  );
                })}
              </div>
            )}

            {rest.length > 0 && (
              <ul className="surface-card flex flex-col divide-y divide-border px-4">
                {rest.map((entry, index) => {
                  const rank = index + 4;
                  const isMe = entry.user_id === currentUserId;
                  return (
                    <li
                      key={entry.user_id}
                      ref={isMe ? myRowRef : undefined}
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="w-5 shrink-0 text-center text-[13px] font-bold text-muted">
                        {rank}
                      </span>
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                        {entry.avatar_url && (
                          <Image src={entry.avatar_url} alt="" fill sizes="36px" className="object-cover" />
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

            {myRank > 3 && (
              <button
                onClick={() => myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="fixed inset-x-0 bottom-24 z-20 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[12.5px] font-semibold text-background shadow-[var(--shadow-pop)]"
              >
                내 순위 {myRank}위
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
