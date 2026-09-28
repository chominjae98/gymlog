"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addComment, deleteComment, updateComment } from "@/lib/social-data";
import { useToast } from "@/components/ToastProvider";
import type { CommentWithProfile } from "@/types/database";

/**
 * 인증 게시물 하나에 달리는 댓글. DayDrawer의 게시물 카드 하단에 붙는다.
 * 댓글 목록은 게시물마다 따로 조회하지 않고 부모(DayDrawer)가 하루치를 한 번에 배치
 * 조회해 initialComments로 내려준다 — 그래서 이 컴포넌트는 자체 조회 effect가 없다.
 */
export function PostSocialPanel({
  logId,
  currentUserId,
  initialComments,
}: {
  logId: string;
  currentUserId: string;
  initialComments: CommentWithProfile[];
}) {
  const showToast = useToast();
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments);
  // 부모가 새로 배치 조회를 마치고 다른 초기값을 내려주면 로컬 낙관적 상태보다 최신
  // 서버 값을 신뢰한다(ReactionBar/Dashboard의 override 리셋과 동일한 패턴).
  const [prevInitialComments, setPrevInitialComments] = useState(initialComments);
  if (initialComments !== prevInitialComments) {
    setPrevInitialComments(initialComments);
    setComments(initialComments);
  }
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 방금 업로드한 사진은 서버 새로고침 전까지 화면에만 존재하는 임시(optimistic) 기록이라
  // 아직 실제 log_id가 없다. 이 경우 댓글을 달 수 없다.
  const isOptimistic = logId.startsWith("optimistic-");

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
    <div className="px-4 pb-3.5 pt-3">
      {comments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllComments(true)}
              className="self-start py-1 text-[12px] font-medium text-muted"
            >
              댓글 {comments.length}개 모두 보기
            </button>
          )}
          {visibleComments.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEditComment(c.id);
                    if (e.key === "Escape") cancelEditComment();
                  }}
                  maxLength={300}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] text-foreground outline-none"
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
                <span className="min-w-0 flex-1 break-words">
                  <span className="font-semibold text-foreground">{c.profile.nickname}</span>{" "}
                  <span className="text-foreground/85">{c.body}</span>
                </span>
                {c.user_id === currentUserId && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => startEditComment(c)}
                      aria-label="댓글 수정"
                      className="text-muted transition active:scale-90"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="댓글 삭제"
                      className="text-muted transition active:scale-90"
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

      <div
        className={[
          "flex items-center gap-2.5",
          comments.length > 0 ? "mt-3 border-t border-border pt-3" : "",
        ].join(" ")}
      >
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddComment();
          }}
          maxLength={300}
          placeholder={isOptimistic ? "업로드 완료 후 댓글을 남길 수 있어요" : "댓글 달기..."}
          disabled={isOptimistic}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted disabled:opacity-60"
        />
        <button
          onClick={handleAddComment}
          disabled={posting || isOptimistic || !commentText.trim()}
          className="shrink-0 text-[12.5px] font-bold text-brand-strong transition active:scale-95 disabled:opacity-40"
        >
          게시
        </button>
      </div>
    </div>
  );
}
