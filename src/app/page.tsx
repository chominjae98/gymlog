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

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("xxxx") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("xxxx");

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

  const today = new Date();

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
      finePerDay={finePerDay}
    />
  );
}
