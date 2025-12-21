import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MarketingSidebar } from '@/components/MarketingSidebar'
import { MarketingHeader } from '@/components/MarketingHeader'

export const Route = createFileRoute('/$tenant/app/marketing')({
  component: MarketingLayout,
})

function MarketingLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <MarketingSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MarketingHeader />
        <Outlet />
      </div>
    </div>
  )
}






