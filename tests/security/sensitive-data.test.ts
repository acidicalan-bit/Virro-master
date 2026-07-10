import { describe, expect, it } from "vitest";
import { redactSensitiveData } from "@/lib/security/sensitive-data";

describe("sensitive data redaction", () => {
  it("redacts tokens, credentials and personal email", () => {
    const input = [
      "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456",
      "api_key=super-secret-value",
      "postgres://virro:unsafe-password@localhost:5432/virro",
      "Contact alan@example.com",
      "AKIA1234567890ABCDEF",
    ].join("\n");
    const result = redactSensitiveData(input);

    expect(result.redactionCount).toBe(5);
    expect(result.sanitized).not.toContain("super-secret-value");
    expect(result.sanitized).not.toContain("unsafe-password");
    expect(result.sanitized).not.toContain("alan@example.com");
    expect(result.sanitized).toContain("[REDACTED_SECRET]");
    expect(result.sanitized).toContain("[REDACTED_PASSWORD]");
  });

  it("redacts JWT and private key material", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwxyz";
    const key = "-----BEGIN PRIVATE KEY-----\nsecret-key-material\n-----END PRIVATE KEY-----";
    const result = redactSensitiveData(`${jwt}\n${key}`);
    expect(result.detectedTypes).toContain("jwt");
    expect(result.detectedTypes).toContain("private-key");
    expect(result.sanitized).not.toContain("secret-key-material");
  });

  it("does not alter normal operational language", () => {
    const input = "The owner should validate the checkout flow before Friday.";
    expect(redactSensitiveData(input)).toEqual({ sanitized: input, redactionCount: 0, detectedTypes: [] });
  });
});
