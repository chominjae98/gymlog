export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  kakao_id: string | null;
  created_at: string;
};

export type WeeklyGoal = {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD, 그 주의 월요일
  target_days: number;
  created_at: string;
  updated_at: string;
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  photo_urls: string[]; // 사진 여러 장 첨부 가능, 최소 1장
  memo: string | null;
  created_at: string;
};

export type AppSettings = {
  id: number;
  fine_per_day: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      weekly_goals: {
        Row: WeeklyGoal;
        Insert: Partial<WeeklyGoal> & {
          user_id: string;
          week_start: string;
          target_days: number;
        };
        Update: Partial<WeeklyGoal>;
        Relationships: [];
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Partial<WorkoutLog> & {
          user_id: string;
          photo_urls: string[];
        };
        Update: Partial<WorkoutLog>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettings;
        Insert: Partial<AppSettings>;
        Update: Partial<AppSettings>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** 화면에서 쓰는, 사용자 정보가 join 된 운동 인증 기록 */
export type WorkoutLogWithProfile = WorkoutLog & {
  profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
};

/** 이번 주 멤버별 진행 상황 요약 */
export type WeeklyProgress = {
  profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
  targetDays: number | null;
  achievedDays: number;
  remainingDaysInWeek: number;
  status: "no-goal" | "safe" | "at-risk" | "fined";
};
