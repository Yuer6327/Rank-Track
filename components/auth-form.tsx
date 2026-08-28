"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "失败");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Image src="/logo.png" alt="Rank Track" width={64} height={64} />
        <h1>Rank Track</h1>
        <p className="muted">上海高考生排名追踪</p>
        <form onSubmit={onSubmit}>
          <label className="muted">用户名</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <label className="muted">密码</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="down">{error}</p> : null}
          <button className="btn primary" disabled={pending} type="submit">
            {pending ? "请稍候…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          {mode === "login" ? (
            <>
              还没有账号？<a href="/register">注册</a>
            </>
          ) : (
            <>
              已有账号？<a href="/login">登录</a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
