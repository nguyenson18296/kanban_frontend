import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns"
import DOMPurify from "dompurify"
import { Ellipsis } from "lucide-react";

import Editor from "../Editor"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button";
import ItemDropdownAction from "./item-dropdown-action";
import { type IComment } from "@/types"
import { useEditComment } from "./hooks/use-edit-comment"
import { useStoreUser } from "@/stores/use-store-user"

interface TaskCommentItemProps {
  comment: IComment;
  taskId: string;
  onDelete: (commentId: string) => void;
}

export default function TaskCommentItem({ comment, taskId, onDelete }: Readonly<TaskCommentItemProps>) {
  const currentUserId = useStoreUser((state) => state.user?.id);
  const isOwner = currentUserId === comment.author.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const { mutateAsync: editComment, isPending, isSuccess: hasEdited } = useEditComment(comment.id, taskId);
  const isEdited = comment.is_edited || hasEdited;

  const { author, created_at } = comment;
  const initials = (author.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleEdit = () => {
    setEditedContent(comment.content);
    setIsEditing(true);
  }

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) return;

    try {
      await editComment({ content: editedContent });
      setIsEditing(false);
    } catch {
      toast.error("Failed to edit comment, please try again.");
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(comment.content);
  }

  const handleCopyLink = async () => {
    const url = `${globalThis.location.origin}${globalThis.location.pathname}#comment-${comment.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div id={`comment-${comment.id}`} className="p-4 bg-white rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={author.avatar_url} alt={author.full_name ?? "User avatar"} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#0f172a]">{author.full_name}</span>
            <div className="flex items-center gap-1"> 
              <span className="text-xs text-[#94a3b8]">{formatDistanceToNow(new Date(created_at))}</span>
              {isEdited && (
                <span className="text-xs text-[#84aee8]">(Edited)</span>
              )}
            </div>
          </div>
        </div>
        {!isEditing && (
          <ItemDropdownAction
            isOwner={isOwner}
            onEdit={handleEdit}
            onCopyLink={handleCopyLink}
            onDelete={() => onDelete(comment.id)}
          >
            <Button variant="ghost" size="icon" aria-label="Comment actions">
              <Ellipsis className="size-4" />
            </Button>
          </ItemDropdownAction>
        )}
      </div>
      {isEditing ? (
        <div className="mt-2">
          <Editor description={editedContent} onChange={setEditedContent} />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button type="button" className="cursor-pointer hover:bg-primary/90" size="sm" onClick={handleSaveEdit} disabled={isPending}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none text-[#0f172a] mt-2"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content, { ADD_ATTR: ["data-mention-id", "data-mention"] }) }}
        />
      )}
    </div>
  )
}