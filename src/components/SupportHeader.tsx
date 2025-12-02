import { useState } from 'react'
import { Search, Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'

export function SupportHeader() {
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false)

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search tickets, members..."
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => setIsCreateTicketOpen(true)}
          >
            <Plus size={18} />
            New Ticket
          </Button>
        </div>
      </header>

      <CreateTicketDialog
        open={isCreateTicketOpen}
        onOpenChange={setIsCreateTicketOpen}
      />
    </>
  )
}

