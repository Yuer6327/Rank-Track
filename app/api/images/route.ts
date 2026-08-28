import { fail, handleRouteError, json, requireUser } from "@/lib/api";
import { deleteImage, getExam, insertImage, listImages, storagePathFromUrl } from "@/lib/db";
import { getAdminClient, STORAGE_BUCKET } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const examId = new URL(req.url).searchParams.get("examId") ?? undefined;
    const images = await listImages(user.id, examId);
    return json({ images });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const examId = String(form.get("examId") ?? "");
    const file = form.get("file");
    if (!examId) return fail(400, "缺少 examId");
    if (!(file instanceof File)) return fail(400, "缺少文件");
    const exam = await getExam(user.id, examId);
    if (!exam) return fail(404, "考试不存在");
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `${user.id}/${examId}/${Date.now()}.webp`;
    const { error } = await getAdminClient()
      .storage.from(STORAGE_BUCKET)
      .upload(path, buf, { contentType: "image/webp", upsert: false });
    if (error) return fail(500, error.message);
    const { data } = getAdminClient().storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const image = await insertImage(user.id, examId, data.publicUrl);
    return json({ image }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail(400, "缺少 id");
    const image = await deleteImage(user.id, id);
    if (image) {
      const path = storagePathFromUrl(image.image_url);
      if (path) await getAdminClient().storage.from(STORAGE_BUCKET).remove([path]);
    }
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
