import { useState, useEffect, useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { Search, Building, DollarSign, RefreshCw } from 'lucide-react'

import { useAppForm } from '@/hooks/demo.form'
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

const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required'),
  value: z.number().min(0, 'Value must be positive'),
  tenantOrganizationId: z.string().min(1, 'Organization is required'),
  pipelineId: z.string().min(1, 'Pipeline is required'),
  stageId: z.string().min(1, 'Stage is required'),
  assignedToUserId: z.string().optional(),
  notes: z.string().optional(),
})

interface TenantOrg {
  id: string
  name: string
  slug: string
}

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
}

interface Pipeline {
  id: string
  name: string
  tenantOrganization: TenantOrg | null
  stages: PipelineStage[]
}

interface CreateDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDealCreated?: () => void
  defaultPipelineId?: string
  defaultStageId?: string
}

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
  const initials = words.map((w) => w[0]).join('')
  if (initials.includes(queryLower)) return 75

  // Fuzzy character matching
  let queryIndex = 0
  let score = 0
  let consecutiveBonus = 0
  let lastMatchIndex = -2

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      if (i === lastMatchIndex + 1) consecutiveBonus += 5
      if (
        i === 0 ||
        textLower[i - 1] === ' ' ||
        textLower[i - 1] === '@' ||
        textLower[i - 1] === '.'
      ) {
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

function getOrgScore(org: TenantOrg, query: string): number {
  if (!query) return 100
  return fuzzyScore(org.name, query)
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
        <mark className="bg-yellow-200 text-inherit rounded px-0.5">
          {text.slice(index, index + query.length)}
        </mark>
        {text.slice(index + query.length)}
      </>
    )
  }

  return <>{text}</>
}

