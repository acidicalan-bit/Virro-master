import type { Metadata } from "next";
import { InboxWorkbench } from "@/components/inbox/inbox-workbench";

export const metadata: Metadata = {
  title: "Bandeja de Entendimiento Operativo | Virro",
  description: "Virro mantiene el entendimiento operativo cuando la información se mueve, cambia o necesita convertirse en acción.",
};

export default function EnterpriseInboxPage() {
  return <InboxWorkbench />;
}
