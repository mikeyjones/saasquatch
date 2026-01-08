/**
 * Database seed script for multi-tenant testing
 *
 * Creates two types of data:
 * 1. Support Staff Organizations - Users who CAN log in (with Better Auth accounts)
 *    - Stored in: organization, user, member, account tables
 * 2. Tenant Customer Organizations - Customers being supported (NO login)
 *    - Stored in: tenant_organization, tenant_user tables
 *    - Scoped to a support staff organization
 *
 * Run with: bun run db:seed
 */

import { config } from "dotenv";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "better-auth/crypto";

// Type for the database with schema
type Database = NodePgDatabase<typeof schema>;

// ============================================================================
// Configuration
// ============================================================================

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Validate required environment variables
function validateEnv(): void {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is required");
	}
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
	return crypto.randomUUID().replace(/-/g, "").substring(0, 24);
}

/**
 * Log a success message
 */
function logSuccess(message: string): void {
	console.log(`   ✓ ${message}`);
}

/**
 * Log an info message
 */
function logInfo(message: string): void {
	console.log(`   ℹ ${message}`);
}

/**
 * Log a section header
 */
function logSection(message: string): void {
	console.log(`\n📦 ${message}`);
}

// ============================================================================
// Type Definitions
// ============================================================================

interface SupportStaffOrg {
	name: string;
	slug: string;
	description: string;
	users: {
		name: string;
		email: string;
		role: "owner" | "admin" | "member";
	}[];
}

interface TenantOrgData {
	name: string;
	slug: string;
	description: string;
	industry?: string;
	subscriptionPlan?: string;
	subscriptionStatus?: string;
	website?: string;
	users: {
		name: string;
		email: string;
		role: "owner" | "admin" | "user" | "viewer";
		isOwner?: boolean;
		status?: "active" | "suspended" | "invited";
		phone?: string;
	}[];
}

interface TicketSeedData {
	title: string;
	priority: "low" | "normal" | "high" | "urgent";
	status: "open" | "pending" | "waiting_on_customer" | "escalated" | "closed";
	tenantOrgSlug: string; // Which tenant org's user submitted this
	tenantUserEmail: string; // Which user submitted
	messages: {
		type: "customer" | "agent" | "ai" | "system";
		authorEmail?: string; // For agent messages
		content: string;
		isInternal?: boolean;
		hoursAgo: number; // How many hours ago this message was sent
	}[];
	aiTriage?: {
		category: string;
		sentiment: string;
		urgency_score: number;
		suggested_action: string;
		suggestedPlaybook?: string;
	};
	hasAI?: boolean;
}

interface KnowledgeArticleSeedData {
	title: string;
	content: string;
	category: string;
	tags: string[];
	status: "draft" | "published" | "archived";
}

interface PlaybookSeedData {
	name: string;
	description: string;
	type: "manual" | "automated";
	category: string;
	tags: string[];
	status: "draft" | "active" | "inactive";
	steps?: Array<{
		order: number;
		title: string;
		description: string;
		action?: string;
	}>;
	triggers?: Array<{ type: string; condition: string }>;
	actions?: Array<{ type: string; config: Record<string, unknown> }>;
}

interface PipelineStageSeedData {
	name: string;
	order: number;
	color: string;
}

interface PipelineSeedData {
	name: string;
	description: string;
	is_default: boolean;
	stages: PipelineStageSeedData[];
}

interface DealSeedData {
	name: string;
	value: number; // in cents
	stageName: string;
	assignedToEmail?: string;
	badges?: string[];
	notes?: string;
}

interface ProductSeedData {
	name: string;
	description: string;
	status: "active" | "draft" | "archived";
	plans: ProductPlanSeedData[];
}

interface ProductPlanSeedData {
	name: string;
	description: string;
	status: "active" | "draft" | "archived";
	pricing_model: "flat" | "seat" | "usage" | "hybrid";
	monthlyPrice: number; // in cents
	yearlyPrice: number; // in cents (usually with discount)
	perSeatAmount?: number; // for seat-based pricing
	features: string[];
}

interface SubscriptionSeedData {
	tenantOrgSlug: string;
	planName: string;
	status: "draft" | "active" | "trial" | "past_due" | "canceled" | "paused";
	billing_cycle: "monthly" | "yearly";
	seats: number;
	hasInvoice: boolean;
	invoicePaid: boolean;
	// Payment collection method
	// 'automatic' = self-service customers, auto-charge via payment processor
	// 'send_invoice' = sales-led, manual invoice sent to customer
	collection_method: "automatic" | "send_invoice";
}

// ============================================================================
// Seed Data
// ============================================================================

/**
 * Support Staff Organizations
 * These users CAN log in to the system (have Better Auth accounts)
 * They are the employees/agents who use the support platform
 */
const supportStaffOrgs: SupportStaffOrg[] = [
	{
		name: "Acme Corporation",
		slug: "acme",
		description: "Primary test organization for support staff",
		users: [
			{ name: "Alice Admin", email: "alice@acme.test", role: "owner" },
			{ name: "Bob Builder", email: "bob@acme.test", role: "admin" },
			{ name: "Carol Support", email: "carol@acme.test", role: "member" },
		],
	},
	{
		name: "Globex Industries",
		slug: "globex",
		description: "Secondary test organization for support staff",
		users: [
			{ name: "Charlie CEO", email: "charlie@globex.test", role: "owner" },
			{ name: "Diana Dev", email: "diana@globex.test", role: "member" },
		],
	},
];

/**
 * Tenant Customer Organizations (per support staff org)
 * These are the customers that each support staff organization helps
 *
 * Key: support staff org slug
 * Value: array of tenant organizations for that support staff org
 */
/**
 * Sample tickets for testing
 * Key: support staff org slug
 */
const ticketsPerStaff: Record<string, TicketSeedData[]> = {
	acme: [
		{
			title: "Login Failure on SSO",
			priority: "urgent",
			status: "open",
			tenantOrgSlug: "acme-corp",
			tenantUserEmail: "john@acme.com",
			messages: [
				{
					type: "customer",
					content: `Hi Team,

We are unable to login using our Okta SSO integration on the staging environment. It was working yesterday. Getting a 500 error.

This is blocking our UAT testing. Please help ASAP.`,
					hoursAgo: 2,
				},
			],
			aiTriage: {
				category: "Authentication / SSO",
				sentiment: "Negative (Urgency Detected)",
				urgency_score: 9,
				suggested_action: "Check Error Logs for 'Okta Connection Timeout'.",
				suggested_playbook: "SSO Troubleshooting Guide",
			},
		},
		{
			title: "Billing question for Nov invoice",
			priority: "normal",
			status: "open",
			tenantOrgSlug: "techflow",
			tenantUserEmail: "sarah@techflow.io",
			messages: [
				{
					type: "customer",
					content: `Hello,

I have a question about our November invoice. There seems to be a discrepancy in the number of users billed vs our actual usage.

Can someone review this?`,
					hoursAgo: 4,
				},
			],
		},
		{
			title: "How to add new users?",
			priority: "low",
			status: "open",
			tenantOrgSlug: "startup-inc",
			tenantUserEmail: "mike@startup.io",
			hasAI: true,
			messages: [
				{
					type: "customer",
					content: `Hi there,

I'm a new admin and trying to figure out how to add new users to our account. Can you point me to the right documentation?

Thanks!`,
					hoursAgo: 24,
				},
				{
					type: "ai",
					content: `Hi Mike,

I can help you with adding new users! Here's how:

1. Go to Settings → Team Members
2. Click "Invite User"
3. Enter their email and select a role

You can also check out our documentation: [Adding Team Members](https://docs.example.com/team-members)

Let me know if you have any questions!`,
					hoursAgo: 23,
				},
			],
			aiTriage: {
				category: "Onboarding / How-to",
				sentiment: "Neutral",
				urgency_score: 2,
				suggested_action: "Provide documentation link for user management",
				suggested_playbook: "New Admin Onboarding",
			},
		},
		{
			title: "API Rate Limit increase request",
			priority: "high",
			status: "open",
			tenantOrgSlug: "dataminds",
			tenantUserEmail: "alex@dataminds.com",
			messages: [
				{
					type: "customer",
					content: `Hello Support,

We're hitting our API rate limits frequently now that we've scaled up our integration. We'd like to request an increase to our current limits.

Our current plan is Enterprise and we're willing to discuss pricing for higher limits.`,
					hoursAgo: 48,
				},
				{
					type: "agent",
					authorEmail: "bob@acme.test",
					content: `Hi Alex,

Thanks for reaching out. I can see you're on our Enterprise plan and have been hitting the 10,000 requests/minute limit.

I've escalated this to our API team to review your usage patterns and discuss options. They'll be in touch within 24 hours.

In the meantime, I've temporarily increased your limit to 15,000 requests/minute.`,
					hoursAgo: 46,
				},
				{
					type: "customer",
					content: `Thank you Bob! The temporary increase helps a lot. Looking forward to hearing from the API team.`,
					hoursAgo: 45,
				},
			],
			aiTriage: {
				category: "API / Technical",
				sentiment: "Neutral",
				urgency_score: 6,
				suggested_action:
					"Review API usage and escalate to API team for limit increase",
			},
		},
		{
			title: "Feature request: Dark mode",
			priority: "low",
			status: "closed",
			tenantOrgSlug: "global-logistics",
			tenantUserEmail: "emily@logistics.global",
			messages: [
				{
					type: "customer",
					content: `Hi,

Would love to see a dark mode option in the dashboard. Our team works late nights and it would really help with eye strain.

Thanks for considering!`,
					hoursAgo: 168, // 7 days ago
				},
				{
					type: "agent",
					authorEmail: "carol@acme.test",
					content: `Hi Emily,

Thank you for the feature suggestion! I've added this to our product roadmap.

Dark mode is actually something we're actively working on and expect to release in Q1 next year. I'll make sure you're notified when it's available.

Is there anything else I can help you with?`,
					hoursAgo: 166,
				},
				{
					type: "customer",
					content: `That's great news! Thanks for the quick response. Nothing else for now.`,
					hoursAgo: 165,
				},
				{
					type: "system",
					content: "Ticket closed by Carol Support",
					hoursAgo: 165,
				},
			],
		},
	],
	globex: [
		{
			title: "Cannot export reports to PDF",
			priority: "normal",
			status: "pending",
			tenantOrgSlug: "megacorp",
			tenantUserEmail: "robert@megacorp.com",
			messages: [
				{
					type: "customer",
					content: `Hello,

When I try to export our monthly reports to PDF, the download starts but the file is corrupted. This happens in both Chrome and Firefox.

Can you help?`,
					hoursAgo: 12,
				},
				{
					type: "agent",
					authorEmail: "charlie@globex.test",
					content: `Hi Robert,

Sorry to hear you're having trouble with PDF exports. I've tested this on our end and can reproduce the issue.

I've reported this to our engineering team as a bug. They're investigating and I'll update you as soon as we have a fix.

In the meantime, you can export to CSV as a workaround.`,
					hoursAgo: 10,
				},
			],
		},
	],
};

