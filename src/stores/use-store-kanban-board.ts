import { create } from 'zustand';
import type { IBoard, TAssignee, Priority } from '@/types';

interface IStoreKanbanBoard {
  kanbanBoard: IBoard | null;
  setKanbanBoard: (kanbanBoard: IBoard) => void;
  updateTaskAssignees: (taskId: string, assignees: TAssignee[]) => void;
  moveTask: (taskId: string, fromColumnId: number, toColumnId: number, position: number) => void;
  reorderTask: (columnId: number, taskId: string, newPosition: number) => void;
  updateTaskPriority: (taskId: string, priority: Priority) => void;
}

export const useStoreKanbanBoard = create<IStoreKanbanBoard>((set) => ({
  kanbanBoard: null,
  setKanbanBoard: (kanbanBoard: IBoard) => set({ kanbanBoard: kanbanBoard }),
  // IMPORTANT: Zustand uses referential equality to detect changes.
  // Always return NEW objects — never mutate in place.
  // e.g. `task.assignees = x; return state` won't trigger a re-render
  // because the state reference is the same.
  updateTaskAssignees: (taskId: string, assignees: TAssignee[]) => set((state) => {
    if (!state.kanbanBoard) return state;
    return {
      kanbanBoard: {
        ...state.kanbanBoard,
        columns: state.kanbanBoard.columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) =>
            task.id === taskId ? { ...task, assignees } : task
          ),
        })),
      },
    };
  }),
  moveTask: (taskId, fromColumnId, toColumnId, position) => set((state) => {
    if (!state.kanbanBoard) return state;

    let movedTask: IBoard['columns'][number]['tasks'][number] | undefined;
    const columns = state.kanbanBoard.columns.map((column) => {
      if (column.id === fromColumnId) {
        const taskIndex = column.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return column;
        movedTask = column.tasks[taskIndex];
        return { ...column, tasks: column.tasks.filter((t) => t.id !== taskId) };
      }
      return column;
    });

    if (!movedTask) return state;

    const taskWithNewColumn = { ...movedTask, column_id: toColumnId };

    return {
      kanbanBoard: {
        ...state.kanbanBoard,
        columns: columns.map((column) => {
          if (column.id === toColumnId) {
            const newTasks = [...column.tasks];
            newTasks.splice(position, 0, taskWithNewColumn);
            return { ...column, tasks: newTasks };
          }
          return column;
        }),
      },
    };
  }),
  reorderTask: (columnId, taskId, newPosition) => set((state) => {
    if (!state.kanbanBoard) return state;
    return {
      kanbanBoard: {
        ...state.kanbanBoard,
        columns: state.kanbanBoard.columns.map((column) => {
          if (column.id !== columnId) return column;
          const tasks = [...column.tasks];
          const oldIndex = tasks.findIndex((t) => t.id === taskId);
          if (oldIndex === -1) return column;
          const [task] = tasks.splice(oldIndex, 1);
          tasks.splice(newPosition, 0, task);
          return { ...column, tasks };
        }),
      },
    };
  }),
  updateTaskPriority: (taskId: string, priority: Priority) => set((state) => {
    if (!state.kanbanBoard) return state;

    const newKanbanBoard = {
      ...state.kanbanBoard,
      columns: state.kanbanBoard.columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
          task.id === taskId ? { ...task, priority } : task
        ),
      })),
    };
    return { kanbanBoard: newKanbanBoard };
  }),
}));
