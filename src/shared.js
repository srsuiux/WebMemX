// Shared helpers used by both the background service worker and the popup.

export function isTrackableUrl(url) {
  if (!url) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

// Normalizes a URL for same-day dedup: lowercases scheme/host, drops the
// fragment, and strips a single trailing slash. Query params are preserved
// as-is since they can identify distinct pages (e.g. ?id=123 vs ?id=456).
export function normalizeUrl(url) {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

// Registrable "site" a URL belongs to, for grouping. www. is stripped so
// www.github.com and github.com roll up together.
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const MAX_DAYS = 30;

export function trimOldDays(days) {
  const keys = Object.keys(days).sort(); // ISO date strings sort chronologically
  while (keys.length > MAX_DAYS) {
    delete days[keys.shift()];
  }
}
