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
  const totals = [
    { label: "班级", rank: exam.total_class_rank, prevRank: prev?.total_class_rank },
    { label: "年级", rank: exam.total_grade_rank, prevRank: prev?.total_grade_rank },
    { label: "全市", rank: exam.total_city_rank, prevRank: prev?.total_city_rank },
  ];
  const visibleTotals = totals.filter((t) => t.rank != null);
  const subjectRows = subjects.flatMap((s) => {
    const cur = exam.subject_scores?.find((x) => x.subject === s);
    if (!cur) return [];
    const hasValue = cur.score != null || cur.level != null || cur.grade_rank != null || cur.class_rank != null || cur.city_rank != null;
    return hasValue ? [{ subject: s, score: cur }] : [];
  });
  const hasData = visibleTotals.length > 0 || subjectRows.length > 0;
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
      {!hasData ? (
        <p className="empty">当前暂无数据</p>
      ) : (
        <>
          {visibleTotals.map((t) => (
            <div className="kpi" key={t.label}>
              <span>
                {t.label} {formatRank(t.rank)}
              </span>
              <Delta value={rankDelta(t.rank, t.prevRank)} />
            </div>
          ))}
          {open ? (
            <div className="section">
              {subjectRows.map(({ subject: s, score: cur }) => {
                const old = prev?.subject_scores?.find((x) => x.subject === s);
                return (
                  <div className="kpi" key={s}>
                    <span>
                      {s} {cur.score ?? cur.level ?? "—"}
                      {cur.level ? `（${assignedScore(cur.level)}）` : ""} · 年级 {formatRank(cur.grade_rank ?? null)}
                    </span>
                    <Delta value={rankDelta(cur.grade_rank ?? null, old?.grade_rank ?? null)} />
                  </div>
                );
              })}
            </div>
          ) : null}
          {subjectRows.length ? (
            <button className="btn ghost mt-sm" type="button" onClick={() => setOpen((v) => !v)}>
              {open ? "收起" : "展开各科"}
            </button>
          ) : null}
        </>
      )}
    </article>
  );
}
