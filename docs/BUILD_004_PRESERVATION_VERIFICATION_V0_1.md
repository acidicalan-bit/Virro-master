# BUILD 004 — Preservation & Verification v0.1

## Problem

A text instruction such as “change only the jacket” asks a probabilistic image model to both create the requested change and preserve every unauthorized pixel. BUILD 003 measured that a real provider candidate could cross the configured pixel-change threshold in a large portion of the image outside the selected ROI. That measurement is a pixel statistic, not a statement that the same proportion of semantic content changed.

BUILD 004 tests whether a deterministic preservation layer can suppress unauthorized pixel changes outside an explicitly authorized geometry while retaining the original raw provider output as the experimental control.

## Hypothesis

For `HARD_PRESERVE`, physically compositing source pixels outside the authorized effect area will reduce unauthorized pixel changes more reliably than prompt instructions alone. This hypothesis concerns structural pixel preservation only. It does not imply that the edit inside the ROI is aesthetically or semantically correct.

## Controlled architecture

```text
immutable source v1
  → one ImageEditExecutor call
  → immutable RAW_PROVIDER candidate
  → CompositingImagePreservationEngine
  → immutable PRESERVED candidate
  → raw and preserved evidence
  → Creative Assertions
  → machine verification
  → human preference (experimental)
  → human approval (independent)
  → canonical v2, PRESERVED only
```

The execution and preservation boundaries are provider-neutral. `ImageEditExecutor` owns provider communication and returns the actual candidate bytes plus metadata. `ImagePreservationEngine` consumes decoded pixels and has no Supabase or OpenAI dependency. `MediaObjectStore` owns immutable object storage. Repositories own persistence. The UI calls a server-only application service and never receives service-role credentials.

## PreservationPolicy

The versioned `preservation-policy-v0.1` contract contains:

- `coreRoi`: strict normalized rectangle. Width and height must be positive and the complete rectangle must remain inside `[0,1]`.
- `coupledBand`: `{ unit: "NORMALIZED_MIN_DIMENSION", size }`. `size` is between `0` and `0.25`.
- `outsideMode`: only `HARD_PRESERVE` in v0.1.
- `blendMode`: only `FEATHERED` in v0.1.
- `editRegionChangeThreshold`: minimum changed-pixel ratio inside CORE used by the technical `EDIT_REGION_HAS_CHANGE` assertion.

The coupled band uses the image’s smaller dimension so the same policy resolves deterministically for landscape and portrait images:

```text
bandPixels = ceil(coupledBand.size × min(imageWidth, imageHeight))
```

The expanded rectangle is clamped to image boundaries. The resolved pixel bounds and zone counts are persisted in `preservation_runs.zones` so the experiment can be reconstructed exactly.

## CORE, COUPLED, and LOCKED_OUTSIDE

Normalized ROI edges resolve as:

```text
x0 = floor(x × imageWidth)
y0 = floor(y × imageHeight)
x1 = ceil((x + width) × imageWidth)
y1 = ceil((y + height) × imageHeight)
```

- `CORE`: the resolved ROI rectangle.
- `COUPLED`: the clamped expanded rectangle minus CORE.
- `LOCKED_OUTSIDE`: all pixels outside the expanded rectangle.

The COUPLED region is a geometric approximation, not a claim of semantic dependency. If CORE covers the whole image, COUPLED and LOCKED_OUTSIDE both contain zero pixels. Metrics for an empty zone are defined as zero.

## Compositing methodology

Methodology: `preservation-composite-v0.1`.

For each decoded RGBA output pixel:

```text
CORE:           output = raw candidate
LOCKED_OUTSIDE: output = source
COUPLED:        output = round(source × (1 - w) + raw × w)
```

The formula is applied independently to R, G, B, and alpha. Let `d` be the Euclidean distance from the pixel center to the closest point on the CORE rectangle and `b` be `bandPixels`:

```text
t = clamp(d / b, 0, 1)
smoothstep(t) = t² × (3 - 2t)
w = 1 - smoothstep(t)
```

Candidate influence is highest near CORE and continuously approaches zero toward LOCKED_OUTSIDE. For a zero-width band there are no COUPLED pixels. The engine allocates a new RGBA array and never modifies either input.

Source and raw dimensions must match exactly. A mismatch returns structured `DIMENSION_MISMATCH`; the engine never stretches, crops, or resizes.

## Hard preservation invariant

For every decoded pixel classified as `LOCKED_OUTSIDE`:

```text
preservedCandidateRGBA == sourceRGBA
```

This is checked channel by channel, byte-exactly. Under `pixel-diff-zones-v0.1`, a valid preserved candidate must therefore have:

```text
changedPixelRatioLockedOutside = 0
```

Failure blocks machine verification and commit.

## Candidate types and provenance

`candidate_assets.candidate_type` is explicit:

- `RAW_PROVIDER`: exact bytes returned by the single provider call.
- `PRESERVED`: deterministic PNG encoded from the composite.

RAW and PRESERVED use distinct immutable Storage keys. PRESERVED references its source AssetVersion, RAW candidate, PreservationRun, execution run, transaction, policy and methodology. A unique `(execution_run_id, candidate_type)` constraint permits exactly one experimental pair per provider execution.

