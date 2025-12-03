# 🧩 SaaSquatch — Customer Support Area

## Product Specification (v1)

**Departments:** Switchable (Support-specific UI)

**Users:** Human agents + AI Agents (treated as employees)

---

## 1. Overview

The Customer Support Area provides SaaS companies with a unified place to manage members, organizations, tickets, refunds, and account data. It supports human agents and AI agents that can autonomously triage, respond, escalate, and resolve support work.

---

## 2. Core Modules

### 2.1 Membership Management

Manage members, organizations, and account access.

#### Key Features

**User Search & Overview Page**

- [ ] View profile, subscription, org, billing history, usage data.

**User Management Actions**

- [ ] Update email/password
- [ ] Reset MFA
- [ ] Adjust roles/permissions
- [ ] Disable/enable user accounts
- [ ] Create users manually

**Organization Management**

- [ ] Add/remove users from org
- [ ] Update org details
- [ ] Change subscription owner

**Security & Audit**

- [ ] Login attempt history
- [ ] Password reset history
- [ ] "Log in as user" (impersonation)
- [ ] Full audit logs per member and org

---

### 2.2 Billing & Refund Tools (Support permissions allowed)

Support agents can perform select billing actions.

#### Capabilities

- [ ] Full or partial refunds
- [ ] Apply credits
- [ ] Adjust next invoice
- [ ] Change plan or subscription parameters
- [ ] View invoice history + download PDF
- [ ] Annotate billing actions with internal comments
- [ ] Permission-based guardrails (high-risk actions require supervisor approval)

---

### 2.3 Support Tickets

Centralized ticket management for email + help center submissions.

#### Ticket Creation

- [x] Create ticket form (TanStack Form with Zod validation)
- [x] Customer search/selection from members
- [x] Priority selection (Low, Normal, High, Urgent)
- [x] Initial message input
- [x] Dialog-based UI accessible from header

#### Ticket Channels

- [ ] Email → ticket inbox
- [ ] Help center forms
- [ ] Internal notes
- [ ] AI/automation messages logged as system comments

#### Ticket UI

- [x] Status (Open, Pending, Waiting on Customer, Escalated, Closed)
- [x] Priority (Low, Normal, High, Urgent)
- [ ] SLA countdown
- [ ] Contact info + billing snapshot + subscription status
- [ ] AI-suggested responses
- [ ] Playbook suggestions (based on detected issue type)

#### Agent & AI Collaboration

- [ ] Assign to human agent or AI agent
- [ ] AI triage (categorize, prioritize, tag, summarize)
- [ ] AI draft replies → agent review or auto-send depending on rules
- [ ] AI handles repetitive tickets automatically based on rules/playbooks

---

### 2.4 Playbooks (Manual + Automated)

Playbooks combine repeatable workflows (manual) and automation sequences (automatic).

#### Database Implementation

- [x] Playbook table with organization scoping
- [x] Support for manual and automated playbook types
- [x] JSON storage for steps, triggers, and actions
- [x] Category and tags for organization
- [x] Status workflow (draft, active, inactive)
- [x] Authorship tracking (createdBy, updatedBy)

#### Manual Playbooks

Agents (human or AI) can run step-by-step guided flows:

- [x] Playbook steps stored as JSON array
- [ ] Account troubleshooting steps
- [ ] Migration flows
- [ ] Password reset guides
- [ ] Subscription-change procedures

#### Automated Playbooks

Trigger-based macros/workflows:

- [x] Trigger conditions stored as JSON
- [x] Actions stored as JSON configuration
- [ ] Auto-tag new tickets
- [ ] Auto-reply with knowledge base article suggestions
- [ ] Auto-assign based on topic
- [ ] Auto-escalate refunds or billing errors
- [ ] Trigger a webhook or update CRM/Analytics fields

---

### 2.5 Dashboards (High-level)

Quick insights for support performance.

#### Dashboard Widgets

