import { useState } from "react"
import { ImagePlus, Send } from "lucide-react"
import { toast } from "sonner"

import Editor from "../Editor"
import { Button } from "../ui/button"
import { useCreateComment } from "./hooks/use-create-comment"
import type { IComment } from "@/types"
import { useStoreUser } from "@/stores/use-store-user"

interface CommentEditorProps {
  taskId: string;
  onCommentCreated: (comment: IComment) => void;
}

export default function CommentEditor({ taskId, onCommentCreated }: Readonly<CommentEditorProps>) {
  const { mutateAsync: createComment, isPending } = useCreateComment(taskId);
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const { user } = useStoreUser();

  const handleCreateComment = async () => {
    if (!content.trim()) return;

    const placeholder: IComment = {
      id: crypto.randomUUID(),
      content,
      is_edited: false,
      task_id: taskId,
      author: {
        id: user?.id ?? "",
        full_name: user?.full_name ?? "",
        avatar_url: user?.avatar_url ?? "",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onCommentCreated(placeholder);
    setContent("");
    setEditorKey((prev) => prev + 1);

    try {
      await createComment(content);
    } catch {
      toast.error("Failed to post comment, please try again.");
    }
  };

  const handleChange = (value: string) => {
    setContent(value);
  };

  return (
    <div className="mt-4">
      <div className="text-sm font-medium leading-none text-[#0f172a] outline-none px-4 py-1 relative">
        <Editor
          key={editorKey}
          description=""
          placeholder="Add a comment"
          editable={true}
          editorClassName="!min-h-20 !py-1 focus-within:ring-0 focus-within:ring-offset-0"
          className="pb-8"
          onChange={handleChange}
        />
        <div className="flex items-center justify-between px-4 py-2 absolute gap-2 bottom-0 right-2">
          <Button variant="outline" size="icon" className="w-max text-xs size-[30px]">
            <ImagePlus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-max text-xs size-[30px]"
            disabled={isPending}
            onClick={handleCreateComment}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}