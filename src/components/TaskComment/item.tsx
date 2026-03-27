import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { formatDistanceToNow } from "date-fns"
import DOMPurify from "dompurify"

import { type IComment } from "@/types"

export default function TaskCommentItem({ comment }: Readonly<{ comment: IComment }>) {
  const { author, content, created_at } = comment;
  const initials = (author.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-4 bg-white rounded-lg">
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage src={author.avatar_url} alt={author.full_name ?? "User avatar"} />
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#0f172a]">{author.full_name}</span>
          <span className="text-xs text-[#94a3b8]">{formatDistanceToNow(new Date(created_at))}</span>
        </div>
      </div>
      <div
        className="prose prose-sm max-w-none text-[#0f172a] mt-2"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
      />
    </div>
  )
}