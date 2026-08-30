import { ImageUpload } from "@/components/image-upload";
import { PageTransition } from "@/components/page-transition";
import { RankChart } from "@/components/rank-chart";
import { enabledSubjects } from "@/lib/analysis";
import { getExam, getSettings, listExams, listImages, listNotes } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { assignedScore, formatRank, formatScore, rankDelta } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [exam, exams, settings, images, notes] = await Promise.all([
    getExam(user.id, id),
    listExams(user.id),
    getSettings(user.id),
    listImages(user.id, id),
    listNotes(user.id),
  ]);
  if (!exam) notFound();
  const idx = exams.findIndex((e) => e.id === exam.id);
  const prev = idx > 0 ? exams[idx - 1] : undefined;
  const next = idx >= 0 ? exams[idx + 1] : undefined;
  const subjects = enabledSubjects(settings);
  const related = notes.filter((n) => n.exam_id === exam.id);

  return (
    <PageTransition>
      <div className="stack">
        <div className="page-head">
          <div>
            <h1>{exam.exam_name}</h1>
            <p className="muted">{exam.exam_date}</p>
          </div>
          <Link className="btn" href="/data">
            编辑数据
          </Link>
        </div>
        <section className="card">
          <h3>总分排名</h3>
          <div className="kpi">
            <span>班级 {formatRank(exam.total_class_rank)}</span>
            <span>{fmtDelta(rankDelta(exam.total_class_rank, prev?.total_class_rank))}</span>
          </div>
          <div className="kpi">
            <span>年级 {formatRank(exam.total_grade_rank)}</span>
            <span>{fmtDelta(rankDelta(exam.total_grade_rank, prev?.total_grade_rank))}</span>
          </div>
          <div className="kpi">
            <span>全市 {formatRank(exam.total_city_rank)}</span>
            <span>{fmtDelta(rankDelta(exam.total_city_rank, prev?.total_city_rank))}</span>
          </div>
        </section>
        <section className="card">
          <h3>各科</h3>
          {subjects.map((s) => {
            const sc = exam.subject_scores?.find((x) => x.subject === s);
            const old = prev?.subject_scores?.find((x) => x.subject === s);
            return (
              <div className="kpi" key={s}>
                <span>
                  {s} {sc?.score ?? sc?.level ?? "—"}
                  {sc?.level ? ` / 赋分 ${assignedScore(sc.level)}` : ""} · 均 {formatScore(sc?.class_avg ?? null)} · 班{" "}
                  {formatRank(sc?.class_rank ?? null)} · 年{" "}
                  {formatRank(sc?.grade_rank ?? null)} · 市 {formatRank(sc?.city_rank ?? null)}
                </span>
                <span>{fmtDelta(rankDelta(sc?.grade_rank ?? null, old?.grade_rank ?? null))}</span>
              </div>
            );
          })}
        </section>
        <section className="card">
          <h3>趋势位置</h3>
          <RankChart exams={exams} settings={settings} highlightId={exam.id} compact />
          <div className="row mt-sm">
            {prev ? <Link href={`/exam/${prev.id}`}>← {prev.exam_name}</Link> : null}
            {next ? <Link href={`/exam/${next.id}`}>{next.exam_name} →</Link> : null}
          </div>
        </section>
        <section className="card">
          <h3>回顾笔记</h3>
          {related.length ? related.map((n) => <p key={n.id}>{n.content}</p>) : <p className="empty">暂无笔记</p>}
          <Link className="btn mt-sm" href={`/notes?examId=${exam.id}`}>
            添加 / 编辑笔记
          </Link>
        </section>
        <section className="card">
          <h3>图片</h3>
          <ImageUpload examId={exam.id} images={images} />
        </section>
      </div>
    </PageTransition>
  );
}

function fmtDelta(v: number | null) {
  if (v == null) return "";
  if (v > 0) return `↑${v}`;
  if (v < 0) return `↓${Math.abs(v)}`;
  return "→0";
}
