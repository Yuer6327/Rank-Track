"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Diff = {
  key: string;
  kind: "create" | "update" | "skip" | "sparse";
  incoming: { exam_name: string; exam_date: string; filledCount: number };
};

export function ImportPanel() {
  const router = useRouter();
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");

  async function preview(f: File) {
    setFile(f);
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setDiffs(data.diffs ?? []);
    setSelected((data.diffs ?? []).map((d: Diff) => d.key));
  }

  async function importJson(f: File) {
    const text = await f.text();
    const parsed = JSON.parse(text);
    const preview = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: parsed }),
    });
    const pre = await preview.json();
    if (!confirm(`将导入 ${pre.preview?.exams ?? 0} 场考试、${pre.preview?.notes ?? 0} 条笔记，确认？`)) return;
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: parsed, apply: true }),
    });
    setMsg(res.ok ? "JSON 备份已恢复" : "导入失败");
    router.refresh();
  }

  async function apply() {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("apply", "1");
    fd.set("keys", selected.join(","));
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setMsg(res.ok ? `已导入 ${data.applied} 条` : data.error);
    router.refresh();
  }

  return (
    <div className="stack">
      <label className="muted">Excel / CSV</label>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => e.target.files?.[0] && preview(e.target.files[0])}
      />
      <label className="muted">JSON 备份</label>
      <input
        type="file"
        accept=".json,application/json"
        onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
      />
      {diffs.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>考试</th>
                <th>日期</th>
                <th>类型</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr
                  key={d.key}
                  className={d.kind === "create" ? "diff-add" : d.kind === "update" ? "diff-del" : "diff-sparse"}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(d.key)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked ? [...s, d.key] : s.filter((x) => x !== d.key),
                        )
                      }
                    />
                  </td>
                  <td>{d.incoming.exam_name}</td>
                  <td>{d.incoming.exam_date}</td>
                  <td>{d.kind === "create" ? "新增" : d.kind === "update" ? "合并更新" : "字段过少，请确认"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {diffs.length ? (
        <button className="btn primary" type="button" onClick={apply}>
          确认导入
        </button>
      ) : null}
      {msg ? <p className="muted">{msg}</p> : null}
    </div>
  );
}
