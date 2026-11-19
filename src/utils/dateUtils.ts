import { DateTime } from 'luxon';

/**
 * Parses an ISO date/time string into a valid local Luxon DateTime, or null if invalid.
 */
export function parseIsoDate(iso: string | null | undefined): DateTime | null {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso, { setZone: true }).toLocal();
  return dt.isValid ? dt : null;
}

/**
 * Returns the current timestamp in ISO-8601 format.
 */
export function nowIso(): string {
  return DateTime.now().toISO() ?? '';
}

/**
 * Returns the current epoch time in milliseconds.
 */
export function nowMillis(): number {
  return DateTime.now().toMillis();
}

/**
 * Returns today's local date formatted for <input type="date"> (YYYY-MM-DD).
 */
export function todayDateInput(): string {
  return DateTime.now().toISODate() ?? '';
}

/**
 * Converts an ISO timestamp into a local <input type="date"> value (YYYY-MM-DD).
 */
export function isoToDateInput(iso: string | null | undefined): string {
  const dt = parseIsoDate(iso);
  return dt?.toISODate() ?? '';
}

/**
 * Converts a YYYY-MM-DD date input value to an ISO timestamp at 17:00 local time.
 */
export function dateInputToIso(dateInput: string | null | undefined): string | null {
  if (!dateInput) return null;
  const dt = DateTime.fromISO(dateInput).set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
  return dt.isValid ? dt.toISO() : null;
}

/**
 * Formats an ISO date string into a short localized label (e.g. "Nov 11").
 */
export function formatShortDueDate(iso: string | null | undefined, fallback = ''): string {
  const dt = parseIsoDate(iso);
  if (!dt) return fallback;
  return dt.toLocaleString({ month: 'short', day: 'numeric' });
}

/**
 * Formats an ISO timestamp into a readable date and time for comments (e.g. "Nov 11, 2026, 2:10 PM").
 */
export function formatCommentDateTime(iso: string | null | undefined): string {
  const dt = parseIsoDate(iso);
  if (!dt) return '';
  return dt.toLocaleString(DateTime.DATETIME_MED);
}

/**
 * Compares two ISO date strings chronologically (ascending).
 */
export function compareIsoDates(a: string, b: string): number {
  const dtA = parseIsoDate(a);
  const dtB = parseIsoDate(b);
  if (dtA && dtB) return dtA.toMillis() - dtB.toMillis();
  if (dtA) return -1;
  if (dtB) return 1;
  return 0;
}

/**
 * Returns an ISO timestamp offset by `days` from today at the specified local hour.
 */
export function offsetDateIso(days: number, hour = 17): string {
  return (
    DateTime.now().plus({ days }).set({ hour, minute: 0, second: 0, millisecond: 0 }).toISO() ?? ''
  );
}
