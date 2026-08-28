"use client";

import Link from "next/link";
import { useState } from "react";
import { enabledSubjects } from "@/lib/analysis";
import type { Exam, Settings } from "@/lib/types";
import { assignedScore, formatRank, rankDelta } from "@/lib/utils";

function Delta({ value }: { value: number | null }) {
  if (value == null) return null;
  const cls = value > 0 ? "up" : value < 0 ? "down" : "";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return (
    <span className={cls}>
      {arrow}
      {Math.abs(value)}
    </span>
  );
}

export function ExamCard({
  exam,
  prev,
  settings,
}: {
  exam: Exam;
  prev?: Exam;
  settings: Settings;
}) {
  const [open, setOpen] = useState(false);
  const subjects = enabledSubjects(settings);
  return (
    <article className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h3 style={{ marginBottom: 2 }}>{exam.exam_name}</h3>
          <p className="muted">{exam.exam_date}</p>
        </div>
        <Link className="btn" href={`/exam/${exam.id}`}>
          详情
        </Link>
      </div>
      <div className="kpi">
        <span>班级 {formatRank(exam.total_class_rank)}</span>
        <Delta value={rankDelta(exam.total_class_rank, prev?.total_class_rank)} />
      </div>
      <div className="kpi">
        <span>年级 {formatRank(exam.total_grade_rank)}</span>
        <Delta value={rankDelta(exam.total_grade_rank, prev?.total_grade_rank)} />
      </div>
      <div className="kpi">
        <span>全市 {formatRank(exam.total_city_rank)}</span>
        <Delta value={rankDelta(exam.total_city_rank, prev?.total_city_rank)} />
      </div>
      {open ? (
        <div className="section">
          {subjects.map((s) => {
            const cur = exam.subject_scores?.find((x) => x.subject === s);
            const old = prev?.subject_scores?.find((x) => x.subject === s);
            return (
              <div className="kpi" key={s}>
                <span>
                  {s} {cur?.score ?? cur?.level ?? "—"}
                  {cur?.level ? `（${assignedScore(cur.level)}）` : ""} · 年级 {formatRank(cur?.grade_rank ?? null)}
                </span>
                <Delta value={rankDelta(cur?.grade_rank ?? null, old?.grade_rank ?? null)} />
              </div>
            );
          })}
        </div>
      ) : null}
      <button className="btn ghost mt-sm" type="button" onClick={() => setOpen((v) => !v)}>
        {open ? "收起" : "展开各科"}
      </button>
    </article>
  );
}
