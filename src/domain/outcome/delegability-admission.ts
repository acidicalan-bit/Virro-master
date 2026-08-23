import { z } from "zod";
import { canonicalSha256, immutableCopy } from "@/src/domain/outcome/specification/canonical";
import {
  currentDefaultEvaluator,
  isDelegable,
  sameEvaluatorIdentity,
  verifyEvaluatorIdentity,
  verifyReadinessHash,
  type DelegationReadiness,
  type EvaluatorIdentity,
  type ReadinessValidityState,
} from "@/src/domain/outcome/signal-readiness";

export const BUILD002_DELEGABILITY_ADMISSION_SCHEMA_VERSION = "build002-delegability-admission-v0.1" as const;
export const BUILD002_DELEGABILITY_CONSEQUENCE_BOUNDARY = "FRESH_SERIALIZED_RECHECK_REQUIRED_BEFORE_EXECUTION" as const;

const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Uuid = z.string().uuid();

export const DelegabilityAdmissionSchema = z.object({
  schemaVersion: z.literal(BUILD002_DELEGABILITY_ADMISSION_SCHEMA_VERSION),
  admissionId: Uuid,
  ownerTenantId: Uuid,
  principalId: Uuid,
  membershipId: Uuid,
  authorityCommitId: Uuid,
  outcomeTransactionId: Uuid,
  readinessId: Uuid,
  readinessContentHash: Hash,
  readinessState: z.literal("READY"),
  historicalDependencySnapshotHash: Hash,
  currentDependencySnapshotHash: Hash,
  evaluatorSchemaVersion: z.string().min(1),
  evaluatorVersion: z.string().min(1),
  evaluatorDefinitionHash: Hash,
  currentness: z.literal("CURRENT"),
  revalidatedAt: z.string().datetime(),
  admittedAt: z.string().datetime(),
  scope: z.literal("DELEGABILITY_ONLY"),
  executionAuthorityGranted: z.literal(false),
  executionStarted: z.literal(false),
  consequenceBoundary: z.literal(BUILD002_DELEGABILITY_CONSEQUENCE_BOUNDARY),
  admissionContentHash: Hash,
}).strict();
export type DelegabilityAdmission = Readonly<z.infer<typeof DelegabilityAdmissionSchema>>;

export type DelegabilityAdmissionMaterial = Readonly<{
  ownerTenantId: string;
  principalId: string;
  membershipId: string;
  authorityCommitId: string;
  outcomeTransactionId: string;
  readinessId: string;
  readinessContentHash: string;
  historicalDependencySnapshotHash: string;
  currentDependencySnapshotHash: string;
  evaluator: EvaluatorIdentity;
  revalidatedAt: string;
}>;

export function createDelegabilityAdmission(input: DelegabilityAdmissionMaterial, admittedAt = new Date().toISOString(), admissionId = crypto.randomUUID()): DelegabilityAdmission {
  const evaluator = currentDefaultEvaluator();
  if (!sameEvaluatorIdentity(input.evaluator, evaluator) || !verifyEvaluatorIdentity(input.evaluator)) throw new Error("DELEGABILITY_EVALUATOR_STALE");
  const material = {
    schemaVersion: BUILD002_DELEGABILITY_ADMISSION_SCHEMA_VERSION,
    admissionId,
    ownerTenantId: input.ownerTenantId,
    principalId: input.principalId,
    membershipId: input.membershipId,
    authorityCommitId: input.authorityCommitId,
    outcomeTransactionId: input.outcomeTransactionId,
    readinessId: input.readinessId,
    readinessContentHash: input.readinessContentHash,
    readinessState: "READY" as const,
    historicalDependencySnapshotHash: input.historicalDependencySnapshotHash,
    currentDependencySnapshotHash: input.currentDependencySnapshotHash,
    evaluatorSchemaVersion: input.evaluator.schemaVersion,
    evaluatorVersion: input.evaluator.version,
    evaluatorDefinitionHash: input.evaluator.definitionHash,
    currentness: "CURRENT" as const,
    revalidatedAt: input.revalidatedAt,
    admittedAt,
    scope: "DELEGABILITY_ONLY" as const,
    executionAuthorityGranted: false as const,
    executionStarted: false as const,
    consequenceBoundary: BUILD002_DELEGABILITY_CONSEQUENCE_BOUNDARY,
  };
  return immutableCopy(DelegabilityAdmissionSchema.parse({ ...material, admissionContentHash: canonicalSha256(admissionHashMaterial(material)) }));
}

export function verifyDelegabilityAdmissionHash(admission: DelegabilityAdmission): boolean {
  const parsed = DelegabilityAdmissionSchema.parse(admission);
  const { admissionContentHash, ...material } = parsed;
  void admissionContentHash;
  return canonicalSha256(admissionHashMaterial(material)) === parsed.admissionContentHash;
}

/** Admission identity is excluded; admittedAt is excluded for retry identity, while revalidatedAt remains historical evidence. */
function admissionHashMaterial(material: Omit<DelegabilityAdmission, "admissionContentHash">): Omit<DelegabilityAdmission, "admissionId" | "admittedAt" | "admissionContentHash"> {
  const { admissionId: _id, admittedAt: _at, ...stable } = material;
  void _id;
  void _at;
  return stable;
}

export function assertDelegableReadiness(readiness: DelegationReadiness, currentness: ReadinessValidityState): void {
  if (!verifyReadinessHash(readiness) || !isDelegable(readiness, currentness)) throw new Error("READINESS_NOT_DELEGABLE");
}
