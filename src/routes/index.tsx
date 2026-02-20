import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookie'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: getCookie('access_token') ? '/dashboard' : '/login' })
  },
})
