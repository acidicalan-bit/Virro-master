import { PreservationStudyLab } from "@/src/ui/preservation-study-lab";

export default async function PreservationStudyPage({ searchParams }: { searchParams: Promise<{ caseId?: string; transactionId?: string }> }) {
  const params = await searchParams;
  return <PreservationStudyLab initialCaseId={params.caseId ?? null} initialTransactionId={params.transactionId ?? ""} />;
}
