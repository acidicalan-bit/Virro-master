import { NextResponse } from "next/server";
import { createSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { FakeImageEditExecutor } from "@/src/infrastructure/executors/image/fake-image-edit-executor";
import { OpenAIImageEditExecutor } from "@/src/infrastructure/executors/image/openai-image-edit-executor";
import type { ImageEditExecutor } from "@/src/application/ports/outcome/image-edit-executor-port";

let _executor: ImageEditExecutor | null = null;

function getExecutor(): ImageEditExecutor {
  if (_executor) return _executor;
  const provider = process.env.IMAGE_EDIT_PROVIDER?.trim();
  if (!provider) {
    throw new Error("IMAGE_EDIT_PROVIDER is not configured. Set IMAGE_EDIT_PROVIDER=fake or IMAGE_EDIT_PROVIDER=openai");
  }
  if (provider === "fake") {
    const repos = createSupabaseRepositories();
    _executor = new FakeImageEditExecutor(repos as never);
    return _executor;
  }
  if (provider === "openai") {
    _executor = new OpenAIImageEditExecutor();
    return _executor;
  }
  throw new Error(`Unknown IMAGE_EDIT_PROVIDER: ${provider}. Use "fake" or "openai"`);
}

const repos = createSupabaseRepositories();

export async function GET() {
  try {
    const projects = await repos.projects.list();
    return NextResponse.json({ projects, assets: [], transactions: [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action: string; [key: string]: unknown };

    switch (body.action) {
      case "createProject": {
        const project = await repos.projects.create({ name: body.name as string, description: (body.description as string) || null });
        return NextResponse.json({ project });
      }

      case "createAsset": {
        const asset = await repos.assets.create({ projectId: body.projectId as string, name: body.name as string, description: null });
        return NextResponse.json({ asset });
      }

      case "createTransaction": {
        const transaction = await repos.outcomeTransactions.create({
          projectId: body.projectId as string,
          assetId: body.assetId as string,
          baseVersionId: body.baseVersionId as string,
          rawRequest: body.rawRequest as string,
        });
        return NextResponse.json({ transaction });
      }

      case "executeTransaction": {
        const exec = getExecutor();
        const result = await exec.execute({
          transactionId: body.transactionId as string,
          sourceStorageKey: body.sourceStorageKey as string,
          sourceMimeType: body.sourceMimeType as string,
          sourceWidth: Number(body.sourceWidth),
          sourceHeight: Number(body.sourceHeight),
          roi: body.roi as { x: number; y: number; width: number; height: number },
          instruction: body.instruction as string,
        });
        return NextResponse.json({ result });
      }

      case "verifyTransaction": {
        const transaction = await repos.outcomeTransactions.findById(body.transactionId as string);
        if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        return NextResponse.json({ transaction });
      }

      case "commitTransaction": {
        const transaction = await repos.outcomeTransactions.findById(body.transactionId as string);
        if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        await repos.outcomeTransactions.updateStatus(transaction.id, "COMMITTED");
        return NextResponse.json({ transaction });
      }

      case "rejectTransaction": {
        const transaction = await repos.outcomeTransactions.findById(body.transactionId as string);
        if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        await repos.outcomeTransactions.updateStatus(transaction.id, "ABORTED");
        return NextResponse.json({ transaction });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
