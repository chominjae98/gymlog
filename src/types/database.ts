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
  photo_hashes: string[]; // photo_urls와 같은 순서 - 동일 사진 재업로드 방지용 SHA-256 해시
  memo: string | null;
  created_at: string;
};

export type AppSettings = {
  id: number;
  fine_per_day: number;
};

export type WorkoutLogComment = {
  id: string;
  log_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type FineException = {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD, 그 주의 월요일
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
};

export type FineExceptionVote = {
  id: string;
  exception_id: string;
  voter_id: string;
  vote: "approve" | "reject";
  created_at: string;
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
      workout_log_comments: {
        Row: WorkoutLogComment;
        Insert: Partial<WorkoutLogComment> & {
          log_id: string;
          user_id: string;
          body: string;
        };
        Update: Partial<WorkoutLogComment>;
        Relationships: [];
      };
      fine_exceptions: {
        Row: FineException;
        Insert: Partial<FineException> & {
          user_id: string;
          week_start: string;
          reason: string;
        };
        Update: Partial<FineException>;
        Relationships: [];
      };
      fine_exception_votes: {
        Row: FineExceptionVote;
        Insert: Partial<FineExceptionVote> & {
          exception_id: string;
          voter_id: string;
          vote: "approve" | "reject";
        };
        Update: Partial<FineExceptionVote>;
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

/** 화면에서 쓰는, 작성자 정보가 join 된 댓글 */
export type CommentWithProfile = WorkoutLogComment & {
  profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
};

/** 특정 달(월) 안에서, 한 사람의 주차별 정산 내역 */
export type WeeklySettlementEntry = {
  weekStart: string;
  targetDays: number | null;
  achievedDays: number;
  status: WeeklyProgress["status"];
  fine: number;
};

/** 특정 달(월) 정산 요약 — 사람별 총 벌금과 주차별 내역 */
export type MonthlySettlement = {
  profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
  totalFine: number;
  weeks: WeeklySettlementEntry[];
};

/** 화면에서 쓰는, 신청자 정보와 투표 목록이 join 된 벌금 예외 사유서 */
export type FineExceptionWithVotes = FineException & {
  profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
  votes: FineExceptionVote[];
};
