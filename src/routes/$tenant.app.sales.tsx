import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SalesSidebar } from '@/components/SalesSidebar'
import { SalesHeader } from '@/components/SalesHeader'

export const Route = createFileRoute('/$tenant/app/sales')({
  component: SalesLayout,
})

function SalesLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <SalesSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <SalesHeader />
        <Outlet />
      </div>
    </div>
  )
}





