"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, ThumbsDown, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { castFineExceptionVote, majorityThreshold } from "@/lib/fine-exceptions";
import { useToast } from "@/components/ToastProvider";
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
export function FineExceptionPanel({
  exceptions,
  currentUserId,
  totalMembers,
  myStatus,
  onRequestClick,
  onMutated,
}: Props) {
  const showToast = useToast();
  const [votingId, setVotingId] = useState<string | null>(null);

  const myPending = exceptions.filter(
    (e) => e.user_id === currentUserId && e.status === "pending"
  );
  const othersPending = exceptions.filter(
    (e) => e.user_id !== currentUserId && e.status === "pending"
  );
  const canRequest =
    (myStatus === "fined" || myStatus === "at-risk") && myPending.length === 0;
  const threshold = majorityThreshold(totalMembers);

  async function handleVote(exceptionId: string, vote: "approve" | "reject") {
    setVotingId(exceptionId);
    const supabase = createClient();
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
    <div className="surface-card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FileText size={15} className="text-muted" />
          <h2 className="text-[16px] font-bold text-foreground">벌금 예외 사유서</h2>
        </div>
        {canRequest && (
          <button
            onClick={onRequestClick}
            className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-bold text-foreground active:scale-[0.97]"
          >
            사유서 제출
          </button>
        )}
      </div>

      {myPending.map((ex) => {
        const approveCount = ex.votes.filter((v) => v.vote === "approve").length;
        const rejectCount = ex.votes.filter((v) => v.vote === "reject").length;
        return (
          <div key={ex.id} className="rounded-2xl bg-surface-muted p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-foreground">내 사유서</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${STATUS_META.pending.badgeClass}`}
              >
                {STATUS_META.pending.label} · 승인 {approveCount} / 반려 {rejectCount} (과반 {threshold}표)
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-foreground">{ex.reason}</p>
          </div>
        );
      })}

      {othersPending.map((ex) => {
        const myVote = ex.votes.find((v) => v.voter_id === currentUserId)?.vote ?? null;
        const approveCount = ex.votes.filter((v) => v.vote === "approve").length;
        const rejectCount = ex.votes.filter((v) => v.vote === "reject").length;

        return (
          <div key={ex.id} className="rounded-2xl bg-surface-muted p-3.5">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                {ex.profile.avatar_url && (
                  <Image
                    src={ex.profile.avatar_url}
                    alt=""
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                )}
              </div>
              <span className="text-[13px] font-semibold text-foreground">
                {ex.profile.nickname}
              </span>
              <span className="ml-auto text-[11px] font-medium text-muted">
                승인 {approveCount} / 반려 {rejectCount} (과반 {threshold}표)
              </span>
            </div>
            <p className="mt-2 text-[13px] text-foreground">{ex.reason}</p>

            {myVote ? (
              <p className="mt-2 text-[12px] text-muted">
                {myVote === "approve" ? "승인으로 투표했어요" : "반려로 투표했어요"}
              </p>
            ) : (
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => handleVote(ex.id, "approve")}
                  disabled={votingId === ex.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-soft py-2 text-[12.5px] font-bold text-brand-strong active:scale-[0.97] disabled:opacity-60"
                >
                  <ThumbsUp size={13} /> 승인
                </button>
                <button
                  onClick={() => handleVote(ex.id, "reject")}
                  disabled={votingId === ex.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-warn-soft py-2 text-[12.5px] font-bold text-warn active:scale-[0.97] disabled:opacity-60"
                >
                  <ThumbsDown size={13} /> 반려
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
