"use client";

import { useEffect } from "react";

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{var t=localStorage.getItem("rt-theme")||"system";var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`,
      }}
    />
  );
}

export function applyTheme(mode: "light" | "dark" | "system") {
  const dark =
    mode === "dark" ||
    (mode !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  localStorage.setItem("rt-theme", mode);
}

export function ThemeSync({
  mode,
  accent,
}: {
  mode?: "light" | "dark" | "system";
  accent?: boolean;
}) {
  useEffect(() => {
    if (mode) applyTheme(mode);
    if (accent === false) document.documentElement.dataset.accent = "off";
    else document.documentElement.dataset.accent = "on";
  }, [mode, accent]);
  return null;
}
