import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { useGetUsers } from '@/components/AssigneeDropdown/hooks/use-get-users';
import { SETTINGS_NAV_GROUPS, type SettingsSection } from '@/constants/settings-sections';

interface SidebarSettingsNavProps {
  current: SettingsSection;
}

const itemClass =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-5 no-underline transition-colors';
const idleClass = 'text-[#cbd5e1] hover:bg-white/5 hover:text-white';
const activeClass = 'bg-[#5a5cf2] text-white';

/**
 * Replaces the main menu while the user is inside Settings: a Back link to the
 * main page, then the grouped settings sections.
 */
export default function SidebarSettingsNav({ current }: SidebarSettingsNavProps) {
  const { data: users } = useGetUsers();
  const membersCount = users?.length ?? 0;

  return (
    <nav aria-label="Settings" className="mt-6 flex flex-col gap-5">
      <Link to="/dashboard" className={`${itemClass} ${idleClass}`}>
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        Back
      </Link>

      <div className="px-3">
        <p className="text-base font-bold leading-6 text-white">Settings</p>
        <p className="text-xs font-medium leading-4 text-[#94a3b8]">Workspace · Flowboard Pro</p>
      </div>

      {SETTINGS_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10.5px] font-bold tracking-[0.09em] uppercase text-[#64748b]">
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = item.section === current;
              const count = item.section === 'members' ? membersCount : 0;
              return (
                <li key={item.section}>
                  <Link
                    to="/settings/$section"
                    params={{ section: item.section }}
                    aria-current={active ? 'page' : undefined}
                    className={`${itemClass} ${active ? activeClass : idleClass}`}
                  >
                    <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    {item.label}
                    {count ? (
                      <span
                        className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ${
                          active ? 'bg-white/20 text-white' : 'bg-white/10 text-[#cbd5e1]'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
