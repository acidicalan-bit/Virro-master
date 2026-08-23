import type { DelegabilityAdmission, DelegabilityAdmissionMaterial } from "@/src/domain/outcome/delegability-admission";
import type { SerializedDelegabilityRecheckMaterial } from "@/src/application/outcome/resolve-serialized-delegability-material";

export type DelegabilityAdmissionInput = DelegabilityAdmissionMaterial & Readonly<{ currentMaterial: SerializedDelegabilityRecheckMaterial }>;

export type DelegabilityAdmissionRepository = Readonly<{
  admit(material: DelegabilityAdmissionInput): Promise<DelegabilityAdmission>;
  findById(admissionId: string): Promise<DelegabilityAdmission | null>;
}>;
