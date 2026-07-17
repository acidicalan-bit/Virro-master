import type { Metadata } from "next";
import { DemoHub } from "@/components/landing/demo-hub";

export const metadata: Metadata = { title: "Demo enterprise | Virro", description: "Explora seis áreas simuladas del sistema de entendimiento operativo de Virro.", alternates: { canonical: "/demo" } };
export default function Page() { return <DemoHub />; }
