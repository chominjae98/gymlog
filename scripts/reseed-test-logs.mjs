// seed-test-users.mjs가 만든 test01~test200의 운동 기록을 최근 3주치 대신
// 2026-01-01 ~ 오늘(2026-09-30)까지 통째로 다시 채운다. "주간/월간/전체" 랭킹 탭이
// 서로 다른 숫자를 보여주는지 제대로 테스트하려면 전체 기간에 걸친 데이터가 필요한데,
// 기존 시드는 최근 21일치뿐이라 이번 달(9월) 안에 다 몰려 있어서 "월간"과 "전체"가
// 똑같이 보였다.
//
// 유저를 새로 만들지 않고(이미 200명 다 있음), 기존 workout_logs만 지우고 새 범위로
// 다시 채운다. weekly_goals는 건드리지 않는다.
//
// 실행: node --env-file=.env.local scripts/reseed-test-logs.mjs
import { createClient } from "@supabase/supabase-js";
import { format, subDays, differenceInCalendarDays } from "date-fns";

const START_DATE = new Date("2026-01-01T00:00:00");
const CONCURRENCY = 8;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function toDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function getDefaultRoomId() {
  const { data, error } = await admin.from("rooms").select("id").eq("is_default", true).limit(1).single();
  if (error || !data) throw new Error(`기본(홈) 방을 찾지 못했습니다: ${error?.message ?? "no default room"}`);
  return data.id;
}

async function getPlaceholderPhotoUrl() {
  const path = "_seed/placeholder.jpg";
  const {
    data: { publicUrl },
  } = admin.storage.from("workout-photos").getPublicUrl(path);
  const check = await fetch(publicUrl, { method: "HEAD" });
  if (!check.ok) throw new Error(`플레이스홀더 사진이 없어요(${publicUrl}) — seed-test-users.mjs를 먼저 실행해 주세요.`);
  return publicUrl;
}

async function getTestProfiles() {
  const { data, error } = await admin.from("profiles").select("id, nickname").like("nickname", "test%").order("nickname");
  if (error) throw new Error(`프로필 조회 실패: ${error.message}`);
  return (data ?? []).filter((p) => /^test\d+$/.test(p.nickname));
}

async function main() {
  const today = new Date();
  const daysBack = differenceInCalendarDays(today, START_DATE);
  console.log(`기간: ${toDateKey(START_DATE)} ~ ${toDateKey(today)} (${daysBack + 1}일)`);

  console.log("기본(홈) 방 조회 중...");
  const defaultRoomId = await getDefaultRoomId();

  console.log("플레이스홀더 사진 확인 중...");
  const photoUrl = await getPlaceholderPhotoUrl();

  console.log("테스트 유저 조회 중...");
  const profiles = await getTestProfiles();
  console.log(`  → ${profiles.length}명`);
  if (profiles.length === 0) {
    console.log("대상이 없어 종료합니다.");
    return;
  }

  console.log("기존 운동 기록 삭제 중...");
  const userIds = profiles.map((p) => p.id);
  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const { error } = await admin.from("workout_logs").delete().in("user_id", chunk).eq("room_id", defaultRoomId);
    if (error) throw new Error(`기존 기록 삭제 실패: ${error.message}`);
  }

  console.log(`${toDateKey(START_DATE)}부터 운동 기록 생성 중...`);
  const workoutLogRows = [];
  for (const profile of profiles) {
    // 사람마다 꾸준함이 다르게(0=거의 안 함, 1=거의 매일) — 기존 시드와 같은 방식.
    const consistency = Math.random();
    for (let d = 0; d <= daysBack; d++) {
      if (Math.random() > consistency) continue;
      const logDate = toDateKey(subDays(today, d));
      workoutLogRows.push({
        user_id: profile.id,
        room_id: defaultRoomId,
        log_date: logDate,
        photo_urls: [photoUrl],
        photo_hashes: [`seed-${profile.nickname}-${logDate}`],
        memo: null,
      });
    }
  }
  console.log(`  → ${workoutLogRows.length}건 생성, 저장 중...`);

  let inserted = 0;
  await mapWithConcurrency(
    Array.from({ length: Math.ceil(workoutLogRows.length / 500) }, (_, i) => workoutLogRows.slice(i * 500, i * 500 + 500)),
    CONCURRENCY,
    async (chunk) => {
      const { error } = await admin.from("workout_logs").insert(chunk);
      if (error) {
        console.error(`  ✗ 청크 저장 실패: ${error.message}`);
        return;
      }
      inserted += chunk.length;
      console.log(`  진행: ${inserted}/${workoutLogRows.length}`);
    }
  );

  console.log(`완료! ${inserted}/${workoutLogRows.length}건 저장`);
}

main().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
