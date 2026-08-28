"use client";

import { useEffect, useRef, useState } from "react";

// 危险操作确认弹窗：要求输入与账号一致的用户名后才能确认
export function ConfirmDialog({
  open,
  username,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  username: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // 仅在打开时挂载，输入状态随关闭自动清空
  if (!open) return null;
  return (
    <DialogBody
      username={username}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function DialogBody({
  username,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  username: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在挂载时聚焦与监听
  }, []);

  const ok = text.trim() === username;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        <p className="muted">{description}</p>
        <p>
          请输入用户名 <strong>{username}</strong> 以确认：
        </p>
        <input
          ref={inputRef}
          className="input"
          value={text}
          autoComplete="off"
          placeholder={username}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ok) onConfirm();
          }}
        />
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={onCancel}>
            取消
          </button>
          <button className="btn danger" type="button" disabled={!ok} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
