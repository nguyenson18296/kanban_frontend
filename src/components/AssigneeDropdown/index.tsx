import { useEffect, useRef, useState } from "react";
import { Check, UserRound, UserRoundPlus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import type { TAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { useGetUsers } from "./hooks/use-get-users";

interface AssigneeDropdownProps {
  assignees: TAssignee[];
  onAssigneeChange: (assignees: TAssignee[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AssigneeDropdown({
  assignees,
  onAssigneeChange,
}: Readonly<AssigneeDropdownProps>) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<TAssignee[]>(assignees);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const assignedIds = new Set(draft.map((a) => a.id));
  const { data: users } = useGetUsers();

  const filteredUsers = (users ?? []).filter((user) =>
    user.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = (member: TAssignee) => {
    if (assignedIds.has(member.id)) {
      setDraft(draft.filter((a) => a.id !== member.id));
    } else {
      setDraft([...draft, member]);
    }
  };

  const handleClear = () => {
    setDraft([]);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraft(assignees);
    } else {
      setSearch("");
      // Only fire callback if selection actually changed
      const prevIds = new Set(assignees.map((a) => a.id));
      const nextIds = new Set(draftRef.current.map((a) => a.id));
      const changed =
        prevIds.size !== nextIds.size ||
        [...prevIds].some((id) => !nextIds.has(id));
      if (changed) {
        onAssigneeChange(draftRef.current);
      }
    }
  };

  const trigger =
    assignees.length > 0 ? (
      <AvatarGroup className="pt-4 pb-2">
        {assignees.map((assignee) => (
          <Avatar key={assignee.id} id={assignee.id} className="size-5">
            <AvatarImage src={assignee.avatar_url} />
            <AvatarFallback>{assignee.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    ) : (
      <button
        type="button"
        className="flex size-6 items-center justify-center rounded-full border border-dashed border-[#cbd5e1] text-[#94a3b8] transition-colors hover:border-[#94a3b8] hover:text-[#64748b]"
      >
        <UserRound className="size-3.5" />
      </button>
    );

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 h-96">
        <div className="px-2 py-1.5">
          <Input
            placeholder="Assign to..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuItem
          className="flex items-center justify-between"
          onSelect={(e) => { e.preventDefault(); handleClear(); }}
        >
          <span className="flex items-center gap-2">
            <UserRound className="size-4 text-[#94a3b8]" />
            <span>No assignee</span>
          </span>
          <span className="flex items-center gap-2">
            {draft.length === 0 && (
              <Check className="size-3.5 text-[#0f172a]" />
            )}
            <kbd className="text-[10px] text-[#94a3b8]">0</kbd>
          </span>
        </DropdownMenuItem>

        {filteredUsers.map((member, index) => (
          <DropdownMenuItem
            key={member.id}
            className="flex items-center justify-between"
            onSelect={(e) => { e.preventDefault(); handleToggle(member); }}
          >
            <span className="flex items-center gap-2">
              <Avatar
                size="sm"
                className={cn(
                  "size-5 text-[10px]",
                  assignedIds.has(member.id) && "ring-2 ring-[#6366f1]/30",
                )}
              >
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{member.full_name}</span>
            </span>
            <span className="flex items-center gap-2">
              {assignedIds.has(member.id) && (
                <Check className="size-3.5 text-[#0f172a]" />
              )}
              <kbd className="text-[10px] text-[#94a3b8]">{index + 1}</kbd>
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-[#94a3b8]">
          New user
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => {
            // TODO: implement invite user flow
            console.log("Invite and assign: not yet implemented");
          }}
        >
          <UserRoundPlus className="size-4 text-[#94a3b8]" />
          <span>Invite and assign...</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
