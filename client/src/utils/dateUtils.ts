/**
 * Returns today's date as YYYY-MM-DD in the *browser's local*
 * calendar date — not UTC.
 *
 * `new Date().toISOString()` always returns the UTC date. For a
 * user behind UTC (e.g. America/New_York, UTC-4/-5), that can
 * silently roll back to "yesterday" in the evening, or for a
 * user ahead of UTC it can roll forward to "tomorrow" late at
 * night — either way the date picker's `min` attribute would be
 * wrong and could block booking today, or allow a stale/past date.
 */
export const getLocalTodayISODate = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
