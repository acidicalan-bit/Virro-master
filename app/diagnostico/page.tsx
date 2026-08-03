import type { Metadata } from "next";
import { DiagnosticForm } from "@/components/diagnostic-form";
export const metadata: Metadata = { title: "Diagnóstico", description: "Comparte el punto de partida de tu negocio y descubre un siguiente paso realista." };
export default function Page() { return <main id="main-content"><section className="page-hero section"><div className="shell"><span className="eyebrow">Diagnóstico breve</span><h1 className="display">Empecemos por lo que más importa ahora.</h1><p className="lead">Información mínima, propósito claro y sin obligación de contratar todo. Esta versión guarda nada: es una demostración del flujo.</p><DiagnosticForm /></div></section></main>; }
