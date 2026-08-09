import { BenchmarkCaseSchema, type BenchmarkCase } from "@/src/domain/benchmark";

const fixture = (
  slug: string,
  input: string,
  context: string | null,
  expectedConcepts: string[],
  expectedInteractionMode: BenchmarkCase["expectedInteractionMode"],
  options: Partial<Pick<BenchmarkCase, "forbiddenInterpretations" | "expectedAssumptions" | "forbiddenQuestions" | "notes">> = {},
): BenchmarkCase =>
  BenchmarkCaseSchema.parse({
    slug,
    input,
    context,
    expectedConcepts,
    forbiddenInterpretations: options.forbiddenInterpretations ?? [],
    expectedInteractionMode,
    expectedAssumptions: options.expectedAssumptions ?? [],
    forbiddenQuestions: options.forbiddenQuestions ?? ["seed", "sampler", "CFG"],
    notes: options.notes ?? null,
    active: true,
  });

export const benchmarkFixtures: BenchmarkCase[] = [
  fixture("magia-foto", "Haz magia con esta foto.", "edición fotográfica", ["mejora extraordinaria", "preservar identidad"], "EXECUTE", { forbiddenInterpretations: ["efectos sobrenaturales"], expectedAssumptions: ["ajustes fotográficos naturales"] }),
  fixture("magia-balon", "Hizo magia con el balón.", "fútbol", ["habilidad", "creatividad", "control"], "ASSUME", { forbiddenInterpretations: ["magia sobrenatural"], expectedAssumptions: ["elogio figurado"] }),
  fixture("magia-manos", "Pon magia saliendo de sus manos.", "ilustración fantástica", ["magia", "manos"], "EXECUTE", { notes: "En fantasía, la lectura literal sí es la acción solicitada." }),
  fixture("pesado-personaje", "Hazlo más pesado.", "personaje de videojuego", ["masa", "presencia"], "SHOW_OPTIONS", { forbiddenInterpretations: ["peso físico del archivo"] }),
  fixture("pesado-diseno", "Hazlo más pesado.", "diseño de póster", ["peso visual", "impacto"], "SHOW_OPTIONS", { forbiddenInterpretations: ["peso físico"] }),
  fixture("pesado-musica", "Hazlo más pesado.", "mezcla musical", ["cuerpo", "pegada"], "SHOW_OPTIONS", { forbiddenInterpretations: ["peso físico"] }),
  fixture("demasiado-ia", "Se ve demasiado IA.", "retrato fotográfico", ["natural", "artefactos de IA"], "EXECUTE", { expectedAssumptions: ["piel", "manos"] }),
  fixture("bonito-pero-no", "Está bonito pero como que no.", "branding", ["rechazo", "diagnóstico"], "EXPLORE"),
  fixture("mas-limpio-poster", "Más limpio.", "diseño de póster", ["menos ruido", "jerarquía"], "EXECUTE"),
  fixture("mas-limpio-codigo", "Más limpio.", "código TypeScript", ["simplificar"], "EXECUTE"),
  fixture("dejalo-igual-contexto", "Déjalo igual, nomás arregla eso.", "La mano derecha tiene seis dedos.", ["edición estrictamente local", "preservar todo"], "EXECUTE", { expectedAssumptions: ["área indicada"], forbiddenQuestions: ["qué quieres preservar", "seed", "CFG"] }),
  fixture("dejalo-igual-sin-referencia", "Déjalo igual, nomás arregla eso.", null, ["referencia", "antecedente"], "ASK", { notes: "Sin estado o antecedente, 'eso' es bloqueante." }),
  fixture("cara-otra-vez", "Otra vez me cambiaste la cara.", "edición de retrato", ["frustrada", "rostro original", "identidad"], "EXECUTE", { expectedAssumptions: ["rostro original"], forbiddenQuestions: ["cómo quieres la cara", "seed", "sampler"] }),
  fixture("mas-pro-branding", "Hazlo más pro.", "branding para una cafetería", ["jerarquía", "acabado", "credibilidad"], "EXECUTE"),
  fixture("mas-pro-codigo", "Hazlo más pro.", "aplicación web", ["profesional", "coherente"], "EXECUTE"),
  fixture("no-exagerado", "No tan exagerado.", "efecto visual", ["reducir", "mantener la dirección"], "EXECUTE"),
  fixture("caro-no-mamador", "Que se vea caro pero no mamador.", "branding de restaurante", ["premium sobria", "sin ostentación"], "EXECUTE", { forbiddenInterpretations: ["lujo exagerado"], expectedAssumptions: ["calidad material"] }),
  fixture("falta-vida-poster", "Le falta vida.", "póster cultural", ["vitalidad", "energía"], "SHOW_OPTIONS"),
  fixture("falta-vida-musica", "Le falta vida.", "mezcla musical", ["energía"], "SHOW_OPTIONS"),
  fixture("tieso-personaje", "Está muy tieso.", "pose de personaje", ["natural", "dinámico"], "EXECUTE"),
  fixture("tieso-texto", "Está muy tieso.", "texto para redes sociales", ["fluidez"], "EXECUTE"),
  fixture("raro-foto", "No sé qué tiene pero está raro.", "fotografía de producto", ["diagnosticar", "causas probables"], "EXPLORE"),
  fixture("raro-ui", "No sé qué tiene pero está raro.", "interfaz web", ["diagnosticar", "jerarquía"], "EXPLORE"),
  fixture("medio-equis", "Está medio equis.", "logo", ["cambio contextual"], "ASSUME", { notes: "Caso coloquial deliberadamente abierto para revisión manual." }),
  fixture("bonito-no", "Está bonito, pero no se siente mío.", "identidad de marca", ["cambio contextual"], "ASSUME", { notes: "Debe preservar el rechazo indirecto y la identidad del usuario." }),
  fixture("camiseta-negra", "Haz la camiseta negra.", "edición fotográfica", ["camiseta", "negro", "preservar"], "EXECUTE", { forbiddenInterpretations: ["cambiar el rostro", "regenerar fondo"], expectedAssumptions: ["negro neutro"] }),
  fixture("solo-fondo", "Solo quita lo del fondo.", "edición fotográfica", ["cambio contextual"], "ASSUME", { forbiddenInterpretations: ["cambiar la cara", "cambiar el cuerpo"] }),
  fixture("mas-calido", "Un poquito más cálido.", "fotografía", ["cambio contextual"], "ASSUME", { expectedAssumptions: ["moderada"] }),
  fixture("que-pegue", "Quiero que pegue más.", "mezcla musical", ["cambio contextual"], "ASSUME", { forbiddenInterpretations: ["golpear físicamente"] }),
  fixture("sin-perder-esencia", "Modernízalo sin perder su esencia.", "logo histórico", ["cambio contextual"], "ASSUME", { forbiddenInterpretations: ["reemplazar completamente"] }),
  fixture("menos-corporativo", "Menos corporativo, más humano.", "copy de landing page", ["cambio contextual"], "ASSUME"),
  fixture("haz-magia-bug", "Haz magia, esto sigue tronando.", "aplicación web con error al guardar", ["cambio contextual"], "ASSUME", { forbiddenInterpretations: ["magia sobrenatural"], forbiddenQuestions: ["qué lenguaje usas si ya está en el contexto", "seed"] }),
];

export function parseBenchmarkFixtures(): BenchmarkCase[] {
  return benchmarkFixtures.map((item) => BenchmarkCaseSchema.parse(item));
}
