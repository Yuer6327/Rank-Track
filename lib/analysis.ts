import {
  LEVELS,
  MAJOR_SUBJECTS,
  type Anomaly,
  type CorrelationItem,
  type Exam,
  type GoalRow,
  type RankDimension,
  type RuleAnalysis,
  type Settings,
  type Subject,
  type SubjectImpact,
  type SuggestionItem,
} from "./types";
import { assignedScore, dimensionLabel, levelIndex, meanAbs, pearson, percentOf, stdev } from "./utils";

function scoreOf(exam: Exam, subject: Subject) {
  return exam.subject_scores?.find((s) => s.subject === subject);
}

function totalRank(exam: Exam, dim: RankDimension) {
  if (dim === "class") return exam.total_class_rank;
  if (dim === "city") return exam.total_city_rank;
  return exam.total_grade_rank;
}

function subjectRank(exam: Exam, subject: Subject, dim: RankDimension) {
  const s = scoreOf(exam, subject);
  if (!s) return null;
  if (dim === "class") return s.class_rank;
  if (dim === "city") return s.city_rank;
  return s.grade_rank;
}

function preferredDim(settings: Settings): RankDimension {
  if (settings.trend_chart_default_dimension === "class_rank") return "class";
  if (settings.trend_chart_default_dimension === "city_rank") return "city";
  return "grade";
}

function enabledSubjects(settings: Settings): Subject[] {
  const minors = new Set(settings.enabled_minor_subjects);
  const order = settings.subject_order?.length
    ? settings.subject_order
    : ([...MAJOR_SUBJECTS, ...settings.enabled_minor_subjects] as Subject[]);
  return order.filter((s) => (MAJOR_SUBJECTS as readonly string[]).includes(s) || minors.has(s as never));
}

export function detectAnomalies(exams: Exam[], settings: Settings): Anomaly[] {
  const dim = preferredDim(settings);
  const multiplier = settings.anomaly_multiplier || 1.5;
  const abs = settings.anomaly_abs_threshold;
  const out: Anomaly[] = [];
  const subjects = ["__total__", ...enabledSubjects(settings)] as const;

  for (const scope of subjects) {
    const series = exams.map((e) => ({
      exam: e,
      value: scope === "__total__" ? totalRank(e, dim) : subjectRank(e, scope, dim),
    }));
    const deltas: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1].value;
      const b = series[i].value;
      if (a != null && b != null) deltas.push(b - a);
    }
    const avg = meanAbs(deltas) ?? 0;
    const threshold = Math.max(1, avg * multiplier, abs ?? 0);
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1].value;
      const b = series[i].value;
      if (a == null || b == null) continue;
      const delta = b - a;
      if (Math.abs(delta) >= threshold && Math.abs(delta) > 0) {
        const exam = series[i].exam;
        const label = scope === "__total__" ? "总分" : scope;
        const dir = delta > 0 ? "下降" : "上升";
        out.push({
          examId: exam.id,
          examName: exam.exam_name,
          examDate: exam.exam_date,
          scope: scope === "__total__" ? "total" : scope,
          dimension: dim,
          delta,
          threshold,
          message: `${exam.exam_name} ${label}${dimensionLabel(dim)}排名较上次${dir} ${Math.abs(delta)} 名`,
        });
      }
    }
  }
  return out.slice(-20).reverse();
}

export function subjectImpacts(exams: Exam[], settings: Settings): SubjectImpact[] {
  if (exams.length < 2) return [];
  const dim = preferredDim(settings);
  const latest = exams[exams.length - 1];
  const prev = exams[exams.length - 2];
  const totalDelta =
    totalRank(latest, dim) != null && totalRank(prev, dim) != null
      ? (totalRank(latest, dim) as number) - (totalRank(prev, dim) as number)
      : null;
  return enabledSubjects(settings)
    .map((subject) => {
      const a = subjectRank(prev, subject, dim);
      const b = subjectRank(latest, subject, dim);
      const subjectDelta = a != null && b != null ? b - a : null;
      let contribution: number | null = null;
      if (subjectDelta != null && totalDelta != null && totalDelta !== 0) {
        contribution = subjectDelta / Math.abs(totalDelta);
      } else if (subjectDelta != null) {
        contribution = subjectDelta;
      }
      return { subject, subjectDelta, totalDelta, contribution };
    })
    .sort((x, y) => Math.abs(y.contribution ?? 0) - Math.abs(x.contribution ?? 0));
}

