import { NextResponse } from "next/server";
import { getSessionUser } from "./session";
import type { SessionUser } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, init?: number | ResponseInit) {
  const opts = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, opts);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "未登录");
  return user;
}

export function handleRouteError(err: unknown) {
  if (err instanceof ApiError) return fail(err.status, err.message);
  const message = err instanceof Error ? err.message : "服务器错误";
  if (message.includes("未配置") || message.includes("JWT_SECRET")) {
    return fail(500, message);
  }
  console.error(err);
  return fail(500, "服务器错误");
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "请求体不是合法 JSON");
  }
}
