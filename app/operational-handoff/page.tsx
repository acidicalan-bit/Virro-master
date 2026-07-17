import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";

export const metadata: Metadata = { title: "Operational Handoff | Virro", description: "Aclara receptor, acción, evidencia y aceptación cuando el trabajo pasa entre equipos.", alternates: { canonical: "/operational-handoff" } };
export default function Page() {
  return <CommercialSeoPage capabilityStatus="pilot" eyebrow="Operational Handoff" title="Un handoff no termina cuando se envía: termina cuando el receptor puede actuar." description="Virro estructura qué se transfiere, quién lo recibe, qué acción se espera, qué evidencia falta y qué debe confirmar el receptor antes de aceptar el handoff." sections={[{ title: "Origen", copy: "Hace explícita la intención que el emisor necesita conservar.", points: ["Responsable", "Alcance", "Versión vigente"] }, { title: "Receptor", copy: "Identifica lo que el siguiente equipo necesita para actuar sin reconstruir contexto.", points: ["Acción esperada", "Dependencias", "Preguntas críticas"] }, { title: "Aceptación", copy: "Separa una entrega enviada de un handoff confirmado.", points: ["Evidencia", "Limitaciones", "Confirmación humana"] }]} />;
}
