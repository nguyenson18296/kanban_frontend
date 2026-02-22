import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";

import Column from "./column";
import { useState } from "react";
import type { ITask } from "../../types";

const columns = [
  { id: 'column-1', title: 'To Do', tasks: [] },
  { id: 'column-2', title: 'In Progress', tasks: [] },
  { id: 'column-3', title: 'Review', tasks: [] },
  { id: 'column-4', title: 'Ready for Testing', tasks: [] },
  { id: 'column-5', title: 'Done', tasks: [] },
];

const avatars = {
  alex: 'https://www.figma.com/api/mcp/asset/a4977786-8c3d-4a44-b39e-a637e6bf9c2f',
  sarah: 'https://www.figma.com/api/mcp/asset/a3359e5c-18bb-48f1-8202-9b0889c54a08',
  david: 'https://www.figma.com/api/mcp/asset/0cecb94a-da96-454f-873d-d21811ff90b0',
};

const tasks: ITask[] = [
  { id: 'task-1', title: 'Q4 Budget Approval', description: '', status: 'column-1', priority: 'HIGH', ticket_id: '1', tag: 'Budget', assignee_avatar: avatars.sarah, due_date: 'Oct 15', subtasks_done: 1, subtasks_total: 4, progress: 25, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-2', title: 'Update API documentation', description: '', status: 'column-2', priority: 'MEDIUM', ticket_id: '2', tag: 'Development', assignee_avatar: avatars.david, due_date: 'Oct 18', subtasks_done: 3, subtasks_total: 5, progress: 60, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-3', title: 'Competitor analysis for Q4 features', description: '', status: 'column-3', priority: 'LOW', ticket_id: '3', tag: 'Research', assignee_avatar: avatars.alex, due_date: 'Oct 12', comments_count: 2, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-4', title: 'Fix login page redirect bug', description: '', status: 'column-4', priority: 'HIGH', ticket_id: '4', tag: 'Bug', assignee_avatar: avatars.david, due_date: 'Oct 10', subtasks_done: 2, subtasks_total: 2, progress: 100, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-5', title: 'Design new onboarding flow', description: '', status: 'column-1', priority: 'MEDIUM', ticket_id: '5', tag: 'Design', assignee_avatar: avatars.alex, due_date: 'Oct 20', comments_count: 5, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-6', title: 'Set up CI/CD pipeline', description: '', status: 'column-2', priority: 'HIGH', ticket_id: '6', tag: 'Development', assignee_avatar: avatars.sarah, due_date: 'Oct 14', subtasks_done: 2, subtasks_total: 6, progress: 33, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-7', title: 'Review Q3 marketing results', description: '', status: 'column-3', priority: 'LOW', ticket_id: '7', tag: 'Research', assignee_avatar: avatars.sarah, due_date: 'Oct 22', comments_count: 3, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-8', title: 'Write unit tests for auth module', description: '', status: 'column-4', priority: 'MEDIUM', ticket_id: '8', tag: 'Development', assignee_avatar: avatars.alex, due_date: 'Oct 16', subtasks_done: 4, subtasks_total: 4, progress: 100, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-9', title: 'Prepare investor pitch deck', description: '', status: 'column-1', priority: 'HIGH', ticket_id: '9', tag: 'Budget', assignee_avatar: avatars.david, due_date: 'Oct 25', subtasks_done: 0, subtasks_total: 3, progress: 0, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-10', title: 'Migrate database to PostgreSQL', description: '', status: 'column-2', priority: 'HIGH', ticket_id: '10', tag: 'Development', assignee_avatar: avatars.alex, due_date: 'Oct 19', subtasks_done: 1, subtasks_total: 8, progress: 12, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-11', title: 'User feedback survey analysis', description: '', status: 'column-3', priority: 'MEDIUM', ticket_id: '11', tag: 'Research', assignee_avatar: avatars.david, due_date: 'Oct 21', comments_count: 1, created_at: '2021-01-01', updated_at: '2021-01-01' },
  { id: 'task-12', title: 'Update design system components', description: '', status: 'column-4', priority: 'LOW', ticket_id: '12', tag: 'Design', assignee_avatar: avatars.sarah, due_date: 'Oct 17', subtasks_done: 6, subtasks_total: 6, progress: 100, created_at: '2021-01-01', updated_at: '2021-01-01' },
];

const initialItems: Record<string, ITask[]> = Object.fromEntries(
  columns.map((col) => [col.id, tasks.filter((t) => t.status === col.id)])
);

export default function KanbanBoard() {
  const [items, setItems] = useState<Record<string, ITask[]>>(initialItems);
  const [columnOrder, setColumnOrder] = useState<string[]>(columns.map((column) => column.id));
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Derive activeColumn from current items — always in sync after every render
  const activeColumn = draggedTaskId
    ? Object.keys(items).find((colId) =>
        items[colId].some((t) => t.id === draggedTaskId)
      ) ?? null
    : null;

  return (
    <DragDropProvider
      onDragStart={(event) => {
        const { source } = event.operation;
        if (source?.type === "task") {
          setDraggedTaskId(String(source.id));
        }
      }}
      onDragOver={(event) => {
        const { source } = event.operation;

        if (source?.type === "column") return;

        setItems((items) => move(items, event));
      }}
      onDragEnd={(event) => {
        const { source } = event.operation;
        setDraggedTaskId(null);

        // Handle column reordering on drag end
        if (!event.canceled && source?.type === "column") {
          setColumnOrder((columns) => move(columns, event));
        }
      }}
    >
      <div className="flex gap-4">
        {columnOrder.map((columnId, columnIndex) => {
          const column = columns.find((c) => c.id === columnId);
          if (!column) return null;
          return (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={items[column.id] ?? []}
              index={columnIndex}
              isDropTarget={activeColumn === column.id}
            />
          );
        })}
      </div>
    </DragDropProvider>
  );
}
