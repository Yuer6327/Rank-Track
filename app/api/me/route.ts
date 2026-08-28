import { fail, handleRouteError, json, requireUser } from "@/lib/api";
import { dataStatus, findUserById, getSettings } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    // JWT 是无状态的，账号删除后旧 cookie 仍能通过签名校验，需显式 401 让前端清会话
    const profile = await findUserById(user.id);
    if (!profile) return fail(401, "未登录");
    const [settings, status] = await Promise.all([getSettings(user.id), dataStatus(user.id)]);
    return json({ user: profile, settings, status });
  } catch (err) {
    return handleRouteError(err);
  }
}
