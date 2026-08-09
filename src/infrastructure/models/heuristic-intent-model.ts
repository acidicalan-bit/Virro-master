import type { IntentModel, ModelCompilation } from "@/src/application/ports/intent-model";
import type { PragmaticAnalysis } from "@/src/domain/human-pragmatics";
import {
  INTENT_SCHEMA_VERSION,
  IntentContractSchema,
  type CompileIntentInput,
  type InteractionMode,
} from "@/src/domain/intent-contract";

type Interpretation = {
  intent: string;
  meaning: string;
  mode: InteractionMode;
  creativeFreedom: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  expectations?: string[];
  preservation?: string[];
  prohibited?: string[];
  assumptions?: string[];
  ambiguity?: string;
  nextAction?: string;
};

export class HeuristicIntentModel implements IntentModel {
  async compile(input: CompileIntentInput, pragmatics: PragmaticAnalysis): Promise<ModelCompilation> {
    const interpretation = interpret(input, pragmatics);
    const hasFrustration = pragmatics.signals.some((signal) => signal.kind === "FRUSTRATION");
    const asksClarification = interpretation.mode === "ASK";

    const contract = IntentContractSchema.parse({
      schemaVersion: INTENT_SCHEMA_VERSION,
      rawInput: input.rawInput,
      context: input.context,
      domain: pragmatics.likelyDomain,
      interpretedIntent: interpretation.intent,
      interpretedMeaning: interpretation.meaning,
      explicitFacts: [
        `Solicitud textual: ${input.rawInput}`,
        ...(input.context ? [`Contexto declarado: ${input.context}`] : []),
      ],
      implicitExpectations: [
        "El resultado debe responder al significado contextual, no solo a las palabras literales.",
        ...(interpretation.expectations ?? []),
        ...(hasFrustration ? ["Corregir el fallo repetido sin hacer que la persona repita contexto."] : []),
      ],
      safeAssumptions: (interpretation.assumptions ?? ["Aplicar un cambio moderado y reversible."]).map(
        (assumption) => ({ assumption, reason: "Es una convención de bajo impacto y fácil de revertir.", reversible: true }),
      ),
      provisionalDecisions: [
        {
          decision: "Usar una intensidad moderada como punto de partida.",
          rationale: "La persona pidió una dirección relativa, pero no fijó un grado exacto.",
        },
      ],
      ambiguities: interpretation.ambiguity
        ? [{ topic: interpretation.ambiguity, impact: asksClarification ? "HIGH" : "MEDIUM", resolution: asksClarification ? "Aclarar antes de ejecutar." : "Mostrar una opción reversible y permitir ajuste." }]
        : [],
      clarificationRequirements: asksClarification
        ? [{ question: "¿Cuál de las dos interpretaciones cambia correctamente el resultado que buscas?", reason: "La elección altera materialmente la ejecución.", blocking: true }]
        : [],
      prohibitedQuestions: [
        "No preguntar por modelos, seeds, samplers, CFG ni parámetros técnicos.",
        "No pedir información que ya esté expresada en la solicitud o el contexto.",
      ],
      preservationConstraints: interpretation.preservation ?? ["Preservar todo elemento no mencionado por la persona."],
      prohibitedActions: interpretation.prohibited ?? ["No ampliar el alcance más allá del cambio solicitado."],
      recommendedInteractionMode: interpretation.mode,
      creativeFreedom: interpretation.creativeFreedom,
      confidence: interpretation.confidence,
      nextAction: interpretation.nextAction ?? modeToNextAction(interpretation.mode),
    });

    return {
      contract,
      provider: "intent-lab",
      modelName: "contextual-heuristic",
      modelVersion: "0.1.0",
      usage: null,
    };
  }
}

