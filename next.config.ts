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
};

export default nextConfig;
