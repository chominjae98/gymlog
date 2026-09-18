import { createClient } from "@/lib/supabase/server";
import { LoginScreen } from "@/components/LoginScreen";
import { RoomOnboarding } from "@/components/RoomOnboarding";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginScreen authError={params?.auth_error === "1"} />;
  }

  const rooms = await getMyRooms(supabase, user.id);
  if (rooms.length === 0) {
    const joinCode = typeof params?.join === "string" ? params.join : undefined;
    return <RoomOnboarding initialCode={joinCode} />;
  }

  const requestedRoomId = typeof params?.room === "string" ? params.room : undefined;
  const room = rooms.find((r) => r.id === requestedRoomId) ?? rooms[0];

  const today = nowInSeoul();
  const weekStart = getWeekStartKey(today);

  const [profile, monthLogs, weeklyProgress, myGoal, finePerDay, exceptions, roomMemberCount] =
    await Promise.all([
      getProfile(supabase, user.id),
      getMonthLogs(supabase, today, room.id),
      getWeeklyProgress(supabase, today, room.id),
      getMyWeeklyGoal(supabase, user.id, today, room.id),
      getFinePerDay(supabase, room.id),
      getFineExceptionsForWeek(supabase, weekStart, room.id),
      getRoomMemberCount(supabase, room.id),
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
      room={room}
      rooms={rooms}
      roomMemberCount={roomMemberCount}
      initialMonthLogs={monthLogs}
      initialWeeklyProgress={weeklyProgress}
      initialMyGoal={myGoal}
      weeklyFine={finePerDay}
      weekStart={weekStart}
      initialExceptions={exceptions}
    />
  );
}
