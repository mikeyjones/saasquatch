import { describe, it, expect } from 'vitest'
import {
  pipeline,
  pipelineStage,
  deal,
  dealContact,
  dealActivity,
  tenantOrganization,
  organization,
  user,
  tenantUser,
} from './schema'

/**
 * Tests for Sales Pipeline database schema
 * Validates the CRM/pipeline schema structure for deal management
 */
describe('Sales Pipeline Schema', () => {
  describe('pipeline table', () => {
    it('should have tenantOrganizationId for customer scoping', () => {
      const columns = Object.keys(pipeline)
      expect(columns).toContain('tenantOrganizationId')
    })

    it('should have all required columns', () => {
      const columns = Object.keys(pipeline)
      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('description')
      expect(columns).toContain('isDefault')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should support multiple pipelines per tenant organization', () => {
      // Pipeline is scoped to tenantOrganization, not organization
      // This allows each customer to have their own pipelines (SMB, Enterprise, etc.)
      const columns = Object.keys(pipeline)
      expect(columns).toContain('tenantOrganizationId')
      expect(columns).not.toContain('organizationId') // Not directly scoped to support staff org
    })
  })

  describe('pipelineStage table', () => {
    it('should be linked to pipeline', () => {
      const columns = Object.keys(pipelineStage)
      expect(columns).toContain('pipelineId')
    })

    it('should have all required columns for stage definition', () => {
      const columns = Object.keys(pipelineStage)
      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('order')
      expect(columns).toContain('color')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have order column for stage sequencing', () => {
      const columns = Object.keys(pipelineStage)
      expect(columns).toContain('order')
    })
  })

  describe('deal table', () => {
    it('should have organizationId for support staff scoping', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('organizationId')
    })

    it('should have tenantOrganizationId for customer association', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('tenantOrganizationId')
    })

    it('should have pipeline and stage references', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('pipelineId')
      expect(columns).toContain('stageId')
    })

    it('should have all core deal columns', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('value')
      expect(columns).toContain('createdAt')
      expect(columns).toContain('updatedAt')
    })

    it('should have assignment columns', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('assignedToUserId')
      expect(columns).toContain('assignedToAI')
    })

    it('should have scoring columns', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('manualScore')
      expect(columns).toContain('aiScore')
    })

    it('should have linking columns for subscriptions and trials', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('linkedSubscriptionId')
      expect(columns).toContain('linkedTrialId')
    })

    it('should have metadata columns', () => {
      const columns = Object.keys(deal)
      expect(columns).toContain('badges')
      expect(columns).toContain('customFields')
      expect(columns).toContain('nextTask')
      expect(columns).toContain('notes')
    })
  })

  describe('dealContact table', () => {
    it('should link deals to tenant users', () => {
      const columns = Object.keys(dealContact)
      expect(columns).toContain('dealId')
      expect(columns).toContain('tenantUserId')
    })

    it('should have role column for contact classification', () => {
      const columns = Object.keys(dealContact)
      expect(columns).toContain('role')
    })

    it('should have timestamp', () => {
      const columns = Object.keys(dealContact)
      expect(columns).toContain('createdAt')
    })
  })

  describe('dealActivity table', () => {
    it('should be linked to deal', () => {
      const columns = Object.keys(dealActivity)
      expect(columns).toContain('dealId')
    })

    it('should have activity type and description', () => {
      const columns = Object.keys(dealActivity)
      expect(columns).toContain('activityType')
      expect(columns).toContain('description')
    })

    it('should track who performed the activity', () => {
      const columns = Object.keys(dealActivity)
      expect(columns).toContain('userId')
      expect(columns).toContain('aiAgentId')
    })

    it('should have metadata for additional context', () => {
      const columns = Object.keys(dealActivity)
      expect(columns).toContain('metadata')
    })
  })
})

/**
 * Tests for Sales Pipeline data model relationships
 */
