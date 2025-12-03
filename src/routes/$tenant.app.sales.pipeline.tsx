import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PipelineKanban } from '@/components/PipelineKanban'

export const Route = createFileRoute('/$tenant/app/sales/pipeline')({
  component: PipelinePage,
})

function PipelinePage() {
  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Enterprise Pipeline</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-gray-600">
            All Users
            <ChevronDown size={16} className="ml-1" />
          </Button>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
            Add Deal
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <PipelineKanban />
    </main>
  )
}

