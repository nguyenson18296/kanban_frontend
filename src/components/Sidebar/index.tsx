import { useLocation } from '@tanstack/react-router';
import {
  Home,
  LayoutGrid,
  Calendar,
  FileText,
  Users,
  Settings,
  ChevronRight,
  FolderKanban,
  ListTodo,
  Star,
  UserPlus,
  MessageSquare,
  CalendarDays,
  CalendarClock,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useStoreUser } from '../../stores/use-store-user';
import { useGetMyProjects } from './hooks/use-get-my-projects';

const imgBrandLogo = 'https://www.figma.com/api/mcp/asset/acf68363-8ae7-4d86-90f0-1a5ca540a07f';

interface SubItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  children?: SubItem[];
  dynamic?: 'projects';
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: LayoutGrid, label: 'Projects', href: '/projects', dynamic: 'projects' as const },
  {
    icon: FileText,
    label: 'My Tasks',
    href: '/my-tasks',
    children: [
      { icon: ListTodo, label: 'Assigned to me', href: '/my-tasks' },
      { icon: Star, label: 'Starred', href: '/my-tasks/starred' },
    ],
  },
  {
    icon: Users,
    label: 'Team',
    href: '/team',
    children: [
      { icon: UserPlus, label: 'Members', href: '/team' },
      { icon: MessageSquare, label: 'Messages', href: '/team/messages' },
    ],
  },
  {
    icon: Calendar,
    label: 'Calendar',
    href: '/calendar',
    children: [
      { icon: CalendarDays, label: 'Monthly', href: '/calendar' },
      { icon: CalendarClock, label: 'Upcoming', href: '/calendar/upcoming' },
    ],
  },
  {
    icon: FileText,
    label: 'Reports',
    href: '/reports',
    children: [
      { icon: PieChart, label: 'Summary', href: '/reports' },
      { icon: TrendingUp, label: 'Trends', href: '/reports/trends' },
    ],
  },
];

function NavLink({ item, isActive }: Readonly<{ item: { icon: LucideIcon; label: string; href: string }; isActive: boolean }>) {
  return (
    <a
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 no-underline transition-colors",
        isActive
          ? "bg-[#5a5cf2] text-white"
          : "text-[#cbd5e1] hover:bg-white/5 hover:text-white",
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </a>
  );
}

function NavItemWithChildren({ item, pathname }: Readonly<{ item: NavItem; pathname: string }>) {
  const isChildActive = item.children?.some((child) => pathname === child.href) ?? false;
  const isParentActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const defaultOpen = isChildActive || isParentActive;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 text-[#cbd5e1] transition-colors hover:bg-white/5 hover:text-white cursor-pointer bg-transparent border-none">
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-200 group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-[18px] mt-1 flex flex-col gap-0.5 border-l border-[#334155] pl-3">
          {item.children?.map((child) => (
            <a
              key={child.href}
              href={child.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium no-underline transition-colors",
                pathname === child.href
                  ? "bg-[#5a5cf2]/10 text-[#818cf8]"
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-[#cbd5e1]",
              )}
            >
              <child.icon className="h-4 w-4 shrink-0" />
              {child.label}
            </a>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ProjectsNav({ pathname }: Readonly<{ pathname: string }>) {
  const { user } = useStoreUser();
  const { data: projects } = useGetMyProjects(user?.id ?? '');
  const isActive = pathname.startsWith('/projects');

  return (
    <Collapsible defaultOpen={isActive}>
      <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 text-[#cbd5e1] transition-colors hover:bg-white/5 hover:text-white cursor-pointer bg-transparent border-none">
        <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">Projects</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-200 group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-[18px] mt-1 flex flex-col gap-0.5 border-l border-[#334155] pl-3">
          {projects?.data?.map((project) => (
            <a
              key={project.id}
              href={`/projects/${project.id}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium no-underline transition-colors",
                pathname === `/projects/${project.id}` || pathname.startsWith(`/projects/${project.id}/`)
                  ? "bg-[#5a5cf2]/10 text-[#818cf8]"
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-[#cbd5e1]",
              )}
            >
              <FolderKanban className="h-4 w-4 shrink-0" />
              {project.name}
            </a>
          ))}
          {(!projects || projects.data.length === 0) && (
            <span className="px-3 py-1.5 text-[12px] text-[#64748b]">No projects</span>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.dynamic === 'projects') {
              return <ProjectsNav key={item.label} pathname={location.pathname} />;
            }
            if (item.children) {
              return <NavItemWithChildren key={item.label} item={item} pathname={location.pathname} />;
            }
            return <NavLink key={item.label} item={item} isActive={location.pathname === item.href} />;
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-4">
        <a
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-5 no-underline transition-colors",
            location.pathname === '/settings'
              ? "bg-[#5a5cf2] text-white"
              : "text-[#cbd5e1] hover:bg-white/5 hover:text-white",
          )}
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
