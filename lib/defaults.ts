import {
  MAJOR_SUBJECTS,
  type MinorSubject,
  type Settings,
  type Subject,
} from "./types";

export const DEFAULT_MINORS: MinorSubject[] = ["物理", "化学", "生物"];

export function defaultSubjectOrder(minors: MinorSubject[]): Subject[] {
  return [...MAJOR_SUBJECTS, ...minors];
}

export function defaultSettings(userId: string, partial?: Partial<Settings>): Settings {
  const minors = partial?.enabled_minor_subjects ?? DEFAULT_MINORS;
  return {
    user_id: userId,
    enabled_minor_subjects: minors,
    subject_order: partial?.subject_order ?? defaultSubjectOrder(minors),
    long_term_goals: partial?.long_term_goals ?? {},
    total_students: partial?.total_students ?? {},
    trend_chart_default_dimension: partial?.trend_chart_default_dimension ?? "grade_rank",
    trend_chart_show_goal_line: partial?.trend_chart_show_goal_line ?? true,
    trend_chart_show_data_labels: partial?.trend_chart_show_data_labels ?? true,
    trend_chart_show_count: partial?.trend_chart_show_count ?? 10,
    trend_chart_x_axis: partial?.trend_chart_x_axis ?? "date",
    trend_chart_dual_axis: partial?.trend_chart_dual_axis ?? false,
    home_density: partial?.home_density ?? "compact",
    theme_mode: partial?.theme_mode ?? "system",
    accent_colors: partial?.accent_colors ?? true,
    anomaly_multiplier: partial?.anomaly_multiplier ?? 1.5,
    anomaly_abs_threshold: partial?.anomaly_abs_threshold ?? null,
    suggestion_gap_weight: partial?.suggestion_gap_weight ?? 0.6,
    suggestion_corr_weight: partial?.suggestion_corr_weight ?? 0.4,
    ai_auto_summary: partial?.ai_auto_summary ?? true,
    ai_temperature: partial?.ai_temperature ?? 0.7,
    user_ai: partial?.user_ai ?? {},
    updated_at: partial?.updated_at,
  };
}
