import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/services/board.service";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

export const useGetBoard = () => {
  const setKanbanBoard = useStoreKanbanBoard((s) => s.setKanbanBoard);
  const setIsLoading = useStoreKanbanBoard((s) => s.setIsLoading);
  return useQuery({
    queryKey: ['board'],
    queryFn: async () => {
      setIsLoading(true);
      try {
        const board = await getBoard();
        setKanbanBoard(board);
        return board;
      } finally {
        setIsLoading(false);
      }
    },
  });
}
