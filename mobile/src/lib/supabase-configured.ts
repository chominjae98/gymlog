/**
 * .env.local에 실제 Supabase 프로젝트 값이 채워졌는지 확인한다.
 * 템플릿 기본값("xxxx" 포함)이 그대로 남아있으면 설정 안내 화면을 보여주기 위한 용도.
 */
export const SUPABASE_CONFIGURED =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !process.env.EXPO_PUBLIC_SUPABASE_URL.includes("xxxx") &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes("xxxx");
