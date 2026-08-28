import { handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { listExams, upsertExam, type ExamWrite } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const exams = await listExams(user.id);
    return json({ exams });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<ExamWrite>(req);
    const exam = await upsertExam(user.id, body);
    return json({ exam }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
