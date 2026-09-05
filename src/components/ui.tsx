import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return <p className={`text-sm text-zinc-500 ${className ?? ""}`}>{label}</p>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-800 ${className}`} />
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "success" | "warn" | "danger";
}) {
  const tones = {
    muted: "bg-zinc-800 text-zinc-300",
    primary: "bg-violet-500/15 text-violet-300",
    success: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-300",
    danger: "bg-red-500/15 text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-500",
    secondary:
      "border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
    ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
    danger: "border border-red-500/30 text-red-300 hover:bg-red-500/10",
  };
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DataTable({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export const tableHeadClass =
  "border-b border-white/10 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500";
export const tableCellClass = "px-4 py-3 text-sm text-zinc-300";
