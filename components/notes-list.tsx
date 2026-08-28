"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Md } from "./md";
import type { Exam, Note } from "@/lib/types";

export function NotesList({ notes, exams, presetExamId }: { notes: Note[]; exams: Exam[]; presetExamId?: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [examId, setExamId] = useState(presetExamId ?? "");
  const [editing, setEditing] = useState<string | null>(null);

  async function save(id?: string, text?: string, exam?: string | null) {
    const body = { content: text ?? content, exam_id: exam ?? (examId || null) };
    await fetch(id ? `/api/notes/${id}` : "/api/notes", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setContent("");
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>写笔记</h3>
        <div className="fields">
          <select className="select" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">不关联考试</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.exam_name} {e.exam_date}
              </option>
            ))}
          </select>
          <textarea
            className="textarea"
            maxLength={500}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="支持 Markdown，500 字内"
          />
          <p className="muted">{content.length}/500</p>
          <button className="btn primary" type="button" onClick={() => save()}>
            保存
          </button>
        </div>
      </section>
      {notes.map((n) => {
        const exam = exams.find((e) => e.id === n.exam_id);
        return (
          <article className="card" key={n.id}>
            <p className="muted">
              {exam ? `${exam.exam_name} · ${exam.exam_date}` : "未关联考试"} · {n.updated_at.slice(0, 10)}
            </p>
            {editing === n.id ? (
              <div className="fields mt-sm">
                <textarea
                  className="textarea"
                  maxLength={500}
                  defaultValue={n.content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <button className="btn" type="button" onClick={() => save(n.id, content || n.content, n.exam_id)}>
                  更新
                </button>
              </div>
            ) : (
              <div className="mt-sm">
                <Md>{n.content}</Md>
              </div>
            )}
            <div className="row mt-sm">
              <button className="btn ghost" type="button" onClick={() => setEditing(n.id)}>
                编辑
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  await fetch(`/api/notes/${n.id}`, { method: "DELETE" });
                  router.refresh();
                }}
              >
                删除
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
