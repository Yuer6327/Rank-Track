import type { GoalRow } from "@/lib/types";

export function GoalDashboard({ rows }: { rows: GoalRow[] }) {
  if (!rows.length) return <p className="empty">尚未设定目标，可在设置页填写。</p>;
  const visible = rows.filter((row) => row.current != null);
  if (!visible.length) return <p className="empty">当前暂无数据</p>;
  return (
    <div className="stack">
      {visible.map((row) => (
        <div key={row.key}>
          <div className="kpi">
            <strong>{row.label}</strong>
            <span className="muted">
              {row.current ?? "—"} → {row.target ?? "—"}
            </span>
          </div>
          <p className="muted">{row.gapText}</p>
          {row.progress != null ? (
            <div className="progress" style={{ marginTop: 6 }}>
              <span style={{ width: `${row.progress}%` }} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
