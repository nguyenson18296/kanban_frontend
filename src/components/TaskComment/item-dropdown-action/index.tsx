import { Link, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/dropdown-menu";

interface ItemDropdownActionProps {
  children: React.ReactNode;
  isOwner: boolean;
  onEdit: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}

export default function ItemDropdownAction({ children, isOwner, onEdit, onCopyLink, onDelete }: Readonly<ItemDropdownActionProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {isOwner && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onCopyLink}>
          <Link />
          Copy link to comment
        </DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
