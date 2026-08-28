# Rank Track

面向上海高考生的成绩**排名**追踪与分析工具（3+3）。支持班级 / 年级 / 全市多维排名、大三门分数 + 小三门等级、趋势图、规则分析与 AI 辅助。

- 仓库：https://github.com/Yuer6327/Rank-Track
- 部署：Vercel（Next.js App Router）

## 技术栈

Next.js 16 · Supabase (PostgreSQL + Storage) · JWT Cookie 认证 · Recharts · Agnes AI

## 本地开发

1. 在 Supabase SQL Editor 执行 `supabase/schema.sql`（建表、RLS、Storage bucket `exam-images`）。
2. 复制环境变量：

```bash
cp .env.example .env.local
```

填写：

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=          # 随机长字符串
AGNES_API_KEY=       # 可选，分析页 AI 用
```

3. 安装并启动：

```bash
npm install
npm run dev
```

打开 http://localhost:3000 注册账号。

## 分析自检

```bash
npm run check:analysis
```

## 页面

| 路由 | 说明 |
|------|------|
| `/` | 趋势、最近考试、复盘摘要、差距仪表盘 |
| `/analysis` | 异常 / 单科影响 / 相关 / 提分空间 / AI |
| `/data` | 在线表格 + Excel 导入 |
| `/exam/[id]` | 单次考试详情、笔记、图片 |
| `/notes` | 回顾笔记 |
| `/settings` | 科目、目标、人数、导入导出、危险区 |
| `/help` | 上手指引与 FAQ |

忘记密码请联系管理员手动重置。
