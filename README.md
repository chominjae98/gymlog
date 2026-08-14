# 오운완 — 친구들과 함께하는 운동 인증 웹앱

로그인하지 않으면 카카오 로그인 화면, 로그인하면 이번 달 달력이 뜨고
오늘 날짜를 누르면 그날 운동 인증한 친구들의 사진 목록이 보여요.
주간 운동 목표를 정하고, 못 채울 것 같은 사람은 자동으로 "벌금 확정" 리스트에 올라갑니다.

## 기술 스택

- **Next.js 16 (App Router, TypeScript)** — Vercel에 배포 (서버 관리 불필요)
- **Supabase** — Auth(카카오 로그인), Postgres DB, Storage(인증 사진)
- **Tailwind CSS v4** + Pretendard 폰트
- 사용자 10명 미만 소규모 친구 모임을 가정한 단순한 구조 (별도 조직/그룹 개념 없이 모두가 서로를 봄)

## 1. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성 (Region은 `Northeast Asia (Seoul)` 권장)
2. **SQL Editor** 에서 [`supabase/schema.sql`](supabase/schema.sql) 내용을 그대로 실행
   - `profiles`, `weekly_goals`, `workout_logs`, `app_settings` 테이블 생성
   - RLS 정책 (친구들끼리는 서로 조회 가능, 내 데이터만 수정/삭제 가능)
   - `workout-photos` 공개 Storage 버킷 자동 생성
3. **Authentication → URL Configuration**
   - Site URL: 배포 도메인 (Vercel 배포 주소)
   - Redirect URLs 에 `http://localhost:3000/auth/callback` 과 실제 배포 주소의 `/auth/callback` 추가

## 2. 카카오 로그인 연동

1. [Kakao Developers](https://developers.kakao.com) 에서 애플리케이션 생성
2. **제품 설정 → 카카오 로그인** 활성화, **동의 항목**에서 닉네임/프로필 사진 항목 설정
3. **Redirect URI** 에 Supabase 콜백 주소 등록:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. Supabase 대시보드 **Authentication → Providers → Kakao** 로 이동해 활성화하고
   카카오 개발자센터의 **REST API 키**와 **Client Secret**(보안 → Client Secret 발급)을 입력

## 3. 환경 변수

`.env.local.example` 을 복사해 `.env.local` 을 만들고 값을 채워주세요.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API → anon public key |

값을 채우기 전에는 홈 화면에 "Supabase 연결이 필요해요" 안내만 표시됩니다.

## 4. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 → 카카오 로그인 → 이번 달 달력 화면 확인

## 5. 주요 기능이 동작하는 방식

- **달력 홈**: 이번 달 달력에 그날 인증한 인원 수만큼 초록 점 표시. 미래 날짜는 클릭 불가.
- **오늘 인증 목록**: 날짜를 누르면 하단 시트로 그날 인증한 사람들의 사진(최대 5장, 스와이프로 넘겨봄)/닉네임/메모가 뜸. 본인 게시물은 수정(사진 교체·추가·삭제, 메모 수정)/삭제 가능.
- **운동 인증**: 우측 하단 `+` 버튼 → 사진 최대 5장 선택 + 한 줄 메모 → `workout-photos` 버킷에 업로드 후 `workout_logs`에 기록.
- **주간 목표**: 헤더의 "목표 설정" 버튼 → −/+ 로 1~7일 선택 → 이번 주(월요일 기준) `weekly_goals`에 저장.
- **벌금 리스트**: 매 요청마다 서버에서 계산.
  - `possibleMax = 이미 달성한 일수 + 이번 주 남은 일수(오늘 포함)`
  - `possibleMax < 목표일수` 이면 수학적으로 더 이상 달성 불가능 → **벌금 확정** (부족한 일수와 무관하게 `app_settings.fine_per_day` 고정 금액 1회 부과)
  - `possibleMax == 목표일수` 이면 하루도 빠짐없이 채워야 하는 상태 → **막판 스퍼트**
  - 벌금 단가는 `app_settings.fine_per_day` (기본 5,000원, SQL Editor에서 직접 수정 가능)

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

배포 완료 후 나오는 주소(예: `https://your-project.vercel.app`)를 확인하고, **Supabase Site URL / Redirect URLs**와 **카카오 개발자센터의 Redirect URI(Supabase 콜백 주소는 고정이라 변경 불필요)** 를 실제 배포 주소 기준으로 다시 확인해주세요.

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
  app/                # 라우트 (/, /auth/callback), PWA 아이콘/매니페스트
  components/         # 화면 컴포넌트 (달력, 시트, 벌금 리스트 등)
  lib/
    supabase/          # 서버/브라우저/미들웨어 Supabase 클라이언트
    dashboard-data.ts   # 서버에서 쓰는 데이터 조회 & 벌금 계산 로직
    client-data.ts       # 브라우저에서 달력 이동 시 쓰는 재조회 로직
    date.ts               # 주/월 계산 유틸 (월요일 시작 기준)
  types/database.ts    # Supabase 테이블 타입
supabase/schema.sql    # DB 스키마 + RLS + Storage 정책 SQL
```
