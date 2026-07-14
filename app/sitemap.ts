import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.virro.app";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/legal`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/legal/privacy`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/cookies`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/accessibility`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/security-overview`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/data-processing`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/subprocessors`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/retention`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
