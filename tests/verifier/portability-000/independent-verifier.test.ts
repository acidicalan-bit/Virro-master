import { beforeAll, describe, expect, it } from "vitest";
import { verifyStatic } from "@/scripts/verifier/portability-000/static-verifier.mjs";

describe("PORTABILITY-000 independent verifier", () => {
  let result: ReturnType<typeof verifyStatic>;
  beforeAll(() => {
    result = verifyStatic();
  }, 120_000);

  it("pins the product identity and detects the hidden environment boundary", () => {
    expect(result.PRODUCT_SHA).toBe("935c568ab273f9adae8c23785a77191e676e82c4");
    expect(result.PRODUCT_TREE).toBe("9cfedfb381bd84e0edbdd0beca397f70df203f5e");
    expect(result.PRODUCT_REMOTE_SHA).toBe(result.PRODUCT_SHA);
    expect(result.D0_D2_FILES_CHANGED).toEqual([]);
    expect(result.UNREGISTERED_SOURCE_ENV_NAMES).toEqual(["LLM_API_KEY", "LLM_MODEL"]);
    expect(result.HIDDEN_ENV_RATCHET_ATTACK).toBe("FAIL");
    expect(result.VERIFICATION_FAILURES).toEqual(expect.arrayContaining([
      expect.stringContaining("UNREGISTERED_SOURCE_ENV_USAGE_NOT_RATCHETED"),
      expect.stringContaining("One or more independent portability attacks"),
    ]));
  });

  it("keeps the secret and public-key boundaries independently green", () => {
    expect(result.SECRET_CLASSIFICATION_INVARIANT).toBe("PASS");
    expect(result.SYNCED_SECRET_DOWNGRADE_ATTACK).toBe("PASS");
    expect(result.FUTURE_SECRET_NAME_ATTACKS).toBe("PASS");
    expect(result.PUBLIC_EXCEPTION_POSITIVES).toBe("PASS");
  });
});
