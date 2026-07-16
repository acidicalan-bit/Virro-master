import { notFound, permanentRedirect } from "next/navigation";
import { moduleMap } from "@/lib/config/modules";

export function generateStaticParams() {
  return ["dashboard", ...[...moduleMap.keys()].filter((id) => id !== "dashboard" && id !== "inbox")].map((module) => ({ module }));
}

export default async function LegacyModuleRedirect({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (module === "dashboard") permanentRedirect("/app");
  if (!moduleMap.has(module) || module === "inbox") notFound();
  permanentRedirect(`/app/${module}`);
}
