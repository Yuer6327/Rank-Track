import Link from "next/link";
import { ExamCard } from "@/components/exam-card";
import { GoalDashboard } from "@/components/goal-dashboard";
import { RankChart } from "@/components/rank-chart";
import { runAnalysis } from "@/lib/analysis";
import { getSettings, listExams } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [exams, settings] = await Promise.all([listExams(user.id), getSettings(user.id)]);
  const analysis = runAnalysis(exams, settings);
  const latest = exams[exams.length - 1];
  const prev = exams[exams.length - 2];
  const compact = settings.home_density === "compact";

  return (
    <div className="stack" style={{ gap: compact ? 12 : 18 }}>
      <div className="page-head">
        <div>
          <h1>总览</h1>
          <p className="muted">排名优先 · 上海 3+3</p>
        </div>
        <Link className="btn primary" href="/data">
          录入成绩
        </Link>
      </div>

      <section className="card">
        <h2>A. 总排名趋势</h2>
        {exams.length ? <RankChart exams={exams} settings={settings} /> : <p className="empty">还没有考试数据</p>}
      </section>

      <section className="card">
        <h2>B. 最近考试</h2>
        {latest ? <ExamCard exam={latest} prev={prev} settings={settings} /> : <p className="empty">暂无考试</p>}
      </section>

      <section className="card">
        <h2>D. 考后复盘</h2>
        <ul>
          {analysis.summaries.map((s) => (
            <li key={s} style={{ marginBottom: 6 }}>
              {s}
            </li>
          ))}
        </ul>
        <Link className="btn" href="/analysis">
          查看详细分析
        </Link>
      </section>

      <section className="card">
        <h2>C. 差距仪表盘</h2>
        <GoalDashboard rows={analysis.goals} />
      </section>
    </div>
  );
}
