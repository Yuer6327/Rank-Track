import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./auth-jwt";
import type { SessionUser } from "./types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