- [ ] Ticket volumes
- [ ] Average first response time
- [ ] Resolution time
- [ ] Customer satisfaction (CSAT)
- [ ] AI-resolved vs human-resolved tickets
- [ ] Top issue categories
- [ ] Active account incidents (billing failures, login issues)

---

### 2.6 Knowledge Base / Help Center

Self-service support + article management.

#### Database Implementation

- [x] Knowledge article table with organization scoping
- [x] Title, content (markdown/HTML), and slug fields
- [x] Category and tags for organization
- [x] Status workflow (draft, published, archived)
- [x] View count tracking
- [x] Publishing timestamp
- [x] Authorship tracking (createdBy, updatedBy)
- [x] Server-side fuzzy search using PostgreSQL pg_trgm

#### Features

- [x] Categories + articles (database and API)
- [x] Fuzzy search across title, content, category, tags
- [x] Drafts and published status
- [ ] WYSIWYG editor
- [ ] Version control
- [ ] Scheduled publishing
- [ ] AI rewrite, summarize, or generate starting drafts
- [ ] AI suggests articles inside the ticket UI
- [ ] Public help center hosting (SaaSquatch-powered)

---

## 3. AI Agent Capabilities in Support

### Autonomous Actions

- [ ] Own entire ticket lifecycle
- [ ] Draft and send email replies
- [ ] Run playbooks
- [ ] Perform refunds (if permissioned)
- [ ] Escalate to humans when beyond threshold
- [ ] Suggest account recovery steps
- [ ] Detect user frustration or churn signals in messages

### Agent Controls

- [ ] Assign work to agents (same UI as assigning to humans)
- [ ] View agent queues
- [ ] Agent performance metrics (SLAs, resolution rates)

---

## 4. Permissions Structure

Support-specific permission groups:

- [ ] **Tier 1 Support:** Basic ticket handling, view accounts
- [ ] **Tier 2 Support:** Billing modifications, refunds, subscription adjustments
- [ ] **Support Admin:** Full access, impersonation, KB publishing, access to playbooks and automation rules
- [ ] **AI Agents:** Custom permission bundles mirroring human roles

---

## 5. System Integrations

- [ ] **Email integration:** Parsing, threading, auto-replies
- [ ] **Knowledge base integration:** Suggested articles + SEO frontend
- [ ] **CRM integration:** Notes, usage data, subscription info from Sales area
- [ ] **Audit logs:** Shared across SaaSquatch departments
- [ ] **Billing engine:** Refunds, credits, and invoices from Billing area

---

## 6. Development & Testing

### 6.1 Data Model Architecture

The system uses a **multi-tenant architecture** with clear separation between platform users and tenant customers.

#### Platform Tables (Better Auth)

These tables store users who **CAN log in** to the platform:

| Table | Purpose |
|-------|---------|
| `user` | Platform user accounts (support staff, admins) |
| `account` | Better Auth credentials and OAuth providers |
| `session` | Active user sessions |
| `organization` | Support staff organizations (tenants of the platform) |
| `member` | Links users to organizations with roles |
| `invitation` | Pending organization invitations |

#### Tenant Data Tables

These tables store customer data that **CANNOT log in** - they are managed by support staff:

| Table | Purpose |
|-------|---------|
| `tenant_organization` | Customer companies being supported |
| `tenant_user` | Individual customers within those companies |

#### Knowledge Base Tables

These tables store help articles and playbooks:

| Table | Purpose |
|-------|---------|
| `knowledge_article` | Help center articles with content, categories, and view tracking |
| `playbook` | Manual guides and automated workflows for support agents |

**Knowledge Article Fields:**
- `organizationId` - Scoped to support staff organization
- `title`, `content`, `slug` - Article content
- `category`, `tags` - Categorization (JSON array for tags)
- `status` - draft, published, archived
- `views` - View count tracking
- `publishedAt` - When article was first published
- `createdByUserId`, `updatedByUserId` - Authorship tracking

**Playbook Fields:**
- `organizationId` - Scoped to support staff organization
- `name`, `description` - Playbook info
- `type` - manual or automated
- `steps` - JSON array of step objects for manual playbooks
- `triggers`, `actions` - JSON config for automated playbooks
- `category`, `tags` - Categorization
- `status` - draft, active, inactive

