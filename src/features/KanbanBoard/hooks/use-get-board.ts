import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/services/board.service";

export const useGetBoard = () => {
  return useQuery({
    queryKey: ['board'],
    queryFn: () => getBoard(),
  });
}
