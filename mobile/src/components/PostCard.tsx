import { Image } from "expo-image";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { PostSocialPanel, type PostSocialPanelHandle } from "@/components/PostSocialPanel";
import { ReactionBar } from "@/components/ReactionBar";
import { Avatar } from "@/components/ui/Avatar";
import { formatTime } from "@/lib/date";
import type { CommentWithProfile, ReactionSummary, WorkoutLogWithProfile } from "@/types/database";

type Props = {
  log: WorkoutLogWithProfile;
  currentUserId: string;
  reactionSummary?: ReactionSummary;
  comments?: CommentWithProfile[];
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * 인증 게시물 카드 하나 — 아바타/닉네임/시간, 사진 캐러셀, 메모, 리액션, 댓글.
 * 하루치 게시물을 보여주는 DayDrawer와, 최신순 전체 피드를 보여주는 HomeFeed가 공유한다.
 */
export function PostCard({ log, currentUserId, reactionSummary, comments, busy, onEdit, onDelete }: Props) {
  const socialPanelRef = useRef<PostSocialPanelHandle>(null);

  return (
    <View className="overflow-hidden rounded-[24px] bg-surface shadow-sm">
      <View className="flex-row items-center gap-2.5 px-4 py-3.5">
        <Avatar url={log.profile.avatar_url} size={36} />
        <Text className="shrink text-[14px] font-semibold text-foreground" numberOfLines={1}>
          {log.profile.nickname}
        </Text>
        <Text className="ml-auto shrink-0 text-[11px] font-medium text-muted">{formatTime(log.created_at)}</Text>
        {log.user_id === currentUserId && <PostMenu disabled={!!busy} onEdit={onEdit} onDelete={onDelete} />}
      </View>

      <PhotoCarousel photoUrls={log.photo_urls} nickname={log.profile.nickname} />

      {log.memo && <Text className="px-4 pt-3.5 text-[13px] leading-relaxed text-foreground">{log.memo}</Text>}

      <ReactionBar
        logId={log.id}
        currentUserId={currentUserId}
        initialSummary={reactionSummary}
        onPressComment={() => socialPanelRef.current?.focusInput()}
      />
      <PostSocialPanel ref={socialPanelRef} logId={log.id} currentUserId={currentUserId} initialComments={comments ?? []} />
    </View>
  );
}

/**
 * 사진이 여러 장이면 옆으로 스와이프하며 볼 수 있는 캐러셀. 네이티브 FlatList paging으로 처리.
 * 폭은 화면 크기에서 카드 여백을 추측해서 빼는 대신(기기마다 어긋나 오른쪽에 빈 공간이
 * 남는 원인이었다), onLayout으로 이 카드가 실제로 차지한 폭을 그대로 잰다.
 */
function PhotoCarousel({ photoUrls, nickname }: { photoUrls: string[]; nickname: string }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ aspectRatio: 4 / 5 }}
      className="w-full bg-surface-muted"
    >
      {width > 0 && (
        <FlatList
          data={photoUrls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url) => url}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item: url }) => (
            <Image source={{ uri: url }} style={{ width, height: "100%" }} contentFit="cover" alt={`${nickname}의 운동 인증`} />
          )}
        />
      )}
      {photoUrls.length > 1 && (
        <View className="pointer-events-none absolute inset-x-0 bottom-3 flex-row items-center justify-center gap-1.5">
          {photoUrls.map((_, i) => (
            <View key={i} className={`h-1.5 rounded-full ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
          ))}
        </View>
      )}
    </View>
  );
}

function PostMenu({ onEdit, onDelete, disabled }: { onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="ml-1 shrink-0">
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityLabel="게시물 메뉴"
        className="h-7 w-7 items-center justify-center rounded-full disabled:opacity-40"
      >
        <EllipsisVertical size={16} color="#7a7d74" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View className="absolute right-8 top-24 w-32 overflow-hidden rounded-2xl bg-surface py-1 shadow-lg">
            <Pressable
              onPress={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex-row items-center gap-2 px-3.5 py-2.5 active:bg-surface-muted"
            >
              <Pencil size={13} color="#1b1d1a" />
              <Text className="text-[12.5px] font-medium text-foreground">수정하기</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex-row items-center gap-2 px-3.5 py-2.5 active:bg-surface-muted"
            >
              <Trash2 size={13} color="#ff6a4d" />
              <Text className="text-[12.5px] font-medium text-warn">삭제하기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
