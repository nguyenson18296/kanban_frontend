import { Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserSettingsDropdown from '../UserSettingsDropdown';
import { useStoreUser } from '../../stores/use-store-user';

export default function TopHeader() {
  const { user } = useStoreUser();

  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#e2e8f0] bg-white/50 px-8 backdrop-blur-sm">
      <div>
        <h1 className="m-0 text-2xl font-bold leading-8 tracking-[-0.6px] text-[#0f172a]">
          Good morning, {user?.full_name}
        </h1>
        <p className="m-0 text-sm font-medium leading-5 text-[#64748b]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <Button variant="ghost" size="icon-lg" className="relative rounded-full">
          <Bell className="h-5 w-4" />
          <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#e74008]" />
        </Button>

        {/* Create Task button */}
        <Button
          size="lg"
          className="rounded-xl bg-[#5a5cf2] font-semibold shadow-[0_10px_15px_-3px_rgba(90,92,242,0.2),0_4px_6px_-4px_rgba(90,92,242,0.2)] hover:bg-[#4a4ce2]"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </Button>

        {/* User avatar dropdown */}
        <UserSettingsDropdown />
      </div>
    </header>
  );
}