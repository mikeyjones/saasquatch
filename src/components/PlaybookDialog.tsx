import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { Plus, Trash2, GripVertical } from 'lucide-react'

import { useAppForm } from '@/hooks/demo.form'
import {
  createPlaybook,
  updatePlaybook,
  categoryOptions,
  playbookStatusOptions,
  playbookTypeOptions,
  type Playbook,
  type PlaybookStep,
  type CreatePlaybookInput,
  type UpdatePlaybookInput,
} from '@/data/knowledge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const playbookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['manual', 'automated']),
  category: z.string().optional(),
  tags: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive']),
})

interface PlaybookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbook?: Playbook | null
  onSaved?: () => void
}

export function PlaybookDialog({
  open,
  onOpenChange,
  playbook,
  onSaved,
}: PlaybookDialogProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<PlaybookStep[]>([])

  const isEditMode = !!playbook

  const form = useAppForm({
    defaultValues: {
      name: playbook?.name || '',
      description: playbook?.description || '',
      type: (playbook?.type || 'manual') as 'manual' | 'automated',
      category: playbook?.category || 'none',
      tags: playbook?.tags?.join(', ') || '',
      status: (playbook?.status || 'draft') as 'draft' | 'active' | 'inactive',
    },
    validators: {
      onBlur: playbookSchema,
    },
    onSubmit: async ({ value }) => {
      if (!tenant) return
      setIsSubmitting(true)
      setError(null)

      try {
        const tags = value.tags
          ? value.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined

        // Convert 'none' category to undefined
        const category = value.category === 'none' ? undefined : value.category || undefined

        if (isEditMode && playbook) {
          const input: UpdatePlaybookInput = {
            id: playbook.id,
            name: value.name,
            description: value.description || undefined,
            type: value.type,
            category,
            tags,
            status: value.status,
            steps: value.type === 'manual' ? steps : undefined,
          }
          const result = await updatePlaybook(tenant, input)

          if (!result.success) {
            setError(result.error || 'Failed to update playbook')
            return
          }
        } else {
          const input: CreatePlaybookInput = {
            name: value.name,
            description: value.description || undefined,
            type: value.type,
            category,
            tags,
            status: value.status,
            steps: value.type === 'manual' ? steps : undefined,
          }
          const result = await createPlaybook(tenant, input)

          if (!result.success) {
            setError(result.error || 'Failed to create playbook')
            return
          }
        }

        form.reset()
        setSteps([])
        onOpenChange(false)
        onSaved?.()
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  // Reset form when dialog opens with different playbook
  useEffect(() => {
    if (open) {
      form.reset()
      form.setFieldValue('name', playbook?.name || '')
      form.setFieldValue('description', playbook?.description || '')
      form.setFieldValue('type', (playbook?.type || 'manual') as 'manual' | 'automated')
      form.setFieldValue('category', playbook?.category || 'none')
      form.setFieldValue('tags', playbook?.tags?.join(', ') || '')
      form.setFieldValue('status', (playbook?.status || 'draft') as 'draft' | 'active' | 'inactive')
      setSteps(playbook?.steps || [])
      setError(null)
    }
  }, [open, playbook])

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
      setSteps([])
      setError(null)
    }
    onOpenChange(isOpen)
  }

  const addStep = () => {
    setSteps([
      ...steps,
      {
        order: steps.length + 1,
        title: '',
        description: '',
        action: '',
      },
    ])
  }

  const updateStep = (index: number, field: keyof PlaybookStep, value: string | number) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    // Reorder steps
    setSteps(newSteps.map((step, i) => ({ ...step, order: i + 1 })))
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditMode ? 'Edit Playbook' : 'Create New Playbook'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the playbook details below.'
              : 'Create a new playbook for agents. Fill in the details below.'}
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
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Name Field */}
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Name" placeholder="Playbook name" />
            )}
          </form.AppField>

          {/* Description Field */}
          <form.AppField name="description">
            {(field) => (
              <field.TextArea
                label="Description"
                rows={3}
              />
            )}
          </form.AppField>

          {/* Type Field */}
          <form.AppField name="type">
            {(field) => (
              <field.Select
                label="Type"
                values={playbookTypeOptions}
                placeholder="Select type"
              />
            )}
          </form.AppField>

          {/* Category Field */}
          <form.AppField name="category">
            {(field) => (
              <field.Select
                label="Category"
                values={[{ label: 'None', value: 'none' }, ...categoryOptions]}
                placeholder="Select category"
              />
            )}
          </form.AppField>

          {/* Tags Field */}
          <div className="space-y-2">
            <Label className="text-xl font-bold">Tags</Label>
            <form.Subscribe selector={(state) => state.values.tags}>
              {(tags) => (
                <Input
                  placeholder="Enter tags separated by commas"
                  value={tags}
                  onChange={(e) => form.setFieldValue('tags', e.target.value)}
                />
              )}
            </form.Subscribe>
          </div>

          {/* Status Field */}
          <form.AppField name="status">
            {(field) => (
              <field.Select
                label="Status"
                values={playbookStatusOptions}
                placeholder="Select status"
              />
            )}
          </form.AppField>

          {/* Steps Section (for manual playbooks) */}
          <form.Subscribe selector={(state) => state.values.type}>
            {(type) =>
              type === 'manual' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xl font-bold">Steps</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStep}
                      className="flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Step
                    </Button>
                  </div>

                  {steps.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No steps added yet. Click "Add Step" to add playbook steps.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {steps.map((step, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg bg-gray-50 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical
                                size={16}
                                className="text-gray-400"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Step {step.order}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Input
                              placeholder="Step title"
                              value={step.title}
                              onChange={(e) =>
                                updateStep(index, 'title', e.target.value)
                              }
                            />
                            <Textarea
                              placeholder="Step description"
                              value={step.description}
                              rows={2}
                              onChange={(e) =>
                                updateStep(index, 'description', e.target.value)
                              }
                            />
                            <Input
                              placeholder="Action (optional)"
                              value={step.action || ''}
                              onChange={(e) =>
                                updateStep(index, 'action', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
          </form.Subscribe>

          {/* Automated playbook notice */}
          <form.Subscribe selector={(state) => state.values.type}>
            {(type) =>
              type === 'automated' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Automated playbook triggers and
                    actions can be configured after creation in the playbook
                    editor.
                  </p>
                </div>
              )
            }
          </form.Subscribe>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Playbook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

