# BUILD 001-F8 Fix Design

The forward migration `20260817190000_build_001_f8_asset_scoped_trigger_fix.sql`
keeps the existing trigger names but assigns each table its own trigger
function. Each function references only columns present on its table, derives
`owner_tenant_id` from the authoritative parent, rejects conflicting owners,
and preserves the existing immutable reference and fail-closed historical
ownership rules.

No backfill, data fabrication, unrelated schema change, or edit to the BUILD
001 baseline migration is required.
