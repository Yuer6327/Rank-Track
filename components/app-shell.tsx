"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CORE = [
  { href: "/", label: "首页" },
  { href: "/analysis", label: "分析" },
  { href: "/data", label: "数据" },
  { href: "/settings", label: "设置" },
];

const MORE = [
  { href: "/notes", label: "笔记" },
  { href: "/help", label: "帮助" },
];

export function AppShell({
  children,
  username,
}: {
  children: React.ReactNode;
  username?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAuth = pathname === "/login" || pathname === "/register";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (isAuth) return <>{children}</>;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <Image src="/logo.png" alt="" width={28} height={28} />
            Rank Track
          </Link>
          <nav className="nav">
            {CORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(pathname === item.href && "active")}
              >
                {item.label}
              </Link>
            ))}
            {MORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("wide", pathname === item.href && "active")}
              >
                {item.label}
              </Link>
            ))}
            <div className="more-menu nav-extra">
              <button className="nav-more" type="button" onClick={() => setOpen((v) => !v)}>
                更多
              </button>
              {open ? (
                <div className="more-pop">
                  {MORE.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
          <span className="muted">{username}</span>
          <button className="btn ghost" type="button" onClick={logout}>
            退出
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
