import { AlertOctagon, SquareEqual, Signal, SignalHigh, SignalMedium, type LucideIcon } from "lucide-react";

import type { Priority } from "@/types";

interface PriorityOption {
  value: Priority;
  label: string;
  icon: LucideIcon;
  color: string;
  shortcut: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: "no_priority", label: "No priority", icon: SquareEqual, color: "text-[#94a3b8]", shortcut: "0" },
  { value: "urgent", label: "Urgent", icon: AlertOctagon, color: "text-red-600", shortcut: "1" },
  { value: "high", label: "High", icon: Signal, color: "text-orange-500", shortcut: "2" },
  { value: "medium", label: "Medium", icon: SignalHigh, color: "text-yellow-500", shortcut: "3" },
  { value: "low", label: "Low", icon: SignalMedium, color: "text-blue-400", shortcut: "4" },
];

export { PRIORITY_OPTIONS };
