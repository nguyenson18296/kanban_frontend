import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/services/board.service";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";

export const useGetBoard = () => {
  const setKanbanBoard = useStoreKanbanBoard((s) => s.setKanbanBoard);
  return useQuery({
    queryKey: ['board'],
    queryFn: async () => {
      const board = await getBoard();
      setKanbanBoard(board);
      return board;
    },
  });
}
