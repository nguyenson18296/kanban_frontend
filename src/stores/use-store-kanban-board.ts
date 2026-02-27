import { create } from 'zustand';
import type { IBoard, TAssignee } from '@/types';

interface IStoreKanbanBoard {
  kanbanBoard: IBoard | null;
  isLoading: boolean;
  setKanbanBoard: (kanbanBoard: IBoard) => void;
  setIsLoading: (isLoading: boolean) => void;
  updateTaskAssignees: (taskId: string, assignees: TAssignee[]) => void;
}

export const useStoreKanbanBoard = create<IStoreKanbanBoard>((set) => ({
  kanbanBoard: null,
  isLoading: false,
  setKanbanBoard: (kanbanBoard: IBoard) => set({ kanbanBoard: kanbanBoard }),
  setIsLoading: (isLoading: boolean) => set({ isLoading: isLoading }),
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
}));
