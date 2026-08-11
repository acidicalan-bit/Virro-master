import { NextResponse } from "next/server";

import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import { FakeExecutor } from "@/src/infrastructure/executors/fake-executor";
import { OutcomeTransactionService } from "@/src/application/outcome/outcome-transaction-service";
import type { MutationLeaseCategory } from "@/src/domain/outcome";
import type { RepositoryBundle } from "@/src/application/ports/repositories";
import { createSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";

function getRepositories(): Pick<
  RepositoryBundle,
  | "projects"
  | "assets"
  | "assetVersions"
  | "outcomeTransactions"
  | "partialIntents"
  | "semanticPatches"
  | "mutationLeases"
  | "executionRuns"
  | "evidenceReceipts"
  | "verificationRuns"
  | "stateCommits"
  | "costRecords"
> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && supabaseKey) {
    try {
      return createSupabaseRepositories();
    } catch {
      // fall through to in-memory
    }
  }
  return getInMemoryOutcomeRepositories();
}

const outcomeRepos = getRepositories();
const executor = new FakeExecutor();
const service = new OutcomeTransactionService(outcomeRepos as never, executor);

export async function GET() {
  try {
    const projects = await outcomeRepos.projects.list();
    return NextResponse.json({
      projects,
      assets: (outcomeRepos.assets as unknown as { records: unknown[] }).records,
      transactions: (outcomeRepos.outcomeTransactions as unknown as { records: unknown[] }).records,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action: string; [key: string]: unknown };

    switch (body.action) {
      case "createProject": {
        const project = await service.createProject({
          name: body.name as string,
          description: (body.description as string) || null,
        });
        return NextResponse.json({ project });
      }

      case "createAsset": {
        const result = await service.createAsset({
          projectId: body.projectId as string,
          name: body.name as string,
          description: (body.description as string) || null,
          initialState: JSON.parse(body.initialState as string) as Record<string, unknown>,
        });
        return NextResponse.json({ asset: result.asset, version: result.version });
      }

      case "createTransaction": {
        const transaction = await service.createTransaction({
          projectId: body.projectId as string,
          assetId: body.assetId as string,
          baseVersionId: body.baseVersionId as string,
          rawRequest: body.rawRequest as string,
        });
        return NextResponse.json({ transaction });
      }

      case "prepareTransaction": {
        const result = await service.prepareTransaction({
          transactionId: body.transactionId as string,
          partialIntent: {
            rawInput: (body.rawInput as string) || "",
            targetPath: body.targetPath as string,
            operation: body.operation as never,
            desiredValue: body.desiredValue,
          },
          mutationLeases: (body.mutationLeases as Array<{ targetPath: string; category: string; reason?: string | null }>).map((l) => ({ ...l, category: l.category as MutationLeaseCategory })),
        });
        return NextResponse.json({ ...result });
      }

      case "executeTransaction": {
        const results = await service.executeTransaction(body.transactionId as string);
        return NextResponse.json({ results });
      }

      case "verifyTransaction": {
        const verification = await service.verifyTransaction({
          transactionId: body.transactionId as string,
        });
        return NextResponse.json({ verification });
      }

      case "commitTransaction": {
        const result = await service.commitTransaction({
          transactionId: body.transactionId as string,
        });
        return NextResponse.json(result);
      }

      case "abortTransaction": {
        const result = await service.abortTransaction(
          body.transactionId as string,
          (body.reason as string) || undefined,
        );
        return NextResponse.json({ transaction: result });
      }

      case "rollbackTransaction": {
        const result = await service.rollbackTransaction({
          transactionId: body.transactionId as string,
          targetVersionId: body.targetVersionId as string,
        });
        return NextResponse.json({ version: result });
      }

      case "getAssetState": {
        const result = await service.getAssetState(body.assetId as string);
        return NextResponse.json(result);
      }

      case "getVersionHistory": {
        const versions = await outcomeRepos.assetVersions.findByAssetId(body.assetId as string);
        return NextResponse.json({ versions });
      }

      case "getTransactionDetails": {
        const transaction = await outcomeRepos.outcomeTransactions.findById(body.transactionId as string);
        const partialIntents = await outcomeRepos.partialIntents.findByTransactionId(body.transactionId as string);
        const patches = await outcomeRepos.semanticPatches.findByTransactionId(body.transactionId as string);
        const leases = await outcomeRepos.mutationLeases.findByTransactionId(body.transactionId as string);
        const executions = await outcomeRepos.executionRuns.findByTransactionId(body.transactionId as string);
        const evidence = await outcomeRepos.evidenceReceipts.findByTransactionId(body.transactionId as string);
        const verifications = await outcomeRepos.verificationRuns.findByTransactionId(body.transactionId as string);
        const commits = await outcomeRepos.stateCommits.findByTransactionId(body.transactionId as string);
        const costs = await outcomeRepos.costRecords.findByTransactionId(body.transactionId as string);
        return NextResponse.json({ transaction, partialIntents, patches, leases, executions, evidence, verifications, commits, costs });
      }

      case "getValidTransitions": {
        const status = body.status as string;
        return NextResponse.json({ transitions: getValidTransitions(status) });
      }

      default:
        return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

function getValidTransitions(status: string): string[] {
  const TRANSITIONS: Record<string, string[]> = {
    DRAFT: ["PREPARED", "ABORTED"],
    PREPARED: ["READY", "ABORTED"],
    READY: ["EXECUTING", "ABORTED"],
    EXECUTING: ["VERIFYING", "FAILED", "ABORTED"],
    VERIFYING: ["VERIFIED", "REPAIRING", "FAILED", "ABORTED"],
    REPAIRING: ["EXECUTING", "FAILED", "ABORTED"],
    VERIFIED: ["COMMITTED", "ABORTED"],
    COMMITTED: [],
    FAILED: ["ABORTED"],
    ABORTED: [],
  };
  return TRANSITIONS[status] || [];
}
