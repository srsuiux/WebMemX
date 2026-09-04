import { getDomain } from "./shared.js";

// Rolls today's unique URLs up by domain. This is what surfaces same-origin
// activity that's really many distinct pages (e.g. /product?id=123 vs
// ?id=456 both count as separate URLs but one domain).
export function computeDomainStats(urlEntries) {
  const counts = new Map();
  for (const { url } of urlEntries) {
    const domain = getDomain(url);
    counts.set(domain, (counts.get(domain) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}
