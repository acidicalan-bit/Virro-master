# BUILD 005 — Precision Edit Field Beta + Spec-Anchored Learning v0.1

## Status and scope

This is an internal, narrow recovery build on top of the approved Foundation 1.3 tree. It demonstrates a governed Precision Edit execution record without opening a public marketplace or changing the existing canonical commit workflow.

The beta is intentionally internal/local until tenant ownership and canonical-head/StateCommit atomicity are stronger. A field-beta acceptance is evidence for learning; it is not a canonical commit.

## Objective

Obtain field evidence about Precision Edit while every useful execution is anchored to an identifiable Outcome SKU, versioned Outcome Blueprint, immutable Task Spec, preservation policy, provider execution, evidence, machine verification, and independent human acceptance.

## Non-goals

- No public marketplace, checkout, sellers, recommendations, or payments.
- No native iOS/Android app; mobile remains a first-class product surface in the specification only.
- No BUILD 006, arbitrary third-party execution, new provider, semantic/perceptual verifier, segmentation, or runtime redesign.
- No automatic golden promotion and no canonical state mutation from a study rating.

## Required execution record

Each field execution records, or explicitly leaves unknown, the following: `outcome_sku`, `blueprint_id`, `blueprint_version`, `blueprint_hash`, `task_spec_id`, `task_spec_version`, `task_spec_hash`, `spec_compiler_version`, `preservation_policy_version`, executor/provider, model, source/input references, candidate/output references, evidence, verification result, human acceptance provenance, correction/failure tags, latency, cost, and transaction/run identifiers. Unknown cost remains `null`/`UNKNOWN`; it is never represented as zero.

## Precision Edit Outcome SKU

The internal first-party identity is `precision-edit-v0` (canonical code `PRECISION_EDIT_V01`). The existing Foundation Precision Edit Blueprint is the source of truth. It expresses:

- FIXED: one provider generation, the human-acceptance-only commit policy, required source/PNG limits, and mandatory verification criteria.
- PARAMETERIZED: instruction, ROI, topology, and coupled-band configuration.
- CONDITIONAL: local-coupled edits require a band; unsupported capabilities and invalid source/ROI inputs are rejected.

The Blueprint records preservation requirements, bounded creative freedom, failure conditions, repair/abstain behavior, verification requirements, and Definition of Done without claiming unsupported provider guarantees.

## Task Spec anchoring

The field service compiles an immutable, versioned Task Spec from the published Precision Edit Blueprint after the transaction/source reference exists. Execution metadata, candidate evidence, and verification all carry the same Task Spec id and hash. A material intent change creates a new Task Spec; an executor cannot authorize canonical state mutation and verification cannot silently rewrite the spec.

## Preservation Ladder

The recovered ladder is retained as one provider RAW execution plus deterministic derivatives: `P0_RAW`, `P1_SOFT`, `P2_MODERATE`, and `P3_HARD`. Its exact policy version is persisted. Only variants actually shown to a human can receive human preference/acceptance; shadow variants may have machine evidence only.

## Field beta flow

`source → instruction → target/mutable region → execute → result → human YES/NO`.

The internal API keeps technical details out of the primary flow and accepts bounded failure tags (`requested_edit_failed`, `over_preservation`, `under_preservation`, `semantic_mismatch`, `visual_quality`, `artifact`, `instruction_misunderstanding`, or `other`) with an optional note.

## Human acceptance and machine verification

Machine verification and human acceptance are independent records. A machine pass never implies customer acceptance; human acceptance never bypasses mandatory machine/security assertions. The beta does not call the existing non-atomic approval path.

## Golden Regression

Failures and successes can be promoted manually to a curated regression set only with an explicit reason, expected behavior, Blueprint/policy provenance, and privacy/usage authorization. Customer assets are not reused without authorization; an execution is never auto-promoted.

## Metrics

Metrics are calculated only from persisted real records: FirstPassAcceptance, HumanAcceptanceRate, CorrectionRate, ConstraintViolationRate, PreservationFailureRate, latency, known-cost CostPerAcceptedOutcome, buyer effort when measurable, policy-version performance, and failure-tag distribution. No thresholds or quality superiority are claimed by this build.

## Database safety and atomicity P0

The migration is additive and server-write-only with RLS enabled, tenant ownership fields, immutable/versioned anchors, acceptance provenance, evidence/spec binding, duplicate-execution constraints, and no client grants. The known canonical `head + StateCommit` atomicity P0 remains outside this beta; field acceptance is internal evidence and cannot report canonical commit success.

## Security Delta

New assets are field outcomes, candidate references, strategy runs, evaluation judgments, and golden-regression metadata. Inputs remain server-validated images/instructions/ROI; provider calls use server-only credentials; writes use the existing service-role server boundary; RLS denies browser roles. Tenant id is carried on every field record and repository access is tenant-scoped. The beta adds no public auth claim and no arbitrary code execution. `SECURITY.md` documents this internal-only boundary and the unresolved canonical atomicity debt.

## Implementation and validation

The implementation reuses only compatible partial ideas: the deterministic ladder and bounded failure taxonomy. PNG artifacts are not copied. Tests are hermetic and cover Task Spec anchoring, same-spec verification, tenant scoping, stale/duplicate writes, acceptance provenance, ladder semantics, no fabricated preference, and unknown cost. Full tests, lint, typecheck, production build, diff checks, and scoped security sanity checks are required before review.

