import {
  AvatarGroup as AvatarGroupRoot,
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroupCount,
} from "../ui/avatar";
import type { TAssignee } from "@/types";

interface AvatarGroupProps {
  visibleCount?: number;
  avatars: TAssignee[];
}


export default function AvatarGroupCustom({ visibleCount = 3, avatars }: Readonly<AvatarGroupProps>) {
  const safeCount = Math.max(0, Math.floor(visibleCount));
  const firstVisibleAvatars = avatars.slice(0, safeCount);
  const remainingAvatarsCount = avatars.length - firstVisibleAvatars.length;

  return (
    <AvatarGroupRoot data-testid="avatar-group">
      {firstVisibleAvatars.map((avatar) => (
        <Avatar key={avatar.id} className="size-5">
          <AvatarImage src={avatar.avatar_url} />
          <AvatarFallback>{avatar.full_name.charAt(0)}</AvatarFallback>
        </Avatar>
      ))}
      {remainingAvatarsCount > 0 && (  
        <AvatarGroupCount className="size-5">
          <span className="text-xs">+{remainingAvatarsCount}</span>
        </AvatarGroupCount>
      )}
    </AvatarGroupRoot>
  );
}