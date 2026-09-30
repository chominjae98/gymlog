// 테스트용 유령 유저 200명(test01~test200)을 만들고, 각기 다른 운동 일수/목표
// 달성률을 갖도록 최근 3주치 운동 기록과 이번 주 목표를 함께 채워 넣는다.
//
// - 신규 유저는 profiles 트리거(handle_new_user)로 프로필이 자동 생성되고, 기본
//   방("홈", is_default=true)에 자동으로 가입된다 — 그래서 "홈"/"전체 랭킹" 탭에만
//   나타나고, 사용자가 직접 만든 다른 방(테스트/테스트2/운인방 등)에는 나타나지 않는다.
// - service role 키로 RLS를 우회해서 직접 insert하므로 Next.js 앱 실행 없이
//   한 번 실행하는 것으로 끝나는 독립 스크립트다.
//
// 실행: node --env-file=.env.local scripts/seed-test-users.mjs
import { createClient } from "@supabase/supabase-js";
import { startOfWeek, subDays, format } from "date-fns";

const WEEK_OPTS = { weekStartsOn: 1 };
const USER_COUNT = 200;
const DAYS_BACK = 21; // 최근 3주치
const CREATE_CONCURRENCY = 8;

// 1x1 픽셀짜리 최소 크기 JPEG (실제 이미지 도메인 제약(next.config의 remotePatterns:
// *.supabase.co)을 만족시키기 위해 Storage에 실제로 업로드해서 쓴다 — 아무 URL이나
// 넣으면 이미지 로드가 깨진 것처럼 보일 수 있다).
const PLACEHOLDER_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

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

async function ensurePlaceholderPhotoUrl() {
  const path = "_seed/placeholder.jpg";
  const bytes = Buffer.from(PLACEHOLDER_JPEG_BASE64, "base64");
  const { error } = await admin.storage
    .from("workout-photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`플레이스홀더 이미지 업로드 실패: ${error.message}`);
  const {
    data: { publicUrl },
  } = admin.storage.from("workout-photos").getPublicUrl(path);
  return publicUrl;
}

async function getDefaultRoomId() {
  const { data, error } = await admin
    .from("rooms")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error(`기본(홈) 방을 찾지 못했습니다: ${error?.message ?? "no default room"}`);
  }
  return data.id;
}

async function createFakeUser(index) {
  const n = index + 1;
  const nickname = `test${String(n).padStart(2, "0")}`;
  const email = `${nickname}@uninbang-seed.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: nickname },
  });
  if (error) {
    console.error(`  ✗ ${nickname} 생성 실패: ${error.message}`);
    return null;
  }
  return { id: data.user.id, nickname };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log(`기본(홈) 방 조회 중...`);
  const defaultRoomId = await getDefaultRoomId();
  console.log(`  → ${defaultRoomId}`);

  console.log(`플레이스홀더 사진 업로드 중...`);
  const photoUrl = await ensurePlaceholderPhotoUrl();
  console.log(`  → ${photoUrl}`);

  console.log(`테스트 유저 ${USER_COUNT}명 생성 중 (동시 ${CREATE_CONCURRENCY}개씩)...`);
  const indices = Array.from({ length: USER_COUNT }, (_, i) => i);
  const created = (await mapWithConcurrency(indices, CREATE_CONCURRENCY, createFakeUser)).filter(
    (u) => u !== null
  );
  console.log(`  → ${created.length}/${USER_COUNT}명 생성 완료`);

  const today = new Date();
  const weekStart = toDateKey(startOfWeek(today, WEEK_OPTS));

  const weeklyGoalRows = [];
  const workoutLogRows = [];

  for (const user of created) {
    // 사람마다 "운동을 얼마나 꾸준히 하는지"를 다르게 둬서, 운동 일수/목표 달성률이
    // 골고루 퍼지게 한다 (0명 인증도, 매일 인증도 섞이도록 범위를 넓게 잡음).
    const consistency = Math.random(); // 0(거의 안 함) ~ 1(거의 매일)
    const targetDays = randomInt(1, 7);

    weeklyGoalRows.push({
      user_id: user.id,
      room_id: defaultRoomId,
      week_start: weekStart,
      target_days: targetDays,
    });

    for (let d = 0; d < DAYS_BACK; d++) {
      if (Math.random() > consistency) continue;
      const logDate = toDateKey(subDays(today, d));
      workoutLogRows.push({
        user_id: user.id,
        room_id: defaultRoomId,
        log_date: logDate,
        photo_urls: [photoUrl],
        photo_hashes: [`seed-${user.nickname}-${logDate}`],
        memo: null,
      });
    }
  }

  console.log(`주간 목표 ${weeklyGoalRows.length}건 저장 중...`);
  for (let i = 0; i < weeklyGoalRows.length; i += 500) {
    const chunk = weeklyGoalRows.slice(i, i + 500);
    const { error } = await admin.from("weekly_goals").insert(chunk);
    if (error) console.error(`  ✗ weekly_goals 청크 실패(${i}):`, error.message);
  }

  console.log(`운동 기록 ${workoutLogRows.length}건 저장 중...`);
  for (let i = 0; i < workoutLogRows.length; i += 500) {
    const chunk = workoutLogRows.slice(i, i + 500);
    const { error } = await admin.from("workout_logs").insert(chunk);
    if (error) console.error(`  ✗ workout_logs 청크 실패(${i}):`, error.message);
  }

  console.log("완료!");
}

main().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
