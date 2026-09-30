import { Check, Pencil, Trash2, X } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { addComment, deleteComment, updateComment } from "@/lib/social-data";
import { supabase } from "@/lib/supabase/client";
import type { CommentWithProfile } from "@/types/database";

export type PostSocialPanelHandle = { focusInput: () => void };

type Props = {
  logId: string;
  currentUserId: string;
  initialComments: CommentWithProfile[];
};

/**
 * 인증 게시물 하나에 달리는 댓글. DayDrawer/HomeFeed의 게시물 카드 하단에 붙는다.
 * 댓글 목록은 부모가 하루치(또는 피드 페이지)를 한 번에 배치 조회해 initialComments로
 * 내려준다. ref로 focusInput()을 노출해, 위 ReactionBar의 댓글 아이콘을 누르면 바로
 * 입력창으로 포커스가 가도록 한다(인스타그램의 댓글 아이콘 탭 동작과 동일).
 */
export const PostSocialPanel = forwardRef<PostSocialPanelHandle, Props>(function PostSocialPanel(
  { logId, currentUserId, initialComments },
  ref
) {
  const showToast = useToast();
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => ({ focusInput: () => inputRef.current?.focus() }));

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
  const hasText = commentText.trim().length > 0;

  return (
    <View className="px-4 pb-3.5 pt-2">
      {comments.length > 0 && (
        <View className="gap-1.5 pb-2.5">
          {hiddenCount > 0 && (
            <Pressable onPress={() => setShowAllComments(true)} className="self-start">
              <Text className="text-[12px] text-muted">댓글 {comments.length}개 모두 보기</Text>
            </Pressable>
          )}
          {visibleComments.map((c) =>
            editingId === c.id ? (
              <View key={c.id} className="flex-row items-center gap-3">
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={() => handleSaveEditComment(c.id)}
                  maxLength={300}
                  autoFocus
                  className="min-w-0 flex-1 border-b border-border pb-1 text-[12.5px] text-foreground"
                />
                <Pressable onPress={() => handleSaveEditComment(c.id)} disabled={savingEdit || !editText.trim()} hitSlop={8}>
                  <Check size={15} color="#17914f" />
                </Pressable>
                <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                  <X size={15} color="#a8ab9f" />
                </Pressable>
              </View>
            ) : (
              <View key={c.id} className="flex-row items-start gap-2">
                <Text className="min-w-0 flex-1 text-[12.5px] leading-[18px]">
                  <Text className="font-semibold text-foreground">{c.profile.nickname}  </Text>
                  <Text className="text-foreground/80">{c.body}</Text>
                </Text>
                {c.user_id === currentUserId && (
                  <View className="shrink-0 flex-row items-center gap-3 pt-0.5">
                    <Pressable onPress={() => startEditComment(c)} hitSlop={8}>
                      <Pencil size={12} color="#c4c7bb" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteComment(c.id)} hitSlop={8}>
                      <Trash2 size={12} color="#c4c7bb" />
                    </Pressable>
                  </View>
                )}
              </View>
            )
          )}
        </View>
      )}

      <View className="flex-row items-center gap-3">
        <TextInput
          ref={inputRef}
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={handleAddComment}
          maxLength={300}
          placeholder={isOptimistic ? "업로드 완료 후 댓글을 남길 수 있어요" : "댓글 달기..."}
          placeholderTextColor="#a8ab9f"
          editable={!isOptimistic}
          className="min-w-0 flex-1 text-[13px] text-foreground"
        />
        {hasText && (
          <Pressable onPress={handleAddComment} disabled={posting || isOptimistic} hitSlop={8}>
            <Text className="text-[13px] font-bold text-brand-strong">게시</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});
