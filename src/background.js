import { isTrackableUrl, normalizeUrl, getLocalDateKey, trimOldDays } from "./shared.js";
import { rescanHistory } from "./rescan.js";

// On install or reload, backfill today from real browser history so a
// fresh/updated extension doesn't start at 0 despite a day of browsing.
chrome.runtime.onInstalled.addListener(() => {
  rescanHistory(1).catch((err) => console.error("WebMemX: initial rescan failed", err));
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // main frame only
  if (!isTrackableUrl(details.url)) return;

  const normalized = normalizeUrl(details.url);
  const dateKey = getLocalDateKey(new Date());

  const { days = {} } = await chrome.storage.local.get("days");
  const day = days[dateKey] || { urls: {} };

  if (day.urls[normalized]) return; // already seen today

  day.urls[normalized] = { url: details.url, time: Date.now() };
  days[dateKey] = day;
  trimOldDays(days);

  await chrome.storage.local.set({ days });
});
