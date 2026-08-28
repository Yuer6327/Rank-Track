"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAJOR_SUBJECTS, MINOR_SUBJECTS, LEVELS, type Settings, type Subject } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { applyTheme } from "./theme";

export function SettingsForm({
  settings,
  user,
  status,
}: {
  settings: Settings & { user_ai?: { endpoint?: string | null; has_key?: boolean } };
  user: { username: string; created_at: string };
  status: { examCount: number; lastUpdated: string | null; supabase: boolean };
}) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [aiKey, setAiKey] = useState("");
  const [dialog, setDialog] = useState<null | "clear" | "delete">(null);
  const [msg, setMsg] = useState("");

  async function save(partial: Partial<Settings> & { user_ai_api_key?: string | null } = {}) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, ...partial, user_ai_api_key: aiKey || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("已保存");
      if (partial.theme_mode || s.theme_mode) applyTheme((partial.theme_mode ?? s.theme_mode) as never);
      router.refresh();
    } else setMsg(data.error || "保存失败");
  }

  function toggleMinor(name: (typeof MINOR_SUBJECTS)[number]) {
    const cur = s.enabled_minor_subjects;
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    setS({ ...s, enabled_minor_subjects: next.slice(0, 3) as Settings["enabled_minor_subjects"] });
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>A. 账号信息</h3>
        <p>用户名：{user.username}</p>
        <p className="muted">创建于 {user.created_at?.slice(0, 10)}</p>
        <div className="row mt-sm">
          <input className="input" type="password" placeholder="原密码" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          <input className="input" type="password" placeholder="新密码" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const res = await fetch("/api/auth/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
              });
              setMsg(res.ok ? "密码已更新" : "修改失败");
            }}
          >
            修改密码
          </button>
        </div>
      </section>

      <section className="card">
        <h3>B. 科目管理</h3>
        <p className="muted">大三门固定：{MAJOR_SUBJECTS.join(" / ")}</p>
        <div className="row">
          {MINOR_SUBJECTS.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${s.enabled_minor_subjects.includes(m) ? "primary" : ""}`}
              onClick={() => toggleMinor(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="muted mt-sm">
          已选 {s.enabled_minor_subjects.length}/3，切换后旧数据保留但隐藏。
        </p>
      </section>

      <section className="card">
        <h3>C. 长期目标</h3>
        <div className="grid-2">
          <label>
            总分班级
            <input
              className="input"
              type="number"
              value={s.long_term_goals.total_class_rank ?? ""}
              onChange={(e) =>
                setS({
                  ...s,
                  long_term_goals: { ...s.long_term_goals, total_class_rank: e.target.value ? Number(e.target.value) : null },
                })
              }
            />
          </label>
          <label>
            总分年级
            <input
              className="input"
              type="number"
              value={s.long_term_goals.total_grade_rank ?? ""}
              onChange={(e) =>
                setS({
                  ...s,
                  long_term_goals: { ...s.long_term_goals, total_grade_rank: e.target.value ? Number(e.target.value) : null },
                })
              }
            />
          </label>
          <label>
            总分全市
            <input
              className="input"
              type="number"
              value={s.long_term_goals.total_city_rank ?? ""}
              onChange={(e) =>
                setS({
                  ...s,
                  long_term_goals: { ...s.long_term_goals, total_city_rank: e.target.value ? Number(e.target.value) : null },
                })
              }
            />
          </label>
        </div>
        {([...MAJOR_SUBJECTS, ...s.enabled_minor_subjects] as Subject[]).map((sub) => (
          <div className="row mt-sm" key={sub}>
            <span style={{ width: 48 }}>{sub}</span>
            <input
              className="input"
              placeholder="排名目标"
              type="number"
              value={s.long_term_goals.subjects?.[sub]?.rank ?? ""}
              onChange={(e) =>
                setS({
                  ...s,
                  long_term_goals: {
                    ...s.long_term_goals,
                    subjects: {
                      ...s.long_term_goals.subjects,
                      [sub]: {
                        ...s.long_term_goals.subjects?.[sub],
                        rank: e.target.value ? Number(e.target.value) : null,
                      },
                    },
                  },
                })
              }
            />
            {!(MAJOR_SUBJECTS as readonly string[]).includes(sub) ? (
              <select
                className="select"
                value={s.long_term_goals.subjects?.[sub]?.level ?? ""}
                onChange={(e) =>
                  setS({
                    ...s,
                    long_term_goals: {
                      ...s.long_term_goals,
                      subjects: {
                        ...s.long_term_goals.subjects,
                        [sub]: { ...s.long_term_goals.subjects?.[sub], level: (e.target.value || null) as never },
                      },
                    },
                  })
                }
              >
                <option value="">等级目标</option>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            ) : null}
          </div>
        ))}
      </section>

      <section className="card">
        <h3>D. 总人数</h3>
        <div className="grid-2">
          {(["class", "grade", "city"] as const).map((k) => (
            <label key={k}>
              {k === "class" ? "班级" : k === "grade" ? "年级" : "全市"}
              <input
                className="input"
                type="number"
                value={s.total_students[k] ?? ""}
                onChange={(e) =>
                  setS({ ...s, total_students: { ...s.total_students, [k]: e.target.value ? Number(e.target.value) : null } })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>E / F. 导出与导入</h3>
        <div className="row">
          <a className="btn" href="/api/export?format=json">
            JSON
          </a>
          <a className="btn" href="/api/export?format=csv">
            CSV
          </a>
          <a className="btn" href="/api/export?format=xlsx">
            Excel
          </a>
          <a className="btn" href="/api/template">
            下载模板
          </a>
        </div>
      </section>

      <section className="card">
        <h3>H. 偏好</h3>
        <div className="grid-2">
          <label>
            默认维度
            <select
              className="select"
              value={s.trend_chart_default_dimension}
              onChange={(e) => setS({ ...s, trend_chart_default_dimension: e.target.value as Settings["trend_chart_default_dimension"] })}
            >
              <option value="grade_rank">年级排名</option>
              <option value="class_rank">班级排名</option>
              <option value="city_rank">全市排名</option>
            </select>
          </label>
          <label>
            显示次数
            <select
              className="select"
              value={s.trend_chart_show_count}
              onChange={(e) => setS({ ...s, trend_chart_show_count: Number(e.target.value) })}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={0}>全部</option>
            </select>
          </label>
          <label>
            首页密度
            <select className="select" value={s.home_density} onChange={(e) => setS({ ...s, home_density: e.target.value as never })}>
              <option value="compact">紧凑</option>
              <option value="standard">标准</option>
            </select>
          </label>
          <label>
            深色模式
            <select
              className="select"
              value={s.theme_mode}
              onChange={(e) => {
                const theme_mode = e.target.value as Settings["theme_mode"];
                setS({ ...s, theme_mode });
                applyTheme(theme_mode);
              }}
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label>
            异常倍数
            <input
              className="input"
              type="number"
              step="0.1"
              value={s.anomaly_multiplier}
              onChange={(e) => setS({ ...s, anomaly_multiplier: Number(e.target.value) })}
            />
          </label>
          <label>
            异常绝对阈值
            <input
              className="input"
              type="number"
              value={s.anomaly_abs_threshold ?? ""}
              onChange={(e) => setS({ ...s, anomaly_abs_threshold: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label>
            提分：差距权重
            <input
              className="input"
              type="number"
              step="0.1"
              value={s.suggestion_gap_weight}
              onChange={(e) => setS({ ...s, suggestion_gap_weight: Number(e.target.value) })}
            />
          </label>
          <label>
            提分：相关权重
            <input
              className="input"
              type="number"
              step="0.1"
              value={s.suggestion_corr_weight}
              onChange={(e) => setS({ ...s, suggestion_corr_weight: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="row mt-sm">
          <label>
            <input
              type="checkbox"
              checked={s.trend_chart_show_goal_line}
              onChange={(e) => setS({ ...s, trend_chart_show_goal_line: e.target.checked })}
            />{" "}
            目标线
          </label>
          <label>
            <input
              type="checkbox"
              checked={s.trend_chart_show_data_labels}
              onChange={(e) => setS({ ...s, trend_chart_show_data_labels: e.target.checked })}
            />{" "}
            数据标注
          </label>
          <label>
            <input type="checkbox" checked={s.accent_colors} onChange={(e) => setS({ ...s, accent_colors: e.target.checked })} />{" "}
            红绿强调色
          </label>
        </div>
      </section>

      <section className="card">
        <h3>J. AI 设置</h3>
        <div className="fields">
          <label>
            自定义端点
            <input
              className="input"
              value={s.user_ai.endpoint ?? ""}
              onChange={(e) => setS({ ...s, user_ai: { ...s.user_ai, endpoint: e.target.value } })}
              placeholder="默认 Agnes"
            />
          </label>
          <label>
            自定义 Key（加密存储）
            <input className="input" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder={settings.user_ai && (settings as { user_ai?: { has_key?: boolean } }).user_ai?.has_key ? "已配置，留空保持" : "可选"} />
          </label>
          <label>
            温度 {s.ai_temperature}
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={s.ai_temperature}
              onChange={(e) => setS({ ...s, ai_temperature: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="mt-sm">
          <input type="checkbox" checked={s.ai_auto_summary} onChange={(e) => setS({ ...s, ai_auto_summary: e.target.checked })} />{" "}
          新数据后自动摘要
        </label>
      </section>

      <section className="card">
        <h3>K. 数据状态</h3>
        <p>考试记录 {status.examCount} 条</p>
        <p className="muted">上次更新 {status.lastUpdated ?? "—"}</p>
        <p>Supabase：{status.supabase ? "已连接" : "未配置"}</p>
      </section>

      <button className="btn primary" type="button" onClick={() => save()}>
        保存设置
      </button>
      {msg ? <p className="muted">{msg}</p> : null}

      <section className="card danger-zone">
        <h3>G. 危险区</h3>
        <div className="row">
          <button className="btn danger" type="button" onClick={() => setDialog("clear")}>
            清空考试数据
          </button>
          <button className="btn danger" type="button" onClick={() => setDialog("delete")}>
            删除账号
          </button>
        </div>
        <ConfirmDialog
          open={dialog === "clear"}
          username={user.username}
          title="清空考试数据"
          description={`将永久删除全部 ${status.examCount} 条考试记录，此操作不可恢复。`}
          confirmLabel="确认清空"
          onConfirm={async () => {
            setDialog(null);
            const res = await fetch("/api/account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "clear" }),
            });
            setMsg(res.ok ? "已清空考试数据" : "清空失败");
            router.refresh();
          }}
          onCancel={() => setDialog(null)}
        />
        <ConfirmDialog
          open={dialog === "delete"}
          username={user.username}
          title="删除账号"
          description="将永久删除账号及全部数据（考试、笔记、图片），并退出登录，此操作不可恢复。"
          confirmLabel="确认删除"
          onConfirm={async () => {
            setDialog(null);
            const res = await fetch("/api/account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "delete", username: user.username }),
            });
            if (res.ok) router.push("/register");
            else setMsg("删除失败");
          }}
          onCancel={() => setDialog(null)}
        />
      </section>
    </div>
  );
}
