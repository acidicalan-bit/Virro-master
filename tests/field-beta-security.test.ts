import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { fieldBetaErrorResponse } from "@/app/api/field-beta/route";

describe("BUILD 005-B security boundary", () => {
  it("keeps the page and API feature gates request-bound and fail-closed", () => {
    const page = readFileSync("app/field-beta/page.tsx", "utf8");
    const route = readFileSync("app/api/field-beta/route.ts", "utf8");
    expect(page).toContain('dynamic = "force-dynamic"');
    expect(page).toContain("notFound()");
    expect(page).toContain("resolveRequestAuthority");
    expect(page).not.toContain("resolveAuthenticatedPrincipal");
    expect(route).toContain('dynamic = "force-dynamic"');
    expect(route).toContain("createFieldBetaService(");
    expect(route).toContain("resolveRequestAuthority");
    expect(route).not.toContain("tenantId: z.string");
  });

  it("sanitizes unknown persistence/provider errors", async () => {
    const response = fieldBetaErrorResponse(new Error("SQL secret /srv/service-role-key provider=internal"));
    expect(response.status).toBe(500);
    const body = await response.json() as { code: string; error: string };
    expect(body).toEqual({ code: "FIELD_BETA_REQUEST_FAILED", error: "La solicitud de Field Beta no pudo completarse." });
    expect(JSON.stringify(body)).not.toContain("service-role");
    expect(JSON.stringify(body)).not.toContain("/srv");
  });
});