/**
 * Sample Knowledge Articles for testing
 * Key: support staff org slug
 */
const knowledgeArticlesPerStaff: Record<string, KnowledgeArticleSeedData[]> = {
	acme: [
		{
			title: "Setting up Okta SSO",
			content: `# Setting up Okta SSO Integration

This guide walks you through configuring Okta Single Sign-On with your account.

## Prerequisites
- Okta administrator access
- Professional or Enterprise subscription plan

## Step 1: Create SAML Application in Okta
1. Log in to your Okta Admin Console
2. Navigate to Applications > Applications
3. Click "Create App Integration"
4. Select SAML 2.0 and click Next

## Step 2: Configure SAML Settings
- **Single Sign-On URL**: \`https://app.example.com/sso/saml\`
- **Audience URI**: \`https://app.example.com\`
- **Name ID format**: EmailAddress

## Step 3: Download Metadata
Download the Identity Provider metadata XML file from Okta.

## Step 4: Configure in Our App
1. Go to Settings > Security > SSO Configuration
2. Upload the metadata XML file
3. Test the connection

## Troubleshooting
- **500 Error**: Check that the metadata URL is accessible
- **Invalid Certificate**: Ensure certificates haven't expired
- **User Not Found**: Verify email matching settings

For further assistance, contact support.`,
			category: "AUTHENTICATION",
			tags: ["sso", "okta", "saml", "security"],
			status: "published",
		},
		{
			title: "Understanding Your Invoice",
			content: `# Understanding Your Invoice

This article explains each section of your monthly invoice.

## Invoice Sections

### Header
- Invoice number and date
- Billing period covered
- Your organization details

### Subscription Details
- Current plan name
- Per-user pricing
- Number of active users

### Usage Breakdown
- Base subscription cost
- Additional users (if over plan limit)
- Add-on features
- Overages (API calls, storage, etc.)

### Tax Information
- Applicable taxes based on your location
- Tax ID if provided

## Common Questions

**Q: Why did my bill increase?**
A: Common reasons include:
- Added new team members
- Upgraded plan
- Exceeded usage limits

**Q: How do I get a receipt?**
A: Download PDF invoices from Settings > Billing > Invoice History

**Q: Can I change my billing date?**
A: Contact support to adjust your billing cycle.`,
			category: "BILLING",
			tags: ["billing", "invoice", "payment"],
			status: "published",
		},
		{
			title: "API Rate Limits Explained",
			content: `# API Rate Limits

Understanding and working within our API rate limits.

## Default Limits

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Starter | 100 | 10,000 |
| Professional | 1,000 | 100,000 |
| Enterprise | 10,000 | 1,000,000 |

## Rate Limit Headers
Every API response includes:
- \`X-RateLimit-Limit\`: Your limit
- \`X-RateLimit-Remaining\`: Requests left
- \`X-RateLimit-Reset\`: When limit resets (Unix timestamp)

## Handling 429 Errors
When you exceed limits, you'll receive a 429 response. Implement exponential backoff:

\`\`\`javascript
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    if (response.status !== 429) return response;
    const delay = Math.pow(2, i) * 1000;
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Rate limit exceeded');
}
\`\`\`

## Requesting Higher Limits
Enterprise customers can request limit increases by contacting support.`,
			category: "DEVELOPER",
			tags: ["api", "rate-limits", "developer"],
			status: "draft",
		},
		{
			title: "Managing Team Members",
			content: `# Managing Team Members

Learn how to add, remove, and manage team member access.

## Adding Team Members
1. Go to Settings > Team
2. Click "Invite Member"
3. Enter email address
4. Select role (Admin, Member, Viewer)
5. Click Send Invitation

## Roles and Permissions

### Admin
- Full access to all features
- Can manage billing
- Can invite/remove members

### Member
- Access to main features
- Cannot manage billing
- Cannot remove other members

### Viewer
- Read-only access
- Cannot modify data

## Removing Members
1. Go to Settings > Team
2. Find the member
3. Click the ⋯ menu
4. Select "Remove from team"

Note: Removing a member doesn't delete their data.`,
			category: "AUTHENTICATION",
			tags: ["team", "members", "roles", "permissions"],
			status: "published",
		},
		{
			title: "Webhook Configuration Guide",
			content: `# Webhook Configuration

Set up webhooks to receive real-time notifications.

## Supported Events
- \`ticket.created\`
- \`ticket.updated\`
- \`ticket.closed\`
- \`user.created\`
- \`payment.received\`

## Setting Up Webhooks
1. Navigate to Settings > Integrations > Webhooks
2. Click "Add Endpoint"
3. Enter your endpoint URL
4. Select events to subscribe to
5. Save configuration

## Webhook Payload
\`\`\`json
{
  "event": "ticket.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "tk_123",
    "title": "Help needed",
    "status": "open"
  }
}
\`\`\`

## Verifying Signatures
We sign webhooks with HMAC-SHA256. Verify using your webhook secret.`,
			category: "DEVELOPER",
			tags: ["webhooks", "integrations", "api", "developer"],
			status: "published",
		},
	],
	globex: [
		{
			title: "Getting Started Guide",
			content: `# Getting Started

Welcome! This guide will help you set up your account.

## First Steps
1. Complete your profile
2. Invite your team
3. Configure your first project

## Dashboard Overview
The dashboard shows:
- Active tickets
- Team activity
- Key metrics

## Need Help?
Contact support or check our other articles.`,
			category: "GENERAL",
			tags: ["getting-started", "onboarding"],
			status: "published",
		},
		{
			title: "Export and Reporting Features",
			content: `# Export and Reporting

Learn how to export data and generate reports.

## Available Exports
- CSV export
- PDF reports
- Excel spreadsheets

## Generating Reports
1. Go to Reports section
2. Select report type
3. Choose date range
4. Click Generate

## Scheduled Reports
Set up automatic report delivery via email.`,
			category: "GENERAL",
			tags: ["export", "reports", "data"],
			status: "published",
		},
	],
};

/**
 * Sample Playbooks for testing
 * Key: support staff org slug
 */
