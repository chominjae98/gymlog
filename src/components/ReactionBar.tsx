"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REACTION_EMOJIS, removeReaction, setReaction } from "@/lib/social-data";
import type { ReactionSummary } from "@/types/database";

const EMPTY_SUMMARY: ReactionSummary = { counts: {}, myEmoji: null };

/**
 * 인증 게시물에 다는 이모지 리액션 5종. 1인당 하나만 — 같은 걸 다시 누르면 취소, 다른 걸 누르면 전환.
 * 리액션 집계는 게시물마다 따로 조회하지 않고 부모(DayDrawer)가 하루치를 한 번에 배치
 * 조회해 initialSummary로 내려준다 — 그래서 이 컴포넌트는 자체 조회 effect가 없다.
 */
export function ReactionBar({
  logId,
  currentUserId,
  initialSummary,
}: {
  logId: string;
  currentUserId: string;
  initialSummary?: ReactionSummary;
}) {
  const [summary, setSummary] = useState<ReactionSummary>(initialSummary ?? EMPTY_SUMMARY);
  // 부모가 새로 배치 조회를 마치고 다른 초기값을 내려주면(같은 컴포넌트 인스턴스가 재사용되는
  // 경우) 로컬 낙관적 상태보다 최신 서버 값을 신뢰한다. Dashboard의 override 리셋과 동일한 패턴.
  const [prevInitialSummary, setPrevInitialSummary] = useState(initialSummary);
  if (initialSummary !== prevInitialSummary) {
    setPrevInitialSummary(initialSummary);
    setSummary(initialSummary ?? EMPTY_SUMMARY);
  }

  // 방금 업로드한 사진은 서버 새로고침 전까지 실제 log_id가 없는 임시 기록이라 리액션을 걸 수 없다.
  const isOptimistic = logId.startsWith("optimistic-");
  const [pending, setPending] = useState(false);

  async function handleTap(emoji: string) {
    if (isOptimistic || pending) return;
    setPending(true);
    const supabase = createClient();
    const prevSummary = summary;
    const isRemoving = summary.myEmoji === emoji;

    // 서버 응답을 기다리지 않고 바로 화면에 반영(낙관적 업데이트), 실패하면 원래대로 되돌린다.
    const nextCounts = { ...summary.counts };
    if (summary.myEmoji) {
      nextCounts[summary.myEmoji] = Math.max(0, (nextCounts[summary.myEmoji] ?? 1) - 1);
    }
    if (!isRemoving) {
      nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;
    }
    setSummary({ counts: nextCounts, myEmoji: isRemoving ? null : emoji });

    const { error } = isRemoving
      ? await removeReaction(supabase, logId, currentUserId)
      : await setReaction(supabase, logId, currentUserId, emoji);

    setPending(false);
    if (error) setSummary(prevSummary);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 pt-3.5">
      {REACTION_EMOJIS.map((emoji) => {
        const count = summary.counts[emoji] ?? 0;
        const isMine = summary.myEmoji === emoji;
        return (
          <button
            key={emoji}
            onClick={() => handleTap(emoji)}
            disabled={isOptimistic || pending}
            className="flex items-center gap-1 text-[19px] leading-none transition active:scale-90 disabled:opacity-50"
          >
            <span className={isMine ? "scale-110" : ""}>{emoji}</span>
            {count > 0 && (
              <span className={`text-[11px] font-bold ${isMine ? "text-brand-strong" : "text-muted"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
