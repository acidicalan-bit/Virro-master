# Virro — Defect and Security Finding Catalog

**Cycle:** ISTQB audit 2026-07-10  
**Status legend:** Open, Residual risk, Resolved.  
**Severity:** Critical, High, Medium, Low. **Priority:** P1 immediate, P2 planned, P3 improvement.

## Summary

| State | Count |
|---|---:|
| Open | 6 |
| Residual risk | 1 |
| Resolved and retested | 5 |
| Total | 12 |

Three open findings are production release blockers. None prevents a controlled mock-data demonstration.

## Findings

| ID | Finding | Severity / priority | Status | Evidence and expected behavior |
|---|---|---|---|---|
| VIR-001 | No authentication, authorization or workspace/tenant isolation | Critical / P1 | **Open — production blocker** | Routes and data are available without an identity boundary. Production must enforce authenticated access and server-side workspace ownership on every read/write. |
| VIR-002 | Created Understanding Events exist only in client memory | High / P1 | **Open — production blocker** | A manual event can be analyzed, but refresh discards it and seed-derived dashboard metrics do not incorporate it. Persist atomically through a validated server boundary and update aggregates. |
| VIR-003 | Privacy mode is visual state, not an enforced retention policy | High / P1 | **Open — production blocker** | The selector changes the UI but has no durable policy, audit record or backend enforcement. Storage, anonymization, retention and deletion must follow the selected mode. |
| VIR-004 | Search, notification and workspace selector controls are placeholders | Medium / P2 | Open | Controls are visible but have no operational behavior. Implement, disable, or mark them as demo-only so affordances are not misleading. |
| VIR-005 | Report export is limited to browser print | Low / P3 | Open | `Print / Export` does not generate a governed PDF/CSV file, filename, audit entry or export metadata. |
| VIR-006 | Accessibility assurance is incomplete | Medium / P2 | Open | Responsive and mobile navigation checks passed, but a full WCAG 2.2 scan, keyboard-only journey and screen-reader review remain outstanding. |
| VIR-007 | CSP allows inline scripts/styles | Medium / P2 | Residual risk | CSP blocks objects, framing and foreign origins, but still contains inline allowances required by the present Next.js hydration approach. Introduce nonces/hashes and retest in production. |
| VIR-008 | Two moderate transitive dependency advisories | Medium / P1 | **Resolved** | Patched with workspace overrides: `@hono/node-server` 1.19.13 and `postcss` 8.5.16. `pnpm audit --prod` now reports no known vulnerabilities. |
| VIR-009 | No automated regression or security tests | High / P1 | **Resolved** | Added Vitest coverage for analysis, domain, executive services, sensitive-data handling and security configuration. 17/17 tests pass. |
| VIR-010 | Sidebar badge and health values were hard-coded and inconsistent with seed data | Medium / P2 | **Resolved** | Values now derive from the same event seed and workspace aggregation used by the platform. Retested in production build. |
| VIR-011 | Closed mobile sidebar remained in the interactive/accessibility surface | Medium / P2 | **Resolved** | Closed state now applies `aria-hidden` and `inert`; open state removes both. Verified at 390 × 844 with no horizontal overflow. |
| VIR-012 | Direct dependencies used floating `latest` versions | Medium / P2 | **Resolved** | Direct runtime and development packages are pinned to exact tested versions; lockfile regenerated and build retested. |

## Retest requirements for production blockers

### VIR-001 — identity and isolation

- Verify unauthenticated denial and session expiration.
- Verify role-based access per action.
- Attempt cross-workspace reads and writes using valid IDs from another tenant.
- Verify server-side ownership checks cannot be bypassed through client state.
- Review audit logging without logging raw sensitive inputs.

### VIR-002 — persistence

- Create, refresh, reopen and update an Understanding Event.
- Verify transaction behavior on partial analysis failures.
- Verify input validation and payload-size limits at the server boundary.
- Verify executive metrics and inbox counts update consistently.

### VIR-003 — privacy enforcement

- Verify Private Mode stores only explicitly permitted derived data.
- Verify Pattern Learning Allowed records informed permission and revocation.
- Test retention expiry, deletion, export and anonymization.
- Confirm logs, traces, backups and analytics obey the same policy.

## Security posture after this cycle

The tested demo has no known production dependency advisories, redacts common credential/identity patterns before mock analysis, sends baseline browser security headers, rejects TRACE and invalid traversal probes, and exposes no tracked production secret pattern. This is a hardened demo posture, not a substitute for a production threat model, penetration test or multi-tenant authorization review after backend integration.
