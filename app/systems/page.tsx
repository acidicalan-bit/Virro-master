import type { Metadata } from "next";
import { CapabilityPage } from "@/components/capability-page";
export const metadata: Metadata = { title: "Systems", description: "Web, atención, seguimiento y automatización para problemas concretos." };
export default function Page() { return <CapabilityPage type="systems" />; }
