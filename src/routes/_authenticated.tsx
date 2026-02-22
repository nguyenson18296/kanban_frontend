import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookie'
import Sidebar from '@/components/Sidebar'
import TopHeader from '@/components/TopHeader'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!getCookie('access_token')) {
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
