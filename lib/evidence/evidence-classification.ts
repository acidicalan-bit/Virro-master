export type EvidenceClassification = "observed" | "estimated" | "inferred" | "client_confirmed" | "insufficient" | "limitation";

export const evidenceClassificationLabels: Record<EvidenceClassification, { en: string; es: string }> = {
  observed: { en: "Observed", es: "Observado" },
  estimated: { en: "Estimated", es: "Estimado" },
  inferred: { en: "Inferred", es: "Inferido" },
  client_confirmed: { en: "Client confirmed", es: "Confirmado por el cliente" },
  insufficient: { en: "Insufficient signal", es: "Señal insuficiente" },
  limitation: { en: "Limitation", es: "Limitación" },
};

export interface EvidenceItem {
  id: string;
  title: string;
  detail: string;
  classification: EvidenceClassification;
}

