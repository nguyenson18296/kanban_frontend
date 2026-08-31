import {
  Bell,
  FileText,
  Sparkles,
  SlidersHorizontal,
  Target,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  'preferences',
  'profile',
  'notifications',
  'ai',
  'initiatives',
  'documents',
  'members',
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const DEFAULT_SETTINGS_SECTION: SettingsSection = 'preferences';

/** URL params are untrusted — narrow the raw string at the router boundary. */
function isSettingsSection(value: string): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

interface SettingsNavItem {
  section: SettingsSection;
  label: string;
  icon: LucideIcon;
}

interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Personal',
    items: [
      { section: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
      { section: 'profile', label: 'Profile', icon: User },
      { section: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Features',
    items: [
      { section: 'ai', label: 'AI & Agents', icon: Sparkles },
      { section: 'initiatives', label: 'Initiatives', icon: Target },
      { section: 'documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Workspace',
    items: [{ section: 'members', label: 'Members', icon: Users }],
  },
];

export { SETTINGS_SECTIONS, DEFAULT_SETTINGS_SECTION, SETTINGS_NAV_GROUPS, isSettingsSection };
export type { SettingsSection, SettingsNavItem, SettingsNavGroup };
