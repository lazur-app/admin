import type { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[400px] rounded-[32px] bg-card p-9 shadow-[0_30px_80px_-40px_rgba(18,19,22,0.35)]">
        <div className="mb-7 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-[15px] font-bold text-ink">L</span>
          <span className="text-[15px] font-semibold">Lazur Admin</span>
        </div>
        {children}
      </div>
    </div>
  );
}
