import type { OutcomeTransactionRequirementBinding } from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";

export interface OutcomeTransactionRequirementBindingRepository {
  publish(binding: OutcomeTransactionRequirementBinding): Promise<OutcomeTransactionRequirementBinding>;
  get(outcomeTransactionId: string): Promise<OutcomeTransactionRequirementBinding | null>;
}
