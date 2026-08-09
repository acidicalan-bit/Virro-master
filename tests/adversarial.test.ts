import { describe, expect, it } from "vitest";

import { analyzePragmatics } from "@/src/domain/human-pragmatics";
import { HeuristicIntentModel } from "@/src/infrastructure/models/heuristic-intent-model";

const model = new HeuristicIntentModel();

async function compile(rawInput: string, context: string | null) {
  const input = { rawInput, context };
  return (await model.compile(input, analyzePragmatics(input))).contract;
}

describe("Gate 001 adversarial semantics", () => {
  it("distinguishes figurative football magic from literal fantasy magic", async () => {
    const football = await compile("Hizo magia con el balón.", "football / soccer");
    const fantasy = await compile("Pon magia saliendo de sus manos.", "fantasy character illustration");

    expect(football.interpretedMeaning).toContain("habilidad, creatividad y control");
    expect(football.prohibitedActions).toContain("No interpretar magia sobrenatural.");
    expect(fantasy.domain).toBe("ilustración");
    expect(fantasy.interpretedMeaning).toContain("magia” es literal");
    expect(fantasy.recommendedInteractionMode).toBe("EXECUTE");
  });

  it("detects sarcastic rejection and the anatomy defect", async () => {
    const contract = await compile(
      "Sí, quedó increíble... ahora tiene siete dedos.",
      "AI image editing feedback",
    );

    expect(contract.interpretedMeaning).toContain("sarcástico");
    expect(contract.interpretedIntent).toContain("defecto anatómico");
    expect(contract.recommendedInteractionMode).toBe("EXECUTE");
    expect(contract.prohibitedActions.join(" ")).toContain("feedback positivo");
  });

  it("limits a shirt recolor to the requested mutable element", async () => {
    const contract = await compile("Solo haz la camiseta negra.", "image editing");

    expect(contract.interpretedIntent).toContain("únicamente el color de la camiseta");
    expect(contract.explicitFacts).toContain("Color solicitado: negro.");
    expect(contract.preservationConstraints.join(" ")).toContain("Rostro");
    expect(contract.recommendedInteractionMode).toBe("EXECUTE");
  });

  it("treats a detailed anime identity as executable with bounded options", async () => {
    const contract = await compile(
      "Créame un personaje anime, hombre de unos 27, pelo negro largo, delgado, serio y que se vea peligroso pero no malo.",
      null,
    );

    expect(contract.recommendedInteractionMode).toBe("SHOW_OPTIONS");
    expect(contract.clarificationRequirements).toEqual([]);
    expect(contract.explicitFacts).toEqual(
      expect.arrayContaining([
        "Personaje anime masculino de aproximadamente 27 años.",
        "Pelo negro largo.",
        "Complexión delgada y expresión seria.",
        "Debe verse peligroso, pero no malvado.",
      ]),
    );
    expect(contract.safeAssumptions[0].assumption).toContain("fondo simple");
    expect(contract.provisionalDecisions[0].decision).toContain("atuendo");
  });
});
