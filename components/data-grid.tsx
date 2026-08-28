"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enabledSubjects } from "@/lib/analysis";
import { LEVELS, MAJOR_SUBJECTS, type Exam, type Settings, type Subject, type SubjectScore } from "@/lib/types";
import { sanitizeDigits, sanitizeRank, sanitizeScoreFields } from "@/lib/validate";

type CellKey =
  | "exam_name"
  | "exam_date"
  | "total_class_rank"
  | "total_grade_rank"
  | "total_city_rank"
  | `${Subject}:${"score" | "level" | "class_rank" | "grade_rank" | "city_rank"}`;

function blankExam(): Exam {
  return {
    id: "",
    user_id: "",
    exam_name: "",
    exam_date: new Date().toISOString().slice(0, 10),
    total_class_rank: null,
    total_grade_rank: null,
    total_city_rank: null,
    created_at: "",
    updated_at: "",
    subject_scores: [],
  };
}

function patchScore(exam: Exam, subject: Subject, field: keyof SubjectScore, value: string): Exam {
  const scores = [...(exam.subject_scores ?? [])];
  const i = scores.findIndex((s) => s.subject === subject);
  const cur: SubjectScore =
    i >= 0
      ? { ...scores[i] }
      : {
          exam_id: exam.id,
          user_id: exam.user_id,
          subject,
          score: null,
          level: null,
          class_rank: null,
          grade_rank: null,
          city_rank: null,
        };
  if (field === "level") cur.level = (value || null) as SubjectScore["level"];
  else if (field === "score") cur.score = value === "" ? null : Number(value);
  else if (field === "class_rank" || field === "grade_rank" || field === "city_rank") {
    cur[field] = value === "" ? null : Number(value);
  }
  if (i >= 0) scores[i] = cur;
  else scores.push(cur);
  return { ...exam, subject_scores: scores };
}

function applyCell(exam: Exam, key: CellKey, value: string): Exam {
  // 数值列输入时只放行数字：防负号、小数点、字母和超长输入
  if (key !== "exam_name" && key !== "exam_date" && !key.endsWith(":level")) {
    value = sanitizeDigits(value);
  }
  if (key === "exam_name") return { ...exam, exam_name: value };
  if (key === "exam_date") return { ...exam, exam_date: value };
  if (key === "total_class_rank") return { ...exam, total_class_rank: value === "" ? null : Number(value) };
  if (key === "total_grade_rank") return { ...exam, total_grade_rank: value === "" ? null : Number(value) };
  if (key === "total_city_rank") return { ...exam, total_city_rank: value === "" ? null : Number(value) };
  const [subject, field] = key.split(":") as [Subject, "score" | "level" | "class_rank" | "grade_rank" | "city_rank"];
  return patchScore(exam, subject, field, value);
}

