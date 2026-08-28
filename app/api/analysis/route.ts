import { compactHistory, latestFull, runAnalysis } from "@/lib/analysis";
import { handleRouteError, json, requireUser } from "@/lib/api";
import { getSettings, listExams } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const [exams, settings] = await Promise.all([listExams(user.id), getSettings(user.id)]);
    const analysis = runAnalysis(exams, settings);
    return json({
      analysis,
      history_compact: compactHistory(exams, settings),
      latest_exam_full: latestFull(exams[exams.length - 1], settings),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
