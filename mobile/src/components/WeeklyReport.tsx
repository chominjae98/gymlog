import { Target } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { Avatar } from "@/components/ui/Avatar";
import type { WeeklyProgress } from "@/types/database";

const COMPACT_LIMIT = 3;
const DETAIL_LIMIT = 10;

function rankMostWorkouts(progress: WeeklyProgress[], limit: number) {
  return [...progress].filter((p) => p.achievedDays > 0).sort((a, b) => b.achievedDays - a.achievedDays).slice(0, limit);
}

function rankGoalAchievers(progress: WeeklyProgress[], limit: number) {
  return progress
    .filter((p) => p.targetDays != null && p.targetDays > 0)
    .map((p) => ({ ...p, rate: p.achievedDays / p.targetDays! }))
    .sort((a, b) => b.rate - a.rate || b.achievedDays - a.achievedDays)
    .slice(0, limit);
}

/**
 * 홈 화면 전용 "주간 리포트". 개인 통계 대신 "이번 주에 가장 많이 운동한 사람"과
 * "목표 달성률이 높은 사람"을 전체 이용자 기준으로 보여준다.
 */
export function WeeklyReport({ progress, currentUserId }: { progress: WeeklyProgress[]; currentUserId: string }) {
  const sheetRef = useRef<CenteredModalHandle>(null);
  const mostWorkouts = rankMostWorkouts(progress, COMPACT_LIMIT);
  const goalAchievers = rankGoalAchievers(progress, COMPACT_LIMIT);
  const isEmpty = mostWorkouts.length === 0 && goalAchievers.length === 0;

  return (
    <>
      <Pressable
        onPress={() => !isEmpty && sheetRef.current?.present()}
        disabled={isEmpty}
        className="rounded-[28px] bg-surface px-4 py-3.5 shadow-sm active:opacity-90"
      >
        <Text className="text-[13px] font-semibold text-foreground">주간 리포트</Text>

        {isEmpty ? (
          <Text className="mt-0.5 text-[12px] text-muted">아직 이번 주 기록이 없어요. 가장 먼저 운동을 인증해 보세요!</Text>
        ) : (
          <View className="mt-3 gap-4">
            {mostWorkouts.length > 0 && (
              <View>
                <View className="mb-1.5 flex-row items-center gap-1.5">
                  <Text className="text-[13px] leading-none">🔥</Text>
                  <Text className="text-[12px] font-semibold text-muted">가장 많이 운동한 사람</Text>
                </View>
                <View className="gap-2.5">
                  {mostWorkouts.map((p, i) => (
                    <ReportRow
                      key={p.profile.id}
                      rank={i + 1}
                      nickname={p.profile.nickname}
                      avatarUrl={p.profile.avatar_url}
                      isMe={p.profile.id === currentUserId}
                      stat={`${p.achievedDays}일`}
                    />
                  ))}
                </View>
              </View>
            )}

            {goalAchievers.length > 0 && (
              <View>
                <View className="mb-1.5 flex-row items-center gap-1.5">
                  <Target size={13} color="#17914f" />
                  <Text className="text-[12px] font-semibold text-muted">목표 달성률 TOP</Text>
                </View>
                <View className="gap-2.5">
                  {goalAchievers.map((p, i) => (
                    <ReportRow
                      key={p.profile.id}
                      rank={i + 1}
                      nickname={p.profile.nickname}
                      avatarUrl={p.profile.avatar_url}
                      isMe={p.profile.id === currentUserId}
                      stat={`${Math.round(p.rate * 100)}%`}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </Pressable>

      <CenteredModal ref={sheetRef}>
        <View className="px-5 pb-2 pt-2">
          <Text className="text-[17px] font-bold text-foreground">주간 리포트</Text>
        </View>
        <View className="gap-5 px-5 pb-8 pt-2">
          {rankMostWorkouts(progress, DETAIL_LIMIT).length > 0 && (
            <View>
              <View className="mb-2 flex-row items-center gap-1.5">
                <Text className="text-[14px] leading-none">🔥</Text>
                <Text className="text-[12.5px] font-semibold text-muted">가장 많이 운동한 사람</Text>
              </View>
              <View className="gap-3">
                {rankMostWorkouts(progress, DETAIL_LIMIT).map((p, i) => (
                  <ReportRow
                    key={p.profile.id}
                    rank={i + 1}
                    nickname={p.profile.nickname}
                    avatarUrl={p.profile.avatar_url}
                    isMe={p.profile.id === currentUserId}
                    stat={`${p.achievedDays}일`}
                  />
                ))}
              </View>
            </View>
          )}

          {rankGoalAchievers(progress, DETAIL_LIMIT).length > 0 && (
            <View>
              <View className="mb-2 flex-row items-center gap-1.5">
                <Target size={14} color="#17914f" />
                <Text className="text-[12.5px] font-semibold text-muted">목표 달성률 TOP</Text>
              </View>
              <View className="gap-3">
                {rankGoalAchievers(progress, DETAIL_LIMIT).map((p, i) => (
                  <ReportRow
                    key={p.profile.id}
                    rank={i + 1}
                    nickname={p.profile.nickname}
                    avatarUrl={p.profile.avatar_url}
                    isMe={p.profile.id === currentUserId}
                    stat={`${Math.round(p.rate * 100)}%`}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </CenteredModal>
    </>
  );
}

function ReportRow({
  rank,
  nickname,
  avatarUrl,
  isMe,
  stat,
}: {
  rank: number;
  nickname: string;
  avatarUrl: string | null;
  isMe: boolean;
  stat: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <Text className="w-4 text-center text-[12px] font-bold text-muted">{rank}</Text>
      <Avatar url={avatarUrl} size={28} className="bg-surface-muted" />
      <Text className="min-w-0 flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
        {nickname}
        {isMe && <Text className="ml-1.5 text-[11px] font-medium text-brand-strong"> 나</Text>}
      </Text>
      <Text className="shrink-0 text-[12.5px] font-bold text-foreground">{stat}</Text>
    </View>
  );
}
