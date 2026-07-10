"use client";

import { CheckSquare2, Handshake, ShieldAlert, Workflow } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { demoScenarios } from "@/lib/data/demo-scenarios";
import { FactGrid, InsightList, LabeledList, PackHeader, ScoreHero, SectionCard } from "./shared";

const paths = ["Product → Development", "Development → QA", "QA → QA Automation", "QA → DevOps", "Business → Data", "Company → Consultant", "Process → AI"];

export function HandoffIntelligencePack() {
  const { t } = useLanguage();
  const scenario = demoScenarios[1];
  return <div className="space-y-6"><PackHeader order="09" eyebrow="Handoff Intelligence Pack" title={t("Is this ready for the next team to execute?", "¿Esto está listo para que el siguiente equipo pueda ejecutar?")} description={t("Validate whether the information one team delivers is ready for the next team to work without rework.", "Valida si la información que un equipo entrega está lista para que el siguiente equipo pueda trabajar sin retrabajo.")} statement={t("A handoff is ready when the receiver can act without reconstructing the sender’s intent.", "Un handoff está listo cuando el receptor puede actuar sin reconstruir la intención del emisor.")} icon={<Handshake size={15} />} />
    <section className="grid gap-4 xl:grid-cols-[.68fr_1.32fr]"><ScoreHero label="Handoff Readiness Score" value={scenario.mockScores.handoffReadiness} detail="Estimated from receiver fit, ownership, dependencies, timing and definition of done." /><SectionCard title="Supported handoff paths" icon={<Workflow size={15} />}><div className="grid gap-2 sm:grid-cols-2">{paths.map((path) => <div key={path} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[10px] font-medium">{path}</div>)}</div></SectionCard></section>
    <section className="grid gap-4 lg:grid-cols-2"><LabeledList label="What is clear" items={["Source team: QA", "Target capability: automated regression", "Business moment: before release", "Functional area: checkout"]} /><LabeledList label="What is missing" items={scenario.expectedAnalysis.missingInformation} tone="rose" /></section>
    <section className="grid gap-4 lg:grid-cols-3"><LabeledList label="Blockers" items={["No automation priority", "Test data ownership is undefined", "Environment readiness is unknown"]} tone="rose" /><LabeledList label="Rework risks" items={scenario.expectedAnalysis.risks} tone="amber" /><LabeledList label="Critical questions" items={["Which cases protect the highest business risk?", "Who supplies stable test data?", "What makes the handoff accepted?"]} /></section>
    <section className="grid gap-4 lg:grid-cols-2"><SectionCard title="Pre-handoff checklist" icon={<CheckSquare2 size={15} />}><InsightList items={["One accountable receiver is named", "Priority and scope are explicit", "Dependencies and access are confirmed", "Definition of done is measurable", "Blocking questions are answered"]} /></SectionCard><SectionCard title="Handoff-ready version" icon={<ShieldAlert size={15} />}><div className="rounded-xl border border-teal-400/15 bg-teal-400/[.045] p-4 text-xs leading-6 text-[var(--muted)]">QA Automation owns the top 12 checkout regression scenarios before release R24. Test data is provided by QA in the staging dataset. Automation is complete when the suite runs in CI, failures link to the manual evidence, and the QA Lead accepts coverage.</div></SectionCard></section>
    <SectionCard title="Current handoff profile"><FactGrid facts={[{ label: "Probable intent", value: scenario.expectedAnalysis.probableIntent }, { label: "Target receiver", value: scenario.targetReceiver }, { label: "Source → Target", value: "QA → QA Automation" }, { label: "Recommended output", value: scenario.generatedOutput.title }]} /></SectionCard>
  </div>;
}
