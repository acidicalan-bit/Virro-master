const DEFAULT_RETRY_DELAYS_MS = [250, 750, 1_500] as const;
const FUTURE_JWT_MESSAGE = /jwt issued at future/i;

const PROTECTED_TABLE_PATHS = new Set([
  "assets", "asset_versions", "candidate_assets", "candidate_preferences", "cost_records",
  "evidence_receipts", "execution_runs", "field_outcomes", "media_storage", "mutation_leases",
  "outcome_transactions", "partial_intents", "preservation_runs", "preservation_strategy_runs",
  "preservation_study_cases", "semantic_snapshots", "state_commits", "transaction_patches",
  "verification_criterion_evidence", "verification_runs",
]);

const PROTECTED_RPC_PATHS = new Set([
  "build002_002e_update_asset", "build002_002e_update_outcome_transaction",
  "build002_admit_delegability", "build002_bind_outcome_transaction_requirements",
  "build002_commit_readiness_authority", "build002_consume_execution_attempt_reservation",
  "build002_grant_execution_authority", "build002_grant_mutation_lease",
  "build002_insert_delegation_readiness", "build002_insert_dependency_snapshot",
  "build002_insert_signal", "build002_insert_signal_qualification",
  "build002_insert_signal_requirement", "build002_publish_outcome_blueprint",
  "build002_publish_outcome_requirement_profile", "build002_reserve_execution_attempt",
  "commit_accepted_field_outcome", "create_tenant_asset_with_initial_version",
  "provision_personal_tenant", "revoke_tenant_membership",
]);

export const BUILD002_002E_SERIALIZATION_RETRY_ENDPOINTS_TOTAL =
  PROTECTED_TABLE_PATHS.size + PROTECTED_RPC_PATHS.size;

type Sleep = (delayMs: number) => Promise<void>;

interface TransientJwtRetryOptions {
  fetchImpl?: typeof fetch;
  retryDelaysMs?: readonly number[];
  serializationRetryLimit?: number;
  sleep?: Sleep;
  supabaseUrl?: string;
}

export function createTransientJwtRetryFetch(
  options: TransientJwtRetryOptions = {},
): typeof fetch {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const serializationRetryLimit = options.serializationRetryLimit ?? 1;
  const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const canonicalOrigin = options.supabaseUrl ? new URL(options.supabaseUrl).origin : null;

  return async (input, init) => {
    const originalRequest = new Request(input, init);
    const serializationEligible = canonicalOrigin !== null
      && isProtectedPostgrestSerializationRetryEligible(originalRequest, canonicalOrigin);
    let jwtAttempts = 0;
    let serializationAttempts = 0;
    for (;;) {
      const response = await fetchImpl(originalRequest.clone());
      if (response.ok) return response;

      const responseText = await response.clone().text();
      if (serializationEligible && isSerializationFailure(responseText)
          && serializationAttempts < serializationRetryLimit) {
        serializationAttempts += 1;
        continue;
      }

      if (FUTURE_JWT_MESSAGE.test(responseText) && jwtAttempts < retryDelaysMs.length) {
        await sleep(retryDelaysMs[jwtAttempts]);
        jwtAttempts += 1;
        continue;
      }
      return response;
    }
  };
}

export function isProtectedPostgrestSerializationRetryEligible(
  request: Request,
  canonicalOrigin: string,
): boolean {
  if (request.method.toUpperCase() !== "POST") return false;
  const url = new URL(request.url);
  if (url.origin !== canonicalOrigin) return false;

  const rpcPrefix = "/rest/v1/rpc/";
  if (url.pathname.startsWith(rpcPrefix)) {
    const rpc = url.pathname.slice(rpcPrefix.length);
    return rpc.length > 0 && !rpc.includes("/") && PROTECTED_RPC_PATHS.has(rpc);
  }

  const tablePrefix = "/rest/v1/";
  if (!url.pathname.startsWith(tablePrefix)) return false;
  const table = url.pathname.slice(tablePrefix.length);
  return table.length > 0 && !table.includes("/") && PROTECTED_TABLE_PATHS.has(table);
}

function isSerializationFailure(responseText: string): boolean {
  try {
    const value = JSON.parse(responseText) as { code?: unknown };
    return value.code === "40001";
  } catch {
    return false;
  }
}