function interpret(input: CompileIntentInput, pragmatics: PragmaticAnalysis): Interpretation {
  const text = input.rawInput.toLocaleLowerCase("es-MX");
  const context = (input.context ?? "").toLocaleLowerCase("es-MX");

  if (text.includes("magia") && pragmatics.likelyDomain === "fotografía") {
    return {
      intent: "Mejorar notablemente la foto con criterio visual.",
      meaning: "“Haz magia” pide una mejora extraordinaria pero natural; no solicita efectos sobrenaturales ni cambiar la identidad.",
      mode: "EXECUTE",
      creativeFreedom: "MEDIUM",
      confidence: 0.9,
      expectations: ["Mejorar la foto sin que se vea artificial.", "Preservar identidad y rasgos."],
      preservation: ["Rostro e identidad de las personas.", "Contenido esencial y encuadre salvo que impidan la mejora."],
      prohibited: ["No añadir magia literal.", "No cambiar el rostro ni la identidad."],
      assumptions: ["Aplicar ajustes fotográficos naturales y reversibles."],
    };
  }

  if (text.includes("magia") && pragmatics.likelyDomain === "fútbol") {
    return {
      intent: "Interpretar una actuación futbolística como extraordinaria.",
      meaning: "“Hizo magia con el balón” es lenguaje figurado: habilidad, creatividad y control extraordinarios, no magia sobrenatural.",
      mode: "ASSUME",
      creativeFreedom: "LOW",
      confidence: 0.97,
      prohibited: ["No interpretar magia sobrenatural."],
      assumptions: ["Tratar la frase como elogio figurado dentro del fútbol."],
    };
  }

  if (text.includes("más pesado") || text.includes("mas pesado") || text === "está pesado." || text === "esta pesado.") {
    if (pragmatics.likelyDomain === "música") {
      return {
        intent: "Dar más peso e impacto a la música.",
        meaning: "Aumentar cuerpo, pegada y presencia —probablemente en graves y dinámica— sin asumir peso físico.",
        mode: "SHOW_OPTIONS",
        creativeFreedom: "MEDIUM",
        confidence: 0.82,
        expectations: ["Más cuerpo y pegada musical."],
        assumptions: ["Probar primero un refuerzo moderado de graves y pegada."],
        ambiguity: "“Pesado” puede significar más graves, más distorsión o una interpretación más agresiva.",
      };
    }
    if (pragmatics.likelyDomain === "diseño gráfico") {
      return {
        intent: "Aumentar el peso visual del diseño.",
        meaning: "Hacer el diseño más contundente o denso visualmente, no atribuirle peso físico.",
        mode: "SHOW_OPTIONS",
        creativeFreedom: "MEDIUM",
        confidence: 0.86,
        expectations: ["Mayor impacto y peso visual."],
        assumptions: ["Aumentar contraste y jerarquía antes que agregar elementos."],
        ambiguity: "El peso visual puede venir de tipografía, contraste, escala o densidad.",
      };
    }
    return {
      intent: "Hacer que el personaje se perciba más pesado e imponente.",
      meaning: "Aumentar sensación de masa, presencia o robustez del personaje; no cambiar elementos ajenos.",
      mode: "SHOW_OPTIONS",
      creativeFreedom: "MEDIUM",
      confidence: 0.78,
      expectations: ["Más masa y presencia del personaje."],
      assumptions: ["Probar una silueta ligeramente más robusta."],
      ambiguity: "“Pesado” puede referirse al cuerpo, la armadura o la actitud.",
    };
  }

  if (text.includes("demasiado ia")) {
    return {
      intent: "Reducir los rasgos visuales que delatan generación artificial.",
      meaning: "Buscar un resultado más natural, coherente y humano, corrigiendo textura, detalle y artefactos sin rehacerlo todo.",
      mode: "EXECUTE",
      creativeFreedom: "LOW",
      confidence: 0.93,
      expectations: ["Apariencia natural y coherente.", "Corregir artefactos de IA."],
      assumptions: ["Priorizar piel, manos, microtextura y coherencia de luz cuando apliquen."],
    };
  }

  if (text.includes("déjalo igual") || text.includes("dejalo igual") || text.includes("nomás arregla") || text.includes("nomas arregla")) {
    return {
      intent: "Corregir únicamente el defecto señalado.",
      meaning: "Es una edición estrictamente local: arreglar “eso” y preservar todo lo demás sin regeneración amplia.",
      mode: context ? "EXECUTE" : "ASK",
      creativeFreedom: "LOW",
      confidence: context ? 0.9 : 0.58,
      preservation: ["Todo lo que no sea el defecto señalado.", "Identidad, composición, cámara, fondo e iluminación existentes."],
      prohibited: ["No regenerar la imagen completa.", "No modificar rostro, cuerpo, cámara, fondo ni objetos no solicitados."],
      assumptions: ["Limitar el cambio al área indicada."],
      ambiguity: context ? undefined : "La referencia “eso” no tiene un antecedente disponible.",
    };
  }

  if (text.includes("otra vez") && text.includes("cara")) {
    return {
      intent: "Restaurar y preservar el rostro original.",
      meaning: "La persona está frustrada porque el rostro volvió a cambiar; corregirlo de inmediato y bloquear futuros cambios de identidad.",
      mode: "EXECUTE",
      creativeFreedom: "LOW",
      confidence: 0.96,
      expectations: ["Reconocer el error repetido.", "Preservar identidad facial."],
      preservation: ["Rostro, identidad, expresión y rasgos originales."],
      prohibited: ["No reinterpretar ni embellecer el rostro.", "No pedir de nuevo una preferencia ya establecida."],
      assumptions: ["Usar el rostro original como referencia autoritativa."],
      nextAction: "Restaurar el rostro original y aplicar un bloqueo explícito de identidad.",
    };
  }

  if (text.includes("como que no") || text.includes("está raro") || text.includes("esta raro") || text.includes("no sé qué tiene") || text.includes("no se que tiene")) {
    return {
      intent: "Diagnosticar por qué el resultado no termina de funcionar.",
      meaning: "Hay rechazo real pero no una causa articulada; conviene explorar pocas hipótesis visuales concretas antes de ejecutar cambios amplios.",
      mode: "EXPLORE",
      creativeFreedom: "MEDIUM",
      confidence: 0.84,
      expectations: ["Identificar la causa del rechazo indirecto."],
      assumptions: ["Revisar primero jerarquía, coherencia, proporción y tono."],
      ambiguity: "La causa específica del rechazo todavía no está localizada.",
      nextAction: "Mostrar un diagnóstico breve con dos o tres causas probables y una corrección reversible para cada una.",
    };
  }

  if (text.includes("más limpio") || text.includes("mas limpio")) {
    return {
      intent: "Simplificar y ordenar el resultado.",
      meaning: "Reducir ruido, mejorar jerarquía y dar más espacio sin borrar el contenido esencial.",
      mode: "EXECUTE",
      creativeFreedom: "LOW",
      confidence: 0.88,
      expectations: ["Menos ruido y mejor jerarquía."],
      assumptions: ["Reducir elementos secundarios antes que eliminar contenido principal."],
    };
  }

  if (text.includes("más pro") || text.includes("mas pro")) {
    return {
      intent: "Elevar la calidad y coherencia profesional del resultado.",
      meaning: "Mejorar jerarquía, consistencia, acabado y credibilidad según el dominio, sin agregar complejidad gratuita.",
      mode: "EXECUTE",
      creativeFreedom: "MEDIUM",
      confidence: 0.87,
      expectations: ["Acabado profesional y coherente."],
      assumptions: ["Aplicar convenciones profesionales del dominio de forma moderada."],
    };
  }

  if (text.includes("caro") && text.includes("mamador")) {
    return {
      intent: "Crear una percepción premium sobria.",
      meaning: "Que se perciba de alta calidad y valor, pero sin ostentación, pretensión ni lujo exagerado.",
      mode: "EXECUTE",
      creativeFreedom: "MEDIUM",
      confidence: 0.94,
      expectations: ["Percepción premium sobria.", "Evitar ostentación."],
      assumptions: ["Usar calidad material, espacio y detalle antes que símbolos obvios de lujo."],
      prohibited: ["No usar códigos ostentosos o pretenciosos."],
    };
  }

  if (text.includes("no tan exagerado")) {
    return {
      intent: "Reducir la intensidad manteniendo la dirección actual.",
      meaning: "Atenuar el efecto sin eliminarlo ni reemplazar el concepto completo.",
      mode: "EXECUTE",
      creativeFreedom: "LOW",
      confidence: 0.92,
      expectations: ["Menor intensidad, misma dirección."],
      assumptions: ["Reducir el efecto aproximadamente un nivel y conservar la idea."],
    };
  }

  if (text.includes("falta vida")) {
    return {
      intent: "Aumentar vitalidad y energía perceptual.",
      meaning: "Mejorar energía mediante color, contraste, ritmo o expresión según el dominio, sin saturar indiscriminadamente.",
      mode: "SHOW_OPTIONS",
      creativeFreedom: "MEDIUM",
      confidence: 0.8,
      assumptions: ["Probar primero color y contraste moderados."],
      ambiguity: "La vitalidad puede provenir de color, movimiento, expresión o ritmo.",
    };
  }

  if (text.includes("tieso")) {
    return {
      intent: "Hacer el resultado más natural y dinámico.",
      meaning: "Reducir rigidez en pose, movimiento, ritmo o redacción según el dominio.",
      mode: "EXECUTE",
      creativeFreedom: "MEDIUM",
      confidence: 0.83,
      assumptions: ["Introducir variación y fluidez sin cambiar la intención principal."],
    };
  }

  return {
    intent: `Resolver la solicitud en lenguaje natural: ${input.rawInput}`,
    meaning: `La persona busca un cambio contextual en ${pragmatics.likelyDomain}, con el mínimo de preguntas y sin ampliar el alcance.`,
    mode: "ASSUME",
    creativeFreedom: "MEDIUM",
    confidence: input.context ? 0.74 : 0.62,
    assumptions: ["Elegir una opción estándar, moderada y reversible."],
  };
}

function modeToNextAction(mode: InteractionMode): string {
  const actions: Record<InteractionMode, string> = {
    ASSUME: "Aplicar la suposición segura y mantenerla provisional.",
    SHOW_OPTIONS: "Mostrar pocas opciones contrastantes y recomendar una.",
    ASK: "Hacer únicamente la aclaración bloqueante.",
    EXECUTE: "Ejecutar el cambio solicitado respetando las restricciones.",
    EXPLORE: "Explorar causas probables antes de cambiar el resultado completo.",
  };
  return actions[mode];
}