const playbooksPerStaff: Record<string, PlaybookSeedData[]> = {
	acme: [
		{
			name: "SSO Troubleshooting Guide",
			description: "Step-by-step guide for diagnosing and resolving SSO issues",
			type: "manual",
			category: "AUTHENTICATION",
			tags: ["sso", "troubleshooting", "authentication"],
			status: "active",
			steps: [
				{
					order: 1,
					title: "Verify SSO Configuration",
					description:
						"Check that SSO is properly configured in Settings > Security > SSO",
					action: "Navigate to settings and verify configuration",
				},
				{
					order: 2,
					title: "Check Error Logs",
					description:
						"Review authentication error logs for specific error codes",
					action: "Go to Settings > Logs > Authentication",
				},
				{
					order: 3,
					title: "Verify IdP Metadata",
					description:
						"Ensure the Identity Provider metadata is up to date and certificates are valid",
					action: "Check certificate expiration dates",
				},
				{
					order: 4,
					title: "Test Connection",
					description: "Use the SSO test tool to verify the connection",
					action: 'Click "Test SSO Connection" button',
				},
				{
					order: 5,
					title: "Escalate if Needed",
					description: "If issues persist, escalate to engineering team",
					action: "Create engineering ticket",
				},
			],
		},
		{
			name: "New Admin Onboarding",
			description: "Checklist for helping new administrators get set up",
			type: "manual",
			category: "ONBOARDING",
			tags: ["onboarding", "admin", "setup"],
			status: "active",
			steps: [
				{
					order: 1,
					title: "Welcome and Verify Access",
					description: "Confirm the user has admin access and can log in",
				},
				{
					order: 2,
					title: "Tour the Dashboard",
					description: "Walk through the main dashboard features",
				},
				{
					order: 3,
					title: "Team Management",
					description: "Show how to invite and manage team members",
				},
				{
					order: 4,
					title: "Billing Overview",
					description: "Explain billing section and invoice history",
				},
				{
					order: 5,
					title: "Documentation Links",
					description: "Share links to relevant documentation and guides",
				},
			],
		},
		{
			name: "Billing Issue Resolution",
			description: "Process for handling billing disputes and refund requests",
			type: "manual",
			category: "BILLING",
			tags: ["billing", "refund", "dispute"],
			status: "active",
			steps: [
				{
					order: 1,
					title: "Review Account History",
					description: "Check billing history and recent invoices",
				},
				{
					order: 2,
					title: "Identify the Issue",
					description:
						"Determine if it is overcharge, duplicate payment, or feature not working",
				},
				{
					order: 3,
					title: "Calculate Adjustment",
					description: "Determine appropriate credit or refund amount",
				},
				{
					order: 4,
					title: "Process Adjustment",
					description: "Apply credit or initiate refund through billing system",
				},
				{
					order: 5,
					title: "Confirm with Customer",
					description: "Send confirmation email with adjustment details",
				},
			],
		},
		{
			name: "Auto-Tag New Tickets",
			description:
				"Automatically categorize and tag incoming tickets based on content",
			type: "automated",
			category: "AUTOMATION",
			tags: ["automation", "tickets", "tagging"],
			status: "active",
			triggers: [{ type: "event", condition: "ticket.created" }],
			actions: [
				{
					type: "analyze_content",
					config: { fields: ["title", "message"] },
				},
				{
					type: "add_tags",
					config: {
						rules: [
							{ keyword: "sso", tag: "authentication" },
							{ keyword: "login", tag: "authentication" },
							{ keyword: "invoice", tag: "billing" },
							{ keyword: "payment", tag: "billing" },
							{ keyword: "api", tag: "developer" },
						],
					},
				},
				{
					type: "set_priority",
					config: {
						rules: [
							{ keyword: "urgent", priority: "high" },
							{ keyword: "asap", priority: "high" },
							{ keyword: "production", priority: "high" },
						],
					},
				},
			],
		},
		{
			name: "Auto-Reply with KB Suggestions",
			description:
				"Suggest relevant knowledge base articles based on ticket content",
			type: "automated",
			category: "AUTOMATION",
			tags: ["automation", "knowledge-base", "ai"],
			status: "draft",
			triggers: [
				{ type: "event", condition: "ticket.created" },
				{ type: "condition", condition: "ticket.hasNoAgentReply" },
			],
			actions: [
				{
					type: "search_knowledge_base",
					config: { searchFields: ["title", "message"], maxResults: 3 },
				},
				{
					type: "send_auto_reply",
					config: {
						template: "kb_suggestions",
						onlyIfResults: true,
					},
				},
			],
		},
	],
	globex: [
		{
			name: "Password Reset Procedure",
			description: "Guide for assisting users with password reset",
			type: "manual",
			category: "AUTHENTICATION",
			tags: ["password", "reset", "security"],
			status: "active",
			steps: [
				{
					order: 1,
					title: "Verify User Identity",
					description:
						"Confirm the user identity using security questions or email verification",
				},
				{
					order: 2,
					title: "Initiate Reset",
					description: "Send password reset link to registered email",
				},
				{
					order: 3,
					title: "Confirm Reset",
					description: "Verify user has successfully reset their password",
				},
			],
		},
		{
			name: "Escalation Workflow",
			description:
				"Process for escalating tickets to senior support or engineering",
			type: "manual",
			category: "GENERAL",
			tags: ["escalation", "workflow"],
			status: "active",
			steps: [
				{
					order: 1,
					title: "Document Issue Thoroughly",
					description: "Ensure all troubleshooting steps are documented",
				},
				{
					order: 2,
					title: "Identify Escalation Path",
					description:
						"Determine if this goes to senior support, engineering, or management",
				},
				{
					order: 3,
					title: "Create Escalation Note",
					description: "Write summary of issue and steps taken",
				},
				{
					order: 4,
					title: "Assign to Appropriate Team",
					description: "Transfer ticket with all context",
				},
			],
		},
	],
};

/**
 * Sales Pipelines per tenant organization
 * Key: tenant org slug
 */
const pipelinesPerTenantOrg: Record<string, PipelineSeedData[]> = {
	"acme-corp": [
		{
			name: "Enterprise Pipeline",
			description: "Main sales pipeline for enterprise deals",
			is_default: true,
			stages: [
				{ name: "Lead", order: 1, color: "gray" },
				{ name: "Meeting", order: 2, color: "blue" },
				{ name: "Negotiation", order: 3, color: "amber" },
				{ name: "Closed Won", order: 4, color: "emerald" },
			],
		},
	],
	techflow: [
		{
			name: "SMB Pipeline",
			description: "Pipeline for small and medium business deals",
			is_default: true,
			stages: [
				{ name: "Lead", order: 1, color: "gray" },
				{ name: "Qualified", order: 2, color: "sky" },
				{ name: "Demo", order: 3, color: "blue" },
				{ name: "Proposal", order: 4, color: "amber" },
				{ name: "Closed Won", order: 5, color: "emerald" },
				{ name: "Closed Lost", order: 6, color: "rose" },
			],
		},
	],
	"startup-inc": [
		{
			name: "Startup Pipeline",
			description: "Fast-track pipeline for startup accounts",
			is_default: true,
			stages: [
				{ name: "Trial", order: 1, color: "violet" },
				{ name: "Evaluation", order: 2, color: "blue" },
				{ name: "Conversion", order: 3, color: "amber" },
				{ name: "Active", order: 4, color: "emerald" },
			],
		},
	],
	dataminds: [
		{
			name: "API Partners Pipeline",
			description: "Pipeline for API integration partners",
			is_default: true,
			stages: [
				{ name: "Discovery", order: 1, color: "gray" },
				{ name: "Technical Review", order: 2, color: "sky" },
				{ name: "Integration", order: 3, color: "blue" },
				{ name: "Contract", order: 4, color: "amber" },
				{ name: "Live", order: 5, color: "emerald" },
			],
		},
	],
	"global-logistics": [
		{
			name: "Enterprise Pipeline",
			description: "Enterprise logistics deals",
			is_default: true,
			stages: [
				{ name: "Lead", order: 1, color: "gray" },
				{ name: "Meeting", order: 2, color: "blue" },
				{ name: "Negotiation", order: 3, color: "amber" },
				{ name: "Closed Won", order: 4, color: "emerald" },
			],
		},
	],
	megacorp: [
		{
			name: "Corporate Pipeline",
			description: "High-value corporate deals",
			is_default: true,
			stages: [
				{ name: "Prospect", order: 1, color: "gray" },
				{ name: "Discovery", order: 2, color: "sky" },
				{ name: "Evaluation", order: 3, color: "blue" },
				{ name: "Negotiation", order: 4, color: "amber" },
				{ name: "Closed", order: 5, color: "emerald" },
			],
		},
	],
	smallbiz: [
		{
			name: "Small Business Pipeline",
			description: "Quick conversion pipeline for small businesses",
			is_default: true,
			stages: [
				{ name: "Lead", order: 1, color: "gray" },
				{ name: "Demo", order: 2, color: "blue" },
				{ name: "Closed", order: 3, color: "emerald" },
			],
		},
	],
};

/**
 * Sample deals per tenant organization
 * Key: tenant org slug
 */
const dealsPerTenantOrg: Record<string, DealSeedData[]> = {
	"acme-corp": [
		{
			name: "Enterprise License - 500 Seats",
			value: 12000000, // $120,000
			stageName: "Negotiation",
			assignedToEmail: "alice@acme.test",
			badges: ["Hot"],
			notes: "Large enterprise deal with potential for multi-year contract",
		},
		{
			name: "Annual Renewal + Expansion",
			value: 8500000, // $85,000
			stageName: "Meeting",
			assignedToEmail: "bob@acme.test",
		},
	],
	techflow: [
		{
			name: "Pro Plan Upgrade",
			value: 2500000, // $25,000
			stageName: "Demo",
			assignedToEmail: "carol@acme.test",
		},
		{
			name: "New Account - Marketing Team",
			value: 1500000, // $15,000
			stageName: "Lead",
			assignedToEmail: "alice@acme.test",
		},
		{
			name: "Department Expansion",
			value: 4500000, // $45,000
			stageName: "Proposal",
			assignedToEmail: "bob@acme.test",
			badges: ["Enterprise"],
		},
	],
	"startup-inc": [
		{
			name: "Starter Plan - Annual",
			value: 500000, // $5,000
			stageName: "Trial",
			assignedToEmail: "carol@acme.test",
		},
		{
			name: "Trial Extension Request",
			value: 800000, // $8,000
			stageName: "Evaluation",
			assignedToEmail: "alice@acme.test",
		},
	],
	dataminds: [
		{
			name: "API Access Tier 3",
			value: 4500000, // $45,000
			stageName: "Integration",
			assignedToEmail: "bob@acme.test",
		},
		{
			name: "Enterprise API License",
			value: 15000000, // $150,000
			stageName: "Contract",
			assignedToEmail: "alice@acme.test",
			badges: ["Hot", "Enterprise"],
		},
	],
	"global-logistics": [
		{
			name: "Custom Integration",
			value: 8500000, // $85,000
			stageName: "Closed Won",
			assignedToEmail: "alice@acme.test",
		},
		{
			name: "Fleet Management Add-on",
			value: 3500000, // $35,000
			stageName: "Meeting",
			assignedToEmail: "carol@acme.test",
		},
	],
	megacorp: [
		{
			name: "Global Rollout Phase 1",
			value: 50000000, // $500,000
			stageName: "Evaluation",
			assignedToEmail: "charlie@globex.test",
			badges: ["Strategic"],
		},
		{
			name: "Regional Expansion - APAC",
			value: 25000000, // $250,000
			stageName: "Discovery",
			assignedToEmail: "diana@globex.test",
		},
	],
	smallbiz: [
		{
			name: "Retail POS Integration",
			value: 120000, // $1,200
			stageName: "Demo",
			assignedToEmail: "charlie@globex.test",
		},
	],
};

/**
 * Products with their plans per support staff organization
 * Key: support staff org slug
 */
