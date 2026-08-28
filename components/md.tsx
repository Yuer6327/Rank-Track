"use client";

import Markdown from "react-markdown";

export function Md({ children }: { children: string }) {
  return (
    <div className="markdown">
      <Markdown>{children}</Markdown>
    </div>
  );
}
