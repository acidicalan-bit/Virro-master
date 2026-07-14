import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/app", "/app/"] }, sitemap: "https://www.virro.app/sitemap.xml", host: "https://www.virro.app" };
}