The database constraint prevents new committed candidates whose type is not `PRESERVED`. The application independently validates the full lineage before approval.

## Evidence and experimental metrics

Methodology: `pixel-diff-zones-v0.1`, extending the BUILD 003 luma-based `pixel-diff-v0.1` threshold of `0.01`.

RAW and PRESERVED each retain:

- `meanTotalPixelDiff`
- `changedPixelRatioTotal`
- `meanCorePixelDiff`
- `changedPixelRatioCore`
- `meanCoupledPixelDiff`
- `changedPixelRatioCoupled`
- `meanLockedOutsidePixelDiff`
- `changedPixelRatioLockedOutside`

Experimental value-add metrics are simple differences:

```text
outsideChangeReduction = raw.changedPixelRatioLockedOutside
                       - preserved.changedPixelRatioLockedOutside

totalChangeReduction = raw.changedPixelRatioTotal
                     - preserved.changedPixelRatioTotal
```

These values measure suppression of pixel change. They are not semantic quality scores and must not be marketed as such.

## Creative Assertions v0.1

The runtime emits seven required assertions:

1. `SOURCE_IMMUTABLE`
2. `DIMENSIONS_MATCH`
3. `RAW_CANDIDATE_EXISTS`
4. `PRESERVED_CANDIDATE_EXISTS`
5. `PROVENANCE_VALID`
6. `LOCKED_OUTSIDE_EXACTLY_PRESERVED`
7. `EDIT_REGION_HAS_CHANGE`

`EDIT_REGION_HAS_CHANGE` means only that the changed-pixel ratio in CORE exceeds the configured technical threshold. It does not prove the requested object was added, removed, recolored, or made aesthetically correct.

Machine verification passes only when every required assertion passes. Human approval cannot bypass a failed hard-preservation assertion.

## Human verification and commit invariants

The human first records an experimental preference: `RAW`, `PRESERVED`, `TIE`, or `BOTH_BAD`. Preference never changes canonical state.

Separately, the human can reject or approve PRESERVED. Approval requires:

- valid transaction and execution evidence;
- successful raw provider execution;
- successful PreservationRun;
- valid raw and preserved candidates from the same execution and transaction;
- passed Creative Assertions and machine verification;
- current asset head still equal to the transaction base version;
- no prior commit;
- explicit `humanAccepted = true` for the PRESERVED candidate.

Only PRESERVED becomes the next immutable AssetVersion. RAW remains non-canonical even when the human preference says RAW is visually better. Rejection, provider failure, dimension mismatch, preservation failure, storage failure, invalid provenance, failed assertion, or stale base leaves the canonical head unchanged.

## Persistence and security

Migration `20260811120000_build_004_preservation_verification.sql` adds the minimum data needed:

- provenance columns and candidate type on `candidate_assets`;
- `preservation_runs`;
- `preservation_evidence`;
- `candidate_preferences`.

The private `media` Storage bucket accepts PNG files up to 10 MB. Tables use RLS, revoke `anon` and `authenticated`, and grant server-only access to `service_role`. The service-role key and OpenAI key never enter the client bundle. Storage keys supplied by clients are not trusted; keys are generated on the server.

## Observability

The persistence chain retains transaction, execution, preservation, source version, raw candidate and preserved candidate IDs; provider/model; provider, preservation and verification latency; policy and methodology versions; usage metadata; reliable provider cost when returned; human preference; human acceptance; and commit result.

Human evaluation may carry explicit evidence tags and a bounded note. The first real BUILD 004 case is retained as `PIXEL_HUMAN_PERCEPTION_DIVERGENCE`: deterministic pixel preservation reduced locked-outside changed pixels from 74.86% to 0%, while the human judged RAW and PRESERVED as a visual tie. This is evidence for a future perceptual layer, not evidence that either candidate is semantically superior.

`execution_runs.cost_usd` is inherited as non-null from BUILD 002. When the provider does not report cost, the runtime stores `0` only in that inherited execution field with `costReported: false` and does not create a `cost_records` entry. It never claims that zero is the real provider cost.

## Tests

Synthetic fixtures cover identical candidates, CORE-only change, full-image change, LOCKED_OUTSIDE-only change, edge clamping, full-image CORE, invalid policy, dimension mismatch, exact channel preservation, smoothstep blending, input immutability, raw/preserved persistence, provenance, evidence retention, assertion failure, preference/approval separation, candidate substitution, provider/storage/preservation failure, stale writes, and immutable history.

## Limitations and future directions

- v0.1 accepts non-interlaced 8-bit PNG in grayscale, grayscale-alpha, RGB, or RGBA form. Palette and interlaced PNG require an explicit future decoder extension.
- The coupled band is geometric, not semantic. Hair, shadows, reflections, occlusion, and motion can cross its boundary.
- Deterministic preservation can create visible seams or suppress a semantically necessary surrounding change.
- The service’s multi-record commit sequence relies on repository invariants but is not yet a single PostgreSQL RPC transaction. A future build should make canonical head movement and StateCommit creation atomically database-enforced.
- Signed preview URLs expire. Immutable Storage keys and SHA-256 hashes remain the durable identity.
- Semantic correctness remains human-verified in BUILD 004.

**Pixel preservation != semantic correctness.**
