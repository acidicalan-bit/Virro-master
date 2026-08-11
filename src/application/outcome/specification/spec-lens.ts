import type { OutcomeCapability } from "@/src/domain/outcome/specification/outcome-blueprint";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import type { SpecLens, SpecLensRole } from "@/src/application/outcome/specification/types";

export const ROLE_CAPABILITIES: Record<SpecLensRole, readonly OutcomeCapability[]> = {
  IMAGE_EXECUTOR: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE"],
  PRESERVATION_ENGINE: ["READ_SOURCE", "APPLY_PRESERVATION", "WRITE_CANDIDATE"],
  VERIFIER: ["READ_SOURCE"],
};

export function roleAllowsCapability(role: SpecLensRole, capability: OutcomeCapability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function createSpecLens(spec: TaskSpec, role: SpecLensRole): SpecLens {
  const values = Object.fromEntries(spec.values
    .filter((value) => value.visibility.includes(role))
    .map((value) => [value.id, { value: value.value, provenance: value.provenance }]));
  const criteria = spec.criteria.filter((criterion) => criterion.roles.includes(role));
  const context: Record<string, unknown> = role === "VERIFIER"
    ? { source: spec.source, values, constraints: spec.constraints, criteria }
    : { source: spec.source, values, constraints: spec.constraints.filter((constraint) => values[constraint.target] !== undefined) };
  const lens: SpecLens = {
    schemaVersion: "spec-lens-v0.1",
    role,
    taskSpecId: spec.id,
    taskSpecHash: spec.hash,
    transactionId: spec.transactionId,
    capabilities: spec.capabilityGrant.filter((capability) => ROLE_CAPABILITIES[role].includes(capability)),
    context,
    criterionIds: criteria.map((criterion) => criterion.id),
  };
  assertLensAuthoritySubset(spec, lens);
  return structuredClone(lens);
}

export function assertLensAuthoritySubset(spec: TaskSpec, lens: SpecLens): void {
  if (lens.taskSpecId !== spec.id || lens.taskSpecHash !== spec.hash || lens.transactionId !== spec.transactionId) throw new Error("Spec Lens identity does not match canonical Task Spec.");
  const granted = new Set(spec.capabilityGrant);
  if (lens.capabilities.some((capability) => !granted.has(capability))) throw new Error("Spec Lens cannot enlarge Task Spec authority.");
  const criteria = new Set(spec.criteria.map((criterion) => criterion.id));
  if (lens.criterionIds.some((criterionId) => !criteria.has(criterionId))) throw new Error("Spec Lens references an unknown criterion.");
}
