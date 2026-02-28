import { useState, useCallback } from "react";
import { Check, UserPlus } from "lucide-react";

import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { useUpdateAssignees } from "@/components/AssigneeDropdown/hooks/use-update-assignees";
import type { ITask } from "@/types";
import { useStoreUsersList } from "@/stores/use-store-users-list";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface AssigneeSubmenuProps {
  task: ITask;
}

export default function AssigneeSubmenu({ task }: Readonly<AssigneeSubmenuProps>) {
  const [search, setSearch] = useState("");
  const [draftAssignedIds, setDraftAssignedIds] = useState(() => new Set(task.assignees.map((a) => a.id)));
  const users = useStoreUsersList((s) => s.users);
  const { mutate: updateAssigneesMutation } = useUpdateAssignees();
  const updateStoreAssignees = useStoreKanbanBoard((s) => s.updateTaskAssignees);

  // Focus the search input when the submenu opens.
  // SubContent unmounts on close, so this fires on each open.
  const searchRef = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      requestAnimationFrame(() => el.focus());
    }
  }, []);

  const handleToggle = (userId: string) => {
    setDraftAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleUpdateAssignees = () => {
    const newAssignees = users
      .filter((u) => draftAssignedIds.has(u.id))
      .map(({ id, full_name, avatar_url }) => ({ id, full_name, avatar_url }));

    updateStoreAssignees(task.id, newAssignees);
    updateAssigneesMutation({
      id: task.id,
      assignee_ids: Array.from(draftAssignedIds),
      previousAssignees: task.assignees,
    });
  };

  const handleSubmenuOpen = () => {
    setDraftAssignedIds(new Set(task.assignees.map((a) => a.id)));
    setSearch("");
  };

  const handleSubmenuClose = () => {
    const currentIds = new Set(task.assignees.map((a) => a.id));
    const changed =
      draftAssignedIds.size !== currentIds.size ||
      [...draftAssignedIds].some((id) => !currentIds.has(id));
    if (changed) {
      handleUpdateAssignees();
    }
  };

  const openChangeHandlers = [handleSubmenuClose, handleSubmenuOpen] as const;
  const handleOpenChange = (open: boolean) => openChangeHandlers[Number(open)]();

  const filteredUsers = users.filter((user) => user.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ContextMenuSub onOpenChange={handleOpenChange}>
      <ContextMenuSubTrigger>
        <UserPlus className="size-4" />
        &nbsp;
        Assignee
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-[400px] overflow-y-auto">
        <div className="px-2 py-1.5">
          <Input
            placeholder="Assign to..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            onKeyDown={(e) => e.stopPropagation()}
            ref={searchRef}
          />
        </div>
        {filteredUsers.map((user) => (
          <ContextMenuItem key={user.id} onSelect={(e) => { e.preventDefault(); handleToggle(user.id); }}>
            <Avatar className="size-5">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {user.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{user.full_name}</span>
            {draftAssignedIds.has(user.id) && (
              <Check className="ml-auto size-4 shrink-0" />
            )}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