**Key Design Decisions:**

1. **Scoped to Support Staff Org:** Tenant organizations belong to a support staff organization via `organizationId` foreign key
2. **No Login Accounts:** Tenant users have no `account` records - they're customer records, not platform users
3. **Extended Fields:** Tenant tables include business-specific fields (subscription, billing, industry, etc.)

#### Entity Relationship

```
organization (support staff)
    ├── member ← user (can log in)
    │       └── account (Better Auth)
    │
    ├── tenant_organization (customer companies)
    │       └── tenant_user (customer contacts - NO login)
    │
    ├── knowledge_article (help center content)
    │       └── createdBy/updatedBy → user
    │
    └── playbook (manual guides + automations)
            └── createdBy/updatedBy → user
```

### 6.2 Database Seeding

The database seed script (`src/db/seed.ts`) creates test data for development and testing.

**Run with:** `bun run db:seed`

#### Two Types of Seeded Data

1. **Support Staff Organizations** - Users who CAN log in
   - These are employees/agents who use the support platform
   - Have Better Auth accounts with password authentication
   - Stored in: `organization`, `user`, `member`, `account` tables
   - All passwords: `password123`

2. **Tenant Customer Organizations** - Users who CANNOT log in
   - These are customers that support staff help via tickets
   - Stored in: `tenant_organization`, `tenant_user` tables
   - Used for ticket creation and customer management

#### Support Staff Test Credentials

| Organization | URL | Email | Role |
|--------------|-----|-------|------|
| Acme Corporation | `/acme/app/support` | alice@acme.test | owner |
| Acme Corporation | `/acme/app/support` | bob@acme.test | admin |
| Acme Corporation | `/acme/app/support` | carol@acme.test | member |
| Globex Industries | `/globex/app/support` | charlie@globex.test | owner |
| Globex Industries | `/globex/app/support` | diana@globex.test | member |

**Password for all:** `password123`

#### Tenant Customer Organizations (for Acme support staff)

| Organization | Industry | Subscription | Sample Users |
|--------------|----------|--------------|--------------|
| Acme Corp | Technology | Enterprise | John Doe, Jane Smith, Tom Wilson |
| TechFlow | Software | Professional | Sarah Miller, Mike Ross, Lisa Chen |
| StartUp Inc | Startup | Starter (trial) | Mike Chen, Amy Lee |
| DataMinds | Analytics | Enterprise | Alex Johnson, Ryan Park, Emma Davis |
| Global Logistics | Logistics | Professional | Emily Blunt, James Bond |

#### Tenant Customer Organizations (for Globex support staff)

| Organization | Industry | Subscription | Sample Users |
|--------------|----------|--------------|--------------|
| MegaCorp International | Conglomerate | Enterprise | Robert CEO, Susan CFO |
| SmallBiz LLC | Retail | Starter | Pat Owner |

#### Seed Script Features

- [x] Idempotent operations (safe to run multiple times)
- [x] Environment variable validation
- [x] Clear logging with status indicators
- [x] Separate tables for platform users vs tenant customers
- [x] Automatic membership creation
- [x] Sample todos for support staff organizations
- [x] Sample knowledge articles (5 for Acme, 2 for Globex)
- [x] Sample playbooks (5 for Acme, 2 for Globex)

#### Sample Knowledge Articles (Acme)

| Title | Category | Status |
|-------|----------|--------|
| Setting up Okta SSO | AUTHENTICATION | Published |
| Understanding Your Invoice | BILLING | Published |
| API Rate Limits Explained | DEVELOPER | Draft |
| Managing Team Members | AUTHENTICATION | Published |
| Webhook Configuration Guide | DEVELOPER | Published |

#### Sample Playbooks (Acme)

| Name | Type | Status |
|------|------|--------|
| SSO Troubleshooting Guide | Manual | Active |
| New Admin Onboarding | Manual | Active |
| Billing Issue Resolution | Manual | Active |
| Auto-Tag New Tickets | Automated | Active |
| Auto-Reply with KB Suggestions | Automated | Draft |

