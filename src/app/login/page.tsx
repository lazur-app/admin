"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { startGoogleLogin } from "@/lib/api";

const ERRORS: Record<string, string> = {
  not_allowed: "That Google account isn't on the admin list.",
  expired: "Your admin session ended. Sign in again.",
};

function Login() {
  const error = useSearchParams().get("error");
  return (
    <AuthCard>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Sign in</h1>
      <p className="mt-2 text-[14px] text-muted">Google, then the code from your authenticator app.</p>
      {error ? <p className="mt-5 rounded-2xl bg-rose/30 px-4 py-3 text-[13px] text-ink">{ERRORS[error] ?? "Sign-in failed."}</p> : null}
      <button
        type="button"
        onClick={startGoogleLogin}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[14px] font-medium text-white transition hover:bg-black"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      <p className="mt-5 text-center text-[12px] text-faint">Only listed admins can sign in. Every sign-in is logged.</p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
