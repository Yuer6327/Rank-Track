"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enabledSubjects } from "@/lib/analysis";
import { LEVELS, MAJOR_SUBJECTS, type Exam, type Settings, type Subject, type SubjectScore } from "@/lib/types";
import { sanitizeDecimal, sanitizeDigits, sanitizeRank, sanitizeScoreFields } from "@/lib/validate";

type CellKey =
  | "exam_name"
  | "exam_date"
  | "total_class_rank"
  | "total_grade_rank"
  | "total_city_rank"
  | `${Subject}:${"score" | "class_avg" | "level" | "class_rank" | "grade_rank" | "city_rank"}`;

// 分数/班均允许小数，其余数值列只收整数
const DECIMAL_KEYS = new RegExp(`:(score|class_avg)$`);
// 失焦自动保存的节流间隔
const SAVE_THROTTLE_MS = 3000;
// 模块级取时：避免组件作用域内直接调用 Date.now 触发纯度检查
const nowMs = () => Date.now();

type FieldRow = { key: CellKey; label: string; group?: boolean };

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
          class_avg: null,
          level: null,
          class_rank: null,
          grade_rank: null,
          city_rank: null,
        };
  if (field === "level") cur.level = (value || null) as SubjectScore["level"];
  else if (field === "score" || field === "class_avg") cur[field] = value === "" ? null : Number(value);
  else if (field === "class_rank" || field === "grade_rank" || field === "city_rank") {
    cur[field] = value === "" ? null : Number(value);
  }
  if (i >= 0) scores[i] = cur;
  else scores.push(cur);
  return { ...exam, subject_scores: scores };
}

