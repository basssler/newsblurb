/**
 * Formatting helpers for server-provided freshness timestamps.
 *
 * We keep this deterministic (ISO-derived) so UI + tests don't depend on locale/timezone.
 */

export function formatLastUpdatedTimestamp(dateLike?: Date | string | null): string {
  if (!dateLike) return "—";

  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";

  // Example: 2026-02-16 20:15 UTC
  return `${d.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
