import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookie'
import { tryRefreshTokens } from '@/lib/http-client'
import Sidebar from '@/components/Sidebar'
import TopHeader from '@/components/TopHeader'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!getCookie('access_token')) {
      if (getCookie('refresh_token')) {
        await tryRefreshTokens();
        return;
      }
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen bg-[#fafbfc] font-['Inter',sans-serif]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopHeader />
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
