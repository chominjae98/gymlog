import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginScreen } from "@/components/LoginScreen";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import {
  getFinePerDay,
  getMonthLogs,
  getMyWeeklyGoal,
  getProfile,
  getWeeklyProgress,
} from "@/lib/dashboard-data";
import { getFineExceptionsForWeek, getRoomMemberCount } from "@/lib/fine-exceptions";
import { getMyRooms } from "@/lib/rooms-data";
import { SUPABASE_CONFIGURED } from "@/lib/supabase-configured";
import { getWeekStartKey, nowInSeoul } from "@/lib/date";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 방 하나의 대시보드(정산/오늘 인증/이번 주 현황 등)를 채우는 데 필요한 데이터 묶음.
 * goalRoomId: 주간 목표는 방마다 따로가 아니라 "홈" 기준으로 통일해서 보여주므로,
 * 그 목표를 조회할 방(=홈)의 id를 별도로 받는다. getWeeklyProgress 주석 참고.
 */
async function getRoomDashboardBundle(
  supabase: SupabaseClient<Database>,
  userId: string,
  roomId: string,
  today: Date,
  weekStart: string,
  goalRoomId: string
) {
  const [monthLogs, weeklyProgress, myGoal, finePerDay, exceptions, roomMemberCount] = await Promise.all([
    getMonthLogs(supabase, today, roomId),
    getWeeklyProgress(supabase, today, roomId, goalRoomId),
    getMyWeeklyGoal(supabase, userId, today, goalRoomId),
    getFinePerDay(supabase, roomId),
    getFineExceptionsForWeek(supabase, weekStart, roomId),
    getRoomMemberCount(supabase, roomId),
  ]);
  return { monthLogs, weeklyProgress, myGoal, finePerDay, exceptions, roomMemberCount };
}

/**
 * "홈"(공용 방)용 데이터 묶음. 정산/벌금 UI는 안 보여주지만, 주간 목표 설정과
 * "이번 주 리포트"(누가 가장 많이 운동했는지·목표 달성률)는 홈 화면에도 필요하므로
 * weeklyProgress/myGoal도 함께 가져온다. 홈 자신이 곧 주간 목표의 기준 방이므로
 * getWeeklyProgress/getMyWeeklyGoal 둘 다 goalRoomId 없이(=roomId 자기 자신 기준) 부른다.
 */
async function getHomeBundle(
  supabase: SupabaseClient<Database>,
  userId: string,
  roomId: string,
  today: Date
) {
  const [monthLogs, weeklyProgress, myGoal, roomMemberCount] = await Promise.all([
    getMonthLogs(supabase, today, roomId),
    getWeeklyProgress(supabase, today, roomId),
    getMyWeeklyGoal(supabase, userId, today, roomId),
    getRoomMemberCount(supabase, roomId),
  ]);
  return {
    monthLogs,
    weeklyProgress,
    myGoal,
    finePerDay: 0,
    exceptions: [],
    roomMemberCount,
  };
}

export default async function Home({
  searchParams,
}: PageProps<"/">) {
  if (!SUPABASE_CONFIGURED) {
    return <SetupNotice />;
  }

  const params = await searchParams;

  // Supabase의 리다이렉트 URL 허용 목록 설정에 따라 카카오 로그인 콜백이
  // /auth/callback이 아니라 홈("/")으로 code를 직접 들고 오는 경우가 있다.
  // 이 경우 세션 교환이 되지 않아 로그인 화면이 반복되므로, 콜백 라우트로 다시 보내
  // 정상적으로 세션을 교환하고 홈으로 돌아오게 한다.
  const code = typeof params?.code === "string" ? params.code : undefined;
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    // "AuthSessionMissingError"는 쿠키가 아예 없는(=로그인 전) 정상적인 상태라 로그를
    // 남기지 않는다. 그 외의 에러, 즉 쿠키는 있었는데 검증/갱신 자체가 실패한 경우만
    // 남겨야 "왜 세션이 끊겼는지"를 진단할 수 있다(getMyRooms와 동일하게 조용히 삼키지 않음).
    if (userError && userError.name !== "AuthSessionMissingError") {
      console.error("getUser 실패로 로그인 화면 표시:", userError.name, userError.message, userError.status);
    }
    return <LoginScreen authError={params?.auth_error === "1"} />;
  }

  const rooms = await getMyRooms(supabase, user.id);
  // "홈" 탭은 항상 이 공용 방(모든 신규 가입자가 자동으로 속함)을 보여준다 —
  // 로그인한 전체 이용자가 함께 보는 화면.
  const defaultRoom = rooms.find((r) => r.is_default) ?? null;

  // "참여 중인 방" 탭은 그 외(친구들끼리만 만든) 방들을 다룬다. ?room=으로 그중 하나가
  // 명시돼 있으면 그 방의 대시보드를, 아니면 방 목록을 보여준다.
  const otherRooms = rooms.filter((r) => !r.is_default);
  const requestedRoomId = typeof params?.room === "string" ? params.room : undefined;
  const selectedRoom = otherRooms.find((r) => r.id === requestedRoomId) ?? null;

  const joinCode = typeof params?.join === "string" ? params.join : undefined;

  const today = nowInSeoul();
  const weekStart = getWeekStartKey(today);

  // 주간 목표는 방마다 따로가 아니라 사람마다 하나, "홈" 기준으로 통일해서 보여준다.
  // 홈 방이 없는(설정 누락 등) 예외적인 경우엔 그 방 자기 자신을 기준으로 폴백한다.
  const goalRoomId = defaultRoom?.id ?? selectedRoom?.id ?? null;

  const [profile, defaultRoomData, selectedRoomData] = await Promise.all([
    getProfile(supabase, user.id),
    defaultRoom ? getHomeBundle(supabase, user.id, defaultRoom.id, today) : null,
    selectedRoom && goalRoomId
      ? getRoomDashboardBundle(supabase, user.id, selectedRoom.id, today, weekStart, goalRoomId)
      : null,
  ]);

  return (
    <AppShell
      userId={user.id}
      profile={
        profile ?? {
          id: user.id,
          nickname: "친구",
          avatar_url: null,
          toss_user_key: null,
          created_at: new Date().toISOString(),
        }
      }
      defaultRoom={defaultRoom}
      defaultRoomData={defaultRoomData}
      otherRooms={otherRooms}
      selectedRoom={selectedRoom}
      selectedRoomData={selectedRoomData}
      weekStart={weekStart}
      joinCode={joinCode}
    />
  );
}
