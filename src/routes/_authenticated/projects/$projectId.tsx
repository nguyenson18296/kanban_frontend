import { createFileRoute } from '@tanstack/react-router'
import KanbanBoard from '@/features/KanbanBoard'

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
  component: KanbanBoard,
})
