import type { Metadata } from "next";
import { CapabilityPage } from "@/components/capability-page";
export const metadata: Metadata = { title: "Academy", description: "Capacitación y adopción ligadas a cada implementación." };
export default function Page() { return <CapabilityPage type="academy" />; }
