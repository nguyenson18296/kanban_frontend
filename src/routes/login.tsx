import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookie'
import LoginPage from '../features/LoginPage'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (getCookie('access_token')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})
