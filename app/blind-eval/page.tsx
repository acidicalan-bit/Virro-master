import type { Metadata } from "next";

import { BlindEvaluationLab } from "@/src/ui/blind-evaluation-lab";

export const metadata: Metadata = { title: "Blind Eval · Intent Lab" };

export default function BlindEvaluationPage() {
  return <BlindEvaluationLab />;
}