export function CreateDealDialog({
  open,
  onOpenChange,
  onDealCreated,
  defaultPipelineId,
  defaultStageId,
}: CreateDealDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [selectedOrg, setSelectedOrg] = useState<TenantOrg | null>(null)
  const [orgSearch, setOrgSearch] = useState('')
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([])
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [valueInput, setValueInput] = useState('')

  // Fetch pipelines when dialog opens
  useEffect(() => {
    if (!open || !tenant) return

    const loadPipelines = async () => {
      setIsLoadingPipelines(true)
      try {
        const response = await fetch(`/api/tenant/${tenant}/pipelines`)
        const data = await response.json()
        setAllPipelines(data.pipelines || [])

        // Set default pipeline if provided
        if (defaultPipelineId) {
          const defaultPipeline = data.pipelines?.find(
            (p: Pipeline) => p.id === defaultPipelineId
          )
          if (defaultPipeline) {
            setSelectedPipeline(defaultPipeline)
            if (defaultPipeline.tenantOrganization) {
              setSelectedOrg(defaultPipeline.tenantOrganization)
              setOrgSearch(defaultPipeline.tenantOrganization.name)
            }
            // Set default stage if provided
            if (defaultStageId) {
              const defaultStage = defaultPipeline.stages?.find(
                (s: PipelineStage) => s.id === defaultStageId
              )
              if (defaultStage) {
                setSelectedStage(defaultStage)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch pipelines:', error)
      } finally {
        setIsLoadingPipelines(false)
      }
    }

    loadPipelines()
  }, [open, tenant, defaultPipelineId, defaultStageId])

  // Get unique tenant orgs from pipelines
  const tenantOrgs = useMemo(() => {
    const orgs = new Map<string, TenantOrg>()
    for (const pipeline of allPipelines) {
      if (pipeline.tenantOrganization) {
        orgs.set(pipeline.tenantOrganization.id, pipeline.tenantOrganization)
      }
    }
    return Array.from(orgs.values())
  }, [allPipelines])

  // Filter orgs by search
  const filteredOrgs = useMemo(() => {
    if (!orgSearch.trim()) return tenantOrgs.slice(0, 10)

    const query = orgSearch.trim()
    return tenantOrgs
      .map((org) => ({ org, score: getOrgScore(org, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.org)
  }, [tenantOrgs, orgSearch])

  // Get pipelines for selected org
  const pipelinesForOrg = useMemo(() => {
    if (!selectedOrg) return []
    return allPipelines.filter(
      (p) => p.tenantOrganization?.id === selectedOrg.id
    )
  }, [allPipelines, selectedOrg])

  const form = useAppForm({
    defaultValues: {
      name: '',
      value: 0,
      tenantOrganizationId: '',
      pipelineId: defaultPipelineId || '',
      stageId: defaultStageId || '',
      assignedToUserId: '',
      notes: '',
    },
    validators: {
      onBlur: dealSchema,
    },
    onSubmit: async ({ value }) => {
      if (!selectedOrg || !selectedPipeline || !selectedStage || !tenant) return

      try {
        const response = await fetch(`/api/tenant/${tenant}/deals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: value.name,
            value: value.value,
            tenantOrganizationId: selectedOrg.id,
            pipelineId: selectedPipeline.id,
            stageId: selectedStage.id,
            notes: value.notes,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create deal')
        }

        form.reset()
        setSelectedOrg(null)
        setSelectedPipeline(null)
        setSelectedStage(null)
        setOrgSearch('')
        setValueInput('')
        onOpenChange(false)
        onDealCreated?.()
      } catch (error) {
        console.error('Error creating deal:', error)
      }
    },
  })

  const handleSelectOrg = (org: TenantOrg) => {
    setSelectedOrg(org)
    setOrgSearch(org.name)
    form.setFieldValue('tenantOrganizationId', org.id)

    // Auto-select first pipeline for this org
    const orgPipelines = allPipelines.filter(
      (p) => p.tenantOrganization?.id === org.id
    )
    if (orgPipelines.length > 0) {
      const defaultPipeline =
        orgPipelines.find((p) => p.isDefault) || orgPipelines[0]
      setSelectedPipeline(defaultPipeline)
      form.setFieldValue('pipelineId', defaultPipeline.id)

      // Auto-select first stage
      if (defaultPipeline.stages.length > 0) {
        const firstStage = defaultPipeline.stages.sort(
          (a, b) => a.order - b.order
        )[0]
        setSelectedStage(firstStage)
        form.setFieldValue('stageId', firstStage.id)
      }
    }
  }

  const handleSelectPipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline)
    form.setFieldValue('pipelineId', pipeline.id)

    // Auto-select first stage
    if (pipeline.stages.length > 0) {
      const firstStage = pipeline.stages.sort((a, b) => a.order - b.order)[0]
      setSelectedStage(firstStage)
      form.setFieldValue('stageId', firstStage.id)
    } else {
      setSelectedStage(null)
      form.setFieldValue('stageId', '')
    }
  }

  const handleSelectStage = (stage: PipelineStage) => {
    setSelectedStage(stage)
    form.setFieldValue('stageId', stage.id)
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9.]/g, '')
    setValueInput(input)
    const numValue = Math.round(parseFloat(input || '0') * 100) // Convert to cents
    form.setFieldValue('value', isNaN(numValue) ? 0 : numValue)
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
      setSelectedOrg(null)
      setSelectedPipeline(null)
      setSelectedStage(null)
      setOrgSearch('')
      setValueInput('')
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[540px] overflow-visible max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Deal</DialogTitle>
          <DialogDescription>
            Add a new deal to your sales pipeline.
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
          {/* Organization Search Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Customer Organization
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                type="text"
                placeholder="Search for organization..."
                value={orgSearch}
                onChange={(e) => {
                  setOrgSearch(e.target.value)
                  if (!e.target.value) {
                    setSelectedOrg(null)
                    setSelectedPipeline(null)
                    setSelectedStage(null)
                    form.setFieldValue('tenantOrganizationId', '')
                    form.setFieldValue('pipelineId', '')
                    form.setFieldValue('stageId', '')
                  }
                }}
                className="pl-9 h-10"
              />
              {isLoadingPipelines && (
                <RefreshCw
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                />
              )}

              {/* Organization Dropdown */}
              {orgSearch && !selectedOrg && !isLoadingPipelines && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredOrgs.length > 0 ? (
                    filteredOrgs.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrg(org)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <Building size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900 text-sm">
                          <HighlightedText text={org.name} query={orgSearch} />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No organizations found for "{orgSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Organization Display */}
            {selectedOrg && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                <Building size={16} className="text-indigo-500" />
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {selectedOrg.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrg(null)
                    setSelectedPipeline(null)
                    setSelectedStage(null)
                    setOrgSearch('')
                    form.setFieldValue('tenantOrganizationId', '')
                    form.setFieldValue('pipelineId', '')
                    form.setFieldValue('stageId', '')
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Pipeline Selection */}
          {selectedOrg && pipelinesForOrg.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Pipeline
              </Label>
              <div className="flex flex-wrap gap-2">
                {pipelinesForOrg.map((pipeline) => (
                  <button
                    key={pipeline.id}
                    type="button"
                    onClick={() => handleSelectPipeline(pipeline)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      selectedPipeline?.id === pipeline.id
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {pipeline.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stage Selection */}
          {selectedPipeline && selectedPipeline.stages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Initial Stage
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedPipeline.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleSelectStage(stage)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedStage?.id === stage.id
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {stage.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Deal Name Field */}
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Deal Name"
                placeholder="e.g., Enterprise License - 500 Seats"
              />
            )}
          </form.AppField>

          {/* Deal Value Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Deal Value
            </Label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                type="text"
                placeholder="0.00"
                value={valueInput}
                onChange={handleValueChange}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Notes Field */}
          <form.AppField name="notes">
            {(field) => (
              <field.TextArea
                label="Notes (optional)"
                rows={3}
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
              <form.SubscribeButton label="Create Deal" />
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}





