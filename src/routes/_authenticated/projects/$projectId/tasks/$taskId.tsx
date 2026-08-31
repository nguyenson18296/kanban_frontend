import { createFileRoute } from '@tanstack/react-router'
import TaskDetail from '@/features/TaskDetail'
import { useStoreActiveProject } from '@/stores/use-store-active-project'

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/tasks/$taskId',
)({
  // Keep the sidebar ProjectSwitcher in sync when a task is opened via deep link.
  beforeLoad: ({ params }) => {
    useStoreActiveProject.getState().setActiveProjectId(params.projectId)
  },
  component: TaskDetail,
})
