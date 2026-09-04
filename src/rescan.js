import { isTrackableUrl, normalizeUrl, getLocalDateKey, MAX_DAYS, trimOldDays } from "./shared.js";

// chrome.history has no "unlimited" sentinel for maxResults, so just ask for
// far more than any real browsing history would produce in the window.
const MAX_HISTORY_RESULTS = 1000000;

const META_KEY = "rescanMeta"; // { lastRescanAt, historyScannedFrom }

async function getMeta() {
  const { rescanMeta } = await chrome.storage.local.get(META_KEY);
  return rescanMeta || null;
}

// Backfills local storage from the browser's real history. Existing entries
// (e.g. from live webNavigation tracking, or a previous rescan) are left
// untouched — this only fills in URLs that aren't recorded yet.
//
// Caching: if a previous rescan already covered back to `daysBack` (or
// further), only the delta since that scan is re-fetched from
// chrome.history — a repeat click on "Rescan" is then a fast incremental
// sync instead of re-walking the full window and re-calling getVisits for
// every URL again. Asking for a wider window than was ever scanned (e.g.
// the first full-history rescan after an install-time today-only scan)
// automatically falls back to a full scan of that wider window.
export async function rescanHistory(daysBack = MAX_DAYS) {
  const endTime = Date.now();
  const desiredStart = endTime - daysBack * 24 * 60 * 60 * 1000;

  const meta = await getMeta();
  const covered = meta && meta.historyScannedFrom <= desiredStart;
  const startTime = covered ? meta.lastRescanAt : desiredStart;

  const historyItems = await chrome.history.search({
    text: "",
    startTime,
    endTime,
    maxResults: MAX_HISTORY_RESULTS,
  });

  const trackableItems = historyItems.filter((item) => isTrackableUrl(item.url));

  // chrome.history.search collapses each URL to one row with its latest
  // visit; getVisits gives the individual visit timestamps we need to
  // bucket a URL correctly if it was visited on more than one day.
  const visitsByItem = await Promise.all(
    trackableItems.map((item) => chrome.history.getVisits({ url: item.url }))
  );

  const { days = {} } = await chrome.storage.local.get("days");

  trackableItems.forEach((item, i) => {
    const normalized = normalizeUrl(item.url);
    for (const visit of visitsByItem[i]) {
      if (visit.visitTime < startTime || visit.visitTime > endTime) continue;

      const dateKey = getLocalDateKey(new Date(visit.visitTime));
      const day = days[dateKey] || { urls: {} };
      if (!day.urls[normalized]) {
        day.urls[normalized] = { url: item.url, time: visit.visitTime };
      }
      days[dateKey] = day;
    }
  });

  trimOldDays(days);

  const newMeta = {
    lastRescanAt: endTime,
    historyScannedFrom: Math.min(meta?.historyScannedFrom ?? desiredStart, desiredStart),
  };

  await chrome.storage.local.set({ days, [META_KEY]: newMeta });
  return days;
}
