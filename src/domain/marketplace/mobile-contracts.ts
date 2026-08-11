import { z } from "zod";

import { SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

const ClientReferenceSchema = z.object({
  objectId: z.uuid(),
  versionId: z.uuid(),
  sha256: z.string().regex(SHA256_PATTERN),
  mimeType: z.string().trim().min(3).max(120),
}).strict();

export const IntentInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("TEXT"), text: z.string().trim().min(1).max(10_000) }).strict(),
  z.object({ kind: z.literal("VOICE_REFERENCE"), reference: ClientReferenceSchema }).strict(),
  z.object({ kind: z.literal("MEDIA_REFERENCE"), reference: ClientReferenceSchema }).strict(),
  z.object({ kind: z.literal("FILE_REFERENCE"), reference: ClientReferenceSchema }).strict(),
]);

export const OutcomeConfigurationSchema = z.object({
  schemaVersion: z.literal("outcome-configuration-v0.1"),
  idempotencyKey: z.uuid(),
  productId: z.uuid(),
  blueprint: z.object({
    id: z.uuid(),
    version: z.number().int().positive(),
    hash: z.string().regex(SHA256_PATTERN),
  }).strict(),
  projectId: z.uuid().nullable(),
  canon: z.object({ id: z.uuid(), version: z.number().int().positive() }).strict().nullable(),
  intent: z.array(IntentInputSchema).min(1),
  parameters: z.record(z.string(), z.unknown()),
}).strict();

export const JobStatusSchema = z.enum([
  "DRAFT",
  "INPUT_REQUIRED",
  "READY",
  "QUEUED",
  "RUNNING",
  "VERIFYING",
  "REVIEW_REQUIRED",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export const ReviewDecisionSchema = z.object({
  schemaVersion: z.literal("review-decision-v0.1"),
  idempotencyKey: z.uuid(),
  transactionId: z.uuid(),
  taskSpecId: z.uuid(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  baseVersionId: z.uuid(),
  decision: z.enum(["ACCEPT", "REQUEST_CORRECTION", "REJECT"]),
  correction: z.string().trim().min(1).max(4_000).nullable(),
}).strict().superRefine((decision, context) => {
  if (decision.decision === "REQUEST_CORRECTION" && decision.correction === null) {
    context.addIssue({ code: "custom", path: ["correction"], message: "Correction instructions are required." });
  }
  if (decision.decision !== "REQUEST_CORRECTION" && decision.correction !== null) {
    context.addIssue({ code: "custom", path: ["correction"], message: "Correction text is only valid for REQUEST_CORRECTION." });
  }
});

export const DeliveryActionSchema = z.object({
  schemaVersion: z.literal("delivery-action-v0.1"),
  idempotencyKey: z.uuid(),
  transactionId: z.uuid(),
  artifactId: z.uuid(),
  action: z.enum(["DOWNLOAD", "CREATE_SCOPED_SHARE", "REVOKE_SHARE", "OPEN_IN_APP"]),
}).strict();

export const ClientCapabilityProfileSchema = z.object({
  schemaVersion: z.literal("client-capability-profile-v0.1"),
  surface: z.enum(["RESPONSIVE_WEB", "PWA", "NATIVE_IOS", "NATIVE_ANDROID", "DESKTOP_WEB"]),
  viewport: z.enum(["COMPACT", "MEDIUM", "EXPANDED"]),
  supportsFileUpload: z.boolean(),
  supportsCameraCapture: z.boolean(),
  supportsMicrophoneCapture: z.boolean(),
  supportsPushNotifications: z.boolean(),
  maxUploadBytes: z.number().int().positive(),
  acceptedMimeTypes: z.array(z.string().trim().min(3).max(120)),
}).strict();

export type IntentInput = z.infer<typeof IntentInputSchema>;
export type OutcomeConfiguration = z.infer<typeof OutcomeConfigurationSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type DeliveryAction = z.infer<typeof DeliveryActionSchema>;
export type ClientCapabilityProfile = z.infer<typeof ClientCapabilityProfileSchema>;
