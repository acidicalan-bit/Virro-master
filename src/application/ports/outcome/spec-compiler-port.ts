import type { OutcomeCapability } from "@/src/domain/outcome/specification/outcome-blueprint";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import type { CompilePrecisionEditTaskSpecInput, SpecLens, TaskSpecExecutionResult } from "@/src/application/outcome/specification/types";

export interface SpecCompilerPort {
  readonly name: string;
  readonly version: string;
  compile(input: CompilePrecisionEditTaskSpecInput): Promise<TaskSpec>;
}

export interface CrossAgentExecutorPort {
  readonly name: string;
  readonly version: string;
  readonly provider: string;
  readonly capabilities: readonly OutcomeCapability[];
  execute(lens: SpecLens): Promise<TaskSpecExecutionResult>;
}
