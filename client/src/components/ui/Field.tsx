import type { ComponentProps, ReactNode } from "react";

const inputBase =
  "w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/50 outline-none transition focus:border-plum/50 focus:ring-2 focus:ring-plum/15";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-soft/80">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={`${inputBase} min-h-[96px] resize-none ${className}`} {...props} />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputBase} pr-3 ${className}`} {...props} />;
}
