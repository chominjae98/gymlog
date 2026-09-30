import { Check, Pencil, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { addComment, deleteComment, updateComment } from "@/lib/social-data";
import { supabase } from "@/lib/supabase/client";
import type { CommentWithProfile } from "@/types/database";

/**
 * 인증 게시물 하나에 달리는 댓글. DayDrawer의 게시물 카드 하단에 붙는다.
 * 댓글 목록은 부모(DayDrawer)가 하루치를 한 번에 배치 조회해 initialComments로 내려준다.
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

  const isOptimistic = logId.startsWith("optimistic-");

  async function handleAddComment() {
    const body = commentText.trim();
    if (!body || posting) return;
    setPosting(true);
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

  async function handleSaveEditComment(commentId: string) {
    const body = editText.trim();
    if (!body || savingEdit) return;
    const prevComments = comments;
    setSavingEdit(true);
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body } : c)));
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
    <View className="px-4 pb-3.5 pt-3">
      {comments.length > 0 && (
        <View className="gap-1.5">
          {hiddenCount > 0 && (
            <Pressable onPress={() => setShowAllComments(true)} className="self-start py-1">
              <Text className="text-[12px] font-medium text-muted">댓글 {comments.length}개 모두 보기</Text>
            </Pressable>
          )}
          {visibleComments.map((c) =>
            editingId === c.id ? (
              <View key={c.id} className="flex-row items-center gap-2">
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={() => handleSaveEditComment(c.id)}
                  maxLength={300}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] text-foreground"
                />
                <Pressable onPress={() => handleSaveEditComment(c.id)} disabled={savingEdit || !editText.trim()}>
                  <Check size={14} color="#1fb872" />
                </Pressable>
                <Pressable onPress={() => setEditingId(null)}>
                  <X size={14} color="#7a7d74" />
                </Pressable>
              </View>
            ) : (
              <View key={c.id} className="flex-row items-start gap-2">
                <Text className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
                  <Text className="font-semibold text-foreground">{c.profile.nickname} </Text>
                  <Text className="text-foreground/85">{c.body}</Text>
                </Text>
                {c.user_id === currentUserId && (
                  <View className="shrink-0 flex-row items-center gap-2.5">
                    <Pressable onPress={() => startEditComment(c)}>
                      <Pencil size={12} color="#7a7d74" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteComment(c.id)}>
                      <Trash2 size={12} color="#7a7d74" />
                    </Pressable>
                  </View>
                )}
              </View>
            )
          )}
        </View>
      )}

      <View className={`flex-row items-center gap-2.5 ${comments.length > 0 ? "mt-3 border-t border-border pt-3" : ""}`}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={handleAddComment}
          maxLength={300}
          placeholder={isOptimistic ? "업로드 완료 후 댓글을 남길 수 있어요" : "댓글 달기..."}
          editable={!isOptimistic}
          className="min-w-0 flex-1 text-[12.5px] text-foreground"
        />
        <Pressable onPress={handleAddComment} disabled={posting || isOptimistic || !commentText.trim()}>
          <Text className={`text-[12.5px] font-bold text-brand-strong ${posting || isOptimistic || !commentText.trim() ? "opacity-40" : ""}`}>
            게시
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
