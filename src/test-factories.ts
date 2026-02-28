import type { IColumn } from "@/types/column.type";
import type { ITask, TAssignee } from "@/types";

export function createAssignee(id: string, name: string): TAssignee {
  return { id, full_name: name, avatar_url: "" };
}

export function createColumn(id: number, name: string, color: string): IColumn {
  return {
    id,
    position: id,
    name,
    color,
    is_archived: false,
    created_at: "",
    updated_at: "",
    tasks: [],
  };
}

export function createTask(overrides: Partial<ITask> = {}): ITask {
  return {
    id: "task-1",
    column_id: 1,
    title: "Test Task",
    description: "",
    status: 0,
    priority: "medium",
    ticket_id: "T-1",
    labels: [],
    assignees: [],
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}