export function correlations(exams: Exam[], settings: Settings): CorrelationItem[] {
  const dim = preferredDim(settings);
  const enough = exams.length >= 5;
  return enabledSubjects(settings).map((subject) => {
    const points: CorrelationItem["points"] = [];
    for (const exam of exams) {
      const x = subjectRank(exam, subject, dim);
      const y = totalRank(exam, dim);
      if (x != null && y != null) points.push({ examId: exam.id, examName: exam.exam_name, x, y });
    }
    if (!enough || points.length < 5) {
      return {
        subject,
        coefficient: null,
        n: points.length,
        label: "数据不足",
        points,
      };
    }
    const r = pearson(
      points.map((p) => p.x),
      points.map((p) => p.y),
    );
    const abs = r == null ? 0 : Math.abs(r);
    const label = r == null ? "数据不足" : abs >= 0.8 ? "高度相关" : abs >= 0.5 ? "中度相关" : "低度相关";
    return { subject, coefficient: r, n: points.length, label, points };
  });
}

export function suggestions(
  exams: Exam[],
  settings: Settings,
  corr: CorrelationItem[],
): SuggestionItem[] {
  const dim = preferredDim(settings);
  const latest = exams[exams.length - 1];
  const goals = settings.long_term_goals?.subjects ?? {};
  const gapW = settings.suggestion_gap_weight ?? 0.6;
  const corrW = settings.suggestion_corr_weight ?? 0.4;
  const items = enabledSubjects(settings).map((subject) => {
    const currentRank = latest ? subjectRank(latest, subject, dim) : null;
    const targetRank = goals[subject]?.rank ?? null;
    const gap = currentRank != null && targetRank != null ? currentRank - targetRank : null;
    const hist = exams
      .map((e) => subjectRank(e, subject, dim))
      .filter((n): n is number => n != null);
    const volatility = stdev(hist);
    const correlation = corr.find((c) => c.subject === subject)?.coefficient ?? null;
    let score: number | null = null;
    if (gap != null) {
      const gapPart = Math.max(0, gap);
      const corrPart = correlation != null ? Math.abs(correlation) : 0;
      const maxGap = Math.max(1, ...enabledSubjects(settings).map((s) => {
        const cur = latest ? subjectRank(latest, s, dim) : null;
        const tgt = goals[s]?.rank ?? null;
        return cur != null && tgt != null ? Math.max(0, cur - tgt) : 0;
      }));
      score = (gapPart / maxGap) * gapW + corrPart * corrW;
    }
    return { subject, currentRank, targetRank, gap, volatility, correlation, score };
  });
  return items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

export function goalRows(exams: Exam[], settings: Settings): GoalRow[] {
  const latest = exams[exams.length - 1];
  const rows: GoalRow[] = [];
  const totals = settings.total_students ?? {};
  const g = settings.long_term_goals ?? {};
  const addRank = (
    key: string,
    label: string,
    current: number | null | undefined,
    target: number | null | undefined,
    total: number | null | undefined,
  ) => {
    if (target == null) return;
    const gap = current != null ? current - target : null;
    const pctNow = percentOf(current ?? null, total ?? null);
    const pctTarget = percentOf(target, total ?? null);
    let progress: number | null = null;
    if (current != null && target != null) {
      const worst = total ?? Math.max(current, target) * 2;
      progress = ((worst - current) / Math.max(1, worst - target)) * 100;
      progress = Math.max(0, Math.min(100, progress));
    }
    rows.push({
      key,
      label,
      current: current ?? null,
      target,
      gapText:
        gap == null
          ? "当前暂无数据"
          : `${gap > 0 ? "差" : gap < 0 ? "超出" : "已达"} ${Math.abs(gap)} 名${
              pctNow != null && pctTarget != null ? ` / ${Math.abs(pctNow - pctTarget).toFixed(1)}%` : ""
            }`,
      progress,
      kind: "rank",
    });
  };

  addRank("total-class", "总分 · 班级", latest?.total_class_rank, g.total_class_rank, totals.class);
  addRank("total-grade", "总分 · 年级", latest?.total_grade_rank, g.total_grade_rank, totals.grade);
  addRank("total-city", "总分 · 全市", latest?.total_city_rank, g.total_city_rank, totals.city);

  for (const subject of enabledSubjects(settings)) {
    const sg = g.subjects?.[subject];
    if (!sg) continue;
    const sc = latest ? scoreOf(latest, subject) : undefined;
    if (sg.rank != null) {
      addRank(`${subject}-rank`, `${subject} · 年级排名`, sc?.grade_rank ?? sc?.class_rank ?? sc?.city_rank, sg.rank, totals.grade);
    }
    if (sg.level) {
      const cur = sc?.level ?? null;
      const curIdx = levelIndex(cur);
      const tgtIdx = levelIndex(sg.level);
      const gap = curIdx != null && tgtIdx != null ? curIdx - tgtIdx : null;
      const progress =
        curIdx != null && tgtIdx != null ? ((LEVELS.length - 1 - curIdx) / Math.max(1, LEVELS.length - 1 - tgtIdx)) * 100 : null;
      rows.push({
        key: `${subject}-level`,
        label: `${subject} · 等级`,
        current: cur,
        target: sg.level,
        gapText:
          gap == null ? "当前暂无数据" : `${cur ?? "—"} → ${sg.level}，差 ${Math.abs(gap)} 档`,
        progress: progress == null ? null : Math.max(0, Math.min(100, progress)),
        kind: "level",
      });
    }
  }
  return rows;
}

export function summaries(analysis: Omit<RuleAnalysis, "summaries">): string[] {
  const lines: string[] = [];
  if (analysis.anomalies[0]) lines.push(analysis.anomalies[0].message);
  const drag = analysis.impacts.find((i) => (i.subjectDelta ?? 0) > 0);
  const lift = analysis.impacts.find((i) => (i.subjectDelta ?? 0) < 0);
  if (drag && drag.subjectDelta != null) {
    lines.push(`本次主要拖累：${drag.subject}（排名变化 ${drag.subjectDelta > 0 ? "+" : ""}${drag.subjectDelta}）`);
  } else if (lift && lift.subjectDelta != null) {
    lines.push(`本次主要拉动：${lift.subject}（排名进步 ${Math.abs(lift.subjectDelta)}）`);
  }
  const topCorr = analysis.correlations.find((c) => c.coefficient != null);
  if (topCorr && topCorr.coefficient != null) {
    lines.push(`${topCorr.subject} 与总分排名${topCorr.label}（r=${topCorr.coefficient.toFixed(2)}）`);
  }
  const goal = analysis.goals[0];
  if (goal?.gapText) lines.push(`${goal.label}：${goal.gapText}`);
  if (!lines.length) lines.push("数据还不多，先录入几次考试就能看到趋势与分析。");
  return lines.slice(0, 3);
}

export function runAnalysis(exams: Exam[], settings: Settings): RuleAnalysis {
  const sorted = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const anomalies = detectAnomalies(sorted, settings);
  const impacts = subjectImpacts(sorted, settings);
  const corrs = correlations(sorted, settings);
  const sugg = suggestions(sorted, settings, corrs);
  const goals = goalRows(sorted, settings);
  const base = { anomalies, impacts, correlations: corrs, suggestions: sugg, goals, summaries: [] as string[] };
  return { ...base, summaries: summaries(base) };
}

export function compactHistory(exams: Exam[], settings: Settings) {
  const dim = preferredDim(settings);
  return exams.slice(-10).map((exam) => {
    const subjects: Record<string, number> = {};
    for (const s of enabledSubjects(settings)) {
      const r = subjectRank(exam, s, dim);
      if (r != null) subjects[s] = r;
    }
    return {
      exam: exam.exam_name,
      date: exam.exam_date,
      total_rank: { [dim]: totalRank(exam, dim) },
      subjects_rank: subjects,
    };
  });
}

export function latestFull(exam: Exam | undefined, settings: Settings) {
  if (!exam) return null;
  const subjects: Record<string, unknown> = {};
  for (const s of enabledSubjects(settings)) {
    const sc = scoreOf(exam, s);
    if (!sc) continue;
    subjects[s] = {
      score: sc.score,
      level: sc.level,
      assigned: assignedScore(sc.level),
      class_rank: sc.class_rank,
      grade_rank: sc.grade_rank,
      city_rank: sc.city_rank,
    };
  }
  return {
    exam: exam.exam_name,
    date: exam.exam_date,
    total_ranks: {
      class: exam.total_class_rank,
      grade: exam.total_grade_rank,
      city: exam.total_city_rank,
    },
    subjects,
  };
}

export { preferredDim, enabledSubjects, totalRank, subjectRank, scoreOf };
