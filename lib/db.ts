import { defaultSettings } from "./defaults";
import { getAdminClient, STORAGE_BUCKET, withTransientRetry } from "./supabase";
import { sanitizeLevel, sanitizeRank, sanitizeScoreFields } from "./validate";
import type {
  Exam,
  ExamImage,
  Note,
  Settings,
  SubjectScore,
  UserRow,
} from "./types";

export async function findUserByUsername(username: string) {
  return withTransientRetry(async () => {
    const { data, error } = await getAdminClient()
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    return data as UserRow | null;
  });
}

export async function findUserById(id: string) {
  return withTransientRetry(async () => {
    const { data, error } = await getAdminClient()
      .from("users")
      .select("id, username, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Pick<UserRow, "id" | "username" | "created_at"> | null;
  });
}

export async function createUser(username: string, passwordHash: string) {
  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ username, password_hash: passwordHash })
    .select("id, username, created_at")
    .single();
  if (error) throw error;
  const user = data as Pick<UserRow, "id" | "username" | "created_at">;
  await upsertSettings(defaultSettings(user.id));
  return user;
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  const { error } = await getAdminClient()
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", userId);
  if (error) throw error;
}

export async function getSettings(userId: string): Promise<Settings> {
  return withTransientRetry(async () => {
    const { data, error } = await getAdminClient()
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const created = defaultSettings(userId);
      await upsertSettings(created);
      return created;
    }
    return defaultSettings(userId, data as Partial<Settings>);
  });
}

