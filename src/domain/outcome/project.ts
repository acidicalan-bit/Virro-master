import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.uuid(),
  ownerTenantId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional().default(null),
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;
