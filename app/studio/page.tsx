import type { Metadata } from "next";
import { CapabilityPage } from "@/components/capability-page";
export const metadata: Metadata = { title: "Studio", description: "Identidad y experiencia física de marca conectadas a los canales digitales." };
export default function Page() { return <CapabilityPage type="studio" />; }
