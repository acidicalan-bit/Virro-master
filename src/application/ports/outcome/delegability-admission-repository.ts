import type { DelegabilityAdmission, DelegabilityAdmissionMaterial } from "@/src/domain/outcome/delegability-admission";

export type DelegabilityAdmissionRepository = Readonly<{
  admit(material: DelegabilityAdmissionMaterial): Promise<DelegabilityAdmission>;
  findById(admissionId: string): Promise<DelegabilityAdmission | null>;
}>;
