import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createFieldBetaService, resetFieldBetaServiceForTests } from "@/src/server/field-beta-services";
import { DurableExecutionRecoveryContextLoader } from "@/src/application/outcome/recovery/execution-recovery-context-loader";
import { SupabaseExecutionRunRepository } from "@/src/infrastructure/persistence/outcome/supabase-outcome-repositories";

const enabled = process.env.RUN_BUILD005B_STABILIZATION_INTEGRATION === "true";

describe.skipIf(!enabled)("BUILD 005-B.S fresh-process recovery", () => {
  it("redrives from persisted execution context twice without executor calls", async () => {
    const executionRunId = process.env.BUILD005B_RECOVERY_EXECUTION_ID;
    if (!executionRunId) throw new Error("BUILD005B_RECOVERY_EXECUTION_ID is required.");
    const service = createFieldBetaService();
    const first = await service.completeFieldOutcome(executionRunId, { tenantId: "internal-lab" });
    const firstIds = { transactionId: first.fieldOutcome.transactionId, executionRunId, raw: first.fieldOutcome.rawCandidateId, taskSpecHash: first.fieldOutcome.taskSpecHash, blueprintHash: first.fieldOutcome.blueprintHash };
    resetFieldBetaServiceForTests();
    const second = await createFieldBetaService().completeFieldOutcome(executionRunId, { tenantId: "internal-lab" });
    expect(second.fieldOutcome.transactionId).toBe(firstIds.transactionId);
    expect(second.fieldOutcome.rawCandidateId).toBe(firstIds.raw);
    expect(second.fieldOutcome.taskSpecHash).toBe(firstIds.taskSpecHash);
    expect(second.fieldOutcome.blueprintHash).toBe(firstIds.blueprintHash);
    await expect(createFieldBetaService().completeFieldOutcome(executionRunId, { tenantId: "foreign-tenant" as "internal-lab" })).rejects.toMatchObject({ code: "RECOVERY_NOT_FOUND" });
    resetFieldBetaServiceForTests();
  }, 120_000);

  it("loads the persisted context independently of request memory", async () => {
    const executionRunId = process.env.BUILD005B_RECOVERY_EXECUTION_ID!;
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const loader = new DurableExecutionRecoveryContextLoader(new SupabaseExecutionRunRepository(client, "internal-lab"));
    const loaded = await loader.load(executionRunId, { tenantId: "internal-lab" });
    expect(loaded.status).toBe("REDRIVABLE");
    if (loaded.status === "REDRIVABLE") {
      expect(loaded.context.taskSpec.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(loaded.context.blueprint.hash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect((await loader.load(executionRunId, { tenantId: "foreign-tenant" as "internal-lab" })).status).toBe("NOT_FOUND");
    expect((await loader.load(executionRunId, undefined as never)).status).toBe("NOT_FOUND");
  }, 60_000);
});
