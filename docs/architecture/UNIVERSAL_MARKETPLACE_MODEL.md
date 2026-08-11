# Universal Digital Marketplace Architecture

## Target control flow

```text
Outcome SKU
  → Outcome Blueprint
  → Spec Compiler
  → Task Spec
  → Spec Lenses
  → Governed Runtime
  → Evidence
  → Spec Gate
  → Commit/Delivery
```

The target is provider-neutral and client-independent. The current proof remains narrow: an immutable Precision Edit Blueprint is compiled deterministically into one hash-addressed Task Spec; role lenses constrain authority; evidence is checked against that same spec; commit authorization composes with stale-head protection.

## Product and execution layers

- Outcome SKU: future customer-facing product identity.
- Outcome Blueprint: immutable, versioned production formula and platform-bounded capability policy.
- Marketplace Product Contract: binds a product and seller to an exact Blueprint version/hash.
- Spec Compiler: converts authorized customer/source facts into a Task Spec without enlarging authority.
- Task Spec: versioned transaction instruction with provenance, constraints, capabilities, criteria, and security policy.
- Spec Lens: least-authority projection for executor, preservation, or verifier roles.
- Governed Runtime: coordinates execution without granting the provider canonical mutation authority.
- Evidence: criterion-addressed facts, never an executor's bare `DONE` claim.
- Spec Gate: verifies current Task Spec identity/hash, evidence, critical criteria, and stale base state.
- Commit/Delivery: changes canonical state only after proof and explicit authorization; delivery exposes a scoped artifact, not storage authority.

## Universal model, narrow launch

The domain can describe multiple digital-good classes, buyers, delivery modes, categories, Project needs, Product relationships, and Customer/Business Canon. These definitions reduce migration cost; they do not create a catalog, recommendation engine, graph database, seller runtime, checkout, or payout system.

The Digital Solution Graph is a `[HYPOTHESIS]` over versioned `ProductRelationship` data. It may eventually support Product + Problem + Project discovery and controlled serendipity. Curated/evidence-supported relationships must remain distinguishable from hypotheses.

## Project and Canon boundary

The validated kernel `Project` remains the execution workspace referenced by assets and transactions. A `MarketplaceProject` is a non-executing planning projection that:

- references the existing execution Project;
- binds to a tenant and customer or organization;
- contains planned, in-progress, or completed Outcome needs;
- may call a need complete only when an accepted Outcome transaction is referenced;
- cannot mutate canonical assets or bypass normal transactions.

Customer/Business Canon entries are tenant-owned and provenance-aware. Customer-stated, inferred, and approved values remain distinct. Approval requires explicit actor and time metadata.

## API and client invariants

Business truth remains server-side. Client contracts carry idempotency keys and immutable references. A client can request configuration, review, correction, or delivery actions; it cannot set `paid`, `verified`, canonical head, evidence status, or tenant ownership.

Long-running jobs must eventually be resumable from server state. Current transaction IDs and server repositories provide partial foundations, but there is no general job resource, authenticated ownership, webhook/push delivery, or production recovery contract yet.

## Current implementation boundary

- `[VALIDATED]`: kernel state/version/commit controls and stale-head protection.
- `[CURRENT]`: Blueprint/Task Spec/lens/gate schemas and deterministic in-memory proof.
- `[PLANNED]`: durable registries, production Same-Spec Gate wiring, Project/Canon persistence, discovery, mobile M0, tenant auth/RLS.
- `[NOT IMPLEMENTED]`: public marketplace, payments, recommendations, graph database, arbitrary seller code, Creator Studio, native clients, BUILD 006.
