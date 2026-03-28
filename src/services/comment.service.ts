import { httpClient } from "@/lib/http-client";
import type { ICommentDto, IComment, IResponse } from "@/types";

export const getComments = (taskId: string) => {
  return httpClient.get<IResponse<IComment[]>>(`/tasks/${taskId}/comments`);
}

export const createComment = (taskId: string, comment: ICommentDto) => {
  return httpClient.post<IComment>(`/tasks/${taskId}/comments`, comment);
}

export const updateComment = (commentId: string, body: { content: string }) => {
  return httpClient.patch<IComment>(`/comments/${commentId}`, body);
}

export const deleteComment = (commentId: string) => {
  return httpClient.delete<void>(`/comments/${commentId}`);
}
