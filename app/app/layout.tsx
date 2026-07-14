import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Demo enterprise | Virro",
  description: "Demo simulada de Virro para explorar readiness, riesgos y siguientes acciones.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function EnterpriseAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