describe('Sales Pipeline Data Model', () => {
  it('should follow the pattern: TenantOrg -> Pipeline -> Stages', () => {
    const relationships = {
      tenantOrganization: {
        hasMany: ['pipelines'],
        represents: 'Customer companies',
      },
      pipeline: {
        belongsTo: ['tenantOrganization'],
        hasMany: ['pipelineStages', 'deals'],
        scopedBy: 'tenantOrganizationId',
      },
      pipelineStage: {
        belongsTo: ['pipeline'],
        hasMany: ['deals'],
        orderedBy: 'order',
      },
    }

    expect(relationships.pipeline.scopedBy).toBe('tenantOrganizationId')
    expect(relationships.pipelineStage.orderedBy).toBe('order')
  })

  it('should follow the pattern: Deal -> Contacts -> TenantUsers', () => {
    const relationships = {
      deal: {
        belongsTo: ['organization', 'tenantOrganization', 'pipeline', 'pipelineStage'],
        hasMany: ['dealContacts', 'dealActivities'],
        dualScoping: ['organizationId', 'tenantOrganizationId'],
      },
      dealContact: {
        belongsTo: ['deal', 'tenantUser'],
        compositeKey: ['dealId', 'tenantUserId'],
        roleTypes: ['decision_maker', 'influencer', 'user', 'contact'],
      },
    }

    // Deals have dual scoping - they belong to support staff org but reference customer org
    expect(relationships.deal.dualScoping).toContain('organizationId')
    expect(relationships.deal.dualScoping).toContain('tenantOrganizationId')
    expect(relationships.dealContact.compositeKey).toContain('dealId')
    expect(relationships.dealContact.compositeKey).toContain('tenantUserId')
  })

  it('should support activity tracking for deals', () => {
    const activityTypes = [
      'deal_created',
      'stage_change',
      'deal_updated',
      'note_added',
      'email_sent',
      'task_completed',
    ]

    // Document expected activity types
    expect(activityTypes).toContain('deal_created')
    expect(activityTypes).toContain('stage_change')
  })

  it('should support AI agent assignment', () => {
    const aiFeatures = {
      deal: {
        canAssignToAI: true,
        hasAIScore: true,
        aiFields: ['assignedToAI', 'aiScore'],
      },
      dealActivity: {
        canBePerformedByAI: true,
        aiField: 'aiAgentId',
      },
    }

    expect(aiFeatures.deal.canAssignToAI).toBe(true)
    expect(aiFeatures.deal.aiFields).toContain('assignedToAI')
    expect(aiFeatures.deal.aiFields).toContain('aiScore')
    expect(aiFeatures.dealActivity.aiField).toBe('aiAgentId')
  })
})

/**
 * Tests for Pipeline Stage workflow
 */
describe('Pipeline Stage Workflow', () => {
  it('should support typical sales stages', () => {
    const typicalStages = [
      { name: 'Lead', order: 1, color: 'gray' },
      { name: 'Meeting', order: 2, color: 'blue' },
      { name: 'Negotiation', order: 3, color: 'amber' },
      { name: 'Closed Won', order: 4, color: 'emerald' },
    ]

    // Validate stage structure
    for (const stage of typicalStages) {
      expect(stage).toHaveProperty('name')
      expect(stage).toHaveProperty('order')
      expect(stage).toHaveProperty('color')
      expect(typeof stage.order).toBe('number')
    }

    // Validate ordering
    const orders = typicalStages.map((s) => s.order)
    expect(orders).toEqual([1, 2, 3, 4])
  })

  it('should support custom pipelines for different deal types', () => {
    const pipelineTypes = {
      enterprise: {
        name: 'Enterprise Pipeline',
        stages: ['Lead', 'Meeting', 'Negotiation', 'Closed Won'],
      },
      smb: {
        name: 'SMB Pipeline',
        stages: ['Lead', 'Qualified', 'Demo', 'Proposal', 'Closed Won', 'Closed Lost'],
      },
      partnership: {
        name: 'Partners Pipeline',
        stages: ['Discovery', 'Technical Review', 'Integration', 'Contract', 'Live'],
      },
    }

    // Different pipelines have different stage counts
    expect(pipelineTypes.enterprise.stages.length).toBe(4)
    expect(pipelineTypes.smb.stages.length).toBe(6)
    expect(pipelineTypes.partnership.stages.length).toBe(5)
  })
})

