import { BadgeCheck, Clock, ShieldQuestion, type LucideIcon } from "lucide-react";

const MAP: Record<string, { label: string; cls: string; Icon: LucideIcon }> = {
  verified: { label: "Verified", cls: "text-sage", Icon: BadgeCheck },
  pending: { label: "Verification pending", cls: "text-gold", Icon: Clock },
  rejected: { label: "Not verified", cls: "text-ink-soft/70", Icon: ShieldQuestion },
  unverified: { label: "Not verified", cls: "text-ink-soft/70", Icon: ShieldQuestion },
};

export function VerifyBadge({ status, className = "" }: { status: string; className?: string }) {
  const v = MAP[status] ?? MAP.unverified;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${v.cls} ${className}`}>
      <v.Icon size={14} strokeWidth={2.2} />
      {v.label}
    </span>
  );
}
