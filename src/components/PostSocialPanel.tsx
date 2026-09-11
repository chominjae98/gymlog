"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addComment, deleteComment, getCommentsForLogs, updateComment } from "@/lib/social-data";
import { useToast } from "@/components/ToastProvider";
import type { CommentWithProfile } from "@/types/database";

/** 인증 게시물 하나에 달리는 댓글. DayDrawer의 게시물 카드 하단에 붙는다. */
export function PostSocialPanel({
  logId,
  currentUserId,
}: {
  logId: string;
  currentUserId: string;
}) {
  const showToast = useToast();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 방금 업로드한 사진은 서버 새로고침 전까지 화면에만 존재하는 임시(optimistic) 기록이라
  // 아직 실제 log_id가 없다. 이 경우 댓글 조회를 건너뛴다.
  const isOptimistic = logId.startsWith("optimistic-");

  useEffect(() => {
    if (isOptimistic) return;
    let cancelled = false;
    const supabase = createClient();
    getCommentsForLogs(supabase, [logId]).then((commentMap) => {
      if (cancelled) return;
      setComments(commentMap.get(logId) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [logId, isOptimistic]);

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
    const prevComments = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const { error } = await deleteComment(supabase, commentId);
    if (error) {
      setComments(prevComments);
      showToast("댓글 삭제에 실패했어요.", "error");
    }
  }

  function startEditComment(c: CommentWithProfile) {
    setEditingId(c.id);
    setEditText(c.body);
  }

  function cancelEditComment() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSaveEditComment(commentId: string) {
    const body = editText.trim();
    if (!body || savingEdit) return;
    const prevComments = comments;
    setSavingEdit(true);
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body } : c)));
    const supabase = createClient();
    const { error } = await updateComment(supabase, commentId, body);
    setSavingEdit(false);
    if (error) {
      setComments(prevComments);
      showToast("댓글 수정에 실패했어요.", "error");
      return;
    }
    setEditingId(null);
    setEditText("");
  }

  const visibleComments = showAllComments ? comments : comments.slice(-2);
  const hiddenCount = comments.length - visibleComments.length;

  return (
    <div className="border-t border-border px-4 py-3">
      {comments.length > 0 && (
        <div className="flex flex-col gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllComments(true)}
              className="self-start text-[12px] font-medium text-muted"
            >
              댓글 {comments.length}개 모두 보기
            </button>
          )}
          {visibleComments.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="flex items-center gap-2 text-[12.5px] leading-relaxed">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEditComment(c.id);
                    if (e.key === "Escape") cancelEditComment();
                  }}
                  maxLength={300}
                  autoFocus
                  className="min-w-0 flex-1 rounded-full bg-surface-muted px-3 py-1.5 text-[12.5px] text-foreground outline-none"
                />
                <button
                  onClick={() => handleSaveEditComment(c.id)}
                  disabled={savingEdit || !editText.trim()}
                  aria-label="댓글 수정 완료"
                  className="shrink-0 text-brand disabled:opacity-40"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelEditComment}
                  aria-label="댓글 수정 취소"
                  className="shrink-0 text-muted"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div key={c.id} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                <span className="shrink-0 font-semibold text-foreground">{c.profile.nickname}</span>
                <span className="min-w-0 flex-1 break-words text-foreground/90">{c.body}</span>
                {c.user_id === currentUserId && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => startEditComment(c)}
                      aria-label="댓글 수정"
                      className="text-muted"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="댓글 삭제"
                      className="text-muted"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      <div className={["flex items-center gap-2", comments.length > 0 && "mt-3"].filter(Boolean).join(" ")}>
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
