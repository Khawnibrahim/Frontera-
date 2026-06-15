/**
 * PACR / availability deadline rules.
 *
 * Submissions are due the LAST TUESDAY of the month, for the schedule
 * period TWO MONTHS out. (e.g. last Tuesday of April = deadline for June.)
 *
 * After that deadline passes, any change to that month's schedule
 * requires an attached PACR (Practitioner Availability Change Request).
 */

/** Returns the last Tuesday of the given (year, monthIndex) at local 23:59:59. */
export function lastTuesdayOfMonth(year: number, monthIndex: number): Date {
  // Find last day of month, then walk back to Tuesday (DOW=2).
  const last = new Date(year, monthIndex + 1, 0);
  const dow = last.getDay();
  // Distance back to Tuesday (Sun=0, Mon=1, Tue=2, Wed=3, ...)
  const offset = (dow - 2 + 7) % 7;
  const tue = new Date(year, monthIndex, last.getDate() - offset);
  tue.setHours(23, 59, 59, 999);
  return tue;
}

/**
 * Deadline for a target schedule month (any date inside that month).
 * Deadline = last Tuesday of (target month - 2).
 */
export function pacrDeadlineFor(targetMonth: Date): Date {
  const y = targetMonth.getFullYear();
  const m = targetMonth.getMonth();
  // Two months prior
  const d = new Date(y, m - 2, 1);
  return lastTuesdayOfMonth(d.getFullYear(), d.getMonth());
}

/** True when the current moment is past the deadline for the given target month. */
export function isAfterPacrDeadline(targetMonth: Date, now: Date = new Date()): boolean {
  return now.getTime() > pacrDeadlineFor(targetMonth).getTime();
}

/** Pretty-print the deadline date. */
export function formatDeadline(targetMonth: Date): string {
  return pacrDeadlineFor(targetMonth).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
