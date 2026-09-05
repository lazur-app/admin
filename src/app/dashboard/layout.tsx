"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { QueryProvider } from "@/lib/query";
import {
  fetchAdminMe,
  hasValidSessionToken,
  type AdminProfile,
} from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasValidSessionToken()) {
      router.replace("/login");
      return;
    }

    fetchAdminMe()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof Error && err.message === "not_admin") {
          setError("Admin access required for this account.");
        } else {
          router.replace("/login");
        }
      });
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <QueryProvider>
      <AdminShell profile={profile}>{children}</AdminShell>
    </QueryProvider>
  );
}
