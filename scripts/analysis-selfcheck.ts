import { pearson, rankDelta, assignedScore } from "../lib/utils";
import { runAnalysis } from "../lib/analysis";
import { defaultSettings } from "../lib/defaults";
import type { Exam } from "../lib/types";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function exam(partial: Partial<Exam> & { id: string; exam_name: string; exam_date: string }): Exam {
  return {
    user_id: "u",
    created_at: "",
    updated_at: "",
    total_class_rank: null,
    total_grade_rank: null,
    total_city_rank: null,
    subject_scores: [],
    ...partial,
  };
}

const settings = defaultSettings("u", {
  long_term_goals: { total_grade_rank: 50, subjects: { 数学: { rank: 20 } } },
  total_students: { grade: 500 },
});

const exams: Exam[] = [
  exam({
    id: "1",
    exam_name: "一模",
    exam_date: "2026-01-01",
    total_grade_rank: 120,
    subject_scores: [
      { exam_id: "1", user_id: "u", subject: "数学", score: 130, level: null, class_rank: 10, grade_rank: 80, city_rank: null },
      { exam_id: "1", user_id: "u", subject: "物理", score: null, level: "A", class_rank: null, grade_rank: 90, city_rank: null },
    ],
  }),
  exam({
    id: "2",
    exam_name: "二模",
    exam_date: "2026-04-01",
    total_grade_rank: 90,
    subject_scores: [
      { exam_id: "2", user_id: "u", subject: "数学", score: 140, level: null, class_rank: 8, grade_rank: 40, city_rank: null },
      { exam_id: "2", user_id: "u", subject: "物理", score: null, level: "B+", class_rank: null, grade_rank: 200, city_rank: null },
    ],
  }),
  exam({
    id: "3",
    exam_name: "三模",
    exam_date: "2026-05-01",
    total_grade_rank: 70,
    subject_scores: [
      { exam_id: "3", user_id: "u", subject: "数学", score: 142, level: null, class_rank: 7, grade_rank: 30, city_rank: null },
      { exam_id: "3", user_id: "u", subject: "物理", score: null, level: "A+", class_rank: null, grade_rank: 50, city_rank: null },
    ],
  }),
  exam({
    id: "4",
    exam_name: "月考4",
    exam_date: "2026-06-01",
    total_grade_rank: 60,
    subject_scores: [
      { exam_id: "4", user_id: "u", subject: "数学", score: 145, level: null, class_rank: 5, grade_rank: 25, city_rank: null },
      { exam_id: "4", user_id: "u", subject: "物理", score: null, level: "A", class_rank: null, grade_rank: 40, city_rank: null },
    ],
  }),
  exam({
    id: "5",
    exam_name: "月考5",
    exam_date: "2026-07-01",
    total_grade_rank: 55,
    subject_scores: [
      { exam_id: "5", user_id: "u", subject: "数学", score: 146, level: null, class_rank: 4, grade_rank: 22, city_rank: null },
      { exam_id: "5", user_id: "u", subject: "物理", score: null, level: "A+", class_rank: null, grade_rank: 30, city_rank: null },
    ],
  }),
];

assert(assignedScore("A+") === 70, "A+ 赋分");
assert(rankDelta(50, 80) === 30, "进步为正");
assert(pearson([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])! > 0.99, "完全相关");

const analysis = runAnalysis(exams, settings);
assert(analysis.summaries.length > 0, "摘要");
assert(analysis.impacts[0], "单科影响");
assert(analysis.goals.some((g) => g.key === "total-grade"), "总分目标行");
assert(analysis.suggestions.some((s) => s.subject === "数学"), "数学建议");

const sparse = runAnalysis([], defaultSettings("u"));
assert(sparse.summaries.length === 1, "空数据不抛错");

console.log("ok", analysis.summaries);