const productsPerStaff: Record<string, ProductSeedData[]> = {
	acme: [
		{
			name: "Acme CRM Platform",
			description: "Complete customer relationship management solution",
			status: "active",
			plans: [
				{
					name: "Starter",
					description: "Perfect for small teams getting started",
					status: "active",
					pricing_model: "flat",
					monthlyPrice: 2900, // $29/month
					yearlyPrice: 29000, // $290/year (2 months free)
					features: [
						"Up to 5 users",
						"Basic support",
						"1GB storage",
						"Email integration",
					],
				},
				{
					name: "Professional",
					description: "For growing teams that need more power",
					status: "active",
					pricing_model: "seat",
					monthlyPrice: 4900, // $49/month base
					yearlyPrice: 49000, // $490/year base
					per_seat_amount: 1500, // $15/seat/month
					features: [
						"Unlimited users",
						"Priority support",
						"10GB storage",
						"API access",
						"SSO integration",
					],
				},
				{
					name: "Enterprise",
					description: "For large organizations with custom needs",
					status: "active",
					pricing_model: "flat",
					monthlyPrice: 29900, // $299/month
					yearlyPrice: 299000, // $2,990/year
					features: [
						"Unlimited everything",
						"Dedicated support",
						"Custom integrations",
						"SLA guarantee",
						"Advanced analytics",
					],
				},
			],
		},
	],
	globex: [
		{
			name: "Globex Business Suite",
			description: "All-in-one business management platform",
			status: "active",
			plans: [
				{
					name: "Basic",
					description: "Essential features for small businesses",
					status: "active",
					pricing_model: "flat",
					monthlyPrice: 1900, // $19/month
					yearlyPrice: 19000, // $190/year
					features: ["Up to 3 users", "Email support", "500MB storage"],
				},
				{
					name: "Business",
					description: "Full-featured plan for growing businesses",
					status: "active",
					pricing_model: "seat",
					monthlyPrice: 3900, // $39/month base
					yearlyPrice: 39000, // $390/year base
					per_seat_amount: 1000, // $10/seat/month
					features: [
						"Unlimited users",
						"Phone support",
						"5GB storage",
						"Integrations",
					],
				},
			],
		},
	],
};

/**
 * Subscription seed data per support staff organization
 * Key: support staff org slug
 */
const subscriptionsPerStaff: Record<string, SubscriptionSeedData[]> = {
	acme: [
		// Enterprise customer - sales-led, manual invoicing
		{
			tenantOrgSlug: "acme-corp",
			planName: "Enterprise",
			status: "active",
			billing_cycle: "yearly",
			seats: 50,
			hasInvoice: true,
			invoicePaid: true,
			collection_method: "send_invoice", // Sales team handles billing
		},
		// Professional customer - self-service, auto-charge
		{
			tenantOrgSlug: "techflow",
			planName: "Professional",
			status: "active",
			billing_cycle: "monthly",
			seats: 15,
			hasInvoice: true,
			invoicePaid: true,
			collection_method: "automatic", // Auto-charge via Stripe
		},
		// Starter customer - self-service, awaiting first payment
		{
			tenantOrgSlug: "startup-inc",
			planName: "Starter",
			status: "draft",
			billing_cycle: "monthly",
			seats: 1,
			hasInvoice: true,
			invoicePaid: false,
			collection_method: "automatic", // Will auto-charge once payment method added
		},
		// Enterprise customer - sales-led
		{
			tenantOrgSlug: "dataminds",
			planName: "Enterprise",
			status: "active",
			billing_cycle: "monthly",
			seats: 25,
			hasInvoice: true,
			invoicePaid: true,
			collection_method: "send_invoice", // Sales team handles billing
		},
		// Professional customer - sales-led, awaiting payment
		{
			tenantOrgSlug: "global-logistics",
			planName: "Professional",
			status: "draft",
			billing_cycle: "yearly",
			seats: 10,
			hasInvoice: true,
			invoicePaid: false,
			collection_method: "send_invoice", // Invoice sent, awaiting payment
		},
	],
	globex: [
		// Large enterprise - sales-led
		{
			tenantOrgSlug: "megacorp",
			planName: "Business",
			status: "active",
			billing_cycle: "yearly",
			seats: 100,
			hasInvoice: true,
			invoicePaid: true,
			collection_method: "send_invoice", // Sales team handles billing
		},
		// Small business - self-service
		{
			tenantOrgSlug: "smallbiz",
			planName: "Basic",
			status: "draft",
			billing_cycle: "monthly",
			seats: 1,
			hasInvoice: true,
			invoicePaid: false,
			collection_method: "automatic", // Self-service signup
		},
	],
};

const tenantOrgsPerStaff: Record<string, TenantOrgData[]> = {
	// Tenant customers for Acme Corporation support staff
	acme: [
		{
			name: "Acme Corp",
			slug: "acme-corp",
			description: "Large enterprise customer - SSO issues",
			industry: "Technology",
			subscription_plan: "enterprise",
			subscription_status: "active",
			website: "https://acme-corp.example.com",
			users: [
				{
					name: "John Doe",
					email: "john@acme.com",
					role: "owner",
					is_owner: true,
					status: "active",
				},
				{
					name: "Jane Smith",
					email: "jane@acme.com",
					role: "admin",
					status: "active",
				},
				{
					name: "Tom Wilson",
					email: "tom@acme.com",
					role: "user",
					status: "active",
				},
			],
		},
		{
			name: "TechFlow",
			slug: "techflow",
			description: "Mid-size tech company - Billing questions",
			industry: "Software",
			subscription_plan: "professional",
			subscription_status: "active",
			website: "https://techflow.io",
			users: [
				{
					name: "Sarah Miller",
					email: "sarah@techflow.io",
					role: "owner",
					is_owner: true,
					status: "active",
				},
				{
					name: "Mike Ross",
					email: "mike@techflow.io",
					role: "admin",
					status: "suspended",
				},
				{
					name: "Lisa Chen",
					email: "lisa@techflow.io",
					role: "user",
					status: "active",
				},
			],
		},
		{
			name: "StartUp Inc",
			slug: "startup-inc",
			description: "Small startup - General questions",
			industry: "Startup",
			subscription_plan: "starter",
			subscription_status: "trialing",
			website: "https://startup.io",
			users: [
				{
					name: "Mike Chen",
					email: "mike@startup.io",
					role: "owner",
					is_owner: true,
					status: "active",
				},
				{
					name: "Amy Lee",
					email: "amy@startup.io",
					role: "user",
					status: "active",
				},
			],
		},
		{
			name: "DataMinds",
			slug: "dataminds",
			description: "Data analytics company - API rate limits",
			industry: "Analytics",
			subscription_plan: "enterprise",
			subscription_status: "active",
			website: "https://dataminds.com",
			users: [
				{
					name: "Alex Johnson",
					email: "alex@dataminds.com",
					role: "owner",
					is_owner: true,
					status: "active",
				},
				{
					name: "Ryan Park",
					email: "ryan@dataminds.com",
					role: "admin",
					status: "active",
				},
				{
					name: "Emma Davis",
					email: "emma@dataminds.com",
					role: "user",
					status: "active",
				},
			],
		},
		{
			name: "Global Logistics",
			slug: "global-logistics",
			description: "International shipping company",
			industry: "Logistics",
			subscription_plan: "professional",
			subscription_status: "active",
			website: "https://logistics.global",
			users: [
				{
					name: "Emily Blunt",
					email: "emily@logistics.global",
					role: "owner",
					is_owner: true,
					status: "active",
				},
				{
					name: "James Bond",
					email: "james@logistics.global",
					role: "admin",
					status: "active",
				},
			],
		},
	],
	// Tenant customers for Globex Industries support staff
	globex: [
		{
			name: "MegaCorp International",
			slug: "megacorp",
			description: "Global corporation",
			industry: "Conglomerate",
			subscription_plan: "enterprise",
			subscription_status: "active",
			users: [
				{
					name: "Robert CEO",
					email: "robert@megacorp.com",
					role: "owner",
					is_owner: true,
					status: "active",
				},
				{
					name: "Susan CFO",
					email: "susan@megacorp.com",
					role: "admin",
					status: "active",
				},
			],
		},
		{
			name: "SmallBiz LLC",
			slug: "smallbiz",
			description: "Small business customer",
			industry: "Retail",
			subscription_plan: "starter",
			subscription_status: "active",
			users: [
				{
					name: "Pat Owner",
					email: "pat@smallbiz.com",
					role: "owner",
					is_owner: true,
					status: "active",
				},
			],
		},
	],
};

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Create or get a support staff organization
 */
async function ensureOrganization(
	db: Database,
	name: string,
	slug: string,
): Promise<string> {
	const existing = await db.query.organization.findFirst({
		where: eq(schema.organization.slug, slug),
	});

	if (existing) {
		logInfo(`Organization already exists: ${slug}`);
		return existing.id;
	}

	const id = generateId();
	await db.insert(schema.organization).values({
		id,
		name,
		slug,
		logo: null,
	});
	logSuccess(`Organization created: ${name} (${slug})`);
	return id;
}

/**
 * Create a support staff user WITH Better Auth account (can log in)
 */
async function ensureSupportStaffUser(
	db: Database,
	orgId: string,
	userData: SupportStaffOrg["users"][0],
): Promise<string> {
	const existing = await db.query.user.findFirst({
		where: eq(schema.user.email, userData.email),
	});

	let user_id: string;

	if (existing) {
		user_id = existing.id;
		logInfo(`Support user already exists: ${userData.email}`);

		// Update password if account exists
		const existingAccount = await db.query.account.findFirst({
			where: and(
				eq(schema.account.user_id, user_id),
				eq(schema.account.provider_id, "credential"),
			),
		});

		if (existingAccount) {
			const hashedPassword = await hashPassword("password123");
			await db
				.update(schema.account)
				.set({ password: hashedPassword })
				.where(eq(schema.account.id, existingAccount.id));
			logSuccess(`Password updated for: ${userData.email}`);
		}
	} else {
		user_id = generateId();
		const hashedPassword = await hashPassword("password123");

		// Create user record
		await db.insert(schema.user).values({
			id: user_id,
			name: userData.name,
			email: userData.email,
			email_verified: true,
		});

		// Create Better Auth account for login
		await db.insert(schema.account).values({
			id: generateId(),
			account_id: user_id,
			provider_id: "credential",
			user_id: user_id,
			password: hashedPassword,
		});

		logSuccess(
			`Support user created: ${userData.email} (${userData.role}) [CAN LOGIN]`,
		);
	}

	// Ensure membership exists
	await ensureMembership(db, orgId, user_id, userData.role);

	return user_id;
}

/**
 * Ensure a membership record exists
 */
