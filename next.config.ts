import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage 공개 버킷 (운동 인증 사진)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // 카카오 프로필 이미지
      { protocol: "https", hostname: "*.kakaocdn.net" },
      { protocol: "http", hostname: "*.kakaocdn.net" },
    ],
    // 업로드 시점에 이미 클라이언트에서 리사이즈·압축(긴 변 1600px, JPEG 85%)까지 마친
    // 사진을 Next.js Image Optimization(서버에서 다시 fetch→리사이즈→변환)에 또 태우면,
    // 얻는 용량 절감은 미미한데 (특히 Vercel에서) 그 프록시 왕복 자체가 콜드스타트를 포함해
    // 1~2초씩 걸려 달력 날짜를 눌러 사진을 볼 때 체감 지연의 주된 원인이었다.
    // 원본 CDN(Supabase Storage/Kakao)에서 브라우저가 직접 받아오게 우회한다.
    unoptimized: true,
  },
  // 주의: Vercel에 배포할 때는 output:"standalone"을 넣으면 안 됨 (Vercel 자체 빌드 파이프라인과
  // 충돌해서 "ENOENT next-server.js.nft.json" 빌드 에러가 남). 나중에 오라클 등 자체 서버로
  // 옮길 일이 생기면 그때 다시 추가하면 됨.
  // 개발 모드 좌하단 Next.js Dev Tools 아이콘 숨김
  devIndicators: false,
  // 홈 화면은 로그인 사용자별 실시간 집계(벌금 위기 등)를 담은 동적 페이지라
  // 브라우저/웹뷰의 HTTP 캐시에 남아있으면 안 된다. 캐시된 응답이 재사용되면
  // 앱을 강제종료 후 재실행했을 때 예전 데이터가 그대로 보이는 문제가 생긴다.
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
