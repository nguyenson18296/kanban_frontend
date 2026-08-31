import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/services/board.service";
import { useStoreActiveProject } from "@/stores/use-store-active-project";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

export const useGetBoard = (projectId: string) => {
  const setKanbanBoard = useStoreKanbanBoard((s) => s.setKanbanBoard);
  return useQuery({
    queryKey: ['board', projectId],
    queryFn: async () => {
      const board = await getBoard(projectId);
      // A late-resolving fetch for a project the user has already switched
      // away from must not clobber the store with the wrong board.
      if (useStoreActiveProject.getState().activeProjectId === projectId) {
        setKanbanBoard(board);
      }
      return board;
    },
    enabled: !!projectId,
  });
}
