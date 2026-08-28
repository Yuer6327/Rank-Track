import { LEVEL_SCORE, LEVELS, type Level, type RankDimension } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function assignedScore(level: Level | null | undefined): number | null {
  if (!level || !isLevel(level)) return null;
  return LEVEL_SCORE[level];
}

export function levelIndex(level: Level | null | undefined): number | null {
  if (!level || !isLevel(level)) return null;
  return LEVELS.indexOf(level);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

export function safeInt(value: unknown): number | null {
  const n = safeNumber(value);
  if (n === null) return null;
  return Math.round(n);
}

export function percentOf(rank: number | null | undefined, total: number | null | undefined) {
  if (rank == null || total == null || total <= 0) return null;
  return (rank / total) * 100;
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatRank(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `第 ${value} 名`;
}

export function rankDelta(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) return null;
  return previous - current;
}

export function dimensionLabel(dim: RankDimension) {
  if (dim === "class") return "班级";
  if (dim === "city") return "全市";
  return "年级";
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function examLabel(name: string, date: string, mode: "date" | "name_date" = "date") {
  const d = formatDate(date);
  return mode === "name_date" ? `${name} ${d}` : d;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    syy += ys[i] * ys[i];
    sxy += xs[i] * ys[i];
  }
  const cov = sxy - (sx * sy) / n;
  const vx = sxx - (sx * sx) / n;
  const vy = syy - (sy * sy) / n;
  const den = Math.sqrt(vx * vy);
  if (!Number.isFinite(den) || den === 0) return null;
  const r = cov / den;
  if (!Number.isFinite(r)) return null;
  return clamp(r, -1, 1);
}

export function meanAbs(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + Math.abs(b), 0) / values.length;
}

export function stdev(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function truncate(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function uniqueKey(name: string, date: string) {
  return `${name.trim()}@@${date.slice(0, 10)}`;
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}
