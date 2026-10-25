"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { AuthCard } from "@/components/AuthCard";
import { api, setSession } from "@/lib/api";

type Setup = { secret: string; otpauth_uri: string; email: string };

export default function CallbackPage() {
  const router = useRouter();
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [step, setStep] = useState<"setup" | "verify" | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", "/auth/callback"); // keep the token out of history
    const token = params.get("mfa_token");
    const s = params.get("step") === "verify" ? "verify" : "setup";
    if (!token) {
      router.replace("/login");
      return;
    }
    setMfaToken(token);
    setStep(s);
    if (s === "setup") {
      api<Setup>("/admin/auth/totp/setup", { method: "POST", body: JSON.stringify({ mfa_token: token }) })
        .then(async (data) => {
          setSetup(data);
          setQr(await QRCode.toDataURL(data.otpauth_uri, { margin: 1, width: 220 }));
        })
        .catch((e) => setError(e.message));
    }
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string }>("/admin/auth/verify", {
        method: "POST",
        body: JSON.stringify({ mfa_token: mfaToken, code }),
      });
      setSession(res.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
        {step === "setup" ? "Set up 2-step sign-in" : "Enter your code"}
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        {step === "setup"
          ? "Scan this with Google Authenticator, 1Password or Authy, then enter the 6-digit code."
          : "Open your authenticator app and enter the 6-digit code for Lazur Admin."}
      </p>
      {step === "setup" ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-surface p-5">
          {qr ? <img src={qr} alt="Authenticator QR code" className="h-[180px] w-[180px] rounded-2xl" /> : <div className="h-[180px] w-[180px] animate-pulse rounded-2xl bg-line" />}
          {setup ? <code className="select-all break-all text-center text-[11px] text-muted">{setup.secret}</code> : null}
        </div>
      ) : null}
      <form onSubmit={submit} className="mt-6">
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="h-14 w-full rounded-2xl border border-line bg-surface text-center text-[24px] font-semibold tracking-[0.4em] outline-none focus:border-ink"
        />
        {error ? <p className="mt-3 text-[13px] text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={code.length !== 6 || busy}
          className="mt-4 h-12 w-full rounded-full bg-ink text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40"
        >
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </AuthCard>
  );
}
