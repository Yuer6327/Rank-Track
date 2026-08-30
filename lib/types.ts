export const MAJOR_SUBJECTS = ["语文", "数学", "英语"] as const;
export const MINOR_SUBJECTS = ["物理", "化学", "生物", "政治", "历史", "地理"] as const;
export const ALL_SUBJECTS = [...MAJOR_SUBJECTS, ...MINOR_SUBJECTS] as const;

export type MajorSubject = (typeof MAJOR_SUBJECTS)[number];
export type MinorSubject = (typeof MINOR_SUBJECTS)[number];
export type Subject = (typeof ALL_SUBJECTS)[number];

export const LEVELS = [
  "A+",
  "A",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "E",
] as const;

export type Level = (typeof LEVELS)[number];

export const LEVEL_SCORE: Record<Level, number> = {
  "A+": 70,
  A: 67,
  "B+": 64,
  B: 61,
  "B-": 58,
  "C+": 55,
  C: 52,
  "C-": 49,
  "D+": 46,
  D: 43,
  E: 40,
};

export type RankDimension = "class" | "grade" | "city";
export type TrendDimension = "grade_rank" | "class_rank" | "city_rank" | "percent";
export type HomeDensity = "compact" | "standard";
export type ThemeMode = "light" | "dark" | "system";

export type SessionUser = {
  id: string;
  username: string;
};

export type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

export type SubjectGoal = {
  rank?: number | null;
  level?: Level | null;
};

export type LongTermGoals = {
  total_class_rank?: number | null;
  total_grade_rank?: number | null;
  total_city_rank?: number | null;
  subjects?: Partial<Record<Subject, SubjectGoal>>;
  note?: string | null;
};

export type TotalStudents = {
  class?: number | null;
  grade?: number | null;
  city?: number | null;
};

export type UserAiConfig = {
  endpoint?: string | null;
  api_key_enc?: string | null;
  model?: string | null;
};

export type Settings = {
  user_id: string;
  enabled_minor_subjects: MinorSubject[];
  subject_order: Subject[];
  long_term_goals: LongTermGoals;
  total_students: TotalStudents;
  trend_chart_default_dimension: TrendDimension;
  trend_chart_show_goal_line: boolean;
  trend_chart_show_data_labels: boolean;
  trend_chart_show_count: number;
  trend_chart_x_axis: "date" | "name_date";
  trend_chart_dual_axis: boolean;
  home_density: HomeDensity;
  theme_mode: ThemeMode;
  accent_colors: boolean;
  anomaly_multiplier: number;
  anomaly_abs_threshold: number | null;
  suggestion_gap_weight: number;
  suggestion_corr_weight: number;
  ai_auto_summary: boolean;
  ai_temperature: number;
  user_ai: UserAiConfig;
  updated_at?: string;
};

export type SubjectScore = {
  id?: string;
  exam_id: string;
  user_id: string;
  subject: Subject;
  score: number | null;
  class_avg: number | null;
  level: Level | null;
  class_rank: number | null;
  grade_rank: number | null;
  city_rank: number | null;
};

export type Exam = {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string;
  total_class_rank: number | null;
  total_grade_rank: number | null;
  total_city_rank: number | null;
  created_at: string;
  updated_at: string;
  subject_scores?: SubjectScore[];
};

export type Note = {
  id: string;
  user_id: string;
  exam_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ExamImage = {
  id: string;
  user_id: string;
  exam_id: string;
  image_url: string;
  created_at: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Anomaly = {
  examId: string;
  examName: string;
  examDate: string;
  scope: "total" | Subject;
  dimension: RankDimension;
  delta: number;
  threshold: number;
  message: string;
};

export type SubjectImpact = {
  subject: Subject;
  subjectDelta: number | null;
  totalDelta: number | null;
  contribution: number | null;
};

export type CorrelationItem = {
  subject: Subject;
  coefficient: number | null;
  n: number;
  label: "高度相关" | "中度相关" | "低度相关" | "数据不足";
  points: { examId: string; examName: string; x: number; y: number }[];
};

export type SuggestionItem = {
  subject: Subject;
  currentRank: number | null;
  targetRank: number | null;
  gap: number | null;
  volatility: number | null;
  correlation: number | null;
  score: number | null;
};

export type GoalRow = {
  key: string;
  label: string;
  current: number | string | null;
  target: number | string | null;
  gapText: string | null;
  progress: number | null;
  kind: "rank" | "level";
};

export type RuleAnalysis = {
  anomalies: Anomaly[];
  impacts: SubjectImpact[];
  correlations: CorrelationItem[];
  suggestions: SuggestionItem[];
  goals: GoalRow[];
  summaries: string[];
};
