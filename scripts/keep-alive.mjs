// Supabase 免费实例长期无请求会被暂停,此脚本发少量随机化请求保持活跃。
// 参考 fuwari-cf/scripts/keep-alive.mjs,适配本项目的表结构。
// 本地手动跑会自动读取 .env(GitHub Actions 里走 secrets)。

import { readFileSync } from "node:fs";

try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // 没有 .env 就只用已有环境变量
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY (or SERVICE_ROLE_KEY)");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function headers() {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };
}

// 表受 RLS 保护,anon 查询通常返回 0 行,但请求仍会打到数据库,足以计为活跃
const tables = ["users", "settings", "exams", "subject_scores", "notes", "ai_conversations"];

function tableQuery(name) {
  return {
    name: `${name} query`,
    fn: async () => {
      const limit = randomInt(1, 5);
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/${name}?select=id&limit=${limit}`,
        { headers: headers() },
      );
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    },
  };
}

function buildMethods() {
  // 每次随机挑 2 张表,避免每次都打同样的查询
  const picked = [...tables].sort(() => Math.random() - 0.5).slice(0, 2);
  return [
    ...picked.map(tableQuery),
    {
      name: "storage API",
      fn: async () => {
        const resp = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers: headers() });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      },
    },
    {
      name: "auth API",
      fn: async () => {
        const resp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: headers() });
        // 401 是预期结果(无登录会话)
        if (resp.status !== 401 && !resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      },
    },
  ];
}

async function keepAlive() {
  console.log(`[${new Date().toISOString()}] Starting keep-alive`);

  const methods = buildMethods();
  let successCount = 0;

  for (const method of methods) {
    // 每个请求前随机延迟 1-5 秒,让流量看起来更像真实使用
    await sleep(randomInt(1000, 5000));

    try {
      await method.fn();
      console.log(`  [OK] ${method.name}`);
      successCount++;
    } catch (err) {
      console.error(`  [FAIL] ${method.name}: ${err.message}`);
    }
  }

  console.log(`[${new Date().toISOString()}] Done (${successCount}/${methods.length} succeeded)`);

  if (successCount === 0) {
    console.error("All keep-alive operations failed");
    process.exit(1);
  }
}

keepAlive();
