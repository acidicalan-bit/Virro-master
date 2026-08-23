# PORTABILITY-000 Contract

These rules preserve the current GitHub + Vercel + Supabase deployment while
keeping a later VPS, Docker, ECS, or Cloud Run move an infrastructure concern.

1. Domain code is provider-agnostic.
2. Application decisions are provider-agnostic.
3. Infrastructure adapters are replaceable.
4. The application has no durable local filesystem dependency.
5. Configuration and secrets are externalized.
6. A production OCI container build is required.
7. The source SHA is bound to the container image identity.
8. New provider dependencies require registration and review.
9. Database behavior remains PostgreSQL-compatible where practical.
10. Vercel is a deployment target, not authority.

The container is a shadow artifact. No traffic, DNS, Supabase deployment, or
production runtime changes are part of PORTABILITY-000. Post-commit readiness,
tenant isolation, provenance, temporal semantics, and provider behavior remain
the responsibility of the existing assurance gates.
