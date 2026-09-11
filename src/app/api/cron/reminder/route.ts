import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";
import { computeWeeklyStatus } from "@/lib/dashboard-data";
import {
  getWeekRangeKeys,
  getWeekStartKey,
  nowInSeoul,
  remainingDaysInWeekIncludingToday,
  toDateKey,
} from "@/lib/date";

export const dynamic = "force-dynamic";

/**
 * 매일 저녁(KST) 한 번, 그날 아직 인증하지 않은 사람에게 리마인더 푸시를 보낸다.
 * Vercel Cron(vercel.json)이 이 경로를 호출하며, Authorization 헤더의 CRON_SECRET으로
 * 외부에서 아무나 호출해 알림을 스팸으로 뿌리지 못하도록 막는다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET이 설정되지 않았어요." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "VAPID 키가 설정되지 않았어요." }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role 설정이 없어요." }, { status: 500 });
  }

  const today = nowInSeoul();
  const todayKey = toDateKey(today);
  const weekStart = getWeekStartKey(today);
  const { start: weekStartKey, end: weekEndKey } = getWeekRangeKeys(today);
  const remaining = remainingDaysInWeekIncludingToday(today);

  const [{ data: subscriptions }, { data: todayLogs }, { data: goals }, { data: weekLogs }] =
    await Promise.all([
      supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth_key"),
      supabase.from("workout_logs").select("user_id").eq("log_date", todayKey),
      supabase.from("weekly_goals").select("user_id, target_days").eq("week_start", weekStart),
      supabase
        .from("workout_logs")
        .select("user_id, log_date")
        .gte("log_date", weekStartKey)
        .lte("log_date", weekEndKey),
    ]);

  const loggedTodayUserIds = new Set((todayLogs ?? []).map((l) => l.user_id));
  const goalByUser = new Map((goals ?? []).map((g) => [g.user_id, g.target_days]));
  const achievedByUser = new Map<string, Set<string>>();
  for (const log of weekLogs ?? []) {
    const set = achievedByUser.get(log.user_id) ?? new Set<string>();
    set.add(log.log_date);
    achievedByUser.set(log.user_id, set);
  }

  const targets = (subscriptions ?? []).filter((s) => !loggedTodayUserIds.has(s.user_id));

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  await Promise.all(
    targets.map(async (sub) => {
      const targetDays = goalByUser.get(sub.user_id) ?? null;
      const achievedDays = achievedByUser.get(sub.user_id)?.size ?? 0;
      const status = computeWeeklyStatus(achievedDays, targetDays, remaining);

      const body =
        status === "fined"
          ? "이번 주 목표는 이미 물 건너갔지만, 내일을 위해 오늘도 운동해봐요."
          : status === "at-risk"
            ? "아직 오늘 인증 전이에요. 벌금 위기, 오늘 인증으로 막아요!"
            : "아직 오늘 운동 인증을 안 하셨어요. 잊지 말고 인증해요 🔥";

      const payload = JSON.stringify({ title: "오운완 리마인더", body, url: "/" });

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        // 410 Gone / 404 Not Found면 브라우저가 구독을 해제한 것이므로 정리 대상으로 표시.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ targeted: targets.length, sent, failed, cleaned: staleEndpoints.length });
}
