import { fail, handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { findUserByUsername, updatePasswordHash } from "@/lib/db";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ oldPassword?: string; newPassword?: string }>(req);
    const pErr = validatePassword(body.newPassword ?? "");
    if (pErr) return fail(400, pErr);
    const row = await findUserByUsername(user.username);
    if (!row) return fail(404, "用户不存在");
    const ok = await verifyPassword(body.oldPassword ?? "", row.password_hash);
    if (!ok) return fail(400, "原密码不正确");
    await updatePasswordHash(user.id, await hashPassword(body.newPassword!));
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
