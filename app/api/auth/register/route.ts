import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth-jwt";
import { fail, handleRouteError, json, readJson } from "@/lib/api";
import { createUser, findUserByUsername } from "@/lib/db";
import { hashPassword, validatePassword, validateUsername } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ username?: string; password?: string }>(req);
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const uErr = validateUsername(username);
    if (uErr) return fail(400, uErr);
    const pErr = validatePassword(password);
    if (pErr) return fail(400, pErr);
    const exists = await findUserByUsername(username);
    if (exists) return fail(409, "用户名已被占用");
    const user = await createUser(username, await hashPassword(password));
    const token = await signSession({ id: user.id, username: user.username });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
    return json({ user: { id: user.id, username: user.username, created_at: user.created_at } }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
