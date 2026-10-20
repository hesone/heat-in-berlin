import type { ReactNode } from "react";

const svg = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;

export const Icon = {
  polygon: () => (
    <svg {...svg} strokeLinejoin="round"><path d="M4 7l7-4 9 5-3 11-11 2z" /></svg>
  ),
  frame: () => (
    <svg {...svg}><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3" /></svg>
  ),
  search: () => (
    <svg {...svg}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
  ),
  plus: () => (
    <svg {...svg} width={18} height={18}><path d="M12 5v14M5 12h14" /></svg>
  ),
  minus: () => (
    <svg {...svg} width={18} height={18}><path d="M5 12h14" /></svg>
  ),
  fit: () => (
    <svg {...svg} width={18} height={18}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
  ),
  close: () => (
    <svg {...svg} width={18} height={18}><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  info: () => (
    <svg {...svg} width={12} height={12} strokeWidth={2.4}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
  ),
  download: () => (
    <svg {...svg}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
  ),
};

export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="6" fill="#1B1F24" />
      <path d="M7 19 L11 9 L14 15 L17 9 L21 19" fill="none" stroke="#FD8D3C" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function EstimateChip({ children = "Estimate" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-warn-bg px-2.5 text-xs font-semibold text-warn-fg">
      <Icon.info />
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, tone = "plain" }: { label: string; value: string; sub?: string; tone?: "plain" | "heat" | "pv" }) {
  const toneCls = {
    plain: "border border-line-soft",
    heat: "bg-heat-bg [&_.lbl]:text-heat-fg",
    pv: "bg-pv-bg [&_.lbl]:text-pv-fg",
  }[tone];
  return (
    <div className={`rounded-lg p-3 ${toneCls}`}>
      <p className="lbl text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="lbl text-xs text-muted">{sub}</p>}
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 font-semibold text-white hover:bg-[#2d333b] disabled:opacity-50",
  accent:
    "inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong disabled:opacity-50",
  secondary:
    "inline-flex h-11 items-center gap-2 rounded-lg border border-field bg-white px-4 font-semibold text-ink hover:bg-ground disabled:opacity-50",
  ghost: "inline-flex h-10 items-center gap-2 rounded-lg px-3 font-medium text-ink hover:bg-ground disabled:text-muted disabled:hover:bg-transparent",
};

export function Section({ title, id, children, className = "" }: { title?: string; id: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={title ? id : undefined} aria-label={title ? undefined : id} className={`border-b border-line-soft px-6 py-[18px] ${className}`}>
      {title && (
        <h2 id={id} className="mb-2.5 text-sm font-semibold">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
