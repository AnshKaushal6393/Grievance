import AdminSetting from "../models/AdminSetting.js";

const ADMIN_SETTINGS_KEY = "global";

const DEFAULT_RUNTIME_SETTINGS = {
  system: {
    maintenanceMode: false,
    autoArchiveDays: 180,
  },
  api: {
    rateLimitPerMin: 120,
  },
};

let cachedSettings = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 1000;

export function invalidateRuntimeSettingsCache() {
  cachedSettings = null;
  cachedAt = 0;
}

export async function getRuntimeSettings() {
  const now = Date.now();
  if (cachedSettings && now - cachedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const doc = await AdminSetting.findOne({ key: ADMIN_SETTINGS_KEY })
    .select("settings")
    .lean();
  const remote = doc?.settings || {};

  cachedSettings = {
    ...DEFAULT_RUNTIME_SETTINGS,
    ...remote,
    system: {
      ...DEFAULT_RUNTIME_SETTINGS.system,
      ...(remote.system || {}),
    },
    api: {
      ...DEFAULT_RUNTIME_SETTINGS.api,
      ...(remote.api || {}),
    },
  };
  cachedAt = now;
  return cachedSettings;
}
