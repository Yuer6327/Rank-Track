import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth-jwt";
import { fail, handleRouteError, json, readJson } from "@/lib/api";
import { findUserByUsername } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ username?: string; password?: string }>(req);
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const user = await findUserByUsername(username);
    if (!user) return fail(401, "用户名或密码错误");
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return fail(401, "用户名或密码错误");
    const token = await signSession({ id: user.id, username: user.username });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
    return json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    return handleRouteError(err);
  }
}
