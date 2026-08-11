# PRODUCT GATE 004 — Preservation Value Study v0.1

## Status

Experimental harness implemented from frozen tag `preservation-verification-v0.1.0` (`f622ea1`). This is not BUILD 005 and it does not modify the preservation algorithm, provider adapters, image runtime, or canonical approval flow.

## Product question

When does deterministic PRESERVED output create more human value than the exact RAW provider output, and when does pixel preservation add little or negative perceptual value?

## Unit of evidence

One study case references one completed BUILD 004 transaction. Enrollment snapshots:

- SOURCE version, storage key, dimensions, and SHA-256;
- instruction and normalized ROI;
- coupled-band unit and size;
- provider and model;
- the single execution run;
- RAW and PRESERVED candidate IDs, storage keys, dimensions, and hashes;
- raw and preserved pixel metrics.

Enrollment only reads existing evidence. It never invokes image generation or creates a replacement candidate.

## Evaluation state machine

```text
HUMAN_INTENT
  → RATING_A
  → RATING_B
  → PAIRWISE
  → ACCEPTANCE
  → COMPLETE
```

Human intent and randomized A/B identity are inserted atomically. Each later stage is append-only. Reopening a case reconstructs the stage from persisted records rather than client state.

### Human intent

Before output disclosure, the evaluator must lock `expectedChange`, `expectedPreservation`, and optional `unacceptableNotes`.

### Blind scoring

Candidate media is served through an opaque same-origin endpoint. Signed Storage paths and candidate identities are not returned to the browser during scoring. Only the active candidate is available during independent scoring.

Ratings use integers from 0–2 for requested edit success, preservation success, naturalness, artifact freedom, and overall usefulness.

### Pairwise and reveal

After A and B are locked, pairwise preference accepts `A_BETTER`, `B_BETTER`, `TIE`, or `BOTH_BAD`. The server derives RAW/PRESERVED preference from the immutable presentation before identity is revealed.

### Acceptance

RAW and PRESERVED acceptance are stored as two independent booleans. Study acceptance never calls `approvePreserved`, writes an asset version, marks a candidate committed, or advances the canonical transaction.

## Database integrity

Migration: `supabase/migrations/20260811180000_product_gate_004_preservation_value_study.sql`.

Post-gate integrity migration `20260811183000_fix_preservation_study_intent_lock_permissions.sql` keeps intent/presentation locking atomic without requiring `UPDATE` privilege on append-only study tables. The HTTP and application boundaries trim copied transaction IDs, validate UUID format, and return a specific human-readable error. Supabase server clients retry only the exact transient `JWT issued at future` rejection within a bounded budget.

Append-only tables:

- `preservation_study_cases`;
- `preservation_study_intents`;
- `preservation_study_presentations`;
- `preservation_study_ratings`;
- `preservation_study_pairwise`;
- `preservation_study_acceptances`.

Postgres enforces:

- unique transaction per study;
- unique planned case per study;
- atomic intent + presentation locking;
- A before B;
- both ratings before pairwise preference;
- correct derived preference for the stored A/B mapping;
- pairwise preference before acceptance;
- rejection of every update or delete to historical evaluation tables.

RLS is enabled. `anon` and `authenticated` receive no table privileges. Server-side `service_role` receives only `SELECT` and `INSERT` for study history.

## Initial 30-case plan

The frozen plan contains 30 distinct representative scenarios:

| Topology | Count |
| --- | ---: |
| LOCAL_INDEPENDENT | 8 |
| LOCAL_COUPLED | 10 |
| STRUCTURAL | 8 |
| GLOBAL/control | 4 |

The square fixture remains a technical regression case and is not part of the primary plan. Templates describe required source conditions and instructions but do not contain pre-written human intent answers, preventing evaluator anchoring.

## Metrics

Rates use completed cases in the applicable stratum as denominator:

- PreservedPreferenceRate;
- RawPreferenceRate;
- TieRate;
- BothBadRate;
- RawAcceptanceRate;
- PreservedAcceptanceRate;
- `AcceptanceLift = PreservedAcceptanceRate - RawAcceptanceRate`.

Each rating dimension is averaged independently for RAW and PRESERVED. The complete aggregate is also computed by topology, task type, and observational coupled-band bucket:

- ZERO: 0;
- SMALL: `(0, 0.03]`;
- MEDIUM: `(0.03, 0.08]`;
- LARGE: `(0.08, 0.25]`.

Band grouping is descriptive only and never changes the configured band.

## Pixel ↔ human divergence

Persisted descriptive tags:

- `LARGE_PIXEL_GAIN_NO_HUMAN_PREFERENCE`;
- `LARGE_PIXEL_GAIN_PRESERVED_PREFERENCE`;
- `LARGE_PIXEL_GAIN_RAW_PREFERENCE`;
- `SMALL_PIXEL_DIFFERENCE_HUMAN_PRESERVATION_FAILURE`.

For v0.1, a large pixel gain means at least 0.25 absolute reduction in changed-pixel ratio within LOCKED_OUTSIDE. A small difference means at most 0.05. These thresholds classify observations; they do not establish semantic correctness or statistical significance.

## Gate decision

No decision is emitted before 30 completed cases. After 30, the report provides a transparent descriptive suggestion among `STRONG_SIGNAL`, `CONDITIONAL_SIGNAL`, `NO_SIGNAL`, and `NEGATIVE_SIGNAL`.

Every suggestion remains marked `manualReviewRequired: true`. The 30-case sample is a product gate, not scientific proof.

## Local use

1. Apply all versioned Supabase migrations.
2. Configure the same server-side environment used by BUILD 004.
3. Run `npm run dev`.
4. Open `/preservation-study`.
5. Enroll a completed BUILD 004 transaction and choose its topology/task type.
6. Complete the five locked stages.

The study can be resumed with `/preservation-study?caseId=<uuid>`.

## Deliberate limitations

- Human evaluation is required; no semantic/perceptual judge was added.
- No automatic band optimization is performed.
- No 30-case conclusion exists until 30 real evaluations are complete.
- The plan does not fabricate assets, provider outputs, ratings, or acceptance decisions.
- Statistical confidence intervals and inter-rater reliability are deferred until multiple evaluators or a larger sample exist.
