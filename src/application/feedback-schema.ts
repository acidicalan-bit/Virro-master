import { z } from "zod";

export const FeedbackTagSchema = z.enum([
  "wrong_context",
  "literal_interpretation",
  "missed_slang",
  "missed_implicit_constraint",
  "unnecessary_question",
  "unsafe_assumption",
  "wrong_interaction_mode",
  "missed_frustration",
  "other",
]);

export const SubmitFeedbackSchema = z
  .object({
    intentRunId: z.string().uuid(),
    accepted: z.boolean(),
    correctedInterpretation: z.string().trim().max(8_000).nullable(),
    feedbackTags: z.array(FeedbackTagSchema).max(9),
    notes: z.string().trim().max(4_000).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.accepted && !value.correctedInterpretation && !value.notes) {
      context.addIssue({
        code: "custom",
        path: ["correctedInterpretation"],
        message: "Incluye una corrección o una nota cuando la interpretación sea incorrecta.",
      });
    }
  });

export type SubmitFeedback = z.infer<typeof SubmitFeedbackSchema>;
