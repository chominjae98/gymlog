import { LeaderboardView } from "@/components/LeaderboardView";
import { useAuth } from "@/lib/auth-context";

export default function RankingScreen() {
  const { session } = useAuth();
  return <LeaderboardView currentUserId={session!.user.id} />;
}
