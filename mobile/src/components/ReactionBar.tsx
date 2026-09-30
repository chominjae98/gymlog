import { Heart, MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { removeReaction, setReaction } from "@/lib/social-data";
import { supabase } from "@/lib/supabase/client";
import type { ReactionSummary } from "@/types/database";

const EMPTY_SUMMARY: ReactionSummary = { counts: {}, myEmoji: null };
const LIKE_EMOJI = "❤️";

/**
 * 인증 게시물의 좋아요(하트) + 댓글 바로가기. 인스타그램 피드와 같은 동작 —
 * 하트를 누르면 빨갛게 채워지고, 다시 누르면 취소된다. 예전에 🔥💪👏❤️😮 5종
 * 이모지로 각각 남겼던 리액션은 이모지 종류와 무관하게 전부 "좋아요" 하나로
 * 합산해서 보여준다(과거 기록도 그대로 집계에 포함, 어떤 이모지였든 유실 없음).
 * 리액션 집계는 부모(DayDrawer)가 하루치를 한 번에 배치 조회해 initialSummary로 내려준다.
 */
export function ReactionBar({
  logId,
  currentUserId,
  initialSummary,
  onPressComment,
}: {
  logId: string;
  currentUserId: string;
  initialSummary?: ReactionSummary;
  onPressComment: () => void;
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

  const liked = summary.myEmoji !== null;
  const totalCount = Object.values(summary.counts).reduce((sum, n) => sum + n, 0);

  async function toggleLike() {
    if (isOptimistic || pending) return;
    setPending(true);
    const prevSummary = summary;
    const myEmoji = summary.myEmoji;

    const nextCounts = { ...summary.counts };
    if (myEmoji) {
      nextCounts[myEmoji] = Math.max(0, (nextCounts[myEmoji] ?? 1) - 1);
      setSummary({ counts: nextCounts, myEmoji: null });
    } else {
      nextCounts[LIKE_EMOJI] = (nextCounts[LIKE_EMOJI] ?? 0) + 1;
      setSummary({ counts: nextCounts, myEmoji: LIKE_EMOJI });
    }

    const { error } = myEmoji
      ? await removeReaction(supabase, logId, currentUserId)
      : await setReaction(supabase, logId, currentUserId, LIKE_EMOJI);

    setPending(false);
    if (error) setSummary(prevSummary);
  }

  return (
    <View className="px-4 pt-3">
      <View className="flex-row items-center gap-4">
        <Pressable onPress={toggleLike} disabled={isOptimistic || pending} hitSlop={6} className="active:opacity-50 disabled:opacity-40">
          <Heart size={25} color={liked ? "#ff3b30" : "#1b1d1a"} fill={liked ? "#ff3b30" : "none"} strokeWidth={1.8} />
        </Pressable>
        <Pressable onPress={onPressComment} hitSlop={6} className="active:opacity-50">
          <MessageCircle size={23} color="#1b1d1a" strokeWidth={1.8} />
        </Pressable>
      </View>

      {totalCount > 0 && <Text className="mt-2 text-[13px] font-bold text-foreground">좋아요 {totalCount}개</Text>}
    </View>
  );
}
