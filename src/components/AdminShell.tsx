"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminProfile } from "@/lib/auth";
import { logout } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/cost", label: "Cost" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/feedback", label: "Feedback" },
  { href: "/dashboard/compare", label: "Compare" },
  { href: "/dashboard/ops", label: "Ops" },
];

export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-56 flex-col border-r border-white/10 bg-zinc-950 p-4">
        <div className="mb-8 px-2">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
            Lazur
          </p>
          <p className="text-lg font-semibold text-zinc-50">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-violet-600/20 font-semibold text-violet-200"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="truncate px-2 text-xs text-zinc-500">{profile.email}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-950 p-8">{children}</main>
    </div>
  );
}
