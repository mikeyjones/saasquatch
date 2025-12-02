import { useState, useEffect, useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { Search, User, Building, RefreshCw } from 'lucide-react'

import { useAppForm } from '@/hooks/demo.form'
import { fetchMembers, type Member } from '@/data/members'
import { addTicket, type CreateTicketInput } from '@/data/tickets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const ticketSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  title: z.string().min(1, 'Title is required'),
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  message: z.string().min(1, 'Message is required'),
})

/**
 * Fuzzy match score - returns a score based on how well the query matches the text
 */
function fuzzyScore(text: string, query: string): number {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  
  if (textLower === queryLower) return 100
  if (textLower.startsWith(queryLower)) return 90
  if (textLower.includes(queryLower)) return 80
  
  // Word boundary match (initials)
  const words = textLower.split(/\s+/)
  const initials = words.map(w => w[0]).join('')
  if (initials.includes(queryLower)) return 75
  
  // Fuzzy character matching
  let queryIndex = 0
  let score = 0
  let consecutiveBonus = 0
  let lastMatchIndex = -2
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      if (i === lastMatchIndex + 1) consecutiveBonus += 5
      if (i === 0 || textLower[i - 1] === ' ' || textLower[i - 1] === '@' || textLower[i - 1] === '.') {
        score += 10
      } else {
        score += 5
      }
      lastMatchIndex = i
      queryIndex++
    }
  }
  
  if (queryIndex < queryLower.length) return 0
  score += consecutiveBonus
  score = score * (1 - (textLower.length - queryLower.length) / 100)
  
  return Math.max(0, Math.min(70, score))
}

function getMemberScore(member: Member, query: string): number {
  if (!query) return 100
  return Math.max(
    fuzzyScore(member.name, query),
    fuzzyScore(member.email, query),
    fuzzyScore(member.organization, query)
  )
}

/**
 * Highlight matching parts of text
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  
  const index = textLower.indexOf(queryLower)
  if (index !== -1) {
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-200 text-inherit rounded px-0.5">{text.slice(index, index + query.length)}</mark>
        {text.slice(index + query.length)}
      </>
    )
  }
  
  // Fuzzy highlight
  const result: React.ReactNode[] = []
  let queryIndex = 0
  
  for (let i = 0; i < text.length; i++) {
    if (queryIndex < queryLower.length && textLower[i] === queryLower[queryIndex]) {
      result.push(
        <mark key={i} className="bg-yellow-200 text-inherit rounded-sm">
          {text[i]}
        </mark>
      )
      queryIndex++
    } else {
      result.push(text[i])
    }
  }
  
  return <>{result}</>
}

interface CreateTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTicketCreated?: () => void
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  onTicketCreated,
}: CreateTicketDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [selectedCustomer, setSelectedCustomer] = useState<Member | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Fetch all members when dialog opens
  useEffect(() => {
    if (!open || !tenant) return

    const loadMembers = async () => {
      setIsLoadingMembers(true)
      try {
        const data = await fetchMembers(tenant)
        setAllMembers(data)
      } catch (error) {
        console.error('Failed to fetch members:', error)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [open, tenant])

  // Fuzzy filter and sort members
  const filteredMembers = useMemo(() => {
    if (!customerSearch.trim()) return allMembers.slice(0, 10) // Show first 10 when no search
    
    const query = customerSearch.trim()
    return allMembers
      .map(member => ({ member, score: getMemberScore(member, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limit results
      .map(item => item.member)
  }, [allMembers, customerSearch])

  const form = useAppForm({
    defaultValues: {
      customerId: '',
      title: '',
      priority: 'normal' as const,
      message: '',
    },
    validators: {
      onBlur: ticketSchema,
    },
    onSubmit: ({ value }) => {
      if (!selectedCustomer) return

      const ticketInput: CreateTicketInput = {
        title: value.title,
        priority: value.priority,
        message: value.message,
        customer: {
          name: selectedCustomer.name,
          company: selectedCustomer.organization,
          initials: selectedCustomer.initials,
        },
      }

      addTicket(ticketInput)

      form.reset()
      setSelectedCustomer(null)
      setCustomerSearch('')
      onOpenChange(false)
      onTicketCreated?.()
    },
  })

  const handleSelectCustomer = (member: Member) => {
    setSelectedCustomer(member)
    setCustomerSearch(member.name)
    form.setFieldValue('customerId', member.id)
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
      setSelectedCustomer(null)
      setCustomerSearch('')
      setAllMembers([])
    }
    onOpenChange(isOpen)
  }

  const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ]

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[540px] overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Ticket</DialogTitle>
          <DialogDescription>
            Create a support ticket for a customer. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-5"
        >
          {/* Customer Search Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Customer
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                type="text"
                placeholder="Fuzzy search by name, email, or org..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  if (!e.target.value) {
                    setSelectedCustomer(null)
                    form.setFieldValue('customerId', '')
                  }
                }}
                className="pl-9 h-10"
              />
              {isLoadingMembers && (
                <RefreshCw
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                />
              )}

              {/* Customer Dropdown */}
              {customerSearch && !selectedCustomer && !isLoadingMembers && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleSelectCustomer(member)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {member.initials}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-900 text-sm">
                              <HighlightedText text={member.name} query={customerSearch} />
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Building size={14} className="text-gray-400" />
                            <span className="text-gray-500 text-xs">
                              <HighlightedText text={member.organization} query={customerSearch} />
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5 truncate">
                            <HighlightedText text={member.email} query={customerSearch} />
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No customers found for "{customerSearch}"
                    </div>
                  )}
                </div>
              )}

              {/* Loading state for dropdown */}
              {customerSearch && !selectedCustomer && isLoadingMembers && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="px-4 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Loading customers...
                  </div>
                </div>
              )}
            </div>

            {/* Selected Customer Display */}
            {selectedCustomer && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {selectedCustomer.initials}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCustomer.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedCustomer.organization}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null)
                    setCustomerSearch('')
                    form.setFieldValue('customerId', '')
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            <form.Subscribe selector={(state) => state.fieldMeta.customerId}>
              {(meta) =>
                meta?.isTouched && meta?.errors?.length > 0 ? (
                  <p className="text-red-500 text-sm mt-1">
                    {meta.errors[0]?.toString()}
                  </p>
                ) : null
              }
            </form.Subscribe>
          </div>

          {/* Title Field */}
          <form.AppField name="title">
            {(field) => <field.TextField label="Title" placeholder="Brief description of the issue" />}
          </form.AppField>

          {/* Priority Field */}
          <form.AppField name="priority">
            {(field) => (
              <field.Select
                label="Priority"
                values={priorityOptions}
                placeholder="Select priority"
              />
            )}
          </form.AppField>

          {/* Message Field */}
          <form.AppField name="message">
            {(field) => (
              <field.TextArea
                label="Initial Message"
                rows={4}
              />
            )}
          </form.AppField>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Cancel
            </Button>
            <form.AppForm>
              <form.SubscribeButton label="Create Ticket" />
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
