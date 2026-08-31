import { createFileRoute, redirect } from '@tanstack/react-router'

import { projectsQueryOptions } from '@/components/ProjectSwitcher/hooks/use-get-projects'
import { resolveTargetProject } from '@/components/ProjectSwitcher/resolve-target-project'
import { queryClient } from '@/lib/query-client'
import { useStoreActiveProject } from '@/stores/use-store-active-project'
import type { IProject } from '@/types'

export const Route = createFileRoute('/_authenticated/projects/')({
  // /projects has no page of its own — land on the active project's board,
  // falling back to the first accessible project (same order as the switcher,
  // via the shared resolveTargetProject helper).
  beforeLoad: async () => {
    let projects: IProject[]
    try {
      projects = await queryClient.ensureQueryData(projectsQueryOptions)
    } catch {
      throw redirect({ to: '/dashboard' })
    }

    const storedId = useStoreActiveProject.getState().activeProjectId
    const target = resolveTargetProject(projects, storedId)
    if (!target) throw redirect({ to: '/dashboard' })

    throw redirect({ to: '/projects/$projectId', params: { projectId: target.id } })
  },
})
