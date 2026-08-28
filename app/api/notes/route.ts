import { fail, handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { listNotes, upsertNote } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const notes = await listNotes(user.id);
    return json({ notes });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ exam_id?: string | null; content?: string }>(req);
    if (!body.content?.trim()) return fail(400, "笔记内容不能为空");
    const note = await upsertNote(user.id, { exam_id: body.exam_id ?? null, content: body.content });
    return json({ note }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
