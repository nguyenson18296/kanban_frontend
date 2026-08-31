import { useParams } from '@tanstack/react-router';
import type { ComponentType } from 'react';

import {
  DEFAULT_SETTINGS_SECTION,
  isSettingsSection,
  type SettingsSection,
} from '@/constants/settings-sections';

import Preferences from './sections/preferences';
import Profile from './sections/profile';
import Notifications from './sections/notifications';
import AiAgents from './sections/ai-agents';
import Initiatives from './sections/initiatives';
import Documents from './sections/documents';
import Members from './sections/members';

const SECTION_COMPONENTS: Record<SettingsSection, ComponentType> = {
  preferences: Preferences,
  profile: Profile,
  notifications: Notifications,
  ai: AiAgents,
  initiatives: Initiatives,
  documents: Documents,
  members: Members,
};

/**
 * Settings content. The section menu lives in the main `Sidebar`, which swaps
 * to settings mode while the URL is under `/settings`.
 */
export default function Settings() {
  const { section } = useParams({ from: '/_authenticated/settings/$section' });
  // The route's beforeLoad already redirects unknown sections; this narrows the type.
  const current = isSettingsSection(section) ? section : DEFAULT_SETTINGS_SECTION;
  const SectionComponent = SECTION_COMPONENTS[current];

  return (
    // Bleed past the layout's `p-8` and paint our own background so the page
    // stays consistent when `.dark` is on (the authenticated layout still
    // paints a hardcoded light `bg-[#fafbfc]`).
    <div className="-m-8 min-h-[calc(100%+4rem)] bg-background px-8 py-9 text-foreground">
      <div
        // `key` remounts the section so its local state resets on navigation.
        key={current}
        className="mx-auto flex max-w-[840px] flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
      >
        <SectionComponent />
      </div>
    </div>
  );
}
