import { httpClient } from "@/lib/http-client";
import type { ICommentDto, IComment, IResponse } from "@/types";

export const getComments = (taskId: string) => {
  return httpClient.get<IResponse<IComment[]>>(`/tasks/${taskId}/comments`);
}

export const createComment = (taskId: string, comment: ICommentDto) => {
  return httpClient.post<IComment>(`/tasks/${taskId}/comments`, comment);
}

export const updateComment = (taskId: string, commentId: string, comment: ICommentDto) => {
  return httpClient.put<IComment>(`/tasks/${taskId}/comments/${commentId}`, comment);
}
