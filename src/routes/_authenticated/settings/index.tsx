import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEFAULT_SETTINGS_SECTION } from '@/constants/settings-sections'

export const Route = createFileRoute('/_authenticated/settings/')({
  beforeLoad: () => {
    throw redirect({
      to: '/settings/$section',
      params: { section: DEFAULT_SETTINGS_SECTION },
      replace: true,
    })
  },
})
