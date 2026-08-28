import { AiPanel, AnalysisBoard } from "@/components/analysis-board";
import { runAnalysis } from "@/lib/analysis";
import { getSettings, listExams } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AnalysisPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [exams, settings] = await Promise.all([listExams(user.id), getSettings(user.id)]);
  const analysis = runAnalysis(exams, settings);
  return (
    <div className="stack">
      <div className="page-head">
        <h1>分析</h1>
      </div>
      <AnalysisBoard analysis={analysis} />
      <AiPanel />
    </div>
  );
}
