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
  const requestedRoomId = typeof params?.room === "string" ? params.room : undefined;
  // 특정 방이 ?room=으로 명시된 경우에만 그 방의 대시보드를 보여준다. 명시되지 않았으면
  // (첫 방문/"홈" 재진입 등) 방을 하나 골라 대신 보여주지 않고, 모두가 공유하는 방 목록
  // 허브(AppShell의 RoomsHub)로 보낸다.
  const room = rooms.find((r) => r.id === requestedRoomId) ?? null;
  const joinCode = typeof params?.join === "string" ? params.join : undefined;

  const today = nowInSeoul();
  const weekStart = getWeekStartKey(today);

  const [profile, roomData] = await Promise.all([
    getProfile(supabase, user.id),
    room
      ? Promise.all([
          getMonthLogs(supabase, today, room.id),
          getWeeklyProgress(supabase, today, room.id),
          getMyWeeklyGoal(supabase, user.id, today, room.id),
          getFinePerDay(supabase, room.id),
          getFineExceptionsForWeek(supabase, weekStart, room.id),
          getRoomMemberCount(supabase, room.id),
        ])
      : null,
  ]);

  const [monthLogs, weeklyProgress, myGoal, finePerDay, exceptions, roomMemberCount] =
    roomData ?? [[], [], null, 0, [], 0];

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
      room={room}
      rooms={rooms}
      roomMemberCount={roomMemberCount}
      initialMonthLogs={monthLogs}
      initialWeeklyProgress={weeklyProgress}
      initialMyGoal={myGoal}
      weeklyFine={finePerDay}
      weekStart={weekStart}
      initialExceptions={exceptions}
      joinCode={joinCode}
    />
  );
}
