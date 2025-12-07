import { useState } from 'react'
import { Plus, X, Edit2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrganizationCustomPropertiesProps {
  metadata: Record<string, unknown>
  onUpdate: (metadata: Record<string, unknown>) => Promise<void>
}

export function OrganizationCustomProperties({ metadata, onUpdate }: OrganizationCustomPropertiesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMetadata, setEditedMetadata] = useState<Record<string, unknown>>(metadata)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAddProperty = () => {
    if (!newKey.trim()) return

    setEditedMetadata({
      ...editedMetadata,
      [newKey.trim()]: newValue.trim() || '',
    })
    setNewKey('')
    setNewValue('')
  }

  const handleRemoveProperty = (key: string) => {
    const updated = { ...editedMetadata }
    delete updated[key]
    setEditedMetadata(updated)
  }

  const handleUpdateProperty = (key: string, value: unknown) => {
    setEditedMetadata({
      ...editedMetadata,
      [key]: value,
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(editedMetadata)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save custom properties:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedMetadata(metadata)
    setNewKey('')
    setNewValue('')
    setIsEditing(false)
  }

  const properties = isEditing ? editedMetadata : metadata
  const propertyKeys = Object.keys(properties)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">
          {propertyKeys.length === 0
            ? 'No custom properties defined'
            : `${propertyKeys.length} custom ${propertyKeys.length === 1 ? 'property' : 'properties'}`}
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Properties
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Property List */}
      {propertyKeys.length === 0 && !isEditing ? (
        <div className="text-center text-muted-foreground py-12">
          <div className="mb-4">No custom properties yet</div>
          <Button onClick={() => setIsEditing(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add First Property
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {propertyKeys.map((key) => {
            const value = properties[key]
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

            return (
              <div key={key} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Property Name</div>
                    <div className="font-medium">{key}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Value</div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={displayValue}
                        onChange={(e) => handleUpdateProperty(key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="Enter value"
                      />
                    ) : (
                      <div className="text-sm">{displayValue || <span className="text-muted-foreground italic">Empty</span>}</div>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <Button
                    onClick={() => handleRemoveProperty(key)}
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add New Property Form */}
      {isEditing && (
        <div className="mt-6 p-4 border rounded-lg bg-muted/30">
          <div className="text-sm font-medium mb-3">Add New Property</div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Property Name</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddProperty()
                  }
                }}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="e.g., Account Manager"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Value</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddProperty()
                  }
                }}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="e.g., John Smith"
              />
            </div>
            <Button onClick={handleAddProperty} size="sm" disabled={!newKey.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
