import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("technical SEO hardening", () => {
  it("keeps public canonicals and noindexes the enterprise workspace", () => {
    for (const [path, canonical] of [["app/demo/page.tsx", "/demo"], ["app/how-it-works/page.tsx", "/how-it-works"], ["app/operational-handoff/page.tsx", "/operational-handoff"]]) {
      expect(read(path)).toContain(`canonical: "${canonical}"`);
    }
    const appLayout = read("app/app/layout.tsx");
    expect(appLayout).toContain("index: false");
    expect(appLayout).toContain("noarchive: true");
  });

  it("keeps robots, sitemap and redirects internally consistent", () => {
    const robots = read("app/robots.ts");
    const sitemap = read("app/sitemap.ts");
    const config = read("next.config.ts");
    expect(robots).toContain('"/app/"');
    expect(robots).toContain('"/api/"');
    expect(robots).not.toContain('"/demo/"');
    expect(sitemap).not.toContain('`${base}/app`');
    expect(config).toContain('source: "/privacy"');
  });

  it("limits structured data to supportable public entities", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('"@type": "Organization"');
    expect(layout).toContain('"@type": "WebSite"');
    expect(layout).toContain('"@type": "WebPage"');
    expect(layout).not.toContain('"@type": "FAQPage"');
    expect(layout).not.toContain('"@type": "SoftwareApplication"');
  });

  it("keeps the social preview aligned with the approved category", () => {
    const image = read("app/opengraph-image.tsx");
    expect(image).toContain("Infraestructura de Entendimiento Operativo Digital");
    expect(image).toContain("Signal Sufficiency");
  });
});
