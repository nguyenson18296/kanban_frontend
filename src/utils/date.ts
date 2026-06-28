import { Calendar, Calendar1, CalendarDays, type LucideIcon } from "lucide-react";

export const DUE_DATE_OPTIONS: DueDateOption[] = [
  { label: "Today", icon: Calendar1, getDate: () => addDays(0) },
  { label: "Tomorrow", icon: Calendar, getDate: () => addDays(1) },
  { label: "End of this week", icon: CalendarDays, getDate: getEndOfWeek },
  { label: "In one week", icon: CalendarDays, getDate: () => addDays(7) },
] as const;

export interface DueDateOption {
  label: string;
  icon: LucideIcon;
  getDate: () => Date | null;
} 

export function getEndOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setDate(now.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  return date.toLocaleDateString("en-US", options);
}

/**
 * Format an ISO date string as "MMM yyyy" (e.g. "Mar 2024"), suitable
 * for "Joined ..." / "Created ..." labels. Returns null when the input
 * is empty, missing, or unparseable so callers can skip rendering.
 *
 * Forces UTC so backend-canonical timestamps render the same month/year
 * for every viewer. Without this, a UTC-midnight `created_at` on the
 * 1st of a month (e.g. `2024-03-01T00:00:00.000Z`) would shift to the
 * previous month in negative-offset timezones (e.g. "Feb 2024" in UTC-5).
 */
export function formatJoinedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatDate(date, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
