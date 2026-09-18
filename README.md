# 오운완 — 친구들과 함께하는 운동 인증 웹앱

로그인하지 않으면 토스 로그인 화면, 로그인하면 이번 달 달력이 뜨고
오늘 날짜를 누르면 그날 운동 인증한 친구들의 사진 목록이 보여요.
주간 운동 목표를 정하고, 못 채울 것 같은 사람은 자동으로 "벌금 확정" 리스트에 올라갑니다.

## 기술 스택

- **Next.js 16 (App Router, TypeScript)** — Vercel에 배포 (서버 관리 불필요)
- **Supabase** — Auth(토스 로그인 세션 매핑), Postgres DB, Storage(인증 사진)
- **Tailwind CSS v4** + Pretendard 폰트
- 사용자 10명 미만 소규모 친구 모임을 가정한 단순한 구조 (별도 조직/그룹 개념 없이 모두가 서로를 봄)
- Apps in Toss 미니앱 전환 진행 중 — **토스 로그인**으로 사용자 식별 (`src/app/api/auth/toss/route.ts`)

## 1. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성 (Region은 `Northeast Asia (Seoul)` 권장)
2. **SQL Editor** 에서 [`supabase/schema.sql`](supabase/schema.sql) 내용을 그대로 실행
   - `profiles`, `weekly_goals`, `workout_logs`, `app_settings`, `workout_log_comments` 테이블 생성
   - RLS 정책 (친구들끼리는 서로 조회 가능, 내 데이터만 수정/삭제 가능)
   - `workout-photos` 공개 Storage 버킷 자동 생성
   - ⚠️ 이미 예전 버전을 실행해서 운영 중인 프로젝트라면, 댓글 기능을 쓰기 위해 **`schema.sql` 전체를 다시 한 번 SQL Editor에서 그대로 실행**해주세요. 모든 문장이 재실행 가능(idempotent)하게 되어 있어(`create table if not exists`, 정책은 `drop policy if exists` 후 재생성) 기존 데이터나 정책을 깨뜨리지 않고 새 테이블/정책만 추가됩니다. (한때 있었던 알림 리마인더용 `push_subscriptions`, 리액션용 `workout_log_reactions` 테이블은 이 실행으로 자동 정리됩니다 — `weekly_goals`/`workout_logs`/`workout_log_comments` 등 남겨둔 테이블의 기존 데이터는 전혀 영향받지 않습니다.)
3. **Authentication → URL Configuration**
   - Site URL: 배포 도메인 (Vercel 배포 주소)
   - Redirect URLs 에 `http://localhost:4000/auth/callback` 과 실제 배포 주소의 `/auth/callback` 추가

## 2. 토스 로그인 연동

이 앱은 **Apps in Toss 토스 로그인**으로 사용자를 식별합니다.
`appLogin()`은 실제 토스 앱(웹뷰)/샌드박스 안에서만 동작하므로, 아래가 모두 끝나기
전까지는 일반 브라우저에서 로그인 버튼을 눌러도 실패하는 게 정상입니다.

1. [앱인토스 콘솔](https://developers-apps-in-toss.toss.im) 에서 워크스페이스 아래에
   미니앱을 등록하고, **토스 로그인 약관**을 설정
2. 콘솔에서 서버-서버 통신용 **mTLS 클라이언트 인증서**를 발급받아 안전하게 보관
3. 발급받은 인증서(cert/key, PEM)를 `.env.local`의 `TOSS_LOGIN_MTLS_CERT`,
   `TOSS_LOGIN_MTLS_KEY`에 줄바꿈을 `\n`으로 이스케이프해 한 줄로 채워넣기
4. Supabase Project Settings → API → **service_role key**를 `SUPABASE_SERVICE_ROLE_KEY`에 채워넣기
   (토스 로그인으로 검증된 사용자를 실제 Supabase 세션으로 바꿀 때만 서버에서 사용, 노출 금지)

인증서/서비스 롤 키가 비어 있으면 `/api/auth/toss`가 503을 반환할 뿐 앱 빌드·배포 자체는
막히지 않습니다.

## 3. 환경 변수

`.env.local.example` 을 복사해 `.env.local` 을 만들고 값을 채워주세요.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API → service_role key (서버 전용) |
| `TOSS_LOGIN_MTLS_CERT` / `TOSS_LOGIN_MTLS_KEY` | 앱인토스 콘솔에서 발급받은 mTLS 인증서/키 (PEM, `\n` 이스케이프) |

값을 채우기 전에는 홈 화면에 "Supabase 연결이 필요해요" 안내만 표시됩니다.

## 4. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:4000` 접속 → (토스 로그인은 실제 토스 앱/샌드박스 안에서만 동작하므로,
일반 브라우저에서는 콘솔/mTLS 준비가 끝나기 전까지 로그인 화면만 확인 가능)

## 5. 주요 기능이 동작하는 방식

