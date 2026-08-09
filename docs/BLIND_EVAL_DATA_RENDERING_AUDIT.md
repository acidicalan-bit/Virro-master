# Build 001.1.1 — Blind Eval data/rendering audit

## Scope

This audit used only `fixtures/blind-eval-rendering-audit-demo.json`. No case, private evaluator note, expected behavior or model output from the real 120-case holdout was queried for debugging or tuning.

## Root cause

The observed behavior had multiple causes:

1. **Expected heuristic fallback:** the frozen heuristic has no specialized rule for the three technical phrases, so it uses the same generic fallback structure. The resulting contracts are not reused: each one has a different `rawInput`, interpreted intent, explicit fact and persisted run.
2. **Input propagation bug:** `blind_evaluation_cases.domain` was displayed and persisted on the case, but it was omitted from `CompileIntentInput` before invoking baseline and candidate models.
3. **Advancement presentation bug:** the next comparison rendered correctly, but the browser retained the scroll position at the bottom of the previous judgment form. The new case could therefore appear not to have advanced until the evaluator scrolled upward.

No stale React contract state, memoization bug, Next.js response-cache bug, repository first-row bug or shared output row was reproduced.

## Technical evidence

Completed technical session: `c8353ffb-6576-4817-bb28-d8df1e450391`.

| Case | Declared domain | Persisted A/B mapping | Baseline behavior | Candidate behavior |
| --- | --- | --- | --- | --- |
| `Haz el título más grande.` | `graphic_design` | A baseline / B candidate | Generic fallback tied to this exact input | Context-specific title-size edit |
| `Haz que la voz suene más cálida.` | `audio_voice` | A baseline / B candidate | Generic fallback tied to this exact input | Context-specific voice-warmth edit |
| `Quita el vaso de la mesa.` | `image_editing` | A candidate / B baseline | Generic fallback tied to this exact input | Context-specific local image edit |

Persistence verification for that session returned:

- 3 comparison rows;
- 6 distinct intent-run IDs;
- 6 distinct SHA-256 hashes of stored contracts;
- two distinct runs linked to each case;
- matching `raw_input`, `context` and contract `rawInput` for both runs of every case.

The browser audit advanced from case 1 to case 2 and then case 3. The active heading, source case IDs and form state changed on every submission. No framework error overlay, console error or warning was present.

## UI field mapping

The intended and current mapping is:

| Presentation | Intent Contract field |
| --- | --- |
| Large bold response heading | `interpretedIntent` |
| Explanatory text beneath it | `interpretedMeaning` |
| Mode | `recommendedInteractionMode` |
| Domain | `domain` |
| Confidence | `confidence` |
| Expectations | `implicitExpectations` |
| Preserve | `preservationConstraints` |
| Assumptions | `safeAssumptions[].assumption` |
| Clarifications | `clarificationRequirements[].question` |
| Do not | `prohibitedActions` |

The two principal fields were not swapped. Explicit labels were added to remove visual ambiguity.

## Integrity controls added

- Propagate `rawInput`, `context` and `domain` to both model invocations.
- Include `domain` in OpenAI and generic structured-provider case payloads without changing either system instruction.
- Return `sessionId`, `evaluationCaseId` and `comparisonId` with each comparison.
- Reject a run or provider failure whose input belongs to a different evaluation case.
- Reject a comparison that links A and B to the same run or failure row.
- Validate persisted A/B source identity against the frozen session providers.
- Mark live session responses `private, no-store` without changing global caching.
- Remount and focus/scroll the heading of each new comparison.
- Expose a collapsed technical-integrity view containing case-specific IDs and source input.

## Semantic changes

None. The heuristic rules, OpenAI system instruction, Intent Contract output schema, evaluation cases, evaluator guidance and model selection were not changed.

## Experiment status

The blind-evaluation session that triggered this audit is invalid and must not be included in product metrics. A new real session must start from the audited patch commit.
