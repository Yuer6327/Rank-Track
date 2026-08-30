import { clamp, isLevel, safeNumber } from "./utils";
import type { Level } from "./types";

// 数据填写护栏：分数/班均 0–150（支持两位小数），排名为正整数
// 超界收敛到边界，非数字（NaN/Infinity/文本）一律清空
export const MAX_SCORE = 150;
export const MAX_RANK = 1_000_000;

export function sanitizeScore(value: unknown): number | null {
  const n = safeNumber(value);
  if (n === null) return null;
  return clamp(Math.round(n * 100) / 100, 0, MAX_SCORE);
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

// 输入时过滤：排名类只保留数字，防负号、小数点、字母与超长输入
export function sanitizeDigits(value: string, maxLen = 7): string {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

// 输入时过滤：分数类允许小数点（至多一位小数点、两位小数）
// 中文输入法的全角句号（。／．）归一化为小数点，避免中文状态下无法输入小数
export function sanitizeDecimal(value: string, maxLen = 7, maxDecimals = 2): string {
  let v = value
    .replace(/[。．]/g, ".")
    .replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot >= 0) {
    const intPart = v.slice(0, dot);
    const decPart = v.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals);
    v = `${intPart}.${decPart}`;
  }
  return v.slice(0, maxLen);
}

type ScoreFields = {
  score?: unknown;
  class_avg?: unknown;
  level?: unknown;
  class_rank?: unknown;
  grade_rank?: unknown;
  city_rank?: unknown;
};

export function sanitizeScoreFields<T extends ScoreFields>(s: T): T {
  return {
    ...s,
    score: sanitizeScore(s.score),
    class_avg: sanitizeScore(s.class_avg),
    level: sanitizeLevel(s.level),
    class_rank: sanitizeRank(s.class_rank),
    grade_rank: sanitizeRank(s.grade_rank),
    city_rank: sanitizeRank(s.city_rank),
  };
}