async function ensureMembership(
	db: Database,
	orgId: string,
	user_id: string,
	role: string,
): Promise<void> {
	const existing = await db.query.member.findFirst({
		where: and(
			eq(schema.member.organization_id, orgId),
			eq(schema.member.user_id, user_id),
		),
	});

	if (!existing) {
		await db.insert(schema.member).values({
			organization_id: orgId,
			user_id: user_id,
			role: role,
		});
		logSuccess(`Membership created: ${role}`);
	}
}

/**
 * Create sample todos for an organization
 */
async function ensureSampleTodos(
	db: Database,
	orgId: string,
	orgName: string,
): Promise<void> {
	const existing = await db.query.todos.findFirst({
		where: eq(schema.todos.organization_id, orgId),
	});

	if (existing) {
		logInfo("Sample todos already exist");
		return;
	}

	const sampleTodos = [
		`Review Q4 reports for ${orgName}`,
		`Schedule team meeting`,
		`Update documentation`,
	];

	for (const title of sampleTodos) {
		await db.insert(schema.todos).values({
			title,
			organization_id: orgId,
		});
	}
	logSuccess(`Created ${sampleTodos.length} sample todos`);
}

/**
 * Create or get a tenant organization (customer company)
 */
async function ensureTenantOrganization(
	db: Database,
	staffOrgId: string,
	tenantData: TenantOrgData,
): Promise<string> {
	const existing = await db.query.tenantOrganization.findFirst({
		where: and(
			eq(schema.tenantOrganization.organization_id, staffOrgId),
			eq(schema.tenantOrganization.slug, tenantData.slug),
		),
	});

	if (existing) {
		logInfo(`Tenant org already exists: ${tenantData.slug}`);
		return existing.id;
	}

	const id = generateId();
	await db.insert(schema.tenantOrganization).values({
		id,
		organization_id: staffOrgId,
		name: tenantData.name,
		slug: tenantData.slug,
		industry: tenantData.industry,
		subscription_plan: tenantData.subscriptionPlan,
		subscription_status: tenantData.subscriptionStatus,
		website: tenantData.website,
		notes: tenantData.description,
	});
	logSuccess(`Tenant org created: ${tenantData.name} (${tenantData.slug})`);
	return id;
}

/**
 * Create a tenant user (customer - NO login)
 */
async function ensureTenantUser(
	db: Database,
	tenantOrgId: string,
	userData: TenantOrgData["users"][0],
): Promise<string> {
	const existing = await db.query.tenantUser.findFirst({
		where: and(
			eq(schema.tenantUser.tenant_organization_id, tenantOrgId),
			eq(schema.tenantUser.email, userData.email),
		),
	});

	if (existing) {
		logInfo(`Tenant user already exists: ${userData.email}`);
		return existing.id;
	}

	const id = generateId();
	await db.insert(schema.tenantUser).values({
		id,
		tenant_organization_id: tenantOrgId,
		name: userData.name,
		email: userData.email,
		phone: userData.phone,
		role: userData.role,
		is_owner: userData.isOwner ?? false,
		status: userData.status ?? "active",
	});
	logSuccess(
		`Tenant user created: ${userData.name} (${userData.email}) [NO LOGIN]`,
	);
	return id;
}

/**
 * Get the next ticket number for an organization
 */
async function getNextTicketNumber(
	db: Database,
	orgId: string,
): Promise<number> {
	const result = await db.query.ticket.findFirst({
		where: eq(schema.ticket.organization_id, orgId),
		orderBy: (ticket, { desc }) => [desc(ticket.ticket_number)],
	});
	return (result?.ticket_number ?? 9900) + 1;
}

/**
 * Create a ticket with messages and AI triage
 */
async function ensureTicket(
	db: Database,
	staffOrgId: string,
	ticketData: TicketSeedData,
	tenantUserMap: Map<
		string,
		{ id: string; name: string; tenantOrgName: string }
	>,
	supportStaffMap: Map<string, { id: string; name: string }>,
): Promise<void> {
	// Find the tenant user
	const tenantUserKey = `${ticketData.tenantOrgSlug}:${ticketData.tenantUserEmail}`;
	const tenantUser = tenantUserMap.get(tenantUserKey);

	if (!tenantUser) {
		console.error(`   ⚠ Tenant user not found: ${tenantUserKey}`);
		return;
	}

	// Check if ticket already exists (by title and tenant user)
	const existing = await db.query.ticket.findFirst({
		where: and(
			eq(schema.ticket.organization_id, staffOrgId),
			eq(schema.ticket.title, ticketData.title),
			eq(schema.ticket.tenant_user_id, tenantUser.id),
		),
	});

	if (existing) {
		logInfo(`Ticket already exists: ${ticketData.title}`);
		return;
	}

	const ticketId = generateId();
	const ticketNumber = await getNextTicketNumber(db, staffOrgId);

	// Calculate timestamps based on hoursAgo
	const now = new Date();
	const oldestMessageHours = Math.max(
		...ticketData.messages.map((m) => m.hoursAgo),
	);
	const createdAt = new Date(
		now.getTime() - oldestMessageHours * 60 * 60 * 1000,
	);

	// Create the ticket
	await db.insert(schema.ticket).values({
		id: ticketId,
		organization_id: staffOrgId,
		ticket_number: ticketNumber,
		tenant_user_id: tenantUser.id,
		title: ticketData.title,
		status: ticketData.status,
		priority: ticketData.priority,
		assigned_to_ai: ticketData.hasAI ?? false,
		channel: "web",
		created_at: createdAt,
		updated_at: now,
		resolved_at: ticketData.status === "closed" ? now : null,
	});

	// Create messages
	for (const msg of ticketData.messages) {
		const messageId = generateId();
		const messageTime = new Date(now.getTime() - msg.hoursAgo * 60 * 60 * 1000);

		let authorName = "";
		let authorTenantUserId: string | null = null;
		let authorUserId: string | null = null;

		if (msg.type === "customer") {
			authorName = tenantUser.name;
			authorTenantUserId = tenantUser.id;
		} else if (msg.type === "agent" && msg.authorEmail) {
			const agent = supportStaffMap.get(msg.authorEmail);
			if (agent) {
				authorName = agent.name;
				authorUserId = agent.id;
			} else {
				authorName = "Support Agent";
			}
		} else if (msg.type === "ai") {
			authorName = "AI Assistant";
		} else if (msg.type === "system") {
			authorName = "System";
		}

		await db.insert(schema.ticketMessage).values({
			id: messageId,
			ticket_id: ticketId,
			message_type: msg.type,
			author_tenant_user_id: authorTenantUserId,
			author_user_id: authorUserId,
			author_name: authorName,
			content: msg.content,
			is_internal: msg.isInternal ?? false,
			created_at: messageTime,
			updated_at: messageTime,
		});
	}

	// Create AI triage if present
	if (ticketData.aiTriage) {
		await db.insert(schema.ticketAiTriage).values({
			id: generateId(),
			ticket_id: ticketId,
			category: ticketData.aiTriage.category,
			sentiment: ticketData.aiTriage.sentiment,
			urgency_score: ticketData.aiTriage.urgencyScore,
			suggested_action: ticketData.aiTriage.suggestedAction,
			suggested_playbook: ticketData.aiTriage.suggestedPlaybook,
			confidence: 85,
		});
	}

	logSuccess(
		`Ticket #${ticketNumber}: ${ticketData.title} (${ticketData.status})`,
	);
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.substring(0, 100);
}

/**
 * Create a knowledge article
 */
async function ensureKnowledgeArticle(
	db: Database,
	staffOrgId: string,
	articleData: KnowledgeArticleSeedData,
	createdByUserId: string,
): Promise<void> {
	const slug = generateSlug(articleData.title);

	// Check if article already exists
	const existing = await db.query.knowledgeArticle.findFirst({
		where: and(
			eq(schema.knowledgeArticle.organization_id, staffOrgId),
			eq(schema.knowledgeArticle.slug, slug),
		),
	});

	if (existing) {
		logInfo(`Knowledge article already exists: ${articleData.title}`);
		return;
	}

	const id = generateId();
	const now = new Date();

	await db.insert(schema.knowledgeArticle).values({
		id,
		organization_id: staffOrgId,
		title: articleData.title,
		content: articleData.content,
		slug,
		category: articleData.category,
		tags: JSON.stringify(articleData.tags),
		status: articleData.status,
		views: Math.floor(Math.random() * 1000), // Random view count for demo
		published_at: articleData.status === "published" ? now : null,
		created_by_user_id: createdByUserId,
		updated_by_user_id: createdByUserId,
		created_at: now,
		updated_at: now,
	});

	logSuccess(
		`Knowledge article created: ${articleData.title} (${articleData.status})`,
	);
}

/**
 * Create a playbook
 */
async function ensurePlaybook(
	db: Database,
	staffOrgId: string,
	playbookData: PlaybookSeedData,
	createdByUserId: string,
): Promise<void> {
	// Check if playbook already exists
	const existing = await db.query.playbook.findFirst({
		where: and(
			eq(schema.playbook.organization_id, staffOrgId),
			eq(schema.playbook.name, playbookData.name),
		),
	});

	if (existing) {
		logInfo(`Playbook already exists: ${playbookData.name}`);
		return;
	}

	const id = generateId();
	const now = new Date();

	await db.insert(schema.playbook).values({
		id,
		organization_id: staffOrgId,
		name: playbookData.name,
		description: playbookData.description,
		type: playbookData.type,
		category: playbookData.category,
		tags: JSON.stringify(playbookData.tags),
		status: playbookData.status,
		steps: playbookData.steps ? JSON.stringify(playbookData.steps) : null,
		triggers: playbookData.triggers
			? JSON.stringify(playbookData.triggers)
			: null,
		actions: playbookData.actions ? JSON.stringify(playbookData.actions) : null,
		created_by_user_id: createdByUserId,
		updated_by_user_id: createdByUserId,
		created_at: now,
		updated_at: now,
	});

	const typeLabel = playbookData.type === "manual" ? "📋" : "⚡";
	logSuccess(
		`Playbook created: ${typeLabel} ${playbookData.name} (${playbookData.status})`,
	);
}

