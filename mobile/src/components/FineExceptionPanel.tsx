import { FileText, ThumbsDown, ThumbsUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { castFineExceptionVote, majorityThreshold } from "@/lib/fine-exceptions";
import { supabase } from "@/lib/supabase/client";
import type { FineExceptionWithVotes, WeeklyProgress } from "@/types/database";

type Props = {
  exceptions: FineExceptionWithVotes[];
  currentUserId: string;
  totalMembers: number;
  myStatus: WeeklyProgress["status"] | undefined;
  onRequestClick: () => void;
  onMutated: () => void;
};

const STATUS_META = {
  pending: { label: "투표 중", badgeClass: "bg-amber-100 text-amber-700" },
  approved: { label: "승인됨", badgeClass: "bg-brand-soft text-brand-strong" },
  rejected: { label: "반려됨", badgeClass: "bg-warn-soft text-warn" },
};

/**
 * 이번 주 벌금 예외 사유서(승인 시 목표 달성일수에 +1로 카운트) 제출/투표 패널.
 * 본인 사유서는 투표할 수 없고(RLS로도 강제됨), 이미 투표한 사유서는 다시 투표할 수 없다.
 */
export function FineExceptionPanel({ exceptions, currentUserId, totalMembers, myStatus, onRequestClick, onMutated }: Props) {
  const showToast = useToast();
  const [votingId, setVotingId] = useState<string | null>(null);

  const myPending = exceptions.filter((e) => e.user_id === currentUserId && e.status === "pending");
  const othersPending = exceptions.filter((e) => e.user_id !== currentUserId && e.status === "pending");
  const myActive = exceptions.filter((e) => e.user_id === currentUserId && (e.status === "pending" || e.status === "approved"));
  const canRequest = (myStatus === "fined" || myStatus === "at-risk") && myActive.length === 0;
  const threshold = majorityThreshold(totalMembers);

  async function handleVote(exceptionId: string, vote: "approve" | "reject") {
    if (votingId) return;
    setVotingId(exceptionId);
    const { error } = await castFineExceptionVote(supabase, exceptionId, currentUserId, vote);
    setVotingId(null);
    if (error) {
      showToast("투표에 실패했어요. 이미 투표했거나 결론이 난 사유서일 수 있어요.", "error");
      onMutated();
      return;
    }
    showToast(vote === "approve" ? "승인에 투표했어요" : "반려에 투표했어요");
    onMutated();
  }

  if (!canRequest && othersPending.length === 0 && myPending.length === 0) {
    return null;
  }

  return (
    <View className="gap-3 rounded-[28px] bg-surface p-5 shadow-sm">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <FileText size={15} color="#7a7d74" />
          <Text className="text-[16px] font-bold text-foreground">벌금 예외 사유서</Text>
        </View>
        {canRequest && (
          <Pressable onPress={onRequestClick} className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5 active:opacity-70">
            <Text className="text-[12px] font-bold text-foreground">사유서 제출</Text>
          </Pressable>
        )}
      </View>

      {myPending.map((ex) => {
        const approveCount = ex.votes.filter((v) => v.vote === "approve").length;
        const rejectCount = ex.votes.filter((v) => v.vote === "reject").length;
        return (
          <View key={ex.id} className="rounded-2xl bg-surface-muted p-3.5">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-[12px] font-semibold text-foreground">내 사유서</Text>
              <View className={`rounded-full px-2 py-0.5 ${STATUS_META.pending.badgeClass}`}>
                <Text className={`text-[10.5px] font-bold ${STATUS_META.pending.badgeClass}`}>
                  {STATUS_META.pending.label} · 승인 {approveCount} / 반려 {rejectCount} (과반 {threshold}표)
                </Text>
              </View>
            </View>
            <Text className="mt-1.5 text-[13px] text-foreground">{ex.reason}</Text>
          </View>
        );
      })}

      {othersPending.map((ex) => {
        const myVote = ex.votes.find((v) => v.voter_id === currentUserId)?.vote ?? null;
        const approveCount = ex.votes.filter((v) => v.vote === "approve").length;
        const rejectCount = ex.votes.filter((v) => v.vote === "reject").length;

        return (
          <View key={ex.id} className="rounded-2xl bg-surface-muted p-3.5">
            <View className="flex-row items-center gap-2">
              <Avatar url={ex.profile.avatar_url} size={28} />
              <Text className="text-[13px] font-semibold text-foreground">{ex.profile.nickname}</Text>
              <Text className="ml-auto text-[11px] font-medium text-muted">
                승인 {approveCount} / 반려 {rejectCount} (과반 {threshold}표)
              </Text>
            </View>
            <Text className="mt-2 text-[13px] text-foreground">{ex.reason}</Text>

            {myVote ? (
              <Text className="mt-2 text-[12px] text-muted">{myVote === "approve" ? "승인으로 투표했어요" : "반려로 투표했어요"}</Text>
            ) : (
              <View className="mt-2.5 flex-row gap-2">
                <Pressable
                  onPress={() => handleVote(ex.id, "approve")}
                  disabled={votingId === ex.id}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-brand-soft py-2 active:opacity-80 disabled:opacity-60"
                >
                  <ThumbsUp size={13} color="#17914f" />
                  <Text className="text-[12.5px] font-bold text-brand-strong">승인</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleVote(ex.id, "reject")}
                  disabled={votingId === ex.id}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-warn-soft py-2 active:opacity-80 disabled:opacity-60"
                >
                  <ThumbsDown size={13} color="#ff6a4d" />
                  <Text className="text-[12.5px] font-bold text-warn">반려</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
