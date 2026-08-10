import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  BlindSessionView,
  HumanIntentSummary,
  StepRatingSummary,
} from "@/src/application/blind-evaluation-service";
import type { BlindRatings } from "@/src/domain/blind-evaluation";
import { BlindEvaluationLab } from "@/src/ui/blind-evaluation-lab";
import { validContract } from "@/tests/helpers";

const sessionId = "09016489-1647-4f3b-9e9a-c7f1d8d858c2";
const comparisonId = "1bbd6ea7-b0f0-48df-8100-ae84c2505340";
const evaluationCaseId = "2bbd6ea7-b0f0-48df-8100-ae84c2505340";
const caseView = { rawInput: "Está raro.", context: "landing page", domain: "diseño web" };

const perfectRatings: BlindRatings = {
  intendedMeaning: 2,
  contextualUnderstanding: 2,
  implicitExpectations: 2,
  assumptionSafety: 2,
  clarificationQuality: 2,
  interactionMode: 2,
  preservationIntent: 2,
  overallUsefulness: 2,
};

const humanIntent: HumanIntentSummary = {
  intendedMeaning: "La persona detecta una inconsistencia visual y quiere corregirla.",
  expectedNextAction: "EXPLORE",
  preservationNotes: "Conservar la estructura aprobada.",
  recordedAt: "2026-08-09T00:00:00Z",
  lockedAt: "2026-08-09T00:00:00Z",
};

const stepRating: StepRatingSummary = {
  ratings: perfectRatings,
  errorTags: [],
  evaluatorNotes: null,
  recordedAt: "2026-08-09T00:01:00Z",
};

const comparison = {
  id: comparisonId,
  sessionId,
  evaluationCaseId,
  caseNumber: 1,
  totalCases: 1,
  case: caseView,
  responseA: {
    status: "SUCCESS" as const,
    contract: validContract({
      interpretedIntent: "Interpretación A",
      interpretedMeaning: "Significado explicado A",
    }),
  },
  responseB: {
    status: "SUCCESS" as const,
    contract: validContract({
      interpretedIntent: "Interpretación B",
      interpretedMeaning: "Significado explicado B",
    }),
  },
};

const humanIntentSession: BlindSessionView = {
  sessionId,
  status: "IN_PROGRESS",
  progress: { completed: 0, total: 1 },
  step: "HUMAN_INTENT",
  evaluationCaseId,
  case: caseView,
  humanIntent: null,
  comparison: null,
  stepRating1: null,
  stepRating2: null,
  reveal: null,
};

const ratingOutput1Session: BlindSessionView = {
  ...humanIntentSession,
  step: "RATING_OUTPUT_1",
  humanIntent,
  comparison,
};

const ratingOutput2Session: BlindSessionView = {
  ...ratingOutput1Session,
  step: "RATING_OUTPUT_2",
  stepRating1: stepRating,
};

const preferenceSession: BlindSessionView = {
  ...ratingOutput2Session,
  step: "PREFERENCE",
  stepRating2: stepRating,
};

const completedSession: BlindSessionView = {
  ...preferenceSession,
  status: "COMPLETED",
  progress: { completed: 1, total: 1 },
  step: null,
  evaluationCaseId: null,
  case: null,
  humanIntent: null,
  comparison: null,
  stepRating1: null,
  stepRating2: null,
  reveal: {
    baseline: {
      provider: "intent-lab",
      model: "contextual-heuristic",
      modelVersion: "0.1.0",
      revision: "1d3353c",
      systemInstructionVersion: "heuristic-baseline-0.1.0",
    },
    candidate: {
      provider: "openai",
      model: "gpt-5.6-luna",
      modelVersion: null,
      systemInstructionVersion: "intent-compiler-system-1.0.0",
    },
    metrics: {
      humanIntentMatchScore: { baseline: 1, candidate: 2 },
      interactionModeAccuracy: { baseline: 0, candidate: 1 },
      humanPreservationScore: { baseline: 1, candidate: 2 },
      averageIndependentScore: { baseline: 1, candidate: 2 },
      bothGoodRate: 0,
      bothBadRate: 0,
      providerFailureRate: 0,
    },
    cases: [
      {
        comparisonId,
        externalId: "unseen-1",
        responseASource: "CANDIDATE",
        responseBSource: "BASELINE",
        privateEvaluatorNotes: "private",
        expectedHighLevelBehavior: "expected",
        humanIntent,
        stepRating1: stepRating,
        stepRating2: stepRating,
        responseAMetadata: null,
        responseBMetadata: null,
      },
    ],
  },
};

const setResponse = {
  sets: [
    {
      id: "8903ae4b-32cc-44bd-9586-a1c364e1250d",
      slug: "blind",
      name: "Blind set",
      description: null,
      sourceLabel: "external",
      isDemo: true,
      caseCount: 1,
      frozenAt: "2026-08-09T00:00:00Z",
    },
  ],
};

function scoreCurrentOutput(value = "2") {
  for (const select of screen.getAllByRole("combobox")) {
    fireEvent.change(select, { target: { value } });
  }
}