/**
 * Create a pipeline with its stages
 */
async function ensurePipeline(
	db: Database,
	tenantOrgId: string,
	pipelineData: PipelineSeedData,
): Promise<{ pipeline_id: string; stageMap: Map<string, string> }> {
	// Check if pipeline already exists
	const existing = await db.query.pipeline.findFirst({
		where: and(
			eq(schema.pipeline.tenant_organization_id, tenantOrgId),
			eq(schema.pipeline.name, pipelineData.name),
		),
	});

	const stageMap = new Map<string, string>();

	if (existing) {
		logInfo(`Pipeline already exists: ${pipelineData.name}`);
		// Get existing stages
		const existingStages = await db.query.pipelineStage.findMany({
			where: eq(schema.pipelineStage.pipeline_id, existing.id),
		});
		for (const stage of existingStages) {
			stageMap.set(stage.name, stage.id);
		}
		return { pipeline_id: existing.id, stageMap };
	}

	const pipelineId = generateId();
	const now = new Date();

	await db.insert(schema.pipeline).values({
		id: pipelineId,
		tenant_organization_id: tenantOrgId,
		name: pipelineData.name,
		description: pipelineData.description,
		is_default: pipelineData.isDefault,
		created_at: now,
		updated_at: now,
	});

	// Create stages
	for (const stage of pipelineData.stages) {
		const stageId = generateId();
		await db.insert(schema.pipelineStage).values({
			id: stageId,
			pipeline_id: pipelineId,
			name: stage.name,
			order: stage.order,
			color: stage.color,
			created_at: now,
			updated_at: now,
		});
		stageMap.set(stage.name, stageId);
	}

	logSuccess(
		`Pipeline created: ${pipelineData.name} with ${pipelineData.stages.length} stages`,
	);
	return { pipeline_id: pipelineId, stageMap };
}

/**
 * Create a product (productFamily) entity
 */
async function ensureProduct(
	db: Database,
	staffOrgId: string,
	productData: ProductSeedData,
): Promise<string> {
	// Check if product already exists
	const existing = await db.query.productFamily.findFirst({
		where: and(
			eq(schema.productFamily.organization_id, staffOrgId),
			eq(schema.productFamily.name, productData.name),
		),
	});

	if (existing) {
		logInfo(`Product already exists: ${productData.name}`);
		return existing.id;
	}

	const productId = generateId();
	const now = new Date();

	// Create the product
	await db.insert(schema.productFamily).values({
		id: productId,
		organization_id: staffOrgId,
		name: productData.name,
		description: productData.description,
		status: productData.status,
		created_at: now,
		updated_at: now,
	});

	logSuccess(`Product created: ${productData.name}`);
	return productId;
}

/**
 * Create a product plan with pricing and features
 */
async function ensureProductPlan(
	db: Database,
	staffOrgId: string,
	productId: string,
	planData: ProductPlanSeedData,
): Promise<string> {
	// Check if plan already exists
	const existing = await db.query.productPlan.findFirst({
		where: and(
			eq(schema.productPlan.organization_id, staffOrgId),
			eq(schema.productPlan.name, planData.name),
		),
	});

	const planId = existing ? existing.id : generateId();
	const now = new Date();

	if (existing) {
		logInfo(`Product plan already exists: ${planData.name}`);

		// Update productFamilyId if it's null (for plans created before products)
		if (!existing.productFamilyId) {
			await db
				.update(schema.productPlan)
				.set({ product_family_id: productId, updated_at: now })
				.where(eq(schema.productPlan.id, planId));
		}
	} else {
		// Create the plan linked to the product
		await db.insert(schema.productPlan).values({
			id: planId,
			organization_id: staffOrgId,
			product_family_id: productId,
			name: planData.name,
			description: planData.description,
			status: planData.status,
			pricing_model: planData.pricingModel,
			created_at: now,
			updated_at: now,
		});
	}

	// Check if pricing already exists using direct query
	const existingPricing = await db
		.select()
		.from(schema.productPricing)
		.where(eq(schema.productPricing.product_plan_id, planId));

	const hasMonthlyPricing = existingPricing.some(
		(p) => p.interval === "monthly" && p.pricingType === "base",
	);
	const hasYearlyPricing = existingPricing.some(
		(p) => p.interval === "yearly" && p.pricingType === "base",
	);

	// Create monthly pricing if it doesn't exist
	if (!hasMonthlyPricing) {
		await db.insert(schema.productPricing).values({
			id: generateId(),
			product_plan_id: planId,
			pricingType: "base",
			currency: "USD",
			amount: planData.monthlyPrice,
			interval: "monthly",
			per_seat_amount: planData.perSeatAmount || null,
			created_at: now,
			updated_at: now,
		});
		logInfo(`Created monthly pricing for plan: ${planData.name}`);
	}

	// Create yearly pricing if it doesn't exist
	if (!hasYearlyPricing) {
		await db.insert(schema.productPricing).values({
			id: generateId(),
			product_plan_id: planId,
			pricingType: "base",
			currency: "USD",
			amount: planData.yearlyPrice,
			interval: "yearly",
			per_seat_amount: planData.perSeatAmount
				? planData.perSeatAmount * 10
				: null, // 10 months worth for yearly
			created_at: now,
			updated_at: now,
		});
		logInfo(`Created yearly pricing for plan: ${planData.name}`);
	}

	// Check if features exist using direct query
	const existingFeatures = await db
		.select()
		.from(schema.productFeature)
		.where(eq(schema.productFeature.product_plan_id, planId));

	// Create features if they don't exist
	if (existingFeatures.length === 0) {
		for (let i = 0; i < planData.features.length; i++) {
			await db.insert(schema.productFeature).values({
				id: generateId(),
				product_plan_id: planId,
				name: planData.features[i],
				order: i + 1,
				created_at: now,
				updated_at: now,
			});
		}
	}

	if (!existing) {
		logSuccess(
			`Product plan created: ${planData.name} ($${planData.monthlyPrice / 100}/mo)`,
		);
	}
	return planId;
}

/**
 * Create a subscription with invoice
 */
async function ensureSubscription(
	db: Database,
	staffOrgId: string,
	staffOrgSlug: string,
	subData: SubscriptionSeedData,
	tenantOrgIds: Record<string, { id: string; staffOrgId: string }>,
	planMap: Map<
		string,
		{
			id: string;
			name: string;
			monthlyPrice: number;
			yearlyPrice: number;
			perSeatAmount?: number;
		}
	>,
): Promise<void> {
	const tenantOrgInfo = tenantOrgIds[subData.tenantOrgSlug];
	if (!tenantOrgInfo) {
		console.error(`   ⚠ Tenant org not found: ${subData.tenantOrgSlug}`);
		return;
	}

	const planInfo = planMap.get(subData.planName);
	if (!planInfo) {
		console.error(`   ⚠ Product plan not found: ${subData.planName}`);
		return;
	}

	// Check if subscription already exists
	const existing = await db.query.subscription.findFirst({
		where: and(
			eq(schema.subscription.organization_id, staffOrgId),
			eq(schema.subscription.tenant_organization_id, tenantOrgInfo.id),
		),
	});

	if (existing) {
		logInfo(`Subscription already exists for: ${subData.tenantOrgSlug}`);
		return;
	}

	const subscriptionId = generateId();
	const now = new Date();

	// Calculate MRR
	let mrr =
		subData.billingCycle === "yearly"
			? Math.round(planInfo.yearlyPrice / 12)
			: planInfo.monthlyPrice;

	// Add seat pricing if applicable
	if (planInfo.perSeatAmount && subData.seats > 1) {
		mrr += planInfo.perSeatAmount * (subData.seats - 1);
	}

	// Generate subscription number
	const existingCount = await db
		.select({ count: schema.subscription.id })
		.from(schema.subscription)
		.where(eq(schema.subscription.organization_id, staffOrgId));

	const subNumber = `SUB-${(existingCount.length || 0) + 1000}`;

	// Calculate billing period
	const periodStart = new Date(now);
	const periodEnd = new Date(now);
	if (subData.billingCycle === "yearly") {
		periodEnd.setFullYear(periodEnd.getFullYear() + 1);
	} else {
		periodEnd.setMonth(periodEnd.getMonth() + 1);
	}

	// Create subscription
	await db.insert(schema.subscription).values({
		id: subscriptionId,
		organization_id: staffOrgId,
		tenant_organization_id: tenantOrgInfo.id,
		subscription_number: subNumber,
		product_plan_id: planInfo.id,
		status: subData.status,
		collection_method: subData.collectionMethod,
		billing_cycle: subData.billingCycle,
		current_period_start: periodStart,
		current_period_end: periodEnd,
		mrr,
		seats: subData.seats,
		created_at: now,
		updated_at: now,
	});

	// Create subscription activity
	await db.insert(schema.subscriptionActivity).values({
		id: generateId(),
		subscription_id: subscriptionId,
		activity_type: "created",
		description: `Subscription ${subNumber} created for ${subData.tenantOrgSlug}`,
		metadata: JSON.stringify({
			plan: planInfo.name,
			mrr,
			seats: subData.seats,
			collection_method: subData.collectionMethod,
		}),
		created_at: now,
	});

	// Update tenant organization
	await db
		.update(schema.tenantOrganization)
		.set({
			subscription_plan: planInfo.name,
			subscription_status: subData.status,
			updated_at: now,
		})
		.where(eq(schema.tenantOrganization.id, tenantOrgInfo.id));

	// Create invoice if needed
	if (subData.hasInvoice) {
		const invoiceId = generateId();

		// Generate invoice number
		const invoiceCount = await db
			.select({ count: schema.invoice.id })
			.from(schema.invoice)
			.where(eq(schema.invoice.organization_id, staffOrgId));

		const invoiceNumber = `INV-${staffOrgSlug.toUpperCase()}-${(invoiceCount.length || 0) + 1001}`;

		// Calculate invoice amounts
		const invoiceTotal =
			subData.billingCycle === "yearly"
				? planInfo.yearlyPrice
				: planInfo.monthlyPrice;
		const seatTotal = planInfo.perSeatAmount
			? planInfo.perSeatAmount *
				(subData.seats - 1) *
				(subData.billingCycle === "yearly" ? 10 : 1)
			: 0;
		const subtotal = invoiceTotal + seatTotal;
		const tax = 0;
		const total = subtotal + tax;

		// Create line items
		const lineItems = [
			{
				description: `${planInfo.name} - ${subData.billingCycle === "yearly" ? "Annual" : "Monthly"} subscription`,
				quantity: 1,
				unitPrice: invoiceTotal,
				total: invoiceTotal,
			},
		];

		if (seatTotal > 0 && planInfo.perSeatAmount) {
			lineItems.push({
				description: `Additional seats (${subData.seats - 1} seats)`,
				quantity: subData.seats - 1,
				unitPrice:
					planInfo.perSeatAmount * (subData.billingCycle === "yearly" ? 10 : 1),
				total: seatTotal,
			});
		}

		// Calculate dates
		const issueDate = new Date(now);
		const dueDate = new Date(now);
		dueDate.setDate(dueDate.getDate() + 30);
		const paidAt = subData.invoicePaid ? new Date(now) : null;

		// Create invoice
		await db.insert(schema.invoice).values({
			id: invoiceId,
			organization_id: staffOrgId,
			subscription_id: subscriptionId,
			tenant_organization_id: tenantOrgInfo.id,
			invoice_number: invoiceNumber,
			status: subData.invoicePaid ? "paid" : "draft",
			subtotal,
			tax,
			total,
			currency: "USD",
			issue_date: issueDate,
			due_date: dueDate,
			paid_at: paidAt,
			line_items: JSON.stringify(lineItems),
			pdf_path: null, // PDF will be generated on demand
			billing_name: subData.tenantOrgSlug,
			created_at: now,
			updated_at: now,
		});

		// Create invoice activity
		await db.insert(schema.subscriptionActivity).values({
			id: generateId(),
			subscription_id: subscriptionId,
			activity_type: subData.invoicePaid ? "invoice_paid" : "invoice_created",
			description: subData.invoicePaid
				? `Invoice ${invoiceNumber} paid - $${(total / 100).toFixed(2)}`
				: `Invoice ${invoiceNumber} created for $${(total / 100).toFixed(2)}`,
			metadata: JSON.stringify({ invoiceId, invoiceNumber, total }),
			created_at: now,
		});

		if (subData.invoicePaid) {
			// Create activation activity
			await db.insert(schema.subscriptionActivity).values({
				id: generateId(),
				subscription_id: subscriptionId,
				activity_type: "activated",
				description: `Subscription ${subNumber} activated`,
				metadata: JSON.stringify({ plan: planInfo.name }),
				created_at: now,
			});
		}
	}

	const statusIcon = subData.status === "active" ? "✓" : "○";
	const collectionLabel =
		subData.collectionMethod === "automatic" ? "⚡auto" : "📧invoice";
	logSuccess(
		`${statusIcon} Subscription: ${subData.tenantOrgSlug} → ${planInfo.name} (${subData.status}, ${collectionLabel})`,
	);
}

