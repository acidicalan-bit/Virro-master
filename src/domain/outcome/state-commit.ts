import { z } from "zod";

export const StateCommitSchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  assetId: z.uuid(),
  newVersionId: z.uuid(),
  previousVersionId: z.uuid(),
  committedAt: z.string(),
});

export type StateCommit = z.infer<typeof StateCommitSchema>;

export const CreateStateCommitSchema = z.object({
  transactionId: z.uuid(),
  assetId: z.uuid(),
  newVersionId: z.uuid(),
  previousVersionId: z.uuid(),
});

export type CreateStateCommit = z.infer<typeof CreateStateCommitSchema>;