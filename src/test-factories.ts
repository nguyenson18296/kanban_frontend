import type { IColumn } from "@/types/column.type";
import type { ITask, TAssignee, IUser } from "@/types";

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

export function createUser(overrides: Partial<IUser> = {}): IUser {
  return {
    id: "user-1",
    email: "user@example.com",
    full_name: "Test User",
    role: "member",
    team_id: 1,
    team: {
      id: 1,
      name: "Default",
      description: "",
      color: "#000",
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    avatar_url: "",
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

export function createTask(overrides: Partial<ITask> = {}): ITask {
  return {
    id: "task-1",
    due_date: null,
    column_id: 1,
    title: "Test Task",
    description: "",
    status: 0,
    priority: "medium",
    position: 0,
    ticket_id: "T-1",
    labels: [],
    assignees: [],
    creator: createUser(),
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}
