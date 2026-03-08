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
