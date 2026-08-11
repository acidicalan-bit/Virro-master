# Mobile-First Product Surface

## Decision

Mobile is a **first-class product surface**. This is a mobile-first experience requirement, not a native-first implementation mandate.

The operating model is:

```text
phone = control surface
cloud = factory
```

The phone should support discovery, minimal configuration, status, review, correction, acceptance, and delivery. Canonical state, provider credentials, execution, evidence, payment authority, and commit authorization remain server-side.

## Mobile UX law

A normal Outcome should be discoverable and requestable with minimal typing and without provider/model selection. The flow may reuse approved Project/Canon context, must recover after interruption, and must make review, correction, delivery, and sharing usable on a compact viewport.

The Situational Execution Gap is `[HYPOTHESIS]`: mobile may create value when a buyer has urgency or intent but lacks the time, attention, environment, or specialized tools to execute the work directly.

## Phases

- M0 `[PLANNED]`: responsive mobile-first web over the same server/domain contracts; compact review/correction; resumable transaction status; scoped delivery.
- M1 `[DEFERRED]`: PWA capabilities only where installation, offline shell, share targets, or notifications show measurable value.
- M2 `[DEFERRED]`: native iOS/Android only under a separate approved Build and evidence that native capabilities improve conversion, trust, urgent execution, or retention.

## Provider-neutral interaction contracts

The domain foundation defines `IntentInput`, `OutcomeConfiguration`, `JobStatus`, `ReviewDecision`, `DeliveryAction`, and `ClientCapabilityProfile`. These use immutable media/file references and idempotency keys, and contain no iOS/Android SDK types.

## Architecture audit

Current evidence:

| Surface | Current state | Gap before M0 |
| --- | --- | --- |
| Layout | Labs include responsive CSS and compact breakpoints. | Navigation and dense transaction/debug tables are lab-oriented, not a validated purchase/review flow. |
| Upload | Precision Edit accepts one PNG up to 10 MB in browser memory. | No resumable upload, camera capture flow, background transfer, magic-byte validation, or generalized file contract in runtime. |
| Long jobs | Transactions and persisted IDs exist; UI has loading/error states. | No general client-independent job endpoint, polling cursor, reconnect policy, push/webhook, or cancellation contract. |
| Checkout | No billing code exists. | Payment authority, idempotent checkout, receipt and refund boundaries require a separate approved Build. |
| Auth/session | Internal lab uses server-side service role without user auth. | No tenant session, device/session revocation, high-risk re-auth, or cross-tenant authorization. |
| Project/Canon | Kernel Project exists; marketplace Project/Canon schemas are domain-only. | No persistence, approval UI, ownership enforcement, or minimal-context retrieval. |
| Delivery/share | Signed media previews exist and expire. | No durable delivery record, scoped share/revoke workflow, download recovery, or phone-native share integration. |

Desktop assumptions include wide debug grids, persistent header navigation, large two-column evidence layouts, manual UUID-driven lab flows, and browser-memory uploads. These are audit findings, not authorization to redesign the current labs.

## Mobile security baseline

- Lost/shared devices and stolen sessions require server-side revocation and short-lived scoped sessions.
- Clients cannot assert payment, verification, tenant, evidence, or canonical commit state.
- Deep-link mutations require signature, expiry, audience, nonce/replay protection, and authorization at use time.
- Push notifications contain no private prompt, media, signed URL, or sensitive result content.
- Client storage contains no provider/service-role secrets and minimizes cached customer data.
- Upload ownership and tenant binding are enforced server-side before processing or delivery.
- High-risk approvals require current Task Spec/base version and appropriate authorization.

These are `[PLANNED]` controls unless existing kernel tests establish a narrower invariant.

## Future instrumentation

Planned event contracts:

- `mobile_listing_view`
- `mobile_configuration_start`
- `mobile_configuration_complete`
- `mobile_checkout_start`
- `mobile_checkout_complete`
- `mobile_order_accepted`
- `mobile_correction_requested`
- `mobile_delivery_completed`
- `mobile_repeat_purchase`
- `mobile_cross_category_repeat`
- `mobile_urgent_outcome_selected`

Do not collect persistent device identity, raw private prompts, media, or notification contents merely for these metrics. Conversion advantage, urgent demand, and native retention remain `[EXPERIMENT]` until measured.
