import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/services/board.service";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

export const useGetBoard = (projectId: string) => {
  const setKanbanBoard = useStoreKanbanBoard((s) => s.setKanbanBoard);
  return useQuery({
    queryKey: ['board', projectId],
    queryFn: async () => {
      const board = await getBoard(projectId);
      setKanbanBoard(board);
      return board;
    },
    enabled: !!projectId,
  });
}
