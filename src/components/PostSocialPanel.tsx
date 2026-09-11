"use client";

import { useEffect, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addComment,
  deleteComment,
  getCommentsForLogs,
  getReactionsForLogs,
  REACTION_EMOJIS,
  toggleReaction,
} from "@/lib/social-data";
import { useToast } from "@/components/ToastProvider";
import type { CommentWithProfile, LogReactionSummary } from "@/types/database";

const EMPTY_SUMMARY: LogReactionSummary = { counts: {}, myEmoji: null };

/** 인증 게시물 하나에 달리는 이모지 리액션 + 댓글. DayDrawer의 게시물 카드 하단에 붙는다. */
export function PostSocialPanel({
  logId,
  currentUserId,
}: {
  logId: string;
  currentUserId: string;
}) {
  const showToast = useToast();
  const [reactions, setReactions] = useState<LogReactionSummary>(EMPTY_SUMMARY);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // 방금 업로드한 사진은 서버 새로고침 전까지 화면에만 존재하는 임시(optimistic) 기록이라
  // 아직 실제 log_id가 없다. 이 경우 리액션/댓글 조회를 건너뛴다.
  const isOptimistic = logId.startsWith("optimistic-");

  useEffect(() => {
    if (isOptimistic) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      getReactionsForLogs(supabase, [logId], currentUserId),
      getCommentsForLogs(supabase, [logId]),
    ]).then(([reactionMap, commentMap]) => {
      if (cancelled) return;
      setReactions(reactionMap.get(logId) ?? EMPTY_SUMMARY);
      setComments(commentMap.get(logId) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [logId, currentUserId, isOptimistic]);

  async function handleToggle(emoji: string) {
    const supabase = createClient();
    const prevMyEmoji = reactions.myEmoji;

    setReactions((prev) => {
      const counts = { ...prev.counts };
      if (prevMyEmoji) counts[prevMyEmoji] = Math.max(0, (counts[prevMyEmoji] ?? 1) - 1);
      const nextMy = prevMyEmoji === emoji ? null : emoji;
      if (nextMy) counts[nextMy] = (counts[nextMy] ?? 0) + 1;
      return { counts, myEmoji: nextMy };
    });

    const { error } = await toggleReaction(supabase, logId, currentUserId, emoji, prevMyEmoji);
    if (error) {
      showToast("반응을 남기지 못했어요.", "error");
      const map = await getReactionsForLogs(supabase, [logId], currentUserId);
      setReactions(map.get(logId) ?? EMPTY_SUMMARY);
    }
  }

  async function handleAddComment() {
    const body = commentText.trim();
    if (!body || posting) return;
    setPosting(true);
    const supabase = createClient();
    const { data, error } = await addComment(supabase, logId, currentUserId, body);
    setPosting(false);
    if (error || !data) {
      showToast("댓글을 남기지 못했어요.", "error");
      return;
    }
    setComments((prev) => [...prev, data as unknown as CommentWithProfile]);
    setCommentText("");
  }

  async function handleDeleteComment(commentId: string) {
    const supabase = createClient();
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const { error } = await deleteComment(supabase, commentId);
    if (error) showToast("댓글 삭제에 실패했어요.", "error");
  }

  const visibleComments = showAllComments ? comments : comments.slice(-2);
  const hiddenCount = comments.length - visibleComments.length;

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactions.counts[emoji] ?? 0;
          const mine = reactions.myEmoji === emoji;
          return (
            <button
              key={emoji}
              onClick={() => handleToggle(emoji)}
              disabled={isOptimistic}
              className={[
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition active:scale-90",
                mine ? "bg-brand-soft text-brand-strong" : "bg-surface-muted text-muted",
              ].join(" ")}
            >
              <span>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {comments.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllComments(true)}
              className="self-start text-[12px] font-medium text-muted"
            >
              댓글 {comments.length}개 모두 보기
            </button>
          )}
          {visibleComments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
              <span className="shrink-0 font-semibold text-foreground">{c.profile.nickname}</span>
              <span className="min-w-0 flex-1 break-words text-foreground/90">{c.body}</span>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  aria-label="댓글 삭제"
                  className="shrink-0 text-muted"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddComment();
          }}
          maxLength={300}
          placeholder={isOptimistic ? "업로드 완료 후 댓글을 남길 수 있어요" : "댓글 달기..."}
          disabled={isOptimistic}
          className="min-w-0 flex-1 rounded-full bg-surface-muted px-3.5 py-2 text-[12.5px] text-foreground outline-none disabled:opacity-60"
        />
        <button
          onClick={handleAddComment}
          disabled={posting || isOptimistic || !commentText.trim()}
          aria-label="댓글 등록"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition active:scale-90 disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
