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
