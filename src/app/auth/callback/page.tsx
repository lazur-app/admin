"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAdminMe, storeTokens } from "@/lib/auth";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (!accessToken) {
      setError("Missing access token from OAuth callback.");
      return;
    }

    storeTokens(accessToken, refreshToken);

    fetchAdminMe()
      .then((profile) => {
        if (!profile) {
          setError("Could not verify admin session.");
          return;
        }
        router.replace("/dashboard");
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "not_admin") {
          setError("This account is not an admin. Set users.is_admin = true in the database.");
        } else {
          setError("Sign-in failed. Try again.");
        }
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-zinc-900 p-8 text-center shadow-sm">
          <p className="text-red-300">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-block text-sm text-zinc-400 hover:text-zinc-100"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-sm text-zinc-500">Signing in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