export function DataGrid({ exams, settings }: { exams: Exam[]; settings: Settings }) {
  const router = useRouter();
  const subjects = enabledSubjects(settings);
  const [rows, setRows] = useState<Exam[]>(() => (exams.length ? exams : [blankExam()]));
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const columns = useMemo(() => {
    const cols: { key: CellKey; label: string }[] = [
      { key: "exam_name", label: "考试名称" },
      { key: "exam_date", label: "日期" },
    ];
    for (const s of subjects) {
      if ((MAJOR_SUBJECTS as readonly string[]).includes(s)) {
        cols.push(
          { key: `${s}:score`, label: `${s}分数` },
          { key: `${s}:class_rank`, label: `${s}班排` },
          { key: `${s}:grade_rank`, label: `${s}年排` },
          { key: `${s}:city_rank`, label: `${s}市排` },
        );
      } else {
        cols.push(
          { key: `${s}:level`, label: `${s}等级` },
          { key: `${s}:class_rank`, label: `${s}班排` },
          { key: `${s}:grade_rank`, label: `${s}年排` },
          { key: `${s}:city_rank`, label: `${s}市排` },
        );
      }
    }
    cols.push(
      { key: "total_class_rank", label: "总分班排" },
      { key: "total_grade_rank", label: "总分年排" },
      { key: "total_city_rank", label: "总分市排" },
    );
    return cols;
  }, [subjects]);

  function getValue(exam: Exam, key: CellKey): string {
    if (key === "exam_name") return exam.exam_name ?? "";
    if (key === "exam_date") return exam.exam_date ?? "";
    if (key === "total_class_rank") return exam.total_class_rank?.toString() ?? "";
    if (key === "total_grade_rank") return exam.total_grade_rank?.toString() ?? "";
    if (key === "total_city_rank") return exam.total_city_rank?.toString() ?? "";
    const [subject, field] = key.split(":") as [Subject, "score" | "level" | "class_rank" | "grade_rank" | "city_rank"];
    const sc = exam.subject_scores?.find((s) => s.subject === subject);
    const v = sc?.[field];
    return v == null ? "" : String(v);
  }

  async function saveRow(ri: number) {
    const exam = rowsRef.current[ri];
    if (!exam || !exam.exam_name.trim() || !exam.exam_date) return;
    setBusy(true);
    const payload = {
      exam_name: exam.exam_name,
      exam_date: exam.exam_date,
      total_class_rank: sanitizeRank(exam.total_class_rank),
      total_grade_rank: sanitizeRank(exam.total_grade_rank),
      total_city_rank: sanitizeRank(exam.total_city_rank),
      subject_scores: (exam.subject_scores ?? []).map((s) => sanitizeScoreFields(s)),
    };
    // 本地行同步为清洗后的值，避免界面与库中数据不一致
    const clean: Exam = {
      ...exam,
      total_class_rank: payload.total_class_rank,
      total_grade_rank: payload.total_grade_rank,
      total_city_rank: payload.total_city_rank,
      subject_scores: payload.subject_scores,
    };
    const fixed = JSON.stringify(clean) !== JSON.stringify(exam);
    if (fixed) setRows((prev) => prev.map((r, i) => (i === ri ? clean : r)));
    const res = await fetch(exam.id ? `/api/exams/${exam.id}` : "/api/exams", {
      method: exam.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "保存失败");
      return;
    }
    if (!exam.id && data.exam?.id) {
      setRows((prev) => prev.map((r, i) => (i === ri ? data.exam : r)));
    }
    setMsg(fixed ? "已自动修正无效输入（分数 0–150 整数，排名为正整数）并保存" : "已保存");
    router.refresh();
  }

  async function removeRow(exam: Exam, index: number) {
    if (exam.id) await fetch(`/api/exams/${exam.id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((_, i) => i !== index));
    router.refresh();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const grid = text.replace(/\r/g, "").split("\n").filter((line, i, arr) => line.length || i < arr.length - 1);
    setRows((prev) => {
      const next = [...prev];
      grid.forEach((line, i) => {
        const rr = r + i;
        while (next.length <= rr) next.push(blankExam());
        const cells = line.split("\t");
        let exam = next[rr];
        cells.forEach((cell, j) => {
          const col = columns[c + j];
          if (col) exam = applyCell(exam, col.key, cell);
        });
        next[rr] = exam;
      });
      return next;
    });
  }

  return (
    <div className="stack">
      <div className="row">
        <button className="btn primary" type="button" onClick={() => setRows((p) => [...p, blankExam()])}>
          新增一行
        </button>
        <a className="btn" href="/api/template">
          下载模板
        </a>
        <span className="muted">
          {msg}
          {busy ? " 保存中…" : ""}
        </span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((exam, ri) => (
              <tr key={exam.id || `new-${ri}`}>
                {columns.map((c, ci) => (
                  <td key={c.key}>
                    {String(c.key).endsWith(":level") ? (
                      <select
                        value={getValue(exam, c.key)}
                        onChange={(e) =>
                          setRows((prev) => prev.map((row, i) => (i === ri ? applyCell(row, c.key, e.target.value) : row)))
                        }
                        onBlur={() => saveRow(ri)}
                      >
                        <option value="">—</option>
                        {LEVELS.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={getValue(exam, c.key)}
                        inputMode={c.key !== "exam_name" && c.key !== "exam_date" ? "numeric" : undefined}
                        onChange={(e) =>
                          setRows((prev) => prev.map((row, i) => (i === ri ? applyCell(row, c.key, e.target.value) : row)))
                        }
                        onPaste={(e) => onPaste(e, ri, ci)}
                        onBlur={() => saveRow(ri)}
                      />
                    )}
                  </td>
                ))}
                <td>
                  <button className="btn ghost" type="button" onClick={() => removeRow(exam, ri)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
