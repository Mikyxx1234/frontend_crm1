import type { ActivityStats } from "./use-activity-stats";

const today = new Date();
function dayKey(offset: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

export const MOCK_ACTIVITY_STATS: ActivityStats = {
  window: { from: dayKey(29), to: dayKey(0) },
  totals: {
    total: 248,
    byActorType: { HUMAN: 142, AI: 38, AUTOMATION: 52, SYSTEM: 16 },
    byEntityType: { DEAL: 88, CONTACT: 54, MESSAGE: 72, CONVERSATION: 24, ACTIVITY: 10 },
    byType: [
      { type: "MESSAGE_RECEIVED", count: 64 },
      { type: "MESSAGE_SENT", count: 48 },
      { type: "STAGE_CHANGED", count: 32 },
      { type: "CREATED", count: 28 },
      { type: "STATUS_CHANGED", count: 18 },
      { type: "AUTOMATION_RUN", count: 22 },
    ],
  },
  timeline: Array.from({ length: 14 }, (_, i) => ({
    day: dayKey(13 - i),
    count: 8 + ((i * 7) % 15),
  })),
};
