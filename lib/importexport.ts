import * as XLSX from "xlsx";
import { MAJOR_SUBJECTS, MINOR_SUBJECTS, type Exam, type MinorSubject, type Subject } from "./types";
import { isLevel, safeInt, safeNumber, uniqueKey } from "./utils";

export type SheetRow = {
  exam_name: string;
  exam_date: string;
  total_class_rank: number | null;
  total_grade_rank: number | null;
  total_city_rank: number | null;
  subjects: Record<
    string,
    {
      score: number | null;
      level: string | null;
      class_rank: number | null;
      grade_rank: number | null;
      city_rank: number | null;
    }
  >;
  filledCount: number;
};

export type DiffItem = {
  key: string;
  kind: "create" | "update" | "skip" | "sparse";
  incoming: SheetRow;
  existing?: Exam;
};

export function enabledMinors(minors: MinorSubject[]) {
  return MINOR_SUBJECTS.filter((s) => minors.includes(s));
}

export function templateHeaders(minors: MinorSubject[]) {
  const headers = ["考试名称", "考试日期"];
  for (const s of MAJOR_SUBJECTS) {
    headers.push(`${s}分数`, `${s}班级排名`, `${s}年级排名`, `${s}全市排名`);
  }
  for (const s of enabledMinors(minors)) {
    headers.push(`${s}等级`, `${s}班级排名`, `${s}年级排名`, `${s}全市排名`);
  }
  headers.push("总分班级排名", "总分年级排名", "总分全市排名");
  return headers;
}

export function buildTemplateWorkbook(minors: MinorSubject[]) {
  const headers = templateHeaders(minors);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const levels = "A+,A,B+,B,B-,C+,C,C-,D+,D,E";
  headers.forEach((h, i) => {
    if (h.endsWith("等级")) {
      for (let r = 1; r < 50; r++) {
        const cell = XLSX.utils.encode_cell({ r, c: i });
        ws[cell] = ws[cell] || { t: "s", v: "" };
        ws[cell].z = "@";
      }
      if (!ws["!dataValidation"]) ws["!dataValidation"] = [];
    }
    void levels;
  });
  ws["!cols"] = headers.map(() => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "成绩");
  const note = XLSX.utils.aoa_to_sheet([
    ["填写说明"],
    ["1. 日期格式 YYYY-MM-DD"],
    ["2. 所有字段可留空"],
    ["3. 小三门等级：A+ / A / B+ / B / B- / C+ / C / C- / D+ / D / E"],
    ["4. 考试名称 + 日期相同视为同一场考试，导入时合并填充（空字段才覆盖）"],
  ]);
  XLSX.utils.book_append_sheet(wb, note, "说明");
  return wb;
}

function cell(row: Record<string, unknown>, key: string) {
  const v = row[key];
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export function parseSheet(buffer: ArrayBuffer, minors: MinorSubject[]): SheetRow[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  const rows: SheetRow[] = [];
  for (const raw of json) {
    const exam_name = cell(raw, "考试名称") ?? "";
    let exam_date = cell(raw, "考试日期") ?? "";
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(exam_date)) {
      const [y, m, d] = exam_date.split("/");
      exam_date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (!exam_name && !exam_date) continue;
    const subjects: SheetRow["subjects"] = {};
    let filled = 0;
    const bump = (v: unknown) => {
      if (v != null && v !== "") filled += 1;
      return v;
    };
    for (const s of MAJOR_SUBJECTS) {
      const score = safeNumber(bump(raw[`${s}分数`]));
      const class_rank = safeInt(bump(raw[`${s}班级排名`]));
      const grade_rank = safeInt(bump(raw[`${s}年级排名`]));
      const city_rank = safeInt(bump(raw[`${s}全市排名`]));
      subjects[s] = { score, level: null, class_rank, grade_rank, city_rank };
    }
    for (const s of enabledMinors(minors)) {
      const lv = cell(raw, `${s}等级`);
      if (lv) filled += 1;
      subjects[s] = {
        score: null,
        level: lv && isLevel(lv) ? lv : lv,
        class_rank: safeInt(bump(raw[`${s}班级排名`])),
        grade_rank: safeInt(bump(raw[`${s}年级排名`])),
        city_rank: safeInt(bump(raw[`${s}全市排名`])),
      };
    }
    const total_class_rank = safeInt(bump(raw["总分班级排名"]));
    const total_grade_rank = safeInt(bump(raw["总分年级排名"]));
    const total_city_rank = safeInt(bump(raw["总分全市排名"]));
    if (exam_name) filled += 1;
    if (exam_date) filled += 1;
    rows.push({
      exam_name,
      exam_date,
      total_class_rank,
      total_grade_rank,
      total_city_rank,
      subjects,
      filledCount: filled,
    });
  }
  return rows;
}

export function diffRows(incoming: SheetRow[], existing: Exam[]): DiffItem[] {
  const map = new Map(existing.map((e) => [uniqueKey(e.exam_name, e.exam_date), e]));
  return incoming.map((row) => {
    const key = uniqueKey(row.exam_name, row.exam_date);
    const prev = map.get(key);
    const sparse = row.filledCount <= 3;
    if (!prev) return { key, kind: sparse ? "sparse" : "create", incoming: row };
    return { key, kind: sparse ? "sparse" : "update", incoming: row, existing: prev };
  });
}

export function examsToAoA(exams: Exam[], minors: MinorSubject[], scope: "all" | "rank" | "score" = "all") {
  const headers = templateHeaders(minors);
  const rows = exams.map((exam) => {
    const line: (string | number | null)[] = [exam.exam_name, exam.exam_date];
    const pick = (s: Subject) => exam.subject_scores?.find((x) => x.subject === s);
    for (const s of MAJOR_SUBJECTS) {
      const sc = pick(s);
      if (scope === "rank") line.push(null, sc?.class_rank ?? null, sc?.grade_rank ?? null, sc?.city_rank ?? null);
      else if (scope === "score") line.push(sc?.score ?? null, null, null, null);
      else line.push(sc?.score ?? null, sc?.class_rank ?? null, sc?.grade_rank ?? null, sc?.city_rank ?? null);
    }
    for (const s of enabledMinors(minors)) {
      const sc = pick(s);
      if (scope === "rank") line.push(null, sc?.class_rank ?? null, sc?.grade_rank ?? null, sc?.city_rank ?? null);
      else if (scope === "score") line.push(sc?.level ?? null, null, null, null);
      else line.push(sc?.level ?? null, sc?.class_rank ?? null, sc?.grade_rank ?? null, sc?.city_rank ?? null);
    }
    if (scope === "score") line.push(null, null, null);
    else line.push(exam.total_class_rank, exam.total_grade_rank, exam.total_city_rank);
    return line;
  });
  return [headers, ...rows];
}

export function workbookFromAoA(aoa: (string | number | null)[][], name = "成绩") {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name);
  return wb;
}

export function toCsv(aoa: (string | number | null)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  return XLSX.utils.sheet_to_csv(ws);
}