- **방(room)**: 사진·벌금·투표 등 모든 데이터는 "방" 단위로 완전히 격리됨. 누구나 방을 만들 수 있고, 8자리 초대 코드(또는 그 코드를 담은 링크)로 다른 사람을 초대함. 한 사람이 여러 방에 동시에 속할 수 있고, 헤더의 방 이름을 눌러 언제든 전환 가능. 로그인은 했지만 아직 어느 방에도 속하지 않았다면 방 만들기/참가하기 화면부터 보게 됨.
- **전체 랭킹**: 하단 "랭킹" 탭 — 방과 무관하게 전체 이용자를 누적 인증 일수 기준으로 줄 세움(닉네임/아바타/일수만 노출, 사진이나 어느 방 소속인지는 안 보임).
- **달력 홈**: 이번 달 달력에 그날 인증한 인원 수만큼 초록 점 표시. 미래 날짜는 클릭 불가.
- **오늘 인증 목록**: 날짜를 누르면 하단 시트로 그날 인증한 사람들의 사진(최대 5장, 스와이프로 넘겨봄)/닉네임/메모가 뜸. 본인 게시물은 수정(사진 교체·추가·삭제, 메모 수정)/삭제 가능.
- **운동 인증**: 우측 하단 `+` 버튼 → 사진 최대 5장 선택 + 한 줄 메모 → `workout-photos` 버킷에 업로드 후 `workout_logs`에 기록.
- **주간 목표**: 헤더의 "목표 설정" 버튼 → −/+ 로 1~7일 선택 → 이번 주(월요일 기준) `weekly_goals`에 저장.
- **벌금 리스트**: 매 요청마다 서버에서 계산.
  - `possibleMax = 이미 달성한 일수 + 이번 주 남은 일수(오늘 포함)`
  - `possibleMax < 목표일수` 이면 수학적으로 더 이상 달성 불가능 → **벌금 확정** (부족한 일수와 무관하게 그 방의 `rooms.fine_per_day` 고정 금액 1회 부과)
  - `possibleMax == 목표일수` 이면 하루도 빠짐없이 채워야 하는 상태 → **막판 스퍼트**
  - 벌금 단가는 방마다 다르게 설정되는 `rooms.fine_per_day` (기본 5,000원, SQL Editor에서 직접 수정 가능)
- **이 달 정산 요약**: 홈 화면 맨 위 "OO월 정산 요약" 카드 → 매번 열 때마다 그 시점 기준으로 이번 달에 걸친 모든 주를 다시 계산해서 사람별 누적 벌금 합계를 보여줌 (실제 송금 기능은 없음). 달이 바뀌면(자정 KST 기준) 자동으로 새 달 기준으로 계산됨 — 별도 초기화 로직이 필요 없이, "이번 달"이 뭔지부터 매번 다시 계산하는 구조라서 그렇다.
- **댓글**: 날짜를 눌러 연 게시물마다 댓글을 남길 수 있음. 본인 댓글만 삭제 가능.
- **내 활동 히트맵**: 헤더의 불꽃 아이콘 → 최근 약 5개월 인증 기록을 GitHub 잔디밭처럼 시각화. 칸을 탭하면 그 날짜(몇 월 며칠, 무슨 요일)와 인증 여부가 아래 캡션에 표시됨. 연속 인증 일수 / 최장 기록 / 지금까지 누적 인증 일수(전체 기간 기준) 표시.

## 6. Vercel 배포

Git 저장소(GitHub)와 연동해두면 `git push` 할 때마다 자동으로 빌드·배포됩니다.

### 6-1. 최초 배포

```bash
npm i -g vercel   # 또는 매번 npx vercel 사용
vercel login
vercel            # 질문에 답하면서 프로젝트 생성 (프로젝트 이름은 소문자만 가능)
```

### 6-2. 환경 변수 등록

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

### 6-3. 프로덕션 배포

```bash
vercel --prod
```

배포 완료 후 `SUPABASE_SERVICE_ROLE_KEY`, `TOSS_LOGIN_MTLS_CERT`, `TOSS_LOGIN_MTLS_KEY` 환경 변수를 Vercel 프로젝트에도 등록해주세요(토스 로그인은 별도 Redirect URL 설정이 필요 없습니다).

### 6-4. GitHub 연동 (권장)

1. Vercel 대시보드 → 프로젝트 → **Settings → Git → Connect Git Repository**
2. 이후로는 아래만 하면 자동 배포됩니다.
   ```bash
   git add .
   git commit -m "메시지"
   git push
   ```

### 6-5. 커스텀 도메인을 쓰고 싶다면

Vercel 대시보드 → 프로젝트 → **Settings → Domains** 에서 보유한 도메인의 서브도메인(예: `gym.example.com`)을 추가하고 안내되는 DNS 레코드(CNAME)를 등록하면 됩니다. 필수는 아니고, Vercel이 기본으로 주는 `*.vercel.app` 주소도 영구적으로 유지됩니다.

## 폴더 구조 참고

```
src/
  app/                # 라우트 (/, /api/auth/toss), PWA 아이콘/매니페스트
  components/         # 화면 컴포넌트 (달력, 시트, 벌금 리스트, 히트맵, 정산, 댓글/리액션 등)
  lib/
    supabase/          # 서버/브라우저/미들웨어/admin Supabase 클라이언트
    toss/              # 토스 로그인 mTLS 클라이언트 & 세션 발급
    dashboard-data.ts   # 서버에서 쓰는 데이터 조회 & 벌금 계산 로직
    settlement-data.ts   # 월간 정산 요약 계산
    social-data.ts        # 댓글 조회·작성
    heatmap-data.ts        # 히트맵 그리드 & 연속 일수 계산
    client-data.ts          # 브라우저에서 달력 이동 시 쓰는 재조회 로직
    rooms-data.ts             # 방 생성/참가, 전체 랭킹 조회
    share.ts                   # 초대 링크 공유 (토스 SDK → Web Share → 클립보드 순 폴백)
    date.ts                      # 주/월 계산 유틸 (월요일 시작 기준)
  types/database.ts    # Supabase 테이블 타입
supabase/schema.sql    # DB 스키마 + RLS + Storage 정책 SQL
```
