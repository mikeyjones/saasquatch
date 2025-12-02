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

#### Manual Playbooks

Agents (human or AI) can run step-by-step guided flows:

- [ ] Account troubleshooting steps
- [ ] Migration flows
- [ ] Password reset guides
- [ ] Subscription-change procedures

#### Automated Playbooks

Trigger-based macros/workflows:

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

#### Features

- [ ] Categories + articles
- [ ] WYSIWYG editor
- [ ] Version control
- [ ] Drafts, scheduled publishing
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
    └── tenant_organization (customer companies)
            └── tenant_user (customer contacts - NO login)
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

