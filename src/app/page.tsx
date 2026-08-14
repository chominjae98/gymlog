import { createClient } from "@/lib/supabase/server";
import { LoginScreen } from "@/components/LoginScreen";
import { Dashboard } from "@/components/Dashboard";
import { SetupNotice } from "@/components/SetupNotice";
import {
  getFinePerDay,
  getMonthLogs,
  getMyWeeklyGoal,
  getProfile,
  getWeeklyProgress,
} from "@/lib/dashboard-data";
import { SUPABASE_CONFIGURED } from "@/lib/supabase-configured";
import { nowInSeoul } from "@/lib/date";

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

  const today = nowInSeoul();

  const [profile, monthLogs, weeklyProgress, myGoal, finePerDay] =
    await Promise.all([
      getProfile(supabase, user.id),
      getMonthLogs(supabase, today),
      getWeeklyProgress(supabase, today),
      getMyWeeklyGoal(supabase, user.id, today),
      getFinePerDay(supabase),
    ]);

  return (
    <Dashboard
      userId={user.id}
      profile={
        profile ?? {
          id: user.id,
          nickname: "친구",
          avatar_url: null,
          kakao_id: null,
          created_at: new Date().toISOString(),
        }
      }
      initialMonthLogs={monthLogs}
      initialWeeklyProgress={weeklyProgress}
      initialMyGoal={myGoal}
      weeklyFine={finePerDay}
    />
  );
}
