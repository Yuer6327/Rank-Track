import type { ReactNode } from "react";
import { ViewTransition } from "react";
// react/canary 并非真实模块，仅为加载 ViewTransition 的 canary 类型声明
import type {} from "react/canary";

// 包裹各页内容：导航时旧页淡出下移、新页淡入上移（动画见 globals.css 的 ::view-transition 规则）
// 顶栏在 AppShell 中通过 viewTransitionName 锚定，不参与动画
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
