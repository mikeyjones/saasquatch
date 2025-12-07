import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SupportSidebar } from '@/components/SupportSidebar'
import { SupportHeader } from '@/components/SupportHeader'

export const Route = createFileRoute('/$tenant/app/support')({
  component: SupportLayout,
})

function SupportLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <SupportSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <SupportHeader />
        <Outlet />
      </div>
    </div>
  )
}







