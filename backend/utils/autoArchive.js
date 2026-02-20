import Notification from "../models/Notification.js";
import { getRuntimeSettings } from "./runtimeSettings.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RUN_INTERVAL_MS = 60 * 60 * 1000;

let archiveTimer = null;

async function runAutoArchiveOnce() {
  try {
    const settings = await getRuntimeSettings();
    const days = Number(settings?.system?.autoArchiveDays ?? 0);
    if (!Number.isFinite(days) || days <= 0) return;

    const cutoff = new Date(Date.now() - days * ONE_DAY_MS);
    const now = new Date();

    const result = await Notification.updateMany(
      { archivedAt: null, createdAt: { $lt: cutoff } },
      { $set: { archivedAt: now } },
    );

    const modified = result?.modifiedCount || 0;
    if (modified > 0) {
      console.log(`[auto-archive] Archived ${modified} notifications older than ${days} days`);
    }
  } catch (error) {
    console.error("[auto-archive] Failed:", error.message);
  }
}

export function startAutoArchiveJob() {
  if (archiveTimer) return;

  void runAutoArchiveOnce();
  archiveTimer = setInterval(() => {
    void runAutoArchiveOnce();
  }, RUN_INTERVAL_MS);
}

