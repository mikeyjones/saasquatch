-- Migration: Rename all database columns from camelCase to snake_case
-- This migration is required for compatibility with another system using the same database

-- ============================================================================
-- todos table
-- ============================================================================
ALTER TABLE "todos" RENAME COLUMN "organizationId" TO "organization_id";

-- ============================================================================
-- user table (Better Auth)
-- ============================================================================
ALTER TABLE "user" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- session table (Better Auth)
-- ============================================================================
ALTER TABLE "session" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "session" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "session" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "session" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "session" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "session" RENAME COLUMN "userId" TO "user_id";

-- ============================================================================
-- account table (Better Auth)
-- ============================================================================
ALTER TABLE "account" RENAME COLUMN "accountId" TO "account_id";
ALTER TABLE "account" RENAME COLUMN "providerId" TO "provider_id";
ALTER TABLE "account" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "account" RENAME COLUMN "accessToken" TO "access_token";
ALTER TABLE "account" RENAME COLUMN "refreshToken" TO "refresh_token";
ALTER TABLE "account" RENAME COLUMN "idToken" TO "id_token";
ALTER TABLE "account" RENAME COLUMN "accessTokenExpiresAt" TO "access_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "account" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- verification table (Better Auth)
-- ============================================================================
ALTER TABLE "verification" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "verification" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "verification" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- organization table
-- ============================================================================
ALTER TABLE "organization" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "organization" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- member table
-- ============================================================================
ALTER TABLE "member" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "member" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "member" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "member" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- invitation table
-- ============================================================================
ALTER TABLE "invitation" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "invitation" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "invitation" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "invitation" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- tenant_organization table
-- ============================================================================
ALTER TABLE "tenant_organization" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "tenant_organization" RENAME COLUMN "subscriptionPlan" TO "subscription_plan";
ALTER TABLE "tenant_organization" RENAME COLUMN "subscriptionStatus" TO "subscription_status";
ALTER TABLE "tenant_organization" RENAME COLUMN "billingEmail" TO "billing_email";
ALTER TABLE "tenant_organization" RENAME COLUMN "billingAddress" TO "billing_address";
ALTER TABLE "tenant_organization" RENAME COLUMN "assignedToUserId" TO "assigned_to_user_id";
ALTER TABLE "tenant_organization" RENAME COLUMN "customerDiscountType" TO "customer_discount_type";
ALTER TABLE "tenant_organization" RENAME COLUMN "customerDiscountValue" TO "customer_discount_value";
ALTER TABLE "tenant_organization" RENAME COLUMN "customerDiscountIsRecurring" TO "customer_discount_is_recurring";
ALTER TABLE "tenant_organization" RENAME COLUMN "customerDiscountNotes" TO "customer_discount_notes";
ALTER TABLE "tenant_organization" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tenant_organization" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- tenant_user table
-- ============================================================================
ALTER TABLE "tenant_user" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "tenant_user" RENAME COLUMN "avatarUrl" TO "avatar_url";
ALTER TABLE "tenant_user" RENAME COLUMN "isOwner" TO "is_owner";
ALTER TABLE "tenant_user" RENAME COLUMN "lastActivityAt" TO "last_activity_at";
ALTER TABLE "tenant_user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tenant_user" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- audit_log table
-- ============================================================================
ALTER TABLE "audit_log" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "audit_log" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "audit_log" RENAME COLUMN "performedByUserId" TO "performed_by_user_id";
ALTER TABLE "audit_log" RENAME COLUMN "performedByName" TO "performed_by_name";
ALTER TABLE "audit_log" RENAME COLUMN "entityType" TO "entity_type";
ALTER TABLE "audit_log" RENAME COLUMN "entityId" TO "entity_id";
ALTER TABLE "audit_log" RENAME COLUMN "fieldName" TO "field_name";
ALTER TABLE "audit_log" RENAME COLUMN "oldValue" TO "old_value";
ALTER TABLE "audit_log" RENAME COLUMN "newValue" TO "new_value";
ALTER TABLE "audit_log" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- ticket table
-- ============================================================================
ALTER TABLE "ticket" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "ticket" RENAME COLUMN "ticketNumber" TO "ticket_number";
ALTER TABLE "ticket" RENAME COLUMN "tenantUserId" TO "tenant_user_id";
ALTER TABLE "ticket" RENAME COLUMN "assignedToUserId" TO "assigned_to_user_id";
ALTER TABLE "ticket" RENAME COLUMN "assignedToAI" TO "assigned_to_ai";
ALTER TABLE "ticket" RENAME COLUMN "slaDeadline" TO "sla_deadline";
ALTER TABLE "ticket" RENAME COLUMN "firstResponseAt" TO "first_response_at";
ALTER TABLE "ticket" RENAME COLUMN "resolvedAt" TO "resolved_at";
ALTER TABLE "ticket" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "ticket" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- ticket_message table
-- ============================================================================
ALTER TABLE "ticket_message" RENAME COLUMN "ticketId" TO "ticket_id";
ALTER TABLE "ticket_message" RENAME COLUMN "messageType" TO "message_type";
ALTER TABLE "ticket_message" RENAME COLUMN "authorTenantUserId" TO "author_tenant_user_id";
ALTER TABLE "ticket_message" RENAME COLUMN "authorUserId" TO "author_user_id";
ALTER TABLE "ticket_message" RENAME COLUMN "authorName" TO "author_name";
ALTER TABLE "ticket_message" RENAME COLUMN "isInternal" TO "is_internal";
ALTER TABLE "ticket_message" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "ticket_message" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- ticket_ai_triage table
-- ============================================================================
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "ticketId" TO "ticket_id";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "urgencyScore" TO "urgency_score";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "suggestedAction" TO "suggested_action";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "suggestedPlaybook" TO "suggested_playbook";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "suggestedPlaybookLink" TO "suggested_playbook_link";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "draftResponse" TO "draft_response";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "ticket_ai_triage" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- knowledge_article table
-- ============================================================================
ALTER TABLE "knowledge_article" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "knowledge_article" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "knowledge_article" RENAME COLUMN "createdByUserId" TO "created_by_user_id";
ALTER TABLE "knowledge_article" RENAME COLUMN "updatedByUserId" TO "updated_by_user_id";
ALTER TABLE "knowledge_article" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "knowledge_article" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- playbook table
-- ============================================================================
ALTER TABLE "playbook" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "playbook" RENAME COLUMN "createdByUserId" TO "created_by_user_id";
ALTER TABLE "playbook" RENAME COLUMN "updatedByUserId" TO "updated_by_user_id";
ALTER TABLE "playbook" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "playbook" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- pipeline table
-- ============================================================================
ALTER TABLE "pipeline" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "pipeline" RENAME COLUMN "isDefault" TO "is_default";
ALTER TABLE "pipeline" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pipeline" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- pipeline_stage table
-- ============================================================================
ALTER TABLE "pipeline_stage" RENAME COLUMN "pipelineId" TO "pipeline_id";
ALTER TABLE "pipeline_stage" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pipeline_stage" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- deal table
-- ============================================================================
ALTER TABLE "deal" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "deal" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "deal" RENAME COLUMN "pipelineId" TO "pipeline_id";
ALTER TABLE "deal" RENAME COLUMN "stageId" TO "stage_id";
ALTER TABLE "deal" RENAME COLUMN "assignedToUserId" TO "assigned_to_user_id";
ALTER TABLE "deal" RENAME COLUMN "assignedToAI" TO "assigned_to_ai";
ALTER TABLE "deal" RENAME COLUMN "linkedSubscriptionId" TO "linked_subscription_id";
ALTER TABLE "deal" RENAME COLUMN "linkedTrialId" TO "linked_trial_id";
ALTER TABLE "deal" RENAME COLUMN "manualScore" TO "manual_score";
ALTER TABLE "deal" RENAME COLUMN "aiScore" TO "ai_score";
ALTER TABLE "deal" RENAME COLUMN "customFields" TO "custom_fields";
ALTER TABLE "deal" RENAME COLUMN "nextTask" TO "next_task";
ALTER TABLE "deal" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "deal" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- deal_contact table
-- ============================================================================
ALTER TABLE "deal_contact" RENAME COLUMN "dealId" TO "deal_id";
ALTER TABLE "deal_contact" RENAME COLUMN "tenantUserId" TO "tenant_user_id";
ALTER TABLE "deal_contact" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- deal_activity table
-- ============================================================================
ALTER TABLE "deal_activity" RENAME COLUMN "dealId" TO "deal_id";
ALTER TABLE "deal_activity" RENAME COLUMN "activityType" TO "activity_type";
ALTER TABLE "deal_activity" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "deal_activity" RENAME COLUMN "aiAgentId" TO "ai_agent_id";
ALTER TABLE "deal_activity" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- product_family table
-- ============================================================================
ALTER TABLE "product_family" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "product_family" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_family" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_plan table
-- ============================================================================
ALTER TABLE "product_plan" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "product_plan" RENAME COLUMN "productFamilyId" TO "product_family_id";
ALTER TABLE "product_plan" RENAME COLUMN "pricingModel" TO "pricing_model";
ALTER TABLE "product_plan" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_plan" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_pricing table
-- ============================================================================
ALTER TABLE "product_pricing" RENAME COLUMN "productPlanId" TO "product_plan_id";
ALTER TABLE "product_pricing" RENAME COLUMN "pricingType" TO "pricing_type";
ALTER TABLE "product_pricing" RENAME COLUMN "perSeatAmount" TO "per_seat_amount";
ALTER TABLE "product_pricing" RENAME COLUMN "usageMeterId" TO "usage_meter_id";
ALTER TABLE "product_pricing" RENAME COLUMN "usageTiers" TO "usage_tiers";
ALTER TABLE "product_pricing" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_pricing" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_feature table
-- ============================================================================
ALTER TABLE "product_feature" RENAME COLUMN "productPlanId" TO "product_plan_id";
ALTER TABLE "product_feature" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_feature" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_add_on table
-- ============================================================================
ALTER TABLE "product_add_on" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "product_add_on" RENAME COLUMN "pricingModel" TO "pricing_model";
ALTER TABLE "product_add_on" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_add_on" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_add_on_pricing table
-- ============================================================================
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "productAddOnId" TO "product_add_on_id";
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "pricingType" TO "pricing_type";
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "perSeatAmount" TO "per_seat_amount";
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "usageMeterId" TO "usage_meter_id";
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "usageTiers" TO "usage_tiers";
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_add_on_pricing" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- coupon table
-- ============================================================================
ALTER TABLE "coupon" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "coupon" RENAME COLUMN "discountType" TO "discount_type";
ALTER TABLE "coupon" RENAME COLUMN "discountValue" TO "discount_value";
ALTER TABLE "coupon" RENAME COLUMN "applicablePlanIds" TO "applicable_plan_ids";
ALTER TABLE "coupon" RENAME COLUMN "maxRedemptions" TO "max_redemptions";
ALTER TABLE "coupon" RENAME COLUMN "redemptionCount" TO "redemption_count";
ALTER TABLE "coupon" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "coupon" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "coupon" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_feature_flag table
-- ============================================================================
ALTER TABLE "product_feature_flag" RENAME COLUMN "productPlanId" TO "product_plan_id";
ALTER TABLE "product_feature_flag" RENAME COLUMN "flagKey" TO "flag_key";
ALTER TABLE "product_feature_flag" RENAME COLUMN "flagValue" TO "flag_value";
ALTER TABLE "product_feature_flag" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_feature_flag" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- product_plan_add_on table
-- ============================================================================
ALTER TABLE "product_plan_add_on" RENAME COLUMN "productPlanId" TO "product_plan_id";
ALTER TABLE "product_plan_add_on" RENAME COLUMN "productAddOnId" TO "product_add_on_id";
ALTER TABLE "product_plan_add_on" RENAME COLUMN "billingType" TO "billing_type";
ALTER TABLE "product_plan_add_on" RENAME COLUMN "displayOrder" TO "display_order";
ALTER TABLE "product_plan_add_on" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_plan_add_on" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- usage_meter table
-- ============================================================================
ALTER TABLE "usage_meter" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "usage_meter" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "usage_meter" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- subscription table
-- ============================================================================
ALTER TABLE "subscription" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "subscription" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "subscription" RENAME COLUMN "subscriptionNumber" TO "subscription_number";
ALTER TABLE "subscription" RENAME COLUMN "productPlanId" TO "product_plan_id";
ALTER TABLE "subscription" RENAME COLUMN "collectionMethod" TO "collection_method";
ALTER TABLE "subscription" RENAME COLUMN "billingCycle" TO "billing_cycle";
ALTER TABLE "subscription" RENAME COLUMN "currentPeriodStart" TO "current_period_start";
ALTER TABLE "subscription" RENAME COLUMN "currentPeriodEnd" TO "current_period_end";
ALTER TABLE "subscription" RENAME COLUMN "paymentMethodId" TO "payment_method_id";
ALTER TABLE "subscription" RENAME COLUMN "linkedDealId" TO "linked_deal_id";
ALTER TABLE "subscription" RENAME COLUMN "couponId" TO "coupon_id";
ALTER TABLE "subscription" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "subscription" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- subscription_add_on table
-- ============================================================================
ALTER TABLE "subscription_add_on" RENAME COLUMN "subscriptionId" TO "subscription_id";
ALTER TABLE "subscription_add_on" RENAME COLUMN "productAddOnId" TO "product_add_on_id";
ALTER TABLE "subscription_add_on" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- usage_history table
-- ============================================================================
ALTER TABLE "usage_history" RENAME COLUMN "subscriptionId" TO "subscription_id";
ALTER TABLE "usage_history" RENAME COLUMN "usageMeterId" TO "usage_meter_id";
ALTER TABLE "usage_history" RENAME COLUMN "periodStart" TO "period_start";
ALTER TABLE "usage_history" RENAME COLUMN "periodEnd" TO "period_end";
ALTER TABLE "usage_history" RENAME COLUMN "recordedAt" TO "recorded_at";
ALTER TABLE "usage_history" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- subscription_activity table
-- ============================================================================
ALTER TABLE "subscription_activity" RENAME COLUMN "subscriptionId" TO "subscription_id";
ALTER TABLE "subscription_activity" RENAME COLUMN "activityType" TO "activity_type";
ALTER TABLE "subscription_activity" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "subscription_activity" RENAME COLUMN "aiAgentId" TO "ai_agent_id";
ALTER TABLE "subscription_activity" RENAME COLUMN "createdAt" TO "created_at";

