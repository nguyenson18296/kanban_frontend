import { httpClient } from "@/lib/http-client";
import type { IBoard } from "@/types";

export const getBoard = (projectId: string) => {
  return httpClient.get<IBoard>(`/board/${projectId}`);
}