/**
 * Create a deal
 */
async function ensureDeal(
	db: Database,
	staffOrgId: string,
	tenantOrgId: string,
	pipeline_id: string,
	stageMap: Map<string, string>,
	dealData: DealSeedData,
	supportStaffMap: Map<string, { id: string; name: string }>,
): Promise<void> {
	// Check if deal already exists
	const existing = await db.query.deal.findFirst({
		where: and(
			eq(schema.deal.organization_id, staffOrgId),
			eq(schema.deal.name, dealData.name),
		),
	});

	if (existing) {
		logInfo(`Deal already exists: ${dealData.name}`);
		return;
	}

	const stageId = stageMap.get(dealData.stageName);
	if (!stageId) {
		console.error(`   ⚠ Stage not found: ${dealData.stageName}`);
		return;
	}

	const dealId = generateId();
	const now = new Date();

	// Get assigned user ID if provided
	let assigned_to_user_id: string | null = null;
	if (dealData.assignedToEmail) {
		const assignedUser = supportStaffMap.get(dealData.assignedToEmail);
		if (assignedUser) {
			assigned_to_user_id = assignedUser.id;
		}
	}

	await db.insert(schema.deal).values({
		id: dealId,
		organization_id: staffOrgId,
		tenant_organization_id: tenantOrgId,
		pipeline_id,
		stage_id: stageId,
		name: dealData.name,
		value: dealData.value,
		assigned_to_user_id,
		assigned_to_ai: false,
		badges: dealData.badges ? JSON.stringify(dealData.badges) : null,
		notes: dealData.notes,
		created_at: now,
		updated_at: now,
	});

	// Create initial activity
	await db.insert(schema.dealActivity).values({
		id: generateId(),
		deal_id: dealId,
		activity_type: "deal_created",
		description: `Deal created: ${dealData.name}`,
		user_id: assigned_to_user_id,
		metadata: JSON.stringify({
			value: dealData.value,
			stage: dealData.stageName,
		}),
		created_at: now,
	});

	const formattedValue = `$${(dealData.value / 100).toLocaleString()}`;
	logSuccess(
		`Deal created: ${dealData.name} (${formattedValue}, ${dealData.stageName})`,
	);
}

// ============================================================================
// Main Seed Function
// ============================================================================

