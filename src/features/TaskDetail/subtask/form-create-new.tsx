import Editor from "@/components/Editor";
import { Plus, Signal } from "lucide-react";

import PriorityDropdown from "@/components/PriorityDropdown";
import { Button } from "@/components/ui/button";
import StatusDropdown from "@/components/StatusDropdown";

export default function FormCreateNew() {
  const priorityTrigger = (
    <Button variant="outline" size="icon" className="text-xs size-[30px]">
      <Signal className="size-4" />
    </Button>
  );

  const statusTrigger = (
    <Button variant="outline" size="icon" className="text-xs h-[30px] w-max px-2 flex items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: "#F59E0B" }}
      />
      <span className="text-xs">In Progress</span>
    </Button>
  );

  return (
    <div className="flex flex-1 bg-[lch(100_0_282)] shadow-[lch(0_0_0_/_0.02)_0px_6px_18px,lch(0_0_0_/_0.04)_0px_3px_9px,lch(0_0_0_/_0.04)_0px_1px_1px] px-2.5 py-1.5 rounded-lg border border-solid border-[lch(90.55_0_282)] border-[lch(95.95_0_282)] w-full">
      <div className="w-full px-0">
        <div
        className="text-sm font-medium leading-none text-[#0f172a] outline-none px-4 py-1">
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: "#6b7280" }}
            />
            <div
              contentEditable="true"
              data-placeholder="Add title..."
              className="whitespace-pre-wrap h-6 flex items-center text-[#1b1b1b] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground outline-none focus:outline-none focus:ring-0 focus:ring-offset-0"
              onInput={(e) => {
                const el = e.currentTarget;
                if (el.innerHTML === "<br>") el.innerHTML = "";
              }}
            />
          </div>
        </div>
        <Editor
          placeholder="Add description..."
          description=""
          onChange={() => {}}
          className="border-none outline-none focus-within:ring-0 focus-within:ring-offset-0 p-0"
          editorClassName="!min-h-10 !py-1"
          editable={true}
        />
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <PriorityDropdown priority="no_priority" onPriorityChange={() => {}} trigger={priorityTrigger} />
            <StatusDropdown id={""} column_id={3} onStatusChange={() => {}} trigger={statusTrigger} />
            <Button variant="outline" size="icon" className="w-max text-xs size-[30px]">
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="w-max text-xs size-[30px]">
              Cancel
            </Button>
            <Button variant="outline" size="icon" className="w-max text-xs min-w-[90px]">
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}