import { createFileRoute, redirect } from '@tanstack/react-router'
import Settings from '@/features/Settings'
import { DEFAULT_SETTINGS_SECTION, isSettingsSection } from '@/constants/settings-sections'

export const Route = createFileRoute('/_authenticated/settings/$section')({
  // The section comes from the URL — validate it and fall back to the default
  // instead of rendering an empty page for `/settings/anything`.
  beforeLoad: ({ params }) => {
    if (!isSettingsSection(params.section)) {
      throw redirect({
        to: '/settings/$section',
        params: { section: DEFAULT_SETTINGS_SECTION },
        replace: true,
      })
    }
  },
  component: Settings,
})
