/**
 * Reads integration settings from the DB Setting table.
 * Falls back to the corresponding environment variable if the DB value is empty.
 * This lets admins override env vars via the Settings page without a redeploy.
 */

import { prisma } from "@/lib/prisma";

const LINE_KEYS = [
  "line_channel_id",
  "line_channel_secret",
  "line_channel_access_token",
  "line_callback_url",
] as const;

type LineKey = (typeof LINE_KEYS)[number];

const ENV_MAP: Record<LineKey, string> = {
  line_channel_id: process.env.LINE_CHANNEL_ID ?? "",
  line_channel_secret: process.env.LINE_CHANNEL_SECRET ?? "",
  line_channel_access_token: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  line_callback_url: process.env.LINE_CALLBACK_URL ?? "",
};

let cache: Record<string, string> | null = null;
let cacheAt = 0;
const TTL = 60_000; // 1 min

async function loadSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: [...LINE_KEYS] } } });
    cache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    cacheAt = Date.now();
    return cache;
  } catch {
    return {};
  }
}

export async function getLineSettings() {
  const db = await loadSettings();
  const get = (key: LineKey) => db[key]?.trim() || ENV_MAP[key];
  return {
    channelId: get("line_channel_id"),
    channelSecret: get("line_channel_secret"),
    channelAccessToken: get("line_channel_access_token"),
    callbackUrl: get("line_callback_url"),
  };
}

/** Call after saving settings to invalidate the in-process cache */
export function invalidateSettingsCache() {
  cache = null;
}
