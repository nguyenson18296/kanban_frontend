import { AlertOctagon, SquareEqual, Signal, SignalHigh, SignalMedium, type LucideIcon, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Priority } from "@/types";
import { cn } from "@/lib/utils";

interface PriorityProps {
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
}

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

  export default function PriorityDropdown({ priority, onPriorityChange }: Readonly<PriorityProps>) {
  const current =
    PRIORITY_OPTIONS.find((o) => o.value === priority) ?? PRIORITY_OPTIONS[0];
  const Icon = current.icon;

  const handlePriorityChange = (value: Priority) => {
    onPriorityChange(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "mt-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors hover:bg-[#f1f5f9]",
            current.color,
          )}
        >
          <Icon className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {PRIORITY_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              className="flex items-center justify-between"
              onSelect={() => handlePriorityChange(option.value)}
            >
              <span className="flex items-center gap-2">
                <OptionIcon className={cn("size-5", option.color)} />
                <span>{option.label}</span>
              </span>
              <span className="flex items-center gap-2">
                {priority === option.value && (
                  <Check className="h-3.5 w-3.5 text-[#0f172a]" />
                )}
                <kbd className="text-[10px] text-[#94a3b8]">{option.shortcut}</kbd>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
