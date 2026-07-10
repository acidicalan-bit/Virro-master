import type { EventStatus } from "@/lib/types/understanding";

const styles: Record<EventStatus, string> = {
  Ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  "Needs context": "border-amber-400/25 bg-amber-400/10 text-amber-300",
  "In review": "border-sky-400/25 bg-sky-400/10 text-sky-300",
  "At risk": "border-rose-400/25 bg-rose-400/10 text-rose-300",
};

export function StatusPill({ status }: { status: EventStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>{status}</span>;
}
