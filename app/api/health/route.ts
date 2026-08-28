import { json } from "@/lib/api";
import { hasSupabaseEnv } from "@/lib/supabase";

export async function GET() {
  return json({
    ok: true,
    supabase: hasSupabaseEnv(),
    time: new Date().toISOString(),
  });
}
