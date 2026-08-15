import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  void request;
  return retiredLegacyResponse();
}

export function POST(request: Request) {
  void request;
  return retiredLegacyResponse();
}

function retiredLegacyResponse() {
  return NextResponse.json(
    {
      error: "Legacy precision-edit is retired; use the authenticated Field Beta API.",
      code: "LEGACY_CANONICAL_PATH_DISABLED",
      successor: "/api/field-beta",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
        Link: '</api/field-beta>; rel="successor-version"',
      },
    },
  );
}
