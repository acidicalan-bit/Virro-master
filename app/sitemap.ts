import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.virro.app";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${base}/jira-readiness`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/change-integrity`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/workflow-discovery`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/flow-audit`, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${base}/design-delivery`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/product-delivery`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/operational-handoff`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/ai-understanding`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    { url: `${base}/security`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/enterprise`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/legal`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/legal/privacy`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/cookies`, changeFrequency: "monthly", priority: 0.3 },
    {
      url: `${base}/legal/accessibility`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/legal/security-overview`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/legal/data-processing`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/legal/subprocessors`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/legal/retention`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
