export const dataHandlingSummary = {
  default_privacy_mode: "safe",
  raw_data_stored_by_default: false,
  stores: ["metadata", "readiness scores", "risk patterns", "recommended packs", "safe reports", "usage counters"],
  does_not_store_by_default: ["raw conversations", "complete documents", "transcripts", "emails", "phone numbers", "tokens", "secrets"],
  message: "Virro processes operational information to generate understanding signals without storing raw client content by default.",
} as const;

export const retentionPolicy = {
  raw_data_retention: "none",
  safe_output_retention_days: 90,
  aggregate_patterns_retention_days: 365,
  audit_logs_retention_days: 365,
} as const;

export const securityOverview = {
  default_privacy_mode: "safe",
  pipeline: ["Auth", "Tenant Guard", "PrivacyPolicyGuard", "Privacy Shield", "Analyze-Safe", "Store Signals"],
  raw_stored: false,
  certification_claimed: false,
  note: "Controls are defined by pilot and deployment scope. This overview is not a security certification or regulatory guarantee.",
} as const;
