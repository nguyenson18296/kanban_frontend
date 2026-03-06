import { useEffect, useRef, useState } from "react";

import { FieldGroup } from "@/components/ui/field";
import { Button } from "../ui/button";
import { Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { ILabel } from "@/types";
import { useGetLabels } from "./hooks/use-get-labels";
import TaskLabelDropdownItem from "./item";

interface TaskLabelDropdownProps {
  selectedLabels: ILabel[];
  trigger?: React.ReactNode;
  onLabelsChange: (labels: ILabel[]) => void;
}

export default function TaskLabelDropdown({
  selectedLabels,
  trigger,
  onLabelsChange,
}: Readonly<TaskLabelDropdownProps>) {
  const { data: allLabels } = useGetLabels();
  const [draft, setDraft] = useState<Set<string>>(
    () => new Set(selectedLabels.map((l) => l.id)),
  );
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const defaultTrigger = (
    <Button variant="outline" size="icon" className="size-6 border-none">
      <Tag />
    </Button>
  );

  const handleLabelToggle = (label: ILabel) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(label.id)) {
        next.delete(label.id);
      } else {
        next.add(label.id);
      }
      return next;
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraft(new Set(selectedLabels.map((l) => l.id)));
    } else {
      const prevIds = new Set(selectedLabels.map((l) => l.id));
      const nextIds = draftRef.current;
      const changed =
        prevIds.size !== nextIds.size ||
        [...prevIds].some((id) => !nextIds.has(id));
      if (changed) {
        const selected = (allLabels ?? []).filter((l) => nextIds.has(l.id));
        onLabelsChange(selected);
      }
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger ?? defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 py-2">
        <FieldGroup className="max-w-sm gap-2">
          {(allLabels ?? []).map((label) => (
            <TaskLabelDropdownItem
              key={label.id}
              label={label}
              selected={draft.has(label.id)}
              onSelect={handleLabelToggle}
            />
          ))}
        </FieldGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
