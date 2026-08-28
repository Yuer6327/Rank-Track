import { fail, handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { deleteNote, upsertNote } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<{ exam_id?: string | null; content?: string }>(req);
    if (!body.content?.trim()) return fail(400, "笔记内容不能为空");
    const note = await upsertNote(user.id, { id, exam_id: body.exam_id ?? null, content: body.content });
    return json({ note });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteNote(user.id, id);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