function applyCell(exam: Exam, key: CellKey, value: string): Exam {
  // 数值行输入时过滤：分数/班均放行小数点，排名只放行数字
  if (key !== "exam_name" && key !== "exam_date" && !key.endsWith(":level")) {
    value = DECIMAL_KEYS.test(key) ? sanitizeDecimal(value) : sanitizeDigits(value);
  }
  if (key === "exam_name") return { ...exam, exam_name: value };
  if (key === "exam_date") return { ...exam, exam_date: value };
  if (key === "total_class_rank") return { ...exam, total_class_rank: value === "" ? null : Number(value) };
  if (key === "total_grade_rank") return { ...exam, total_grade_rank: value === "" ? null : Number(value) };
  if (key === "total_city_rank") return { ...exam, total_city_rank: value === "" ? null : Number(value) };
  const [subject, field] = key.split(":") as [
    Subject,
    "score" | "class_avg" | "level" | "class_rank" | "grade_rank" | "city_rank",
  ];
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
  const tableRef = useRef<HTMLTableElement>(null);
  // 失焦保存节流：3 秒最多保存一次，未保存的列记入 dirty 集合
  const dirtyRef = useRef<Set<number>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveAtRef = useRef(0);

  // 转置布局：一次考试一列，字段做行；总分三行置顶，group 标记门类首行（渲染粗分隔线）
  const fieldRows = useMemo<FieldRow[]>(() => {
    const rows: FieldRow[] = [
      { key: "exam_name", label: "考试名称" },
      { key: "exam_date", label: "日期" },
      { key: "total_class_rank", label: "总分班排", group: true },
      { key: "total_grade_rank", label: "总分年排" },
      { key: "total_city_rank", label: "总分市排" },
    ];
    for (const s of subjects) {
      if ((MAJOR_SUBJECTS as readonly string[]).includes(s)) {
        rows.push(
          { key: `${s}:score`, label: `${s}分数`, group: true },
          { key: `${s}:class_avg`, label: `${s}班均` },
          { key: `${s}:class_rank`, label: `${s}班排` },
          { key: `${s}:grade_rank`, label: `${s}年排` },
          { key: `${s}:city_rank`, label: `${s}市排` },
        );
      } else {
        rows.push(
          { key: `${s}:level`, label: `${s}等级`, group: true },
          { key: `${s}:class_avg`, label: `${s}班均` },
          { key: `${s}:class_rank`, label: `${s}班排` },
          { key: `${s}:grade_rank`, label: `${s}年排` },
          { key: `${s}:city_rank`, label: `${s}市排` },
        );
      }
    }
    return rows;
  }, [subjects]);

  function getValue(exam: Exam, key: CellKey): string {
    if (key === "exam_name") return exam.exam_name ?? "";
    if (key === "exam_date") return exam.exam_date ?? "";
    if (key === "total_class_rank") return exam.total_class_rank?.toString() ?? "";
    if (key === "total_grade_rank") return exam.total_grade_rank?.toString() ?? "";
    if (key === "total_city_rank") return exam.total_city_rank?.toString() ?? "";
    const [subject, field] = key.split(":") as [
      Subject,
      "score" | "class_avg" | "level" | "class_rank" | "grade_rank" | "city_rank",
    ];
    const sc = exam.subject_scores?.find((s) => s.subject === subject);
    const v = sc?.[field];
    return v == null ? "" : String(v);
  }

  async function doSave(ci: number) {
    const exam = rowsRef.current[ci];
    dirtyRef.current.delete(ci);
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
    // 本地列同步为清洗后的值，避免界面与库中数据不一致
    const clean: Exam = {
      ...exam,
      total_class_rank: payload.total_class_rank,
      total_grade_rank: payload.total_grade_rank,
      total_city_rank: payload.total_city_rank,
      subject_scores: payload.subject_scores,
    };
    const fixed = JSON.stringify(clean) !== JSON.stringify(exam);
    if (fixed) setRows((prev) => prev.map((r, i) => (i === ci ? clean : r)));
    const res = await fetch(exam.id ? `/api/exams/${exam.id}` : "/api/exams", {
      method: exam.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "服务器错误");
      return;
    }
    if (!exam.id && data.exam?.id) {
      setRows((prev) => prev.map((r, i) => (i === ci ? data.exam : r)));
    }
    setMsg(fixed ? "已自动修正无效输入（分数/班均 0–150 可含小数，排名为正整数）并保存" : "已保存");
    router.refresh();
  }

  function flushSaves() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const targets = [...dirtyRef.current];
    dirtyRef.current.clear();
    lastSaveAtRef.current = nowMs();
    targets.forEach((ci) => void doSave(ci));
  }

  function scheduleSave(ci: number) {
    dirtyRef.current.add(ci);
    if (saveTimerRef.current) return;
    const wait = Math.max(0, SAVE_THROTTLE_MS - (nowMs() - lastSaveAtRef.current));
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSaves();
    }, wait);
  }

  function manualSave() {
    if (!dirtyRef.current.size) {
      setMsg("没有需要保存的修改");
      return;
    }
    flushSaves();
  }

  // 卸载前把未落库的改动立即保存，避免 3 秒窗口内的编辑丢失
  const doSaveRef = useRef(doSave);
  useEffect(() => {
    doSaveRef.current = doSave;
  });
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      dirtyRef.current.forEach((ci) => void doSaveRef.current(ci));
      dirtyRef.current.clear();
    },
    [],
  );

  async function removeColumn(exam: Exam, ci: number) {
    // 被删列不再待存；其余列先按删除前的索引立即落库，避免位移后错存
    dirtyRef.current.delete(ci);
    if (dirtyRef.current.size) flushSaves();
    if (exam.id) await fetch(`/api/exams/${exam.id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((_, i) => i !== ci));
    router.refresh();
  }

  // Tab 顺序：考试列内先从上到下，再换到右边一列（Shift 反向）
  function onCellKeyDown(e: React.KeyboardEvent, r: number, c: number) {
    if (e.key !== "Tab") return;
    const last = fieldRows.length - 1;
    let next: [number, number] | null = null;
    if (!e.shiftKey) {
      if (r < last) next = [c, r + 1];
      else if (c < rows.length - 1) next = [c + 1, 0];
    } else {
      if (r > 0) next = [c, r - 1];
      else if (c > 0) next = [c - 1, last];
    }
    if (!next) return;
    e.preventDefault();
    tableRef.current?.querySelector<HTMLElement>(`[data-cell="${next[0]}:${next[1]}"]`)?.focus();
  }

  // 粘贴块与表格同向：第 i 行文本落到第 c+i 列考试，第 j 个单元格落到第 r+j 行字段
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>, c: number, r: number) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const grid = text.replace(/\r/g, "").split("\n").filter((line, i, arr) => line.length || i < arr.length - 1);
    setRows((prev) => {
      const next = [...prev];
      grid.forEach((line, i) => {
        const cc = c + i;
        while (next.length <= cc) next.push(blankExam());
        const cells = line.split("\t");
        let exam = next[cc];
        cells.forEach((cell, j) => {
          const fr = fieldRows[r + j];
          if (fr) exam = applyCell(exam, fr.key, cell);
        });
        next[cc] = exam;
      });
      return next;
    });
  }

  function cellProps(r: number, c: number) {
    return {
      "data-cell": `${c}:${r}`,
      onBlur: () => scheduleSave(c),
      onKeyDown: (e: React.KeyboardEvent) => onCellKeyDown(e, r, c),
    };
  }

  return (
    <div className="stack">
      <div className="row">
        <button className="btn primary" type="button" onClick={() => setRows((p) => [...p, blankExam()])}>
          新增考试
        </button>
        <a className="btn" href="/api/template">
          下载模板
        </a>
        <button className="btn" type="button" onClick={manualSave} disabled={busy}>
          手动保存
        </button>
        <span className="muted">
          {msg}
          {busy ? " 保存中…" : ""}
        </span>
      </div>
      <div className="table-wrap">
        <table className="data transposed" ref={tableRef}>
          <tbody>
            {fieldRows.map((fr, ri) => (
              <tr key={fr.key} className={fr.group ? "group-start" : undefined}>
                <th scope="row">{fr.label}</th>
                {rows.map((exam, ci) => (
                  <td key={exam.id || `col-${ci}`}>
                    {String(fr.key).endsWith(":level") ? (
                      <select
                        {...cellProps(ri, ci)}
                        value={getValue(exam, fr.key)}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) => (i === ci ? applyCell(row, fr.key, e.target.value) : row)),
                          )
                        }
                      >
                        <option value="">—</option>
                        {LEVELS.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        {...cellProps(ri, ci)}
                        value={getValue(exam, fr.key)}
                        inputMode={
                          fr.key !== "exam_name" && fr.key !== "exam_date"
                            ? DECIMAL_KEYS.test(fr.key)
                              ? "decimal"
                              : "numeric"
                            : undefined
                        }
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) => (i === ci ? applyCell(row, fr.key, e.target.value) : row)),
                          )
                        }
                        onPaste={(e) => onPaste(e, ci, ri)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="group-start">
              <th scope="row">操作</th>
              {rows.map((exam, ci) => (
                <td key={exam.id || `op-${ci}`}>
                  <button className="btn ghost" type="button" onClick={() => removeColumn(exam, ci)}>
                    删除
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
