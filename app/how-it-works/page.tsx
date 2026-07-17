import type { Metadata } from "next";
import { HowItWorksPage } from "@/components/landing/how-it-works-page";

export const metadata: Metadata = { title: "Cómo funciona Virro", description: "Conoce cómo Virro sigue el entendimiento operativo desde la fuente hasta un outcome confirmado.", alternates: { canonical: "/how-it-works" } };
export default function Page() { return <HowItWorksPage />; }
