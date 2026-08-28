import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ThemeScript, ThemeSync } from "@/components/theme";
import { getSessionUser } from "@/lib/session";
import { getSettings } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rank Track",
  description: "上海高考生成绩排名追踪与分析",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  let theme: "light" | "dark" | "system" = "system";
  let accent = true;
  if (user) {
    try {
      const settings = await getSettings(user.id);
      theme = settings.theme_mode;
      accent = settings.accent_colors;
    } catch {
      theme = "system";
    }
  }
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <ThemeSync mode={theme} accent={accent} />
        <AppShell username={user?.username}>{children}</AppShell>
      </body>
    </html>
  );
}
