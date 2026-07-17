import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Jira Readiness Shadow Scan | Virro",
  description:
    "Virro muestra qué tickets comenzaron con contexto insuficiente y qué cambió después, en modo de solo lectura.",
  alternates: { canonical: "/jira-readiness" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="planned"
      eyebrow="Jira Readiness · Connector candidate"
      title="Observa readiness y cambios dentro de un proyecto de Jira."
      description="Jira es el primer candidato de conector nativo. La experiencia actual demuestra cómo funcionaría un análisis de solo lectura; no afirma un conector autoservicio productivo."
      cta="Evaluar un flujo de Jira"
      sections={[
        {
          title: "Cómo funciona",
          copy: "El alcance planeado observa un proyecto sin modificar tickets ni bloquear el flujo.",
          points: [
            "Solo lectura",
            "Un proyecto",
            "Acceso revocable",
            "Reporte privado",
          ],
        },
        {
          title: "Signal Sufficiency",
          copy: "Virro no fuerza un score cuando la evidencia disponible no permite un veredicto confiable.",
          points: [
            "Fuentes sin acceso",
            "Reuniones no disponibles",
            "Tickets demasiado desestructurados",
          ],
        },
        {
          title: "Change Integrity",
          copy: "Detecta cambios posteriores que podrían dejar criterios, pruebas o referencias desactualizadas.",
          points: [
            "Historias modificadas",
            "QA pendiente",
            "Documentación referenciada",
          ],
        },
      ]}
    />
  );
}
