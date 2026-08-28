"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// AI 偶尔幻觉输出 localhost 链接，渲染时降级为纯文本
function SafeLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (href && /\/\/(www\.)?(localhost|127\.0\.0\.1)/.test(href)) return <span>{children}</span>;
  return <a href={href}>{children}</a>;
}

export function Md({ children }: { children: string }) {
  return (
    <div className="markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={{ a: SafeLink }}>
        {children}
      </Markdown>
    </div>
  );
}
