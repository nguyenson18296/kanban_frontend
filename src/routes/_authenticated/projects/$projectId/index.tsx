import { createFileRoute } from '@tanstack/react-router'
import KanbanBoard from '@/features/KanbanBoard'
import { useStoreActiveProject } from '@/stores/use-store-active-project'

export const Route = createFileRoute('/_authenticated/projects/$projectId/')({
  // Keep the sidebar ProjectSwitcher in sync when a board is opened via URL.
  beforeLoad: ({ params }) => {
    useStoreActiveProject.getState().setActiveProjectId(params.projectId)
  },
  component: KanbanBoard,
})
