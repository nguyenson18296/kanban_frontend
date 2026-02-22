import { useLocation } from '@tanstack/react-router';
import { Home, LayoutGrid, Calendar, FileText, Users, Settings } from 'lucide-react';

import { useStoreUser } from '../../stores/use-store-user';

const imgBrandLogo = 'https://www.figma.com/api/mcp/asset/acf68363-8ae7-4d86-90f0-1a5ca540a07f';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: LayoutGrid, label: 'Projects', href: '/projects' },
  { icon: FileText, label: 'My Tasks', href: '/my-tasks' },
  { icon: Users, label: 'Team', href: '/team' },
  { icon: Calendar, label: 'Calendar', href: '/calendar' },
  { icon: FileText, label: 'Reports', href: '/reports' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useStoreUser();
  return (
    <aside className="flex w-[256px] shrink-0 flex-col justify-between border-r border-[#1e293b] bg-[#0f172a] p-6">
      {/* Top */}
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5a5cf2] shadow-[0_10px_15px_-3px_rgba(90,92,242,0.3),0_4px_6px_-4px_rgba(90,92,242,0.3)]">
            <img src={imgBrandLogo} alt="" className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold leading-7 text-white">Flowboard</div>
            <div className="text-xs font-medium leading-4 text-[#94a3b8]">Pro Workspace</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-5 no-underline transition-colors ${
                location.pathname === item.href
                  ? 'bg-[#5a5cf2] text-white'
                  : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
              }`}
            > 
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-4">
        <a
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-5 text-[#cbd5e1] no-underline transition-colors hover:bg-white/5 hover:text-white"
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </a>

        <div className="border-t border-[#334155] pt-4">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar_url}
              alt={user?.full_name}
              className="h-10 w-10 rounded-full border-2 border-[#475569] object-cover"
            />
            <div>
              <div className="text-sm font-medium leading-5 text-white">{user?.full_name}</div>
              <div className="text-xs font-medium leading-4 text-[#94a3b8]">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
