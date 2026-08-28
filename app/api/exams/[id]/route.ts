import { fail, handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { deleteExam, getExam, upsertExam, type ExamWrite } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const exam = await getExam(user.id, id);
    if (!exam) return fail(404, "考试不存在");
    return json({ exam });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await getExam(user.id, id);
    if (!existing) return fail(404, "考试不存在");
    const body = await readJson<ExamWrite>(req);
    const exam = await upsertExam(user.id, body, id);
    return json({ exam });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteExam(user.id, id);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