async function seed(): Promise<void> {
	validateEnv();

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL environment variable is required");
	}
	const pool = new Pool({
		connectionString: databaseUrl,
	});
	const db = drizzle(pool, { schema });

	console.log("🌱 Starting database seed...");
	console.log("═".repeat(60));

	try {
		// Store org IDs for later use
		const staffOrgIds: Record<string, string> = {};
		// Store tenant org IDs (slug -> { id, staffOrgId })
		const tenantOrgIds: Record<string, { id: string; staffOrgId: string }> = {};
		// Map support staff emails to their IDs and names
		const supportStaffMap = new Map<string, { id: string; name: string }>();
		// Map tenant user keys (orgSlug:email) to their IDs and info
		const tenantUserMap = new Map<
			string,
			{ id: string; name: string; tenantOrgName: string }
		>();

		// ========================================================================
		// Seed Support Staff Organizations (with login)
		// ========================================================================
		console.log("\n📋 SUPPORT STAFF ORGANIZATIONS (can log in)");
		console.log("─".repeat(60));

		for (const org of supportStaffOrgs) {
			logSection(`${org.name} (${org.slug})`);
			console.log(`   ${org.description}`);

			const orgId = await ensureOrganization(db, org.name, org.slug);
			staffOrgIds[org.slug] = orgId;

		for (const user of org.users) {
			const userId = await ensureSupportStaffUser(db, orgId, user);
			supportStaffMap.set(user.email, { id: userId, name: user.name });
		}

			await ensureSampleTodos(db, orgId, org.name);
		}

		// ========================================================================
		// Seed Tenant Customer Organizations (no login)
		// ========================================================================
		console.log("\n\n📋 TENANT CUSTOMER ORGANIZATIONS (cannot log in)");
		console.log("─".repeat(60));

		for (const staffOrgSlug of Object.keys(tenantOrgsPerStaff)) {
			const staffOrgId = staffOrgIds[staffOrgSlug];
			if (!staffOrgId) {
				console.error(`   ⚠ Staff org not found: ${staffOrgSlug}`);
				continue;
			}

			console.log(`\n   For support staff: ${staffOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

			for (const tenantOrg of tenantOrgsPerStaff[staffOrgSlug]) {
				logSection(`${tenantOrg.name} (${tenantOrg.slug})`);
				console.log(`   ${tenantOrg.description}`);

				const tenantOrgId = await ensureTenantOrganization(
					db,
					staffOrgId,
					tenantOrg,
				);
				tenantOrgIds[tenantOrg.slug] = { id: tenantOrgId, staffOrgId };

			for (const user of tenantOrg.users) {
				const userId = await ensureTenantUser(db, tenantOrgId, user);
				tenantUserMap.set(`${tenantOrg.slug}:${user.email}`, {
					id: userId,
					name: user.name,
					tenantOrgName: tenantOrg.name,
				});
			}
			}
		}

		// ========================================================================
		// Seed Support Tickets
		// ========================================================================
		console.log("\n\n📋 SUPPORT TICKETS");
		console.log("─".repeat(60));

		for (const staffOrgSlug of Object.keys(ticketsPerStaff)) {
			const staffOrgId = staffOrgIds[staffOrgSlug];
			if (!staffOrgId) {
				console.error(`   ⚠ Staff org not found for tickets: ${staffOrgSlug}`);
				continue;
			}

			console.log(`\n   For support staff: ${staffOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

			for (const ticketData of ticketsPerStaff[staffOrgSlug]) {
				await ensureTicket(
					db,
					staffOrgId,
					ticketData,
					tenantUserMap,
					supportStaffMap,
				);
			}
		}

		// ========================================================================
		// Seed Knowledge Articles
		// ========================================================================
		console.log("\n\n📋 KNOWLEDGE ARTICLES");
		console.log("─".repeat(60));

		for (const staffOrgSlug of Object.keys(knowledgeArticlesPerStaff)) {
			const staffOrgId = staffOrgIds[staffOrgSlug];
			if (!staffOrgId) {
				console.error(`   ⚠ Staff org not found for articles: ${staffOrgSlug}`);
				continue;
			}

			// Get first user of the org for createdBy
			const orgUsers =
				supportStaffOrgs.find((o) => o.slug === staffOrgSlug)?.users || [];
			const firstUserEmail = orgUsers[0]?.email;
			const creatorInfo = firstUserEmail
				? supportStaffMap.get(firstUserEmail)
				: null;
			const creatorId = creatorInfo?.id || "";

			console.log(`\n   For support staff: ${staffOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

			for (const article of knowledgeArticlesPerStaff[staffOrgSlug]) {
				await ensureKnowledgeArticle(db, staffOrgId, article, creatorId);
			}
		}

		// ========================================================================
		// Seed Playbooks
		// ========================================================================
		console.log("\n\n📋 PLAYBOOKS");
		console.log("─".repeat(60));

		for (const staffOrgSlug of Object.keys(playbooksPerStaff)) {
			const staffOrgId = staffOrgIds[staffOrgSlug];
			if (!staffOrgId) {
				console.error(
					`   ⚠ Staff org not found for playbooks: ${staffOrgSlug}`,
				);
				continue;
			}

			// Get first user of the org for createdBy
			const orgUsers =
				supportStaffOrgs.find((o) => o.slug === staffOrgSlug)?.users || [];
			const firstUserEmail = orgUsers[0]?.email;
			const creatorInfo = firstUserEmail
				? supportStaffMap.get(firstUserEmail)
				: null;
			const creatorId = creatorInfo?.id || "";

			console.log(`\n   For support staff: ${staffOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

			for (const playbookItem of playbooksPerStaff[staffOrgSlug]) {
				await ensurePlaybook(db, staffOrgId, playbookItem, creatorId);
			}
		}

		// ========================================================================
		// Seed Products and Plans
		// ========================================================================
		console.log("\n\n📦 PRODUCTS & PLANS");
		console.log("─".repeat(60));

		// Store plan info for subscriptions
		const planMaps: Record<
			string,
			Map<
				string,
				{
					id: string;
					name: string;
					monthlyPrice: number;
					yearlyPrice: number;
					perSeatAmount?: number;
				}
			>
		> = {};

		for (const staffOrgSlug of Object.keys(productsPerStaff)) {
			const staffOrgId = staffOrgIds[staffOrgSlug];
			if (!staffOrgId) {
				console.error(`   ⚠ Staff org not found for products: ${staffOrgSlug}`);
				continue;
			}

			console.log(`\n   For support staff: ${staffOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

			planMaps[staffOrgSlug] = new Map();

			for (const productData of productsPerStaff[staffOrgSlug]) {
				// Create the product first
				const productId = await ensureProduct(db, staffOrgId, productData);

				// Then create plans for this product
				for (const planData of productData.plans) {
					const planId = await ensureProductPlan(
						db,
						staffOrgId,
						productId,
						planData,
					);
					planMaps[staffOrgSlug].set(planData.name, {
						id: planId,
						name: planData.name,
						monthlyPrice: planData.monthlyPrice,
						yearlyPrice: planData.yearlyPrice,
						per_seat_amount: planData.perSeatAmount,
					});
				}
			}
		}

		// ========================================================================
		// Seed Subscriptions and Invoices
		// ========================================================================
		console.log("\n\n📋 SUBSCRIPTIONS & INVOICES");
		console.log("─".repeat(60));

		for (const staffOrgSlug of Object.keys(subscriptionsPerStaff)) {
			const staffOrgId = staffOrgIds[staffOrgSlug];
			if (!staffOrgId) {
				console.error(
					`   ⚠ Staff org not found for subscriptions: ${staffOrgSlug}`,
				);
				continue;
			}

			const planMap = planMaps[staffOrgSlug];
			if (!planMap) {
				console.error(`   ⚠ Plan map not found for: ${staffOrgSlug}`);
				continue;
			}

			console.log(`\n   For support staff: ${staffOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

			for (const subData of subscriptionsPerStaff[staffOrgSlug]) {
				await ensureSubscription(
					db,
					staffOrgId,
					staffOrgSlug,
					subData,
					tenantOrgIds,
					planMap,
				);
			}
		}

		// ========================================================================
		// Seed Sales Pipelines and Deals
		// ========================================================================
		console.log("\n\n📋 SALES PIPELINES & DEALS");
		console.log("─".repeat(60));

		for (const tenantOrgSlug of Object.keys(pipelinesPerTenantOrg)) {
			const tenantOrgInfo = tenantOrgIds[tenantOrgSlug];
			if (!tenantOrgInfo) {
				console.error(
					`   ⚠ Tenant org not found for pipelines: ${tenantOrgSlug}`,
				);
				continue;
			}

			console.log(`\n   For tenant org: ${tenantOrgSlug}`);
			console.log(`   ${"─".repeat(40)}`);

		for (const pipelineData of pipelinesPerTenantOrg[tenantOrgSlug]) {
			const { pipeline_id, stageMap } = await ensurePipeline(
				db,
				tenantOrgInfo.id,
				pipelineData,
			);

			// Seed deals for this pipeline
			const deals = dealsPerTenantOrg[tenantOrgSlug] || [];
			for (const dealData of deals) {
				await ensureDeal(
					db,
					tenantOrgInfo.staffOrgId,
					tenantOrgInfo.id,
					pipeline_id,
					stageMap,
					dealData,
					supportStaffMap,
				);
			}
		}
		}

		// ========================================================================
		// Summary
		// ========================================================================
		console.log(`\n\n${"═".repeat(60)}`);
		console.log("✅ Seed completed successfully!");
		console.log("═".repeat(60));

		console.log("\n📋 SUPPORT STAFF CREDENTIALS (password: password123)");
		console.log("─".repeat(60));
		for (const org of supportStaffOrgs) {
			console.log(`\n🏢 ${org.name} (/${org.slug}/app/support)`);
			for (const user of org.users) {
				console.log(`   • ${user.email} (${user.role})`);
			}
		}

		console.log("\n\n📋 TENANT CUSTOMER ORGANIZATIONS (for ticket testing)");
		console.log("─".repeat(60));
		for (const staffOrgSlug of Object.keys(tenantOrgsPerStaff)) {
			console.log(`\n   Support Staff: ${staffOrgSlug}`);
			for (const org of tenantOrgsPerStaff[staffOrgSlug]) {
				console.log(`   🏢 ${org.name}`);
				console.log(`      Users: ${org.users.map((u) => u.name).join(", ")}`);
			}
		}

		console.log("\n\n📋 SAMPLE TICKETS");
		console.log("─".repeat(60));
		for (const staffOrgSlug of Object.keys(ticketsPerStaff)) {
			console.log(`\n   Support Staff: ${staffOrgSlug}`);
			for (const ticket of ticketsPerStaff[staffOrgSlug]) {
				const statusIcon =
					ticket.status === "closed"
						? "✓"
						: ticket.status === "open"
							? "○"
							: "◐";
				console.log(
					`   ${statusIcon} ${ticket.title} (${ticket.priority}, ${ticket.status})`,
				);
			}
		}

		console.log("\n\n📋 KNOWLEDGE ARTICLES");
		console.log("─".repeat(60));
		for (const staffOrgSlug of Object.keys(knowledgeArticlesPerStaff)) {
			console.log(`\n   Support Staff: ${staffOrgSlug}`);
			for (const article of knowledgeArticlesPerStaff[staffOrgSlug]) {
				const statusIcon = article.status === "published" ? "✓" : "○";
				console.log(
					`   ${statusIcon} ${article.title} (${article.category}, ${article.status})`,
				);
			}
		}

		console.log("\n\n📋 PLAYBOOKS");
		console.log("─".repeat(60));
		for (const staffOrgSlug of Object.keys(playbooksPerStaff)) {
			console.log(`\n   Support Staff: ${staffOrgSlug}`);
			for (const playbookItem of playbooksPerStaff[staffOrgSlug]) {
				const typeIcon = playbookItem.type === "manual" ? "📋" : "⚡";
				console.log(
					`   ${typeIcon} ${playbookItem.name} (${playbookItem.type}, ${playbookItem.status})`,
				);
			}
		}

		console.log("\n\n📦 PRODUCTS & PLANS");
		console.log("─".repeat(60));
		for (const staffOrgSlug of Object.keys(productsPerStaff)) {
			console.log(`\n   Support Staff: ${staffOrgSlug}`);
			for (const product of productsPerStaff[staffOrgSlug]) {
				console.log(`   📦 ${product.name} (${product.status})`);
				for (const plan of product.plans) {
					console.log(
						`      └─ ${plan.name} - $${plan.monthlyPrice / 100}/mo (${plan.pricingModel})`,
					);
				}
			}
		}

		console.log("\n\n📋 SUBSCRIPTIONS & INVOICES");
		console.log("─".repeat(60));
		for (const staffOrgSlug of Object.keys(subscriptionsPerStaff)) {
			console.log(`\n   Support Staff: ${staffOrgSlug}`);
			for (const sub of subscriptionsPerStaff[staffOrgSlug]) {
				const statusIcon = sub.status === "active" ? "✓" : "○";
				const invoiceStatus = sub.invoicePaid ? "paid" : "draft";
				const collectionIcon =
					sub.collectionMethod === "automatic" ? "⚡" : "📧";
				const collectionLabel =
					sub.collectionMethod === "automatic" ? "auto-charge" : "invoice";
				console.log(
					`   ${statusIcon} ${sub.tenantOrgSlug} → ${sub.planName} (${sub.status}, ${collectionIcon} ${collectionLabel}, invoice: ${invoiceStatus})`,
				);
			}
		}

		console.log("\n\n📋 SALES PIPELINES & DEALS");
		console.log("─".repeat(60));
		for (const tenantOrgSlug of Object.keys(pipelinesPerTenantOrg)) {
			console.log(`\n   Tenant Org: ${tenantOrgSlug}`);
			for (const pipelineData of pipelinesPerTenantOrg[tenantOrgSlug]) {
				console.log(`   🔀 ${pipelineData.name}`);
				console.log(
					`      Stages: ${pipelineData.stages.map((s) => s.name).join(" → ")}`,
				);
				const deals = dealsPerTenantOrg[tenantOrgSlug] || [];
				for (const deal of deals) {
					const formattedValue = `$${(deal.value / 100).toLocaleString()}`;
					console.log(
						`      💰 ${deal.name} (${formattedValue}, ${deal.stageName})`,
					);
				}
			}
		}

		console.log("\n");
	} catch (error) {
		console.error("\n❌ Seed failed:", error);
		throw error;
	} finally {
		await pool.end();
	}
}

// Run the seed
seed();
