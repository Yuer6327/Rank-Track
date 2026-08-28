import { readFileSync } from "node:fs";
import { getAdminClient } from "../lib/supabase";

// tsx 不会自动加载 .env，这里手动解析（不覆盖已有环境变量）
try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // 没有 .env 文件，交给下面的缺变量提示
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing = [!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean)
      .join(", ");
    console.error(`✗ 缺少环境变量: ${missing}`);
    console.error("  请在项目根目录 .env 中填入 Supabase 的 Project URL 和 service_role key。");
    process.exit(1);
  }

  console.log(`Supabase URL: ${url}`);
  const supabase = getAdminClient();
  const { error } = await supabase.from("users").select("id").limit(1);

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      console.error("✓ 连接成功，但 public.users 表不存在 —— 请先在 Supabase SQL Editor 执行 supabase/schema.sql");
    } else {
      console.error(`✗ 连接失败: ${error.message}`);
    }
    process.exit(1);
  }

  console.log("✓ 连接成功: URL 有效、service_role key 有效、public.users 表可访问");
}

main();
