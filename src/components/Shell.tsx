"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Cpu, LayoutGrid, LogOut, MessageSquareWarning, Radar, ScrollText, Search, Users } from "lucide-react";
import { api, clearSession, getSession } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/revenue", label: "Revenue", icon: BadgeDollarSign },
  { href: "/dashboard/costs", label: "Cost & margin", icon: Cpu },
  { href: "/dashboard/gaps", label: "Where we fall short", icon: Radar },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquareWarning },
  { href: "/dashboard/ops", label: "Ops & audit", icon: ScrollText },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!getSession()) router.replace("/login");
    else setReady(true);
  }, [router]);

  const me = useQuery({ queryKey: ["me"], queryFn: () => api<{ email: string; name: string | null; avatar_url: string | null }>("/admin/me"), enabled: ready });

  const logout = async () => {
    await api("/admin/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
    router.replace("/login");
  };

  if (!ready) return null;
  return (
    <div className="min-h-screen bg-canvas p-3 md:p-5">
      <div className="mx-auto flex max-w-[1440px] gap-5">
        <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-[76px] shrink-0 flex-col items-center md:flex">
          <Link href="/dashboard" className="grid h-[60px] w-[60px] place-items-center rounded-full bg-lime text-[20px] font-bold text-ink">L</Link>
          <nav className="mt-6 flex flex-col items-center gap-2.5 rounded-full bg-ink p-2.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} title={label}
                  className={`group relative grid h-12 w-12 place-items-center rounded-full transition ${active ? "bg-white text-ink" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                  <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
                  <span className="pointer-events-none absolute left-[60px] z-20 hidden whitespace-nowrap rounded-xl bg-ink px-3 py-1.5 text-[12px] text-white group-hover:block">{label}</span>
                </Link>
              );
            })}
          </nav>
          <button type="button" onClick={logout} title="Sign out"
            className="mt-auto grid h-12 w-12 place-items-center rounded-full bg-card text-muted transition hover:text-ink">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-6 flex items-center gap-3">
            <form className="relative w-full max-w-[420px]" onSubmit={(e) => { e.preventDefault(); router.push(`/dashboard/users?q=${encodeURIComponent(q)}`); }}>
              <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by email or name"
                className="h-[52px] w-full rounded-full bg-card pl-12 pr-5 text-[14px] outline-none placeholder:text-faint" />
            </form>
            <div className="ml-auto flex items-center gap-3 rounded-full bg-card py-1.5 pl-4 pr-1.5">
              <span className="hidden text-[13px] text-muted sm:block">{me.data?.email}</span>
              {me.data?.avatar_url ? <img src={me.data.avatar_url} alt="" className="h-10 w-10 rounded-full" /> : <span className="h-10 w-10 rounded-full bg-surface" />}
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
