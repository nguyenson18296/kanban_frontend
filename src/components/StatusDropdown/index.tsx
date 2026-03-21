import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

interface StatusDropdownProps {
  column_id: number;
  trigger?: React.ReactNode;
  onStatusChange?: (columnId: number) => void;
}

export default function StatusDropdown({
  column_id,
  trigger,
  onStatusChange,
}: Readonly<StatusDropdownProps>) {
  const board = useStoreKanbanBoard((state) => state.kanbanBoard);

  const columns = board?.columns ?? [];
  const currentColumn =
    columns.find((col) => col.id === column_id) ?? null;

  const handleStatusChange = (columnId: number) => {
    if (columnId === column_id) return;
    onStatusChange?.(columnId);
  };

  const defaultTrigger = (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
    >
      <span className="flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: currentColumn?.color }}
        />
        {currentColumn?.name ?? "Unknown"}
      </span>
      <ChevronDown className="size-4 text-muted-foreground" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {columns.map((column) => (
          <DropdownMenuItem
            key={column.id}
            className="flex items-center justify-between"
            onSelect={() => handleStatusChange(column.id)}
          >
            <span className="flex items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <span className="truncate">{column.name}</span>
            </span>
            {column.id === column_id && (
              <Check className="size-3.5 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
