import { clamp, isLevel, safeNumber } from "./utils";
import type { Level } from "./types";

// 数据填写护栏：分数 0–150 整数，排名为正整数
// 超界收敛到边界，非数字（NaN/Infinity/文本）一律清空
export const MAX_SCORE = 150;
export const MAX_RANK = 1_000_000;

export function sanitizeScore(value: unknown): number | null {
  const n = safeNumber(value);
  return n === null ? null : clamp(Math.round(n), 0, MAX_SCORE);
}

export function sanitizeRank(value: unknown): number | null {
  const n = safeNumber(value);
  if (n === null) return null;
  if (n < 1) return null;
  return Math.min(Math.round(n), MAX_RANK);
}

export function sanitizeLevel(value: unknown): Level | null {
  return isLevel(value) ? value : null;
}

// 输入时过滤：只保留数字，防负号、小数点、字母与超长输入
export function sanitizeDigits(value: string, maxLen = 7): string {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

type ScoreFields = {
  score?: unknown;
  level?: unknown;
  class_rank?: unknown;
  grade_rank?: unknown;
  city_rank?: unknown;
};

export function sanitizeScoreFields<T extends ScoreFields>(s: T): T {
  return {
    ...s,
    score: sanitizeScore(s.score),
    level: sanitizeLevel(s.level),
    class_rank: sanitizeRank(s.class_rank),
    grade_rank: sanitizeRank(s.grade_rank),
    city_rank: sanitizeRank(s.city_rank),
  };
}