### 6.3 API Endpoints

#### Tenant Users API

**Endpoint:** `GET /api/tenant/:tenant/users`

Fetches tenant users (customers) scoped to the current support staff organization.

**Query Parameters:**
- `search` (optional): Filter by name, email, or organization

**Response:**
```json
{
  "users": [
    {
      "id": "abc123",
      "name": "John Doe",
      "email": "john@acme.com",
      "initials": "JD",
      "organization": "Acme Corp",
      "role": "Admin",
      "isOwner": true,
      "status": "Active",
      "lastLogin": "2h ago"
    }
  ]
}
```

#### Knowledge Search API

**Endpoint:** `GET /api/tenant/:tenant/knowledge/search`

Fuzzy search across knowledge articles and playbooks using PostgreSQL pg_trgm extension.

**Query Parameters:**
- `q` (required): Search query string
- `type` (optional): `article`, `playbook`, or `all` (default: `all`)
- `status` (optional): Filter by status
- `category` (optional): Filter by category
- `limit` (optional): Max results (default: 20, max: 100)

**Response:**
```json
{
  "results": [
    {
      "id": "art_123",
      "type": "article",
      "title": "Setting up Okta SSO",
      "description": "This guide walks you through...",
      "category": "AUTHENTICATION",
      "status": "published",
      "tags": ["sso", "okta", "saml"],
      "score": 0.85,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "query": "okta sso",
  "total": 1
}
```

**Note:** Requires PostgreSQL `pg_trgm` extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

#### Knowledge Articles API

**Endpoint:** `GET /api/tenant/:tenant/knowledge/articles`

List all knowledge articles with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (draft, published, archived)
- `category` (optional): Filter by category

**Endpoint:** `POST /api/tenant/:tenant/knowledge/articles`

Create a new knowledge article.

**Request Body:**
```json
{
  "title": "Article Title",
  "content": "Markdown content...",
  "category": "AUTHENTICATION",
  "tags": ["tag1", "tag2"],
  "status": "draft"
}
```

**Endpoint:** `PUT /api/tenant/:tenant/knowledge/articles`

Update an existing article.

**Request Body:**
```json
{
  "id": "art_123",
  "title": "Updated Title",
  "status": "published"
}
```

**Endpoint:** `DELETE /api/tenant/:tenant/knowledge/articles?id=art_123`

Delete a knowledge article.

#### Playbooks API

**Endpoint:** `GET /api/tenant/:tenant/knowledge/playbooks`

List all playbooks with optional filtering.

**Query Parameters:**
- `type` (optional): Filter by type (manual, automated)
- `status` (optional): Filter by status (draft, active, inactive)
- `category` (optional): Filter by category

**Endpoint:** `POST /api/tenant/:tenant/knowledge/playbooks`

Create a new playbook.

**Request Body (Manual Playbook):**
```json
{
  "name": "SSO Troubleshooting Guide",
  "description": "Step-by-step SSO diagnosis",
  "type": "manual",
  "category": "AUTHENTICATION",
  "tags": ["sso", "troubleshooting"],
  "status": "active",
  "steps": [
    {
      "order": 1,
      "title": "Verify Configuration",
      "description": "Check SSO settings...",
      "action": "Navigate to settings"
    }
  ]
}
```

**Request Body (Automated Playbook):**
```json
{
  "name": "Auto-Tag New Tickets",
  "description": "Automatically tag tickets based on content",
  "type": "automated",
  "category": "AUTOMATION",
  "status": "active",
  "triggers": [
    { "type": "event", "condition": "ticket.created" }
  ],
  "actions": [
    { "type": "add_tags", "config": { "rules": [...] } }
  ]
}
```

**Endpoint:** `PUT /api/tenant/:tenant/knowledge/playbooks`

Update an existing playbook (include `id` in body).

**Endpoint:** `DELETE /api/tenant/:tenant/knowledge/playbooks?id=pb_123`

Delete a playbook.

