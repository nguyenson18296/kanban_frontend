import {
  type LucideIcon,
  AlertOctagon,
  Pencil,
  Signal,
  SignalHigh,
  SignalMedium,
  SquareEqual,
  Trash2,
  ChartPie,
  UserPlus,
  Tag,
  Calendar,
  Flag,
  FilePlusCornerIcon,
  Move,
  Copy,
  Bell
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ReactNode } from "react";
import type { ITask, Priority } from "@/types";

const PRIORITY_OPTIONS = [
  { id: 1, value: "no_priority" as Priority, label: "No priority", icon: SquareEqual, color: "text-[#94a3b8]" },
  { id: 2, value: "urgent" as Priority, label: "Urgent", icon: AlertOctagon, color: "text-red-600" },
  { id: 3, value: "high" as Priority, label: "High", icon: Signal, color: "text-orange-500" },
  { id: 4, value: "medium" as Priority, label: "Medium", icon: SignalHigh, color: "text-yellow-500" },
  { id: 5, value: "low" as Priority, label: "Low", icon: SignalMedium, color: "text-blue-400" },
] as const satisfies { id: number; value: Priority; label: string; icon: LucideIcon; color: string }[];


const FIRST_GROUP_ITEMS = [
  {
    id: 1,
    name: "Status",
    icon: ChartPie,
    hasSubMenu: true,
  },
  {
    id: 2,
    name: "Assignee",
    icon: UserPlus,
    hasSubMenu: true,
  },
  {
    id: 3,
    name: "Priority",
    icon: Signal,
    hasSubMenu: true,
    subMenuItems: PRIORITY_OPTIONS,
  },
  {
    id: 4,
    name: "Labels",
    icon: Tag,
    hasSubMenu: true,
  },
  {
    id: 5,
    name: "Change due date",
    icon: Calendar,
    hasSubMenu: true,
  },
  {
    id: 6,
    name: "Rename",
    icon: Pencil,
    hasSubMenu: false,
  }
]

const SECOND_GROUP_ITEMS = [
  {
    id: 7,
    name: "Mark as",
    icon: Flag,
    hasSubMenu: true,
  },
  {
    id: 8,
    name: "Create related",
    icon: FilePlusCornerIcon,
    hasSubMenu: true,
  },
]

const THIRD_GROUP_ITEMS = [
  {
    id: 1,
    name: "Move",
    icon: Move,
    hasSubMenu: true,
  },
  {
    id: 2,
    name: "Copy",
    icon: Copy,
    hasSubMenu: true,
  },
  {
    id: 3,
    name: "Remind me",
    icon: Bell,
    hasSubMenu: true,
  }
]

interface TaskContextMenuProps {
  task: ITask;
  children: ReactNode;
  onDelete?: (task: ITask) => void;
  onChangePriority?: (task: ITask, priority: Priority) => void;
}

export default function TaskContextMenu({
  task,
  children,
  onDelete,
  onChangePriority,
}: Readonly<TaskContextMenuProps>) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {FIRST_GROUP_ITEMS.map((item) => (
          item.hasSubMenu ? (
            <ContextMenuSub key={item.id}>
              <ContextMenuSubTrigger >
                <item.icon className="size-4" />
                &nbsp;
                {item.name}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {item.subMenuItems?.map((subItem) => (
                  <ContextMenuItem
                    key={subItem.id}
                    onSelect={() => onChangePriority?.(task, subItem.value)}
                  >
                    <subItem.icon className="size-4" />
                    {subItem.label}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : (
            <ContextMenuItem key={item.id}>
              <item.icon className="size-4" />
              &nbsp;
              {item.name}
            </ContextMenuItem>
          )
        ))}
        <ContextMenuSeparator />
        {SECOND_GROUP_ITEMS.map((item) => (
          <ContextMenuSub key={item.id}>
            <ContextMenuSubTrigger>
              <item.icon className="size-4" />
              &nbsp;
              {item.name}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent />
          </ContextMenuSub>
        ))}
        <ContextMenuSeparator />
        {THIRD_GROUP_ITEMS.map((item) => (
          <ContextMenuSub key={item.id}>
            <ContextMenuSubTrigger>
              <item.icon className="size-4" />
              &nbsp;
              {item.name}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent />
          </ContextMenuSub>
        ))}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => onDelete?.(task)}>
          <Trash2 />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
