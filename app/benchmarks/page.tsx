import type { Metadata } from "next";

import { BenchmarkLab } from "@/src/ui/benchmark-lab";

export const metadata: Metadata = { title: "Benchmarks · Intent Lab" };

export default function BenchmarksPage() {
  return <BenchmarkLab />;
}
