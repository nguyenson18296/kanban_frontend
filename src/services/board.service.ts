import { httpClient } from "@/lib/http-client";
import type { IBoard } from "@/types";

export const getBoard = () => {
  return httpClient.get<IBoard>('/board');
}
