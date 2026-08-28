"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { RuleAnalysis, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Md } from "./md";

export function AnalysisBoard({ analysis }: { analysis: RuleAnalysis }) {
  const [scatter, setScatter] = useState<Subject | null>(null);
  const points = useMemo(
    () => analysis.correlations.find((c) => c.subject === scatter)?.points ?? [],
    [analysis.correlations, scatter],
  );

  return (
    <div className="grid-2">
      <section className="card">
        <h3>异常波动检测</h3>
        {analysis.anomalies.length ? (
          analysis.anomalies.map((a) => (
            <div className="kpi" key={`${a.examId}-${a.scope}`}>
              <span>{a.message}</span>
              <a className="btn" href={`/notes?examId=${a.examId}`}>
                添加回顾笔记
              </a>
            </div>
          ))
        ) : (
          <p className="empty">暂无异常波动</p>
        )}
      </section>

      <section className="card">
        <h3>单科影响分析</h3>
        {analysis.impacts.length ? (
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={analysis.impacts.map((i) => ({ name: i.subject, v: i.subjectDelta ?? 0 }))}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis reversed tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="v" name="排名变化（正=退步）">
                  {analysis.impacts.map((i) => (
                    <Cell key={i.subject} fill={(i.subjectDelta ?? 0) > 0 ? "var(--red)" : "var(--green)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty">至少需要两次考试</p>
        )}
      </section>

      <section className="card">
        <h3>长期权重分析</h3>
        {analysis.correlations.map((c) => (
          <button
            key={c.subject}
            className="kpi"
            type="button"
            onClick={() => setScatter(c.subject)}
            style={{ width: "100%", background: "transparent", border: 0, textAlign: "left" }}
          >
            <span>
              {c.subject} · {c.label}
            </span>
            <span>{c.coefficient == null ? "—" : c.coefficient.toFixed(2)}</span>
          </button>
        ))}
        {scatter ? (
          <div className="mt-sm" style={{ height: 220 }}>
            <p className="muted">{scatter} 排名 vs 总分排名</p>
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="var(--line)" />
                <XAxis dataKey="x" name="单科" reversed />
                <YAxis dataKey="y" name="总分" reversed />
                <Tooltip />
                <Scatter data={points} fill="var(--fg)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>提分空间建议</h3>
        {analysis.suggestions.map((s) => (
          <div className="kpi" key={s.subject}>
            <span>
              {s.subject} {s.currentRank ?? "—"} → {s.targetRank ?? "未设目标"}
            </span>
            <span className="muted">
              差 {s.gap ?? "—"} · 波动 {s.volatility?.toFixed(1) ?? "—"}
            </span>
          </div>
        ))}
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>距离目标总览</h3>
        {analysis.goals.length ? (
          analysis.goals.map((g) => (
            <div key={g.key} style={{ marginBottom: 8 }}>
              <div className="kpi">
                <span>{g.label}</span>
                <span>{g.gapText}</span>
              </div>
              {g.progress != null ? (
                <div className="progress">
                  <span style={{ width: `${g.progress}%` }} />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="empty">未设定目标</p>
        )}
      </section>
    </div>
  );
}

type LocalChat = {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string }[];
  updatedAt: number;
};

const CHATS_KEY = "rt_ai_chats";
const ACTIVE_KEY = "rt_ai_chat_active";
const MAX_CHATS = 30;

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}

function freshChat(): LocalChat {
  return { id: newId(), title: "新对话", messages: [], updatedAt: Date.now() };
}

function loadStore(): { chats: LocalChat[]; activeId: string } {
  let chats: LocalChat[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(CHATS_KEY) ?? "[]") as LocalChat[];
    if (Array.isArray(raw)) {
      chats = raw.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages));
    }
  } catch {
    // 忽略损坏的本地数据
  }
  if (!chats.length) {
    const fresh = freshChat();
    return { chats: [fresh], activeId: fresh.id };
  }
  const saved = localStorage.getItem(ACTIVE_KEY);
  const activeId = saved && chats.some((c) => c.id === saved) ? saved : chats[0].id;
  return { chats, activeId };
}

function HistoryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function AiPanel() {
  const [store, setStore] = useState<{ chats: LocalChat[]; activeId: string } | null>(null);
  const [input, setInput] = useState("");
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 聊天记录仅存浏览器 localStorage
  useEffect(() => {
    // 必须挂载后再读取，避免 SSR 水合不一致
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(loadStore());
  }, []);

  useEffect(() => {
    if (!store) return;
    localStorage.setItem(CHATS_KEY, JSON.stringify(store.chats.slice(0, MAX_CHATS)));
    localStorage.setItem(ACTIVE_KEY, store.activeId);
  }, [store]);

  const chat = store?.chats.find((c) => c.id === store.activeId) ?? null;
  const messages = chat?.messages ?? [];

  function patchChat(id: string, fn: (c: LocalChat) => LocalChat) {
    setStore((s) => (s ? { ...s, chats: s.chats.map((c) => (c.id === id ? fn(c) : c)) } : s));
  }

  function newChat() {
    const fresh = freshChat();
    setStore((s) => (s ? { chats: [fresh, ...s.chats].slice(0, MAX_CHATS), activeId: fresh.id } : s));
    setShowHistory(false);
  }

  function removeChat(id: string) {
    setStore((s) => {
      if (!s) return s;
      const chats = s.chats.filter((c) => c.id !== id);
      if (!chats.length) {
        const fresh = freshChat();
        return { chats: [fresh], activeId: fresh.id };
      }
      return { chats, activeId: s.activeId === id ? chats[0].id : s.activeId };
    });
  }

  async function send(preset?: string) {
    const prompt = preset ? "" : input.trim();
    if ((!preset && !prompt) || !chat) return;
    setBusy(true);
    const userText =
      preset === "priority" ? "各科提分优先级" : preset === "strategy" ? "考前策略建议" : prompt;
    const target = chat.id;
    patchChat(target, (c) => ({
      ...c,
      title: c.title === "新对话" ? userText.slice(0, 18) : c.title,
      messages: [...c.messages, { role: "user" as const, content: userText }, { role: "assistant" as const, content: "" }],
      updatedAt: Date.now(),
    }));
    setInput("");
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, preset, history: chat.messages.slice(-5) }),
    });
    if (!res.ok || !res.body) {
      patchChat(target, (c) => ({
        ...c,
        messages: c.messages.map((m, i) =>
          i === c.messages.length - 1 ? { role: "assistant" as const, content: "AI 请求失败" } : m,
        ),
      }));
      setBusy(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      const text = acc;
      patchChat(target, (c) => ({
        ...c,
        messages: c.messages.map((m, i) =>
          i === c.messages.length - 1 ? { role: "assistant" as const, content: text } : m,
        ),
        updatedAt: Date.now(),
      }));
    }
    setBusy(false);
  }

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>AI 深度分析</h3>
        <div className="row">
          <div className="chat-menu">
            <button className="btn" type="button" onClick={() => setShowHistory((v) => !v)}>
              <HistoryIcon />
              历史记录
            </button>
            {showHistory && store ? (
              <div className="chat-pop">
                {store.chats.map((c) => (
                  <div key={c.id} className={cn("chat-pop-item", c.id === store.activeId && "active")}>
                    <button
                      className="chat-pop-open"
                      type="button"
                      onClick={() => {
                        setStore((s) => (s ? { ...s, activeId: c.id } : s));
                        setShowHistory(false);
                      }}
                    >
                      <span className="chat-pop-title">{c.title}</span>
                      <span className="chat-pop-time">
                        {c.messages.length
                          ? new Date(c.updatedAt).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "空对话"}
                      </span>
                    </button>
                    <button className="chat-pop-del" type="button" title="删除此对话" onClick={() => removeChat(c.id)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <button className="btn" type="button" onClick={newChat}>
            <PlusIcon />
            新对话
          </button>
          <button className="btn" type="button" onClick={() => setFull((v) => !v)}>
            {full ? "收起" : "展开"}
          </button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn" type="button" disabled={busy} onClick={() => send("priority")}>
          各科提分优先级
        </button>
        <button className="btn" type="button" disabled={busy} onClick={() => send("strategy")}>
          考前策略建议
        </button>
      </div>
      {messages.length > 5 ? (
        <p className="muted" style={{ marginBottom: 4 }}>
          上下文可能过长：单次仅携带最近 5 条消息，请开新对话。
        </p>
      ) : null}
      <div className={`chat ${full ? "full" : ""}`}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === "assistant" ? <Md>{m.content || (busy ? "…" : "")}</Md> : m.content}
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="input"
          placeholder="自定义提问，回车发送"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn primary" disabled={busy} type="submit">
          发送
        </button>
      </form>
    </section>
  );
}
