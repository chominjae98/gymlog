"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getReactionsForLog, REACTION_EMOJIS, removeReaction, setReaction } from "@/lib/social-data";
import type { ReactionSummary } from "@/types/database";

const EMPTY_SUMMARY: ReactionSummary = { counts: {}, myEmoji: null };

/** 인증 게시물에 다는 이모지 리액션 5종. 1인당 하나만 — 같은 걸 다시 누르면 취소, 다른 걸 누르면 전환. */
export function ReactionBar({
  logId,
  currentUserId,
}: {
  logId: string;
  currentUserId: string;
}) {
  const [summary, setSummary] = useState<ReactionSummary>(EMPTY_SUMMARY);
  // 방금 업로드한 사진은 서버 새로고침 전까지 실제 log_id가 없는 임시 기록이라 리액션을 걸 수 없다.
  const isOptimistic = logId.startsWith("optimistic-");

  useEffect(() => {
    if (isOptimistic) return;
    let cancelled = false;
    const supabase = createClient();
    getReactionsForLog(supabase, logId, currentUserId).then((data) => {
      if (!cancelled) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [logId, currentUserId, isOptimistic]);

  async function handleTap(emoji: string) {
    if (isOptimistic) return;
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

    if (error) setSummary(prevSummary);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3.5">
      {REACTION_EMOJIS.map((emoji) => {
        const count = summary.counts[emoji] ?? 0;
        const isMine = summary.myEmoji === emoji;
        return (
          <button
            key={emoji}
            onClick={() => handleTap(emoji)}
            disabled={isOptimistic}
            className={[
              "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] leading-none transition active:scale-90 disabled:opacity-50",
              isMine ? "bg-brand-soft ring-1 ring-brand/40" : "bg-surface-muted",
            ].join(" ")}
          >
            <span>{emoji}</span>
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
