"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasValidSessionToken, startGoogleLogin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (hasValidSessionToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafaf9] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Lazur
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Admin sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Google account must have <code className="text-zinc-700">is_admin</code>{" "}
          set in the database.
        </p>
        <button
          type="button"
          onClick={() => startGoogleLogin()}
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
