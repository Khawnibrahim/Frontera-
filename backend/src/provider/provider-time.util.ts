/**
 * Time and date helpers for the provider portal (ADR 0009 — PRN Availability Calendar).
 *
 * Lovable sends clock labels like "8:00 AM"; Postgres `time_off_requests` stores `time` as HH:MM:SS.
 * Month boundaries and advance-notice checks align with `ProviderSchedulingService` validation.
 */

import { AppErrors } from '../common/errors/app-errors';
import { formatIsoDate, parseIsoDate } from '../repository/persistence/utils/master-availability.util';

/**
 * Parse a UI clock label into a Postgres `time` string (`HH:MM:SS`).
 *
 * Accepts 12-hour labels from Lovable (`8:00 AM`, `5:00 PM`) or 24-hour `HH:MM` for tests/tools.
 */
export function parseClockLabelToDbTime(label: string): string {
  const t = label.trim();
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hours = Number.parseInt(m12[1], 10);
    const minutes = Number.parseInt(m12[2], 10);
    const meridiem = m12[3].toUpperCase();
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hours = Number.parseInt(m24[1], 10);
    const minutes = Number.parseInt(m24[2], 10);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }
  throw AppErrors.invalidTimeFormat(label);
}

/** Reject same-day or inverted ranges before persisting availability days. */
export function assertEndAfterStart(startLabel: string, endLabel: string): void {
  const start = parseClockLabelToDbTime(startLabel);
  const end = parseClockLabelToDbTime(endLabel);
  if (end <= start) {
    throw AppErrors.endTimeBeforeStart();
  }
}

/**
 * Whole calendar days from today (UTC date string) to `requestDate` (inclusive of target day).
 *
 * Used when the target month is past its monthly submission deadline: each added day must be
 * at least 14 days out (ADR 0009 — post-deadline add notice). Compare with `>= 14`.
 */
export function calendarDaysFromToday(requestDateIso: string): number {
  const today = parseIsoDate(formatIsoDate(new Date()));
  const target = parseIsoDate(requestDateIso);
  return Math.floor((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * `monthYear` must be the first of the month (`YYYY-MM-01`) — same contract as admin PRN APIs.
 */
export function assertFirstOfMonth(monthYear: string): void {
  const d = parseIsoDate(monthYear);
  if (d.getDate() !== 1) {
    throw AppErrors.monthYearNotFirst();
  }
}

/**
 * Ensure each submitted day belongs to the target month (`monthYear` … `monthEnd` inclusive).
 *
 * `monthEnd` comes from `parseMonthYear` in the repository layer (last day of that month).
 */
export function assertDateInMonth(requestDate: string, monthYear: string, monthEnd: string): void {
  if (requestDate < monthYear || requestDate > monthEnd) {
    throw AppErrors.requestDateOutOfMonth(requestDate, monthYear);
  }
}
