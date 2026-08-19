import type { OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import type { OutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";

export interface RequirementCatalogRepository {
  publishBlueprint(blueprint: OutcomeBlueprint): Promise<OutcomeBlueprint>;
  getBlueprint(id: string, version: number): Promise<OutcomeBlueprint | null>;
  publishRequirementProfile(profile: OutcomeRequirementProfile): Promise<OutcomeRequirementProfile>;
  getRequirementProfile(id: string, version: number): Promise<OutcomeRequirementProfile | null>;
}
