import { Tag, UserPlus, Download, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CRMBulkActionsProps {
  selectedCount: number
  onTag: () => void
  onAssign: () => void
  onExport: () => void
  onDelete: () => void
  onClearSelection: () => void
}

export function CRMBulkActions({
  selectedCount,
  onTag,
  onAssign,
  onExport,
  onDelete,
  onClearSelection,
}: CRMBulkActionsProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="sticky top-0 z-10 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-indigo-700">
          {selectedCount} {selectedCount === 1 ? 'customer' : 'customers'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
        >
          <X size={16} className="mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onTag}
          className="text-gray-600"
        >
          <Tag size={16} className="mr-1" />
          Tag
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAssign}
          className="text-gray-600"
        >
          <UserPlus size={16} className="mr-1" />
          Assign
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="text-gray-600"
        >
          <Download size={16} className="mr-1" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
        >
          <Trash2 size={16} className="mr-1" />
          Delete
        </Button>
      </div>
    </div>
  )
}





