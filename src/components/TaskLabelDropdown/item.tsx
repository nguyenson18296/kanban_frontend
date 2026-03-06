import type { ILabel } from "@/types";

import { DropdownMenuItem } from "../ui/dropdown-menu";
import { Field, FieldContent, FieldLabel } from "../ui/field";
import { Checkbox } from "../ui/checkbox";

interface TaskLabelDropdownItemProps {
  label: ILabel;
  selected: boolean;
  onSelect: (label: ILabel) => void;
}

export default function TaskLabelDropdownItem({
  label,
  selected,
  onSelect,
}: Readonly<TaskLabelDropdownItemProps>) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect(label);
      }}
    >
      <Field orientation="horizontal">
        <Checkbox checked={selected} />
        <FieldContent>
          <FieldLabel>
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: label.color }}
            />
            <span className="truncate">{label.name}</span>
          </FieldLabel>
        </FieldContent>
      </Field>
    </DropdownMenuItem>
  );
};