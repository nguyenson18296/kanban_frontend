import { createFileRoute } from '@tanstack/react-router'
import TaskDetail from '@/features/TaskDetail'

export const Route = createFileRoute(
  '/_authenticated/projects/$projectId/tasks/$taskId',
)({
  component: TaskDetail,
})