## Real provider gate and evidence policy

The approved provider smoke path may be run only when credentials are present. Deterministic fixtures and real provider executions are reported separately. This build never fabricates provider, human, field-volume, preference, acceptance, time-saved, cost, or quality evidence.

## Recovery audit decisions

| Partial artifact | Decision | Reason |
| --- | --- | --- |
| `candidate-test.png`, `smoke-candidate.png`, `smoke-source.png`, `source-test.png` | DEFER | Local generated artifacts; not hermetic or required by the build. They remain untouched in the original worktree. |
| `src/domain/outcome/media/field-beta.ts` | MODIFY | Strategy and bounded tags are compatible, but it lacked SKU/Blueprint/Task Spec, provenance, tenant and acceptance safeguards. |
| `src/application/ports/outcome/field-beta-repository.ts` | MODIFY | CRUD shape is reusable after adding tenant/spec/acceptance provenance and immutable records. |
| `src/application/outcome/media/field-beta-service.ts` | MODIFY | Ladder orchestration is useful, but the service lacked spec compilation, same-spec binding, internal gating and canonical-commit isolation. |
| `src/infrastructure/persistence/outcome/in-memory-field-beta-repository.ts` | MODIFY | Useful test repository; must enforce the new immutable anchors and tenant boundary. |
| `src/infrastructure/persistence/outcome/supabase-field-beta-repository.ts` | MODIFY | Mapping is reusable only after a new RLS-safe migration and tenant/spec filters. |
| `src/infrastructure/preservation/preservation-ladder-engine.ts` | KEEP | One RAW plus deterministic P1–P3 derivatives matches the contract; tests will enforce no extra provider calls. |
| `src/server/field-beta-services.ts` | MODIFY | Server-only construction is compatible; add internal feature gate and Blueprint/Task Spec wiring. |
| `supabase/migrations/20260812100000_build_005_precision_edit_field_beta.sql` | REPLACE | The partial migration lacks canonical spec anchors, tenant ownership, acceptance provenance and safe atomicity boundaries; it is not applied. |

### BUILD_005_SPEC_DRIFT

The partial service/migration would create field outcomes that cannot be traced to the canonical Outcome SKU/Blueprint/Task Spec and would expose no tenant ownership or acceptance provenance. It also implied a path toward canonical approval while the existing `OutcomeTransactionService.commitTransaction` is not a single atomic head/StateCommit operation. These contradictions are corrected by anchoring the beta and keeping canonical mutation disabled; the Foundation specification is not changed.

## BUILD 005-B readiness additions

Field outcomes now persist immutable Blueprint and Task Spec snapshots beside their ids, versions, and hashes. Repositories parse and re-verify the canonical hashes before write/read, so a historical outcome can reconstruct the exact content used and reject corruption or cross-reference mismatches. `/api/field-beta` and `/field-beta` fail closed unless `FIELD_BETA_INTERNAL_ENABLED` is exactly `true`; the UI is an internal lab only and records YES/NO acceptance separately from machine verification. Database execution and real-provider/human smoke remain external gates and are never represented by deterministic fixtures.

### BUILD 005-B security hardening boundary

The feature flag is an exposure switch, not authorization. The page/API check it at request boundaries before using a cached service, and the disabled page is not rendered. Client requests cannot provide `tenantId`; the server binds all Field Beta writes to the fixed `internal-lab` laboratory tenant. Supabase repositories enforce that binding on writes and tenant predicates on reads, including evaluation and regression/golden records. PNG decoding rejects dimensions above 2048×2048, more than 4,194,304 pixels, or the decoded resource budget before inflation/allocation. API failures return bounded internal-lab codes/messages. The corrective migration refuses the pre-snapshot schema without fabricating historical snapshots. These controls do not create public authentication or ownership; externally reachable production use remains prohibited.

## BUILD 005-B cardinality and persistence-tail repair

The BUILD 004 candidate index encoded `UNIQUE(execution_run_id, candidate_type)`, which rejected the valid ladder after provider and verification had succeeded. Forward migration `20260812130000_build_005b_candidate_ladder_cardinality.sql` now enforces exactly one `RAW_PROVIDER` per execution while allowing multiple `PRESERVED` artifacts owned by strategy runs (`P1_SOFT`, `P2_MODERATE`, `P3_HARD`). Existing rows are not rewritten or fabricated.

The persistence adapter distinguishes exact strategy retries from collisions with a different immutable Task Spec or policy. Exact matches are reusable; a different identity is reported as `PERSISTENCE_IDENTITY_CONFLICT`. The real Supabase fixture proves one RAW plus three PRESERVED rows and rejects a second RAW.

The current `run` entry point still starts a new provider experiment. A complete provider-free redrive requires a durable historical Task Spec/Blueprint load path tied to the execution checkpoint, which the current execution metadata does not yet provide. This repair therefore does not claim `BUILD_005B_FIELD_READY`.

`MIGRATION_STATE_CONTROL_STATUS = MANUAL_SQL_EDITOR_REQUIRED`: Supabase CLI/history integration is unavailable in this worktree. The versioned migration was applied in the disposable Supabase project through SQL Editor and verified via `pg_indexes`; clean-chain replay and migration-history alignment remain deployment-gate work.
