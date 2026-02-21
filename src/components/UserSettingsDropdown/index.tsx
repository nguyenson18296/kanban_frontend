import { User, Settings, Sun, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import useLogout from './hooks/use-logout';

const imgProfilePictureOfAlex = 'https://www.figma.com/api/mcp/asset/a4977786-8c3d-4a44-b39e-a637e6bf9c2f';

function UserSettingsDropdown() {
  const { mutate: logout } = useLogout();

  const handleLogout = () => {
    logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="overflow-hidden rounded-full border-2 border-[#e2e8f0] p-0"
        >
          <img
            src={imgProfilePictureOfAlex}
            alt="Alex Morgan"
            className="h-full w-full object-cover cursor-pointer"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* User info header */}
        <div className="flex items-center gap-3 px-3 py-3">
          <img
            src={imgProfilePictureOfAlex}
            alt="Alex Morgan"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <p className="m-0 text-sm font-semibold text-[#0f172a]">Alex Morgan</p>
            <p className="m-0 text-xs text-[#64748b]">alex.morgan@flowboard.app</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <User />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings />
          Workspace Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Sun />
          Theme
          <span className="ml-auto rounded bg-[#f1f5f9] px-2 py-0.5 text-xs text-[#64748b]">
            Light
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircle />
          Help & Support
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOut />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserSettingsDropdown;
