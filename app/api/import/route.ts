import { ApiError, fail, handleRouteError, json, requireUser } from "@/lib/api";
import {
  findExamByNameDate,
  getExam,
  getSettings,
  listExams,
  mergeExamScores,
  upsertExam,
  upsertNote,
  upsertSettings,
} from "@/lib/db";
import { defaultSettings } from "@/lib/defaults";
import { diffRows, parseSheet, type SheetRow } from "@/lib/importexport";
import { isLevel, safeInt, safeNumber } from "@/lib/utils";
import type { Subject } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const settings = await getSettings(user.id);
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const apply = String(form.get("apply") ?? "") === "1";
      const selected = String(form.get("keys") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!(file instanceof File)) return fail(400, "缺少文件");
      const rows = parseSheet(await file.arrayBuffer(), settings.enabled_minor_subjects);
      const exams = await listExams(user.id);
      const diffs = diffRows(rows, exams);
      if (!apply) return json({ diffs });
      const applied = [];
      for (const d of diffs) {
        if (selected.length && !selected.includes(d.key)) continue;
        applied.push(await applyRow(user.id, d.incoming));
      }
      return json({ applied: applied.length });
    }

    const body = (await req.json()) as { json?: unknown; apply?: boolean };
    if (!body.json) return fail(400, "缺少 JSON");
    if (!body.apply) return json({ preview: summarizeBackup(body.json) });
    await restoreBackup(user.id, body.json);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

async function applyRow(userId: string, row: SheetRow) {
  if (!row.exam_name || !row.exam_date) throw new ApiError(400, "考试名称和日期不能为空");
  const scores = Object.entries(row.subjects).map(([subject, v]) => ({
    subject: subject as Subject,
    score: safeNumber(v.score),
    level: v.level && isLevel(v.level) ? v.level : null,
    class_rank: safeInt(v.class_rank),
    grade_rank: safeInt(v.grade_rank),
    city_rank: safeInt(v.city_rank),
  }));
  const existingId = await findExamByNameDate(userId, row.exam_name, row.exam_date);
  if (existingId) {
    const exam = await getExam(userId, existingId);
    await upsertExam(
      userId,
      {
        exam_name: row.exam_name,
        exam_date: row.exam_date,
        total_class_rank: row.total_class_rank ?? exam?.total_class_rank ?? null,
        total_grade_rank: row.total_grade_rank ?? exam?.total_grade_rank ?? null,
        total_city_rank: row.total_city_rank ?? exam?.total_city_rank ?? null,
      },
      existingId,
    );
    return mergeExamScores(userId, existingId, scores);
  }
  return upsertExam(userId, {
    exam_name: row.exam_name,
    exam_date: row.exam_date,
    total_class_rank: row.total_class_rank,
    total_grade_rank: row.total_grade_rank,
    total_city_rank: row.total_city_rank,
    subject_scores: scores,
  });
}

function summarizeBackup(raw: unknown) {
  const data = raw as { exams?: unknown[]; notes?: unknown[]; settings?: unknown };
  return {
    exams: Array.isArray(data.exams) ? data.exams.length : 0,
    notes: Array.isArray(data.notes) ? data.notes.length : 0,
    hasSettings: Boolean(data.settings),
  };
}

async function restoreBackup(userId: string, raw: unknown) {
  const data = raw as {
    exams?: Array<{
      exam_name: string;
      exam_date: string;
      total_class_rank?: number | null;
      total_grade_rank?: number | null;
      total_city_rank?: number | null;
      subject_scores?: Array<{
        subject: Subject;
        score?: number | null;
        level?: string | null;
        class_rank?: number | null;
        grade_rank?: number | null;
        city_rank?: number | null;
      }>;
    }>;
    notes?: Array<{ exam_id?: string | null; content: string }>;
    settings?: Record<string, unknown>;
  };
  if (data.settings) {
    const current = await getSettings(userId);
    await upsertSettings(defaultSettings(userId, { ...current, ...data.settings, user_id: userId }));
  }
  for (const exam of data.exams ?? []) {
    const existingId = await findExamByNameDate(userId, exam.exam_name, exam.exam_date);
    await upsertExam(
      userId,
      {
        exam_name: exam.exam_name,
        exam_date: exam.exam_date,
        total_class_rank: exam.total_class_rank ?? null,
        total_grade_rank: exam.total_grade_rank ?? null,
        total_city_rank: exam.total_city_rank ?? null,
        subject_scores: (exam.subject_scores ?? []).map((s) => ({
          subject: s.subject,
          score: s.score ?? null,
          level: s.level && isLevel(s.level) ? s.level : null,
          class_rank: s.class_rank ?? null,
          grade_rank: s.grade_rank ?? null,
          city_rank: s.city_rank ?? null,
        })),
      },
      existingId ?? undefined,
    );
  }
  for (const note of data.notes ?? []) {
    if (note.content) await upsertNote(userId, { content: note.content, exam_id: null });
  }
}
