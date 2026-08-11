import { canonicalJson } from "@/src/domain/outcome/specification/canonical";
import { OutcomeBlueprintSchema, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { TaskSpecSchema, verifyTaskSpecHash } from "@/src/domain/outcome/specification/task-spec";

export type SpecLintCode =
  | "MISSING_REQUIRED_FIELD"
  | "FIXED_OVERRIDE"
  | "CONTRADICTORY_CONSTRAINT"
  | "CRITERION_WITHOUT_VERIFIER"
  | "UNALLOWED_CAPABILITY"
  | "EMBEDDED_SECRET"
  | "CRITICAL_UNKNOWN_ON_READY"
  | "COMMIT_WITHOUT_EVIDENCE_POLICY"
  | "DUPLICATE_CRITERION_ID"
  | "INVALID_HASH";

export type SpecLintIssue = { code: SpecLintCode; path: string; message: string };

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
];

export function containsEmbeddedSecret(input: unknown): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(JSON.stringify(input)));
}

export function lintOutcomeBlueprint(input: unknown): SpecLintIssue[] {
  const parsed = OutcomeBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      code: issue.path.at(-1) === "verifier"
        ? "CRITERION_WITHOUT_VERIFIER"
        : issue.message.startsWith("Duplicate criterion id")
          ? "DUPLICATE_CRITERION_ID"
          : issue.message.includes("both allowed and denied")
            ? "UNALLOWED_CAPABILITY"
            : "MISSING_REQUIRED_FIELD",
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
  const blueprint = parsed.data;
  const issues: SpecLintIssue[] = [];
  duplicateCriterionIssues(blueprint.qualityProfile.criteria.map((criterion) => criterion.id), issues);
  const required = new Set(blueprint.capabilityPolicy.required);
  const optional = new Set(blueprint.capabilityPolicy.optional);
  for (const capability of blueprint.capabilityPolicy.denied) {
    if (required.has(capability) || optional.has(capability)) issues.push({ code: "UNALLOWED_CAPABILITY", path: "capabilityPolicy", message: `${capability} is both granted and denied.` });
  }
  if (!blueprint.verificationPolicy.requireSameSpecHash || blueprint.verificationPolicy.executorDoneIsEvidence) {
    issues.push({ code: "COMMIT_WITHOUT_EVIDENCE_POLICY", path: "verificationPolicy", message: "Commit evidence policy is not fail-closed." });
  }
  if (containsEmbeddedSecret(blueprint)) issues.push({ code: "EMBEDDED_SECRET", path: "$", message: "Specification contains secret-like material." });
  return issues;
}

export function lintTaskSpec(input: unknown, blueprint?: OutcomeBlueprint): SpecLintIssue[] {
  const parsed = TaskSpecSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({ code: issue.message.includes("Critical UNKNOWN") ? "CRITICAL_UNKNOWN_ON_READY" : "MISSING_REQUIRED_FIELD", path: issue.path.join("."), message: issue.message }));
  }
  const spec = parsed.data;
  const issues: SpecLintIssue[] = [];
  if (!verifyTaskSpecHash(spec)) issues.push({ code: "INVALID_HASH", path: "hash", message: "Task Spec hash does not match canonical content." });
  duplicateCriterionIssues(spec.criteria.map((criterion) => criterion.id), issues);
  const seen = new Map<string, string>();
  for (const constraint of spec.constraints) {
    const key = `${constraint.target}:${canonicalJson(constraint.value)}`;
    const prior = seen.get(key);
    if (prior && prior !== constraint.effect) issues.push({ code: "CONTRADICTORY_CONSTRAINT", path: `constraints.${constraint.id}`, message: `${constraint.target} has contradictory constraints.` });
    seen.set(key, constraint.effect);
  }
  if (spec.status === "READY" && spec.values.some((value) => value.critical && value.provenance === "UNKNOWN")) {
    issues.push({ code: "CRITICAL_UNKNOWN_ON_READY", path: "values", message: "Critical UNKNOWN cannot be READY." });
  }
  if (containsEmbeddedSecret(spec)) issues.push({ code: "EMBEDDED_SECRET", path: "$", message: "Specification contains secret-like material." });
  if (blueprint) {
    const allowed = new Set([...blueprint.capabilityPolicy.required, ...blueprint.capabilityPolicy.optional]);
    for (const capability of spec.capabilityGrant) if (!allowed.has(capability)) issues.push({ code: "UNALLOWED_CAPABILITY", path: "capabilityGrant", message: `${capability} is outside Blueprint authority.` });
    const values = new Map(spec.values.map((value) => [value.id, value.value]));
    for (const variable of blueprint.variables) {
      if (variable.kind === "FIXED" && canonicalJson(values.get(variable.id)) !== canonicalJson(variable.value)) {
        issues.push({ code: "FIXED_OVERRIDE", path: `values.${variable.id}`, message: `${variable.id} overrides a FIXED Blueprint value.` });
      }
    }
  }
  return issues;
}

function duplicateCriterionIssues(ids: string[], issues: SpecLintIssue[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push({ code: "DUPLICATE_CRITERION_ID", path: `criteria.${id}`, message: `Duplicate criterion id ${id}.` });
    seen.add(id);
  }
}
