import { useRef, useState } from "react";
import CommentEditor from "@/components/TaskComment/editor";
import TaskCommentItem from "@/components/TaskComment/item";

import { useGetTaskComments } from "./hooks/use-get-task-comments";
import { type IComment } from "@/types";

const sortAsc = (list: IComment[]) =>
  [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

export default function CommentsSection({ taskId }: Readonly<{ taskId: string }>) {
  const { data: comments } = useGetTaskComments(taskId);

  const [localComments, setLocalComments] = useState<IComment[]>(() => sortAsc(comments?.data ?? []));

  const prevDataRef = useRef(comments?.data);
  if (comments?.data !== prevDataRef.current) {
    prevDataRef.current = comments?.data;
    setLocalComments(sortAsc(comments?.data ?? []));
  }

  const handleCommentCreated = (comment: IComment) => {
    setLocalComments((prev) => [...prev, comment]);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 px-4">
        {localComments.map((comment) => (
          <TaskCommentItem key={comment.id} comment={comment} />
        ))}
      </div>
      <CommentEditor taskId={taskId} onCommentCreated={handleCommentCreated} />
    </div>
  )
}