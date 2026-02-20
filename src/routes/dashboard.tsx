import { createFileRoute, redirect } from '@tanstack/react-router'
import Dashboard from '../features/Dashboard'
import { getCookie } from '@/lib/cookie'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    if (!getCookie('access_token')) {
      throw redirect({ to: '/login' })
    }
  },
  component: Dashboard,
})
