import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const registry = JSON.parse(readFileSync(resolve("assurance/environment-lanes.json"), "utf8"));
const lanes = registry.lanes.map((lane) => {
  const missing = lane.requiredEnvironmentVariables.filter((name) => !process.env[name]?.trim());
  const activationMatches = process.env[lane.activation.variable] === lane.activation.value;
  return {
    testIdentifier: lane.testIdentifier,
    evidenceLevel: lane.evidenceLevel,
    status: activationMatches && missing.length === 0 ? "AVAILABLE" : "SKIPPED_ENVIRONMENT",
    skippedReason: activationMatches && missing.length === 0 ? null : lane.skippedReason,
    missingControl: activationMatches ? [] : [`${lane.activation.variable}=${lane.activation.value}`],
    missingEnvironment: missing,
    remainsUnproven: lane.remainsUnproven,
  };
});

console.log(JSON.stringify({ schemaVersion: registry.schemaVersion, lanes }, null, 2));
