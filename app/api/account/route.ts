import { cookies } from "next/headers";
import { fail, handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-jwt";
import { clearExams, deleteAccount } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ action?: string; username?: string }>(req);
    if (body.action === "clear") {
      await clearExams(user.id);
      return json({ ok: true });
    }
    if (body.action === "delete") {
      if (body.username !== user.username) return fail(400, "请输入当前用户名以确认删除");
      await deleteAccount(user.id);
      const jar = await cookies();
      jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
      return json({ ok: true });
    }
    return fail(400, "未知操作");
  } catch (err) {
    return handleRouteError(err);
  }
}
