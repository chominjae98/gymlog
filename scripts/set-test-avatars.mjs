// seed-test-users.mjs로 만든 test01~test200 유령 유저는 프로필 사진이 없어서
// 랭킹/피드 화면을 테스트할 때 전부 빈 아바타로 나온다. 색상만 다른 단색 PNG를
// 유저마다 하나씩 만들어 Storage에 올리고 profiles.avatar_url에 채워 넣는다.
//
// 외부 이미지 라이브러리(sharp 등) 없이 Node 내장 zlib만으로 PNG를 직접 인코딩한다
// (next.config의 remotePatterns가 *.supabase.co만 허용해서, 외부 아바타 서비스
// URL을 그냥 넣으면 웹 화면에서 이미지가 깨진다 — seed-test-users.mjs와 같은 이유로
// Storage에 실제로 업로드한다).
//
// 실행: node --env-file=.env.local scripts/set-test-avatars.mjs
import { createClient } from "@supabase/supabase-js";
import { deflateSync } from "node:zlib";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AVATAR_SIZE = 128;
const UPLOAD_CONCURRENCY = 8;

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** 가로 절반은 밝은 색, 절반은 그 색의 진한 톤 — 단순 단색보다 "아바타"처럼 보이게. */
function makeAvatarPng(size, [r, g, b], [r2, g2, b2]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  const ihdr = chunk("IHDR", ihdrData);

  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(rowBytes * size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [cr, cg, cb] = y < half === x < half ? [r, g, b] : [r2, g2, b2];
      const px = rowStart + 1 + x * 3;
      raw[px] = cr;
      raw[px + 1] = cg;
      raw[px + 2] = cb;
    }
  }
  const idat = chunk("IDAT", deflateSync(raw));
  const iend = chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
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

async function main() {
  console.log("test01~test200 프로필 조회 중...");
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, nickname")
    .like("nickname", "test%")
    .order("nickname");
  if (error) throw new Error(`프로필 조회 실패: ${error.message}`);

  const targets = (profiles ?? []).filter((p) => /^test\d+$/.test(p.nickname));
  console.log(`  → ${targets.length}명 대상`);
  if (targets.length === 0) {
    console.log("대상이 없어 종료합니다.");
    return;
  }

  let done = 0;
  await mapWithConcurrency(targets, UPLOAD_CONCURRENCY, async (profile, i) => {
    const hue = (i * 360) / targets.length;
    const light = hslToRgb(hue, 0.65, 0.62);
    const dark = hslToRgb(hue, 0.65, 0.42);
    const png = makeAvatarPng(AVATAR_SIZE, light, dark);

    const path = `_seed/avatars/${profile.nickname}.png`;
    const { error: uploadError } = await admin.storage
      .from("workout-photos")
      .upload(path, png, { contentType: "image/png", upsert: true });
    if (uploadError) {
      console.error(`  ✗ ${profile.nickname} 업로드 실패: ${uploadError.message}`);
      return;
    }
    const {
      data: { publicUrl },
    } = admin.storage.from("workout-photos").getPublicUrl(path);

    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);
    if (updateError) {
      console.error(`  ✗ ${profile.nickname} 프로필 업데이트 실패: ${updateError.message}`);
      return;
    }
    done += 1;
    if (done % 20 === 0) console.log(`  진행: ${done}/${targets.length}`);
  });

  console.log(`완료! ${done}/${targets.length}명 아바타 설정`);
}

main().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
