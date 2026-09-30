import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getFeedLogs } from "@/lib/feed-data";
import { getCommentsForLogs, getReactionsForLogs } from "@/lib/social-data";
import { supabase } from "@/lib/supabase/client";

/**
 * 홈 피드(인스타그램 스타일) 데이터. 페이지 단위 무한 스크롤 + Supabase Realtime으로
 * 새 게시물/삭제를 실시간 반영한다. (Realtime이 동작하려면 Supabase 프로젝트에서
 * workout_logs 테이블의 Realtime 복제가 켜져 있어야 한다 — supabase/schema.sql 참고.)
 */
export function useHomeFeed(roomId: string, currentUserId: string) {
  const queryClient = useQueryClient();

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", roomId],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => getFeedLogs(supabase, roomId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.length < 10 ? undefined : lastPage[lastPage.length - 1].created_at),
  });

  const logs = feedQuery.data?.pages.flat() ?? [];
  const logIds = logs.map((l) => l.id);
  const logIdsKey = logIds.join(",");

  const socialQuery = useQuery({
    queryKey: ["feedSocialData", logIdsKey, currentUserId],
    queryFn: async () => {
      if (logIds.length === 0) return { comments: new Map(), reactions: new Map() };
      const [comments, reactions] = await Promise.all([
        getCommentsForLogs(supabase, logIds),
        getReactionsForLogs(supabase, logIds, currentUserId),
      ]);
      return { comments, reactions };
    },
    enabled: logIds.length > 0,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`room-feed-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workout_logs", filter: `room_id=eq.${roomId}` },
        () => queryClient.invalidateQueries({ queryKey: ["feed", roomId] })
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "workout_logs", filter: `room_id=eq.${roomId}` },
        () => queryClient.invalidateQueries({ queryKey: ["feed", roomId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return { logs, socialData: socialQuery.data, ...feedQuery };
}
