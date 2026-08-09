import type { CompileIntentInput } from "@/src/domain/intent-contract";

export type PragmaticSignal = {
  kind: "FIGURATIVE" | "SLANG" | "INTENSITY" | "FRUSTRATION" | "SARCASM" | "REJECTION" | "PRESERVATION";
  evidence: string;
  contextualMeaning: string;
};

export type PragmaticAnalysis = {
  likelyDomain: string;
  signals: PragmaticSignal[];
  guidance: string[];
};

const includesAny = (value: string, phrases: string[]) => phrases.some((phrase) => value.includes(phrase));

export function analyzePragmatics(input: CompileIntentInput): PragmaticAnalysis {
  const text = input.rawInput.toLocaleLowerCase("es-MX");
  const context = (input.context ?? "").toLocaleLowerCase("es-MX");
  const combined = `${text} ${context}`;
  const signals: PragmaticSignal[] = [];

  const likelyDomain = inferDomain(combined);

  if (text.includes("magia")) {
    const literal = includesAny(context, [
      "fantasía",
      "fantasia",
      "ilustración",
      "ilustracion",
      "hechizo",
      "fantasy",
      "illustration",
      "magic effect",
    ]);
    signals.push({
      kind: "FIGURATIVE",
      evidence: "magia",
      contextualMeaning: literal
        ? "Puede ser un efecto mágico literal porque el contexto es fantástico."
        : "Probablemente pide una mejora extraordinaria o una ejecución impresionante, no magia literal.",
    });
  }

  if (includesAny(text, ["más pro", "mas pro", "medio equis", "mamador", "nomás", "nomas"])) {
    signals.push({
      kind: "SLANG",
      evidence: input.rawInput,
      contextualMeaning: "La expresión es coloquial y debe traducirse a cualidades del dominio sin exigir jerga técnica.",
    });
  }

  if (includesAny(text, ["no tan", "demasiado", "muy ", "medio ", "más ", "mas "])) {
    signals.push({
      kind: "INTENSITY",
      evidence: input.rawInput,
      contextualMeaning: "Describe un ajuste relativo respecto al estado actual, no una sustitución total.",
    });
  }

  if (includesAny(text, ["otra vez", "me cambiaste", "ya te dije", "sigue mal", "seis dedos", "siete dedos"])) {
    signals.push({
      kind: "FRUSTRATION",
      evidence: input.rawInput,
      contextualMeaning: "Hay frustración por un fallo repetido; se debe reconocer y corregir sin volver a preguntar lo ya conocido.",
    });
  }

  if (
    includesAny(text, ["quedó increíble", "quedo increíble", "quedó perfecto", "quedo perfecto"]) &&
    includesAny(text, ["seis dedos", "siete dedos", "tres brazos", "dos cabezas"])
  ) {
    signals.push({
      kind: "SARCASM",
      evidence: input.rawInput,
      contextualMeaning: "El elogio aparente contradice un defecto evidente: expresa sarcasmo, rechazo y frustración, no aceptación.",
    });
  }

  if (includesAny(text, ["como que no", "está raro", "esta raro", "no sé qué tiene", "no se que tiene"])) {
    signals.push({
      kind: "REJECTION",
      evidence: input.rawInput,
      contextualMeaning: "Es rechazo indirecto: el resultado actual no satisface aunque la causa todavía no esté articulada.",
    });
  }

  if (includesAny(text, ["déjalo igual", "dejalo igual", "nomás arregla", "nomas arregla", "solo cambia", "solo haz"])) {
    signals.push({
      kind: "PRESERVATION",
      evidence: input.rawInput,
      contextualMeaning: "La edición es local: cambiar únicamente lo indicado y conservar todo lo demás.",
    });
  }

  return {
    likelyDomain,
    signals,
    guidance: [
      "Interpreta texto + contexto + dominio + estado disponible como una unidad.",
      "No conviertas slang en una traducción literal universal.",
      "Pregunta solamente si la respuesta cambia materialmente una acción de alto impacto.",
      "Trata las suposiciones reversibles como provisionales, no como hechos permanentes.",
      "En una edición local, preserva todo lo que el usuario no pidió cambiar.",
    ],
  };
}

function inferDomain(combined: string): string {
  const domains: Array<[string, string[]]> = [
    ["fotografía", ["foto", "imagen", "cara", "rostro", "camiseta", "photo", "image editing"]],
    ["diseño gráfico", ["póster", "poster", "branding", "logo", "tipografía", "diseño"]],
    ["fútbol", ["balón", "balon", "fútbol", "futbol", "cancha", "football", "soccer"]],
    ["música", ["música", "musica", "mezcla", "bajo", "beat", "canción", "cancion"]],
    ["programación", ["código", "codigo", "bug", "app", "api", "web"]],
    ["ilustración", ["anime", "personaje", "ilustración", "ilustracion", "fantasía", "fantasia", "fantasy", "illustration", "character"]],
  ];

  return domains.find(([, terms]) => includesAny(combined, terms))?.[0] ?? "general";
}
