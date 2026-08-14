# 오운완 — 친구들과 함께하는 운동 인증 웹앱

로그인하지 않으면 카카오 로그인 화면, 로그인하면 이번 달 달력이 뜨고
오늘 날짜를 누르면 그날 운동 인증한 친구들의 사진 목록이 보여요.
주간 운동 목표를 정하고, 못 채울 것 같은 사람은 자동으로 "벌금 확정" 리스트에 올라갑니다.

## 기술 스택

- **Next.js 16 (App Router, TypeScript)** — Oracle 무료 서버에 `output: "standalone"`으로 셀프 호스팅
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
   - Site URL: 배포 도메인/IP (로컬 개발 중엔 `http://localhost:3000`)
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
5. 카카오 개발자센터 **플랫폼 → Web** 에 사용할 사이트 도메인(로컬/배포 주소) 등록

## 3. 환경 변수

`.env.local.example` 을 복사해 `.env.local` 을 만들고 값을 채워주세요.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API → anon public key |
| `NEXT_PUBLIC_SITE_URL` | 로컬은 `http://localhost:3000`, 배포 후엔 실제 주소 |

값을 채우기 전에는 홈 화면에 "Supabase 연결이 필요해요" 안내만 표시됩니다.

## 4. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 → 카카오 로그인 → 이번 달 달력 화면 확인

## 5. 주요 기능이 동작하는 방식

- **달력 홈**: 이번 달 달력에 그날 인증한 인원 수만큼 초록 점 표시. 미래 날짜는 클릭 불가.
- **오늘 인증 목록**: 날짜를 누르면 하단 시트로 그날 인증한 사람들의 사진/닉네임/메모가 뜸.
- **운동 인증**: 우측 하단 `+` 버튼 → 사진 선택 + 한 줄 메모 → `workout-photos` 버킷에 업로드 후 `workout_logs`에 기록.
- **주간 목표**: 헤더의 "목표 설정" 버튼 → 주 1~7일 중 선택 → 이번 주(월요일 기준) `weekly_goals`에 저장.
- **벌금 리스트**: 매 요청마다 서버에서 계산.
  - `possibleMax = 이미 달성한 일수 + 이번 주 남은 일수(오늘 포함)`
  - `possibleMax < 목표일수` 이면 수학적으로 더 이상 달성 불가능 → **벌금 확정**
  - `possibleMax == 목표일수` 이면 하루도 빠짐없이 채워야 하는 상태 → **막판 스퍼트**
  - 벌금 단가는 `app_settings.fine_per_day` (기본 5,000원, SQL Editor에서 직접 수정 가능)

## 6. Oracle Cloud 무료 서버(Always Free) 배포

10명 미만이 쓰는 서비스이므로 Oracle Free Tier의 **Ampere A1 (ARM, 4 OCPU/24GB 중 일부)** 또는
**VM.Standard.E2.1.Micro** 인스턴스 하나면 충분합니다.

### 6-1. 인스턴스 준비

```bash
# Ubuntu 인스턴스 기준
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Oracle Cloud 콘솔에서 **VCN → Security List** 와 인스턴스 방화벽(`iptables`/`ufw`) 양쪽 모두 80(HTTP), 443(HTTPS) 포트를 열어주세요. (Oracle은 서브넷 보안 목록에서도 별도로 막혀있는 경우가 많습니다.)

### 6-2. 코드 배포 & 빌드

```bash
git clone <your-repo-url> fitlog && cd fitlog
npm ci
cp .env.local.example .env.local   # 실제 값으로 채우기
npm run build                       # next.config.ts 의 output: "standalone" 적용
```

### 6-3. PM2로 상시 실행

`output: "standalone"` 빌드는 `.next/standalone/server.js` 로 실행합니다.

```bash
# 정적 파일 복사 (standalone 산출물에는 public/, .next/static 이 빠져 있음)
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

pm2 start .next/standalone/server.js --name fitlog
pm2 save
pm2 startup   # 안내되는 명령어를 실행해 서버 재부팅 시 자동 시작 등록
```

### 6-4. Nginx 리버스 프록시 (+ 무료 HTTPS)

`/etc/nginx/sites-available/fitlog`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/fitlog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 무료 HTTPS (도메인이 있을 경우)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

배포 후에는 Supabase의 **Redirect URLs**, 카카오 개발자센터의 **플랫폼(Web) 도메인**을
실제 배포 주소로 반드시 추가/변경해야 로그인이 정상 동작합니다.

### 6-5. 업데이트 배포

```bash
git pull
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
pm2 restart fitlog
```

## 폴더 구조 참고

```
src/
  app/                # 라우트 (/, /auth/callback)
  components/         # 화면 컴포넌트 (달력, 시트, 벌금 리스트 등)
  lib/
    supabase/          # 서버/브라우저/미들웨어 Supabase 클라이언트
    dashboard-data.ts   # 서버에서 쓰는 데이터 조회 & 벌금 계산 로직
    client-data.ts       # 브라우저에서 달력 이동 시 쓰는 재조회 로직
    date.ts               # 주/월 계산 유틸 (월요일 시작 기준)
  types/database.ts    # Supabase 테이블 타입
supabase/schema.sql    # DB 스키마 + RLS + Storage 정책 SQL
```
