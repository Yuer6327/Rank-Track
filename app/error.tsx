"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card">
      <h2>出了点问题</h2>
      <p className="muted">{error.message || "未知错误"}</p>
      {error.digest ? <p className="muted">digest: {error.digest}</p> : null}
      <p className="muted">若提示环境变量未配置，请复制 `.env.example` 为 `.env.local` 并填写 Supabase / JWT。</p>
      <button className="btn" type="button" onClick={reset}>
        重试
      </button>
    </div>
  );
}
