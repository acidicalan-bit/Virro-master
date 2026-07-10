import { buildWorkspaceStats } from "@/lib/domain/understanding-event";
import { events } from "@/lib/data/seed";

/** UI-facing aliases kept while persistence is introduced incrementally. */
export const mockEvents = events;
export const workspaceStats = buildWorkspaceStats(mockEvents);
