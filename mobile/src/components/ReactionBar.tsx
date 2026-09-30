import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { REACTION_EMOJIS, removeReaction, setReaction } from "@/lib/social-data";
import { supabase } from "@/lib/supabase/client";
import type { ReactionSummary } from "@/types/database";

const EMPTY_SUMMARY: ReactionSummary = { counts: {}, myEmoji: null };

/**
 * 인증 게시물에 다는 이모지 리액션 5종. 1인당 하나만 — 같은 걸 다시 누르면 취소, 다른 걸 누르면 전환.
 * 리액션 집계는 부모(DayDrawer)가 하루치를 한 번에 배치 조회해 initialSummary로 내려준다.
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
    const prevSummary = summary;
    const isRemoving = summary.myEmoji === emoji;

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
    <View className="flex-row flex-wrap items-center gap-3 px-4 pt-3.5">
      {REACTION_EMOJIS.map((emoji) => {
        const count = summary.counts[emoji] ?? 0;
        const isMine = summary.myEmoji === emoji;
        return (
          <Pressable
            key={emoji}
            onPress={() => handleTap(emoji)}
            disabled={isOptimistic || pending}
            className="flex-row items-center gap-1 active:opacity-60 disabled:opacity-50"
          >
            <Text style={{ fontSize: 19, transform: [{ scale: isMine ? 1.1 : 1 }] }}>{emoji}</Text>
            {count > 0 && (
              <Text className={`text-[11px] font-bold ${isMine ? "text-brand-strong" : "text-muted"}`}>{count}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
