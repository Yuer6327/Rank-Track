"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { RuleAnalysis, Subject } from "@/lib/types";
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

export function AiPanel() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(preset?: string) {
    const prompt = preset ? "" : input.trim();
    if (!preset && !prompt) return;
    setBusy(true);
    const userText =
      preset === "priority" ? "各科提分优先级" : preset === "strategy" ? "考前策略建议" : prompt;
    setMessages((m) => [...m, { role: "user", content: userText }, { role: "assistant", content: "" }]);
    setInput("");
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, preset }),
    });
    if (!res.ok || !res.body) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "AI 请求失败" };
        return copy;
      });
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
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: text };
        return copy;
      });
    }
    setBusy(false);
  }

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>AI 深度分析</h3>
        <button className="btn" type="button" onClick={() => setFull((v) => !v)}>
          {full ? "收起" : "展开"}
        </button>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn" type="button" disabled={busy} onClick={() => send("priority")}>
          各科提分优先级
        </button>
        <button className="btn" type="button" disabled={busy} onClick={() => send("strategy")}>
          考前策略建议
        </button>
      </div>
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