-- ============================================================================
-- invoice table
-- ============================================================================
ALTER TABLE "invoice" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "invoice" RENAME COLUMN "subscriptionId" TO "subscription_id";
ALTER TABLE "invoice" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "invoice" RENAME COLUMN "invoiceNumber" TO "invoice_number";
ALTER TABLE "invoice" RENAME COLUMN "issueDate" TO "issue_date";
ALTER TABLE "invoice" RENAME COLUMN "dueDate" TO "due_date";
ALTER TABLE "invoice" RENAME COLUMN "paidAt" TO "paid_at";
ALTER TABLE "invoice" RENAME COLUMN "lineItems" TO "line_items";
ALTER TABLE "invoice" RENAME COLUMN "pdfPath" TO "pdf_path";
ALTER TABLE "invoice" RENAME COLUMN "billingName" TO "billing_name";
ALTER TABLE "invoice" RENAME COLUMN "billingEmail" TO "billing_email";
ALTER TABLE "invoice" RENAME COLUMN "billingAddress" TO "billing_address";
ALTER TABLE "invoice" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "invoice" RENAME COLUMN "updatedAt" TO "updated_at";

-- ============================================================================
-- quote table
-- ============================================================================
ALTER TABLE "quote" RENAME COLUMN "organizationId" TO "organization_id";
ALTER TABLE "quote" RENAME COLUMN "tenantOrganizationId" TO "tenant_organization_id";
ALTER TABLE "quote" RENAME COLUMN "dealId" TO "deal_id";
ALTER TABLE "quote" RENAME COLUMN "productPlanId" TO "product_plan_id";
ALTER TABLE "quote" RENAME COLUMN "quoteNumber" TO "quote_number";
ALTER TABLE "quote" RENAME COLUMN "parentQuoteId" TO "parent_quote_id";
ALTER TABLE "quote" RENAME COLUMN "validUntil" TO "valid_until";
ALTER TABLE "quote" RENAME COLUMN "lineItems" TO "line_items";
ALTER TABLE "quote" RENAME COLUMN "convertedToInvoiceId" TO "converted_to_invoice_id";
ALTER TABLE "quote" RENAME COLUMN "pdfPath" TO "pdf_path";
ALTER TABLE "quote" RENAME COLUMN "billingName" TO "billing_name";
ALTER TABLE "quote" RENAME COLUMN "billingEmail" TO "billing_email";
ALTER TABLE "quote" RENAME COLUMN "billingAddress" TO "billing_address";
ALTER TABLE "quote" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "quote" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "quote" RENAME COLUMN "sentAt" TO "sent_at";
ALTER TABLE "quote" RENAME COLUMN "acceptedAt" TO "accepted_at";
ALTER TABLE "quote" RENAME COLUMN "rejectedAt" TO "rejected_at";
