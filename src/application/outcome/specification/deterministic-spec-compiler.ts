import type { SpecCompilerPort } from "@/src/application/ports/outcome/spec-compiler-port";
import type { CompilePrecisionEditTaskSpecInput } from "@/src/application/outcome/specification/types";
import { containsEmbeddedSecret } from "@/src/application/outcome/specification/spec-linter";
import { canonicalJson } from "@/src/domain/outcome/specification/canonical";
import { verifyOutcomeBlueprintHash, type BlueprintVariable, type OutcomeCapability } from "@/src/domain/outcome/specification/outcome-blueprint";
import { attachTaskSpecHash, verifyTaskSpecHash, type ProvenancedValue, type TaskConstraint, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";

export class SpecCompilerInputError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "SpecCompilerInputError";
  }
}

export class DeterministicPrecisionEditSpecCompiler implements SpecCompilerPort {
  readonly name = "deterministic-precision-edit-spec-compiler";
  readonly version = "0.1.0";

  constructor(
    private readonly idFactory: () => string = () => crypto.randomUUID(),
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async compile(input: CompilePrecisionEditTaskSpecInput): Promise<TaskSpec> {
    const reasons: string[] = [];
    const requirements: string[] = [];
    if (input.blueprint.status !== "PUBLISHED" || !verifyOutcomeBlueprintHash(input.blueprint)) reasons.push("INVALID_BLUEPRINT_VERSION_OR_HASH");
    if (input.blueprint.outcomeType !== "PRECISION_IMAGE_EDIT") reasons.push("UNSUPPORTED_OUTCOME_TYPE");
    if (input.source.mimeType !== "image/png" || input.source.byteSize <= 0 || input.source.byteSize > input.blueprint.securityProfile.maxSourceBytes) reasons.push("SOURCE_SECURITY_PROFILE_VIOLATION");
    if (!input.customerInstruction.trim() || input.customerInstruction.length > 10_000) reasons.push("INVALID_CUSTOMER_INSTRUCTION");
    if (input.roi !== undefined && !isNormalizedRoi(input.roi)) reasons.push("INVALID_ROI");

    const supplied: Record<string, unknown> = { ...(input.customerParameters ?? {}), instruction: input.customerInstruction };
    if (input.roi !== undefined) supplied.roi = input.roi;
    const resolved = new Map<string, ProvenancedValue>();
    const constraints: TaskConstraint[] = [];

    for (const variable of input.blueprint.variables) {
      if (variable.kind === "CONDITIONAL") continue;
      const attempted = Object.hasOwn(supplied, variable.id);
      if (variable.kind === "FIXED") {
        if (attempted && canonicalJson(supplied[variable.id]) !== canonicalJson(variable.value)) reasons.push(`FIXED_OVERRIDE:${variable.id}`);
        resolved.set(variable.id, valueFrom(variable, "APPROVED", variable.value));
        constraints.push({ id: `fixed-${variable.id}`, effect: "MUST", target: variable.id, value: variable.value, source: "BLUEPRINT_FIXED" });
        continue;
      }
      const approved = input.approvedValues && Object.hasOwn(input.approvedValues, variable.id);
      const inferred = input.inferredValues && Object.hasOwn(input.inferredValues, variable.id);
      let provenance: ProvenancedValue["provenance"] = "UNKNOWN";
      let value: unknown = undefined;
      if (attempted) { provenance = "CUSTOMER_STATED"; value = supplied[variable.id]; }
      else if (approved) { provenance = "APPROVED"; value = input.approvedValues?.[variable.id]; }
      else if (inferred) { provenance = "INFERRED"; value = input.inferredValues?.[variable.id]; }
      else if (variable.defaultValue !== undefined) { provenance = "APPROVED"; value = variable.defaultValue; }
      if (value !== undefined && !matchesVariableType(variable.valueType, value)) reasons.push(`INVALID_PARAMETER_TYPE:${variable.id}`);
      if (value !== undefined && variable.allowedValues && !variable.allowedValues.some((allowed) => canonicalJson(allowed) === canonicalJson(value))) reasons.push(`PARAMETER_OUTSIDE_ALLOWED_VALUES:${variable.id}`);
      if (value === undefined && variable.required) requirements.push(variable.id);
      resolved.set(variable.id, valueFrom(variable, provenance, value));
    }

    for (const variable of input.blueprint.variables) {
      if (variable.kind !== "CONDITIONAL") continue;
      const condition = resolved.get(variable.when.variableId);
      if (condition?.value !== undefined && canonicalJson(condition.value) === canonicalJson(variable.when.equals)) {
        const target = resolved.get(variable.then.variableId);
        if (!target || target.value === undefined) {
          if (variable.then.defaultValue !== undefined) {
            resolved.set(variable.then.variableId, { id: variable.then.variableId, provenance: "APPROVED", critical: variable.critical, visibility: variable.visibility, value: variable.then.defaultValue });
          } else if (variable.then.required) {
            requirements.push(variable.then.variableId);
            if (!target) resolved.set(variable.then.variableId, { id: variable.then.variableId, provenance: "UNKNOWN", critical: variable.critical, visibility: variable.visibility });
          }
        }
      }
    }

    const allowed = new Set<OutcomeCapability>([...input.blueprint.capabilityPolicy.required, ...input.blueprint.capabilityPolicy.optional]);
    const runtime = new Set(input.runtimeCapabilities);
    const requested = input.requestedCapabilities ?? [];
    for (const capability of input.blueprint.capabilityPolicy.required) if (!runtime.has(capability)) reasons.push(`MISSING_RUNTIME_CAPABILITY:${capability}`);
    for (const capability of requested) if (!allowed.has(capability) || input.blueprint.capabilityPolicy.denied.includes(capability)) reasons.push(`FORBIDDEN_CAPABILITY:${capability}`);
    const capabilityGrant = [...new Set([...input.blueprint.capabilityPolicy.required, ...requested])].filter((capability) => allowed.has(capability) && runtime.has(capability));
    if (containsEmbeddedSecret({ supplied, inferredValues: input.inferredValues, approvedValues: input.approvedValues })) {
      throw new SpecCompilerInputError("EMBEDDED_SECRET", "Secret-like material is prohibited and was not compiled into a Task Spec.");
    }

    const uniqueRequirements = [...new Set(requirements)];
    const status = reasons.length > 0
      ? "REJECTED"
      : uniqueRequirements.length > 0
        ? input.blueprint.securityProfile.unknownInputPolicy === "REJECT" ? "REJECTED" : "INPUT_REQUIRED"
        : "READY";
    if (status === "REJECTED" && uniqueRequirements.length > 0 && reasons.length === 0) reasons.push(...uniqueRequirements.map((item) => `MISSING_CRITICAL_INPUT:${item}`));

    const previous = input.previousTaskSpec ?? null;
    if (previous && (!hasValidTaskSpecHash(previous)
      || previous.transactionId !== input.transactionId
      || previous.blueprint.id !== input.blueprint.id
      || previous.blueprint.hash !== input.blueprint.hash)) {
      throw new SpecCompilerInputError("INVALID_PREVIOUS_TASK_SPEC", "Previous Task Spec is invalid or belongs to another transaction/Blueprint.");
    }
    const withoutHash: Omit<TaskSpec, "hash"> = {
      schemaVersion: "task-spec-v0.1",
      id: this.idFactory(),
      version: previous ? previous.version + 1 : 1,
      previousVersionHash: previous?.hash ?? null,
      status,
      transactionId: input.transactionId,
      blueprint: { id: input.blueprint.id, version: input.blueprint.version, hash: input.blueprint.hash },
      source: input.source,
      values: [...resolved.values()],
      constraints,
      capabilityGrant,
      criteria: input.blueprint.qualityProfile.criteria,
      verificationPolicy: input.blueprint.verificationPolicy,
      securityProfile: {
        promptInjectionPolicy: input.blueprint.securityProfile.promptInjectionPolicy,
        embeddedSecretPolicy: input.blueprint.securityProfile.embeddedSecretPolicy,
        unknownInputPolicy: input.blueprint.securityProfile.unknownInputPolicy,
      },
      compiler: { name: this.name, version: this.version },
      inputRequirements: uniqueRequirements,
      rejectionReasons: reasons,
      createdAt: this.clock(),
    };
    return attachTaskSpecHash(withoutHash);
  }
}

function hasValidTaskSpecHash(spec: TaskSpec): boolean {
  try {
    return verifyTaskSpecHash(spec);
  } catch {
    return false;
  }
}

function isNormalizedRoi(roi: { x: number; y: number; width: number; height: number }): boolean {
  const values = [roi.x, roi.y, roi.width, roi.height];
  return values.every(Number.isFinite)
    && roi.x >= 0 && roi.y >= 0 && roi.width > 0 && roi.height > 0
    && roi.x + roi.width <= 1 && roi.y + roi.height <= 1;
}

function valueFrom(variable: Exclude<BlueprintVariable, { kind: "CONDITIONAL" }>, provenance: ProvenancedValue["provenance"], value: unknown): ProvenancedValue {
  const output: ProvenancedValue = { id: variable.id, provenance, critical: variable.critical, visibility: variable.visibility };
  if (value !== undefined) output.value = value;
  return output;
}

function matchesVariableType(type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT", value: unknown): boolean {
  if (type === "STRING") return typeof value === "string";
  if (type === "NUMBER") return typeof value === "number" && Number.isFinite(value);
  if (type === "BOOLEAN") return typeof value === "boolean";
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
