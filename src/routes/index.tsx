import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const isAuthenticated = localStorage.getItem('auth_token') !== null
    throw redirect({ to: isAuthenticated ? '/dashboard' : '/login' })
  },
})