describe("blind evaluation UI", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("locks human intent before showing outputs, rates them sequentially, and reveals providers only at completion", async () => {
    let ratingSubmissions = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/blind-eval/sets") {
        return { ok: true, json: async () => setResponse } as Response;
      }
      if (url === "/api/blind-eval/sessions") {
        return { ok: true, json: async () => ({ session: humanIntentSession }) } as Response;
      }
      if (url === "/api/blind-eval/human-intent") {
        return { ok: true, json: async () => ({ session: ratingOutput1Session }) } as Response;
      }
      if (url === "/api/blind-eval/step-ratings") {
        ratingSubmissions += 1;
        return {
          ok: true,
          json: async () => ({
            session: ratingSubmissions === 1 ? ratingOutput2Session : preferenceSession,
          }),
        } as Response;
      }
      if (url === "/api/blind-eval/judgments") {
        return { ok: true, json: async () => ({ session: completedSession }) } as Response;
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BlindEvaluationLab />);
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión ciega" }));

    expect(await screen.findByText("¿Qué cree que quiere esta persona?")).toBeInTheDocument();
    expect(screen.queryByText("Interpretación A")).not.toBeInTheDocument();
    expect(
      screen.getByText("La instrucción ya es clara: realizarla tal como está."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Falta un detalle menor: elegir una opción segura y reversible y continuar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Elige qué debería hacer el sistema ahora, no qué información podría inferir.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Significado intencional"), {
      target: { value: humanIntent.intendedMeaning },
    });
    fireEvent.click(screen.getByLabelText(/EXPLORE/));
    fireEvent.click(screen.getByRole("button", { name: "Bloquear interpretación e iniciar evaluación" }));

    expect(await screen.findByText("Interpretación A")).toBeInTheDocument();
    expect(screen.queryByText("Interpretación B")).not.toBeInTheDocument();
    expect(screen.queryByText("gpt-5.6-luna")).not.toBeInTheDocument();
    scoreCurrentOutput();
    fireEvent.click(screen.getByRole("button", { name: "Guardar calificación" }));

    expect(await screen.findByText("Interpretación B")).toBeInTheDocument();
    expect(screen.queryByText("Interpretación A")).not.toBeInTheDocument();
    expect(screen.queryByText("Output 1 calificado")).not.toBeInTheDocument();
    scoreCurrentOutput();
    fireEvent.click(screen.getByRole("button", { name: "Guardar calificación" }));

    expect(await screen.findByRole("heading", { name: "¿Preferencia general? (opcional)" })).toBeInTheDocument();
    expect(screen.getByText("Interpretación A")).toBeInTheDocument();
    expect(screen.getByText("Interpretación B")).toBeInTheDocument();
    expect(screen.queryByText("gpt-5.6-luna")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("A claramente mejor"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    expect(await screen.findByText("Identidades reveladas")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
  });

  it("maps interpretedIntent to the output heading and interpretedMeaning to its explanation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/blind-eval/sets") {
          return { ok: true, json: async () => setResponse } as Response;
        }
        if (url === "/api/blind-eval/sessions") {
          return { ok: true, json: async () => ({ session: ratingOutput1Session }) } as Response;
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    render(<BlindEvaluationLab />);
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión ciega" }));
    const responseA = (await screen.findByText("Output 1")).closest("article");
    expect(responseA).not.toBeNull();
    expect(
      within(responseA as HTMLElement).getByRole("heading", { name: "Interpretación A" }),
    ).toBeInTheDocument();
    const meaning = within(responseA as HTMLElement).getByText("Significado explicado A");
    expect(meaning.tagName).toBe("P");
    expect(meaning).toHaveClass("response-meaning");
  });

  it("advances to a fresh human-intent step for the next case without retaining prior output", async () => {
    const nextCaseSession: BlindSessionView = {
      ...humanIntentSession,
      progress: { completed: 1, total: 2 },
      evaluationCaseId: "4bbd6ea7-b0f0-48df-8100-ae84c2505340",
      case: {
        rawInput: "Quita el vaso de la mesa.",
        context: null,
        domain: "image_editing",
      },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/blind-eval/sets") {
        return { ok: true, json: async () => setResponse } as Response;
      }
      if (url === "/api/blind-eval/sessions") {
        return { ok: true, json: async () => ({ session: preferenceSession }) } as Response;
      }
      if (url === "/api/blind-eval/judgments") {
        return { ok: true, json: async () => ({ session: nextCaseSession }) } as Response;
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BlindEvaluationLab />);
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión ciega" }));
    expect(await screen.findByText("Output 1 (A)")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Empate"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    expect(
      await screen.findByRole("heading", { name: "“Quita el vaso de la mesa.”" }),
    ).toBeInTheDocument();
    expect(screen.getByText("¿Qué cree que quiere esta persona?")).toBeInTheDocument();
    expect(screen.queryByText("Interpretación A")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Significado intencional")).toHaveValue("");
  });
});
