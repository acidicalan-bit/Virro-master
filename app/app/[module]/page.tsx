import { notFound } from "next/navigation";
import { moduleMap } from "@/lib/config/modules";
import { ModuleOverview } from "@/components/modules/module-overview";
import { DemoScenarioLibrary } from "@/components/scenarios/demo-scenario-library";
import { ProductDeliveryPack } from "@/components/packs/product-delivery-pack";
import { AIUnderstandingPack } from "@/components/packs/ai-understanding-pack";
import { HandoffIntelligencePack } from "@/components/packs/handoff-intelligence-pack";
import { ProcessUnderstandingPack } from "@/components/packs/process-understanding-pack";
import { OnboardingPack } from "@/components/packs/onboarding-pack";
import { ConsultingDeliveryPack } from "@/components/packs/consulting-delivery-pack";
import { TalentStaffingPack } from "@/components/packs/talent-staffing-pack";
import { TechnicalDocumentationPack } from "@/components/packs/technical-documentation-pack";
import { ReportBuilder } from "@/components/reports/report-builder";
import { PrivacyTrust } from "@/components/privacy/privacy-trust";

export function generateStaticParams() {
  return [...moduleMap.keys()].filter((id) => id !== "dashboard" && id !== "inbox").map((module) => ({ module }));
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleId } = await params;
  const definition = moduleMap.get(moduleId);
  if (!definition || moduleId === "dashboard" || moduleId === "inbox") notFound();
  if (moduleId === "demo-scenarios") return <DemoScenarioLibrary />;
  if (moduleId === "product-delivery") return <ProductDeliveryPack />;
  if (moduleId === "ai-understanding") return <AIUnderstandingPack />;
  if (moduleId === "handoff-intelligence") return <HandoffIntelligencePack />;
  if (moduleId === "process-understanding") return <ProcessUnderstandingPack />;
  if (moduleId === "onboarding") return <OnboardingPack />;
  if (moduleId === "consulting-delivery") return <ConsultingDeliveryPack />;
  if (moduleId === "talent-staffing") return <TalentStaffingPack />;
  if (moduleId === "technical-documentation") return <TechnicalDocumentationPack />;
  if (moduleId === "reports") return <ReportBuilder />;
  if (moduleId === "privacy-trust") return <PrivacyTrust />;
  return <ModuleOverview moduleId={definition.id} />;
}
