/**
 * .env.local에 실제 Supabase 프로젝트 값이 채워졌는지 확인한다.
 * 템플릿 기본값("xxxx" 포함)이 그대로 남아있으면 설정 안내 화면을 보여주기 위한 용도.
 * middleware.ts와 app/page.tsx 양쪽에서 공용으로 사용한다.
 */
export const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("xxxx") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("xxxx");