export async function upsertSettings(settings: Settings) {
  const goals = settings.long_term_goals;
  // 人数与目标排名一并过护栏，防止 0 / 负数 / 超大数把百分比算成 Infinity
  const clean: Settings = {
    ...settings,
    total_students: {
      class: sanitizeRank(settings.total_students.class),
      grade: sanitizeRank(settings.total_students.grade),
      city: sanitizeRank(settings.total_students.city),
    },
    long_term_goals: {
      ...goals,
      total_class_rank: sanitizeRank(goals.total_class_rank),
      total_grade_rank: sanitizeRank(goals.total_grade_rank),
      total_city_rank: sanitizeRank(goals.total_city_rank),
      subjects: goals.subjects
        ? Object.fromEntries(
            Object.entries(goals.subjects).map(([k, v]) => [
              k,
              v ? { rank: sanitizeRank(v.rank), level: sanitizeLevel(v.level) } : v,
            ]),
          )
        : goals.subjects,
    },
  };
  const { error } = await getAdminClient().from("settings").upsert(
    {
      user_id: clean.user_id,
      enabled_minor_subjects: clean.enabled_minor_subjects,
      subject_order: clean.subject_order,
      long_term_goals: clean.long_term_goals,
      total_students: clean.total_students,
      trend_chart_default_dimension: settings.trend_chart_default_dimension,
      trend_chart_show_goal_line: settings.trend_chart_show_goal_line,
      trend_chart_show_data_labels: settings.trend_chart_show_data_labels,
      trend_chart_show_count: settings.trend_chart_show_count,
      trend_chart_x_axis: settings.trend_chart_x_axis,
      trend_chart_dual_axis: settings.trend_chart_dual_axis,
      home_density: settings.home_density,
      theme_mode: settings.theme_mode,
      accent_colors: settings.accent_colors,
      anomaly_multiplier: settings.anomaly_multiplier,
      anomaly_abs_threshold: settings.anomaly_abs_threshold,
      suggestion_gap_weight: settings.suggestion_gap_weight,
      suggestion_corr_weight: settings.suggestion_corr_weight,
      ai_auto_summary: settings.ai_auto_summary,
      ai_temperature: settings.ai_temperature,
      user_ai: settings.user_ai,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function listExams(userId: string): Promise<Exam[]> {
  return withTransientRetry(async () => {
    const { data: exams, error } = await getAdminClient()
      .from("exams")
      .select("*")
      .eq("user_id", userId)
      .order("exam_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const { data: scores, error: sErr } = await getAdminClient()
      .from("subject_scores")
      .select("*")
      .eq("user_id", userId);
    if (sErr) throw sErr;
    const byExam = new Map<string, SubjectScore[]>();
    for (const row of (scores ?? []) as SubjectScore[]) {
      const list = byExam.get(row.exam_id) ?? [];
      list.push(row);
      byExam.set(row.exam_id, list);
    }
    return ((exams ?? []) as Exam[]).map((exam) => ({
      ...exam,
      subject_scores: byExam.get(exam.id) ?? [],
    }));
  });
}

export async function getExam(userId: string, examId: string) {
  return withTransientRetry(async () => {
    const { data, error } = await getAdminClient()
      .from("exams")
      .select("*")
      .eq("user_id", userId)
      .eq("id", examId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: scores, error: sErr } = await getAdminClient()
      .from("subject_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("exam_id", examId);
    if (sErr) throw sErr;
    return { ...(data as Exam), subject_scores: (scores ?? []) as SubjectScore[] };
  });
}

export type ExamWrite = {
  exam_name: string;
  exam_date: string;
  total_class_rank?: number | null;
  total_grade_rank?: number | null;
  total_city_rank?: number | null;
  subject_scores?: Array<Partial<SubjectScore> & { subject: SubjectScore["subject"] }>;
};

export async function upsertExam(userId: string, payload: ExamWrite, examId?: string) {
  const examFields = {
    user_id: userId,
    exam_name: payload.exam_name.trim(),
    exam_date: payload.exam_date.slice(0, 10),
    total_class_rank: sanitizeRank(payload.total_class_rank),
    total_grade_rank: sanitizeRank(payload.total_grade_rank),
    total_city_rank: sanitizeRank(payload.total_city_rank),
    updated_at: new Date().toISOString(),
  };

  let id = examId;
  if (id) {
    const { error } = await getAdminClient().from("exams").update(examFields).eq("id", id).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { data, error } = await getAdminClient()
      .from("exams")
      .insert(examFields)
      .select("id")
      .single();
    if (error) throw error;
    id = (data as { id: string }).id;
  }

  if (payload.subject_scores) {
    await replaceSubjectScores(userId, id!, payload.subject_scores);
  }
  return getExam(userId, id!);
}

export async function mergeExamScores(
  userId: string,
  examId: string,
  scores: Array<Partial<SubjectScore> & { subject: SubjectScore["subject"] }>,
) {
  const existing = await getExam(userId, examId);
  if (!existing) return null;
  const map = new Map((existing.subject_scores ?? []).map((s) => [s.subject, s]));
  for (const incoming of scores) {
    const prev = map.get(incoming.subject);
    map.set(incoming.subject, {
      exam_id: examId,
      user_id: userId,
      subject: incoming.subject,
      score: incoming.score !== undefined && incoming.score !== null ? incoming.score : prev?.score ?? null,
      level: incoming.level !== undefined && incoming.level !== null ? incoming.level : prev?.level ?? null,
      class_rank:
        incoming.class_rank !== undefined && incoming.class_rank !== null
          ? incoming.class_rank
          : prev?.class_rank ?? null,
      grade_rank:
        incoming.grade_rank !== undefined && incoming.grade_rank !== null
          ? incoming.grade_rank
          : prev?.grade_rank ?? null,
      city_rank:
        incoming.city_rank !== undefined && incoming.city_rank !== null
          ? incoming.city_rank
          : prev?.city_rank ?? null,
    });
  }
  await replaceSubjectScores(userId, examId, [...map.values()]);
  return getExam(userId, examId);
}

async function replaceSubjectScores(
  userId: string,
  examId: string,
  scores: Array<Partial<SubjectScore> & { subject: SubjectScore["subject"] }>,
) {
  const { error: delErr } = await getAdminClient()
    .from("subject_scores")
    .delete()
    .eq("user_id", userId)
    .eq("exam_id", examId);
  if (delErr) throw delErr;
  const rows = scores.map((s) => {
    const v = sanitizeScoreFields(s);
    return {
      user_id: userId,
      exam_id: examId,
      subject: s.subject,
      score: v.score ?? null,
      level: v.level ?? null,
      class_rank: v.class_rank ?? null,
      grade_rank: v.grade_rank ?? null,
      city_rank: v.city_rank ?? null,
    };
  });
  if (!rows.length) return;
  const { error } = await getAdminClient().from("subject_scores").insert(rows);
  if (error) throw error;
}

export async function deleteExam(userId: string, examId: string) {
  const { error } = await getAdminClient().from("exams").delete().eq("user_id", userId).eq("id", examId);
  if (error) throw error;
}

export async function findExamByNameDate(userId: string, name: string, date: string) {
  return withTransientRetry(async () => {
    const { data, error } = await getAdminClient()
      .from("exams")
      .select("id")
      .eq("user_id", userId)
      .eq("exam_name", name.trim())
      .eq("exam_date", date.slice(0, 10))
      .maybeSingle();
    if (error) throw error;
    return (data as { id: string } | null)?.id ?? null;
  });
}

export async function listNotes(userId: string): Promise<Note[]> {
  return withTransientRetry(async () => {
    const { data, error } = await getAdminClient()
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Note[];
  });
}

export async function upsertNote(
  userId: string,
  payload: { id?: string; exam_id?: string | null; content: string },
) {
  const content = payload.content.trim();
  if (content.length > 500) throw new Error("笔记不超过 500 字");
  if (payload.id) {
    const { data, error } = await getAdminClient()
      .from("notes")
      .update({
        exam_id: payload.exam_id ?? null,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Note;
  }
  const { data, error } = await getAdminClient()
    .from("notes")
    .insert({
      user_id: userId,
      exam_id: payload.exam_id ?? null,
      content,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(userId: string, id: string) {
  const { error } = await getAdminClient().from("notes").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function listImages(userId: string, examId?: string): Promise<ExamImage[]> {
  return withTransientRetry(async () => {
    let q = getAdminClient().from("exam_images").select("*").eq("user_id", userId).order("created_at", {
      ascending: false,
    });
    if (examId) q = q.eq("exam_id", examId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ExamImage[];
  });
}

export async function insertImage(userId: string, examId: string, imageUrl: string) {
  const { data, error } = await getAdminClient()
    .from("exam_images")
    .insert({ user_id: userId, exam_id: examId, image_url: imageUrl })
    .select("*")
    .single();
  if (error) throw error;
  return data as ExamImage;
}

export async function deleteImage(userId: string, id: string) {
  const { data, error } = await getAdminClient()
    .from("exam_images")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as ExamImage | null;
}

export async function clearExams(userId: string) {
  const { error } = await getAdminClient().from("exams").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function deleteAccount(userId: string) {
  const { data: images } = await getAdminClient().from("exam_images").select("image_url").eq("user_id", userId);
  const paths = ((images ?? []) as { image_url: string }[])
    .map((i) => storagePathFromUrl(i.image_url))
    .filter(Boolean) as string[];
  if (paths.length) {
    await getAdminClient().storage.from(STORAGE_BUCKET).remove(paths);
  }
  const { error } = await getAdminClient().from("users").delete().eq("id", userId);
  if (error) throw error;
}

export function storagePathFromUrl(url: string) {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) return url.slice(idx + marker.length);
  const signed = `/object/sign/${STORAGE_BUCKET}/`;
  const sidx = url.indexOf(signed);
  if (sidx >= 0) return url.slice(sidx + signed.length).split("?")[0];
  return null;
}

export async function dataStatus(userId: string) {
  return withTransientRetry(async () => {
    const { count, error } = await getAdminClient()
      .from("exams")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw error;
    const { data } = await getAdminClient()
      .from("exams")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      examCount: count ?? 0,
      lastUpdated: (data as { updated_at?: string } | null)?.updated_at ?? null,
      supabase: true,
    };
  });
}
