import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.virro.app";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/app`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/app/reports`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/app/privacy-trust`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/app/demo-scenarios`, changeFrequency: "weekly", priority: 0.6 },
  ];
}
