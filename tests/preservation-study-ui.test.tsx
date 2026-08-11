import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreservationStudyLab } from "@/src/ui/preservation-study-lab";
import type { PreservationStudyCaseView } from "@/src/application/outcome/media/preservation-study-service";

const caseId = "20000000-0000-4000-8000-000000000001";
const source = { url: "data:image/png;base64,AA==", width: 10, height: 10, sha256: "a".repeat(64) };
const baseCase = {
  caseId,
  transactionId: "20000000-0000-4000-8000-000000000002",
  topology: "LOCAL_COUPLED",
  taskType: "COLOR_CHANGE",
  planCaseId: "lc-01-jacket-shadow",
  source,
  instruction: "Haz la chamarra café oscuro sin cambiar a la persona.",
  roi: { x: .2, y: .2, width: .3, height: .3 },
  coupledBand: { unit: "NORMALIZED_MIN_DIMENSION", size: .04 },
  provider: "openai",
  model: "gpt-image-2",
  intent: null,
  candidate: null,
  pair: null,
  reveal: null,
  completedEvaluation: null,
};
const dashboard = {
  study: { id: "20000000-0000-4000-8000-000000000003", name: "Study", protocolVersion: "preservation-value-study-v0.1", targetCaseCount: 30 },
  progress: { enrolled: 1, completed: 0, target: 30 },
  cases: [],
  plan: [],
  planDistribution: { LOCAL_INDEPENDENT: 8, LOCAL_COUPLED: 10, STRUCTURAL: 8, GLOBAL: 4 },
  report: { readyForGateDecision: false, suggestedDecision: null, overall: { caseCount: 0, preservedPreferenceRate: null, rawPreferenceRate: null, tieRate: null, bothBadRate: null, rawAcceptanceRate: null, preservedAcceptanceRate: null, acceptanceLift: null, averageRatings: { RAW: {}, PRESERVED: {} }, failureTagCounts: {}, divergenceTagCounts: {} }, byTopology: {}, byTaskType: {}, byCoupledBand: {} },
};

describe("Preservation Value Study UI", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("enforces intent-first, isolated A/B scoring, reveal, and independent acceptance", async () => {
    window.history.replaceState({}, "", `/preservation-study?caseId=${caseId}`);
    let current = { ...baseCase, step: "HUMAN_INTENT" } as PreservationStudyCaseView;
    const actions: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.body) {
        if (String(input).includes("caseId")) return response({ studyCase: current });
        return response({ dashboard });
      }
      const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
      actions.push(String(payload.action));
      if (payload.action === "lockIntent") current = { ...current, step: "RATING_A", intent: { expectedChange: String(payload.expectedChange), expectedPreservation: String(payload.expectedPreservation), unacceptableNotes: null, lockedAt: "2026-08-11T00:00:00Z" }, candidate: { label: "A", url: `/api/preservation-study/media?caseId=${caseId}&label=A`, width: 10, height: 10 } };
      if (payload.action === "rateCandidate" && payload.candidateLabel === "A") current = { ...current, step: "RATING_B", candidate: { label: "B", url: `/api/preservation-study/media?caseId=${caseId}&label=B`, width: 10, height: 10 } };
      else if (payload.action === "rateCandidate" && payload.candidateLabel === "B") current = { ...current, step: "PAIRWISE", candidate: null, pair: [{ label: "A", url: `/api/preservation-study/media?caseId=${caseId}&label=A`, width: 10, height: 10 }, { label: "B", url: `/api/preservation-study/media?caseId=${caseId}&label=B`, width: 10, height: 10 }] };
      if (payload.action === "recordPairwise") current = { ...current, step: "ACCEPTANCE", pair: null, reveal: { candidateA: "PRESERVED", candidateB: "RAW", derivedPreference: "PRESERVED_BETTER", divergenceTags: [], rawMetrics: {} as never, preservedMetrics: {} as never } };
      if (payload.action === "recordAcceptance") current = { ...current, step: "COMPLETE", completedEvaluation: { rawRatings: { requestedEditSuccess: 0, preservationSuccess: 0, naturalness: 0, artifactFreedom: 0, overallUsefulness: 0 }, preservedRatings: { requestedEditSuccess: 0, preservationSuccess: 0, naturalness: 0, artifactFreedom: 0, overallUsefulness: 0 }, rawAccepted: Boolean(payload.rawAccepted), preservedAccepted: Boolean(payload.preservedAccepted) } };
      return response({ studyCase: current });
    }));

    render(<PreservationStudyLab initialCaseId={caseId} />);
    expect(await screen.findByRole("heading", { name: "Expectativa humana" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Candidato A/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("EXPECTED CHANGE"), { target: { value: "Cambiar solo la chamarra" } });
    fireEvent.change(screen.getByLabelText("EXPECTED PRESERVATION"), { target: { value: "Conservar identidad y fondo" } });
    fireEvent.click(screen.getByRole("button", { name: "Bloquear expectativa y revelar A" }));

    expect(await screen.findByRole("heading", { name: "Candidato A" })).toBeInTheDocument();
    expect(screen.getByAltText("Candidato A").getAttribute("src")).toContain("label=A");
    expect(screen.queryByText(/A = PRESERVED/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bloquear calificación de A" }));

    expect(await screen.findByRole("heading", { name: "Candidato B" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Candidato A" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bloquear calificación de B" }));
    expect(await screen.findByRole("heading", { name: "Decisión pairwise" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A_BETTER" }));

    expect(await screen.findByRole("heading", { name: "A = PRESERVED · B = RAW" })).toBeInTheDocument();
    const rawQuestion = screen.getByRole("group", { name: "¿Aceptarías RAW como resultado final?" });
    const preservedQuestion = screen.getByRole("group", { name: "¿Aceptarías PRESERVED como resultado final?" });
    fireEvent.click(within(rawQuestion).getByLabelText("No"));
    fireEvent.click(within(preservedQuestion).getByLabelText("Sí"));
    fireEvent.click(screen.getByRole("button", { name: "Bloquear aceptación" }));
    expect(await screen.findByText("Caso inmutable completado")).toBeInTheDocument();
    await waitFor(() => expect(actions).toEqual(["lockIntent", "rateCandidate", "rateCandidate", "recordPairwise", "recordAcceptance"]));
  });
});

function response(value: unknown): Response {
  return { ok: true, json: async () => value } as Response;
}
