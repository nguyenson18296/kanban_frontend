import {
  Flag,
  FilePlusCornerIcon,
  Move,
  Copy,
  Bell,
  Trash2,
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
import type { ITask } from "@/types";

import StatusSubmenu from "./status-submenu";
import AssigneeSubmenu from "./assignee-submenu";

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
}

export default function TaskContextMenu({
  task,
  children,
  onDelete,
}: Readonly<TaskContextMenuProps>) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <StatusSubmenu task={task} />
        <AssigneeSubmenu task={task} />
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
