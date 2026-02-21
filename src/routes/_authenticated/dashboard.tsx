import { createFileRoute } from '@tanstack/react-router'
import Dashboard from '@/features/Dashboard'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})
