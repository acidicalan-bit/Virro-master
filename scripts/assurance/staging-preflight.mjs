const required = [
  "RUN_BUILD001_TRUST_INTEGRATION",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "VIRRO_STAGING_ASSURANCE_ACK",
];
const missing = required.filter((name) => !process.env[name]?.trim());
const isolated = process.env.VIRRO_STAGING_ASSURANCE_ACK === "ISOLATED_NON_PRODUCTION";
const activated = process.env.RUN_BUILD001_TRUST_INTEGRATION === "true";

if (missing.length > 0 || !isolated || !activated) {
  console.error(JSON.stringify({
    status: "NOT_PROVEN",
    lane: "E4_REMOTE_STAGING",
    missingEnvironment: missing,
    activationRequirement: "RUN_BUILD001_TRUST_INTEGRATION=true",
    safetyRequirement: "VIRRO_STAGING_ASSURANCE_ACK=ISOLATED_NON_PRODUCTION",
    remainsUnproven: ["deployed RLS", "Supabase Auth", "RPC ACL", "Storage policies", "service-role behavior", "remote concurrency"],
  }, null, 2));
  process.exit(2);
}

console.log("E4 staging preflight passed for an explicitly isolated non-production target.");