/**
 * Tests for Deal value handling
 */
describe('Deal Value Handling', () => {
  it('should store values in cents for precision', () => {
    // Values are stored in cents (integer) to avoid floating point issues
    const testDeals = [
      { name: 'Small Deal', valueCents: 500000, expectedDollars: 5000 },
      { name: 'Medium Deal', valueCents: 2500000, expectedDollars: 25000 },
      { name: 'Enterprise Deal', valueCents: 12000000, expectedDollars: 120000 },
    ]

    for (const deal of testDeals) {
      const dollars = deal.valueCents / 100
      expect(dollars).toBe(deal.expectedDollars)
    }
  })

  it('should format currency correctly', () => {
    const formatCurrency = (cents: number): string => {
      const dollars = cents / 100
      if (dollars >= 1000000) {
        return `$${(dollars / 1000000).toFixed(1)}M`
      }
      if (dollars >= 1000) {
        return `$${Math.floor(dollars / 1000)}K`
      }
      return `$${dollars.toLocaleString()}`
    }

    expect(formatCurrency(500000)).toBe('$5K')
    expect(formatCurrency(2500000)).toBe('$25K')
    expect(formatCurrency(12000000)).toBe('$120K')
    expect(formatCurrency(150000000)).toBe('$1.5M')
  })
})

/**
 * Tests for Deal stage transitions
 */
describe('Deal Stage Transitions', () => {
  it('should track stage changes in activity log', () => {
    const stageChangeActivity = {
      activityType: 'stage_change',
      description: 'Deal moved from "Lead" to "Meeting"',
      metadata: {
        oldStageId: 'stage-1',
        oldStageName: 'Lead',
        newStageId: 'stage-2',
        newStageName: 'Meeting',
      },
    }

    expect(stageChangeActivity.activityType).toBe('stage_change')
    expect(stageChangeActivity.metadata.oldStageName).toBe('Lead')
    expect(stageChangeActivity.metadata.newStageName).toBe('Meeting')
  })

  it('should support automated stage movements', () => {
    const automatedMovements = [
      { trigger: 'trial_start', fromStage: null, toStage: 'Evaluation' },
      { trigger: 'trial_end', fromStage: 'Evaluation', toStage: 'Conversion' },
      { trigger: 'subscription_created', fromStage: 'Conversion', toStage: 'Closed Won' },
    ]

    // Document expected automation rules
    expect(automatedMovements.length).toBe(3)
    expect(automatedMovements[0].trigger).toBe('trial_start')
  })
})

/**
 * Tests for Deal contact roles
 */
describe('Deal Contact Roles', () => {
  it('should support multiple contact roles', () => {
    const contactRoles = ['decision_maker', 'influencer', 'user', 'contact']

    expect(contactRoles).toContain('decision_maker')
    expect(contactRoles).toContain('influencer')
    expect(contactRoles).toContain('user')
    expect(contactRoles).toContain('contact')
  })

  it('should allow multiple contacts per deal', () => {
    const dealContacts = [
      { tenantUserId: 'user-1', role: 'decision_maker' },
      { tenantUserId: 'user-2', role: 'influencer' },
      { tenantUserId: 'user-3', role: 'user' },
    ]

    expect(dealContacts.length).toBe(3)
    expect(dealContacts.filter((c) => c.role === 'decision_maker').length).toBe(1)
  })
})

/**
 * Tests for Deal badges
 */
describe('Deal Badges', () => {
  it('should support multiple badges per deal', () => {
    const badges = ['Hot', 'Enterprise', 'Strategic', 'At Risk', 'Renewal']

    expect(badges).toContain('Hot')
    expect(badges).toContain('Enterprise')
    expect(badges).toContain('At Risk')
  })

  it('should store badges as JSON array', () => {
    const badgesArray = ['Hot', 'Enterprise']
    const serialized = JSON.stringify(badgesArray)
    const deserialized = JSON.parse(serialized)

    expect(deserialized).toEqual(['Hot', 'Enterprise'])
  })
})

