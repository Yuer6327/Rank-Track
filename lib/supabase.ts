import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function hasSupabaseEnv() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getAdminClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase 环境变量未配置");
  }
  if (!admin) {
    admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return admin;
}

// PGRST303（JWT issued at future）是 Supabase 实例偶发的时钟偏移，稍后重试通常即恢复；
// 仅用于幂等的读操作，写操作不自动重试
export async function withTransientRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    if (!/PGRST303|JWT issued at future/i.test(msg)) throw err;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return run();
  }
}

export const STORAGE_BUCKET = "exam-images";
