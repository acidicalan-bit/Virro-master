import { notFound } from "next/navigation";
import { moduleMap } from "@/lib/config/modules";
import { ModuleOverview } from "@/components/modules/module-overview";

export function generateStaticParams() {
  return [...moduleMap.keys()].filter((id) => id !== "dashboard" && id !== "inbox").map((module) => ({ module }));
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleId } = await params;
  const moduleDefinition = moduleMap.get(moduleId);
  if (!moduleDefinition || moduleId === "dashboard" || moduleId === "inbox") notFound();
  return <ModuleOverview module={moduleDefinition} />;
}
