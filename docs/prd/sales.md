# 📘 SaaSquatch — Sales Department

## Product Requirements Document (v1)

**Departments:** Switchable (Sales-specific UI)

**Users:** Sales Reps, Sales Managers, Billing/Finance Specialists, Customer Support Agents, AI Agents (treated as employees)

---

## 1. Overview

SaaSquatch Sales Department provides SaaS companies with the full toolset required to manage leads, deals, trials, quotes, and subscriptions — tightly integrated with billing, customer support, and AI agents who behave like employees.

The Sales Department must support:

- Multi-pipeline CRM
- Trial management
- Subscription visibility and creation
- Manual invoicing
- Product catalog
- Quoting and proposal workflows
- Email automation
- AI-assisted insights and task execution
- Deep integration with other departments (Support, Billing, CRM)

---

## 2. Goals

- Equip sales teams with everything needed to convert leads and manage revenue.
- Reduce manual work through "AI employees" who handle follow-up, analysis, and deal updates.
- Provide a single source of truth for leads, trials, subscriptions, and revenue.
- Enable scalable outbound and inbound sales motions.
- Support complex SaaS pricing: seat-based, usage-based, custom enterprise deals.

---

## 3. Personas

### Sales Rep
Needs leads, pipeline visibility, tasks, quotes, easy subscription creation, and automated follow-ups.

### Sales Manager
Needs dashboards, forecasts, performance reports, coaching opportunities.

### Billing/Finance Specialist
Needs manual invoicing, pricing overrides, credits, and financial accuracy.

### Customer Support Agent
Needs visibility into historical deals, subscription changes, and upgrades.

### AI Agents (unique to SaaSquatch)
Function like employees who can:
- Draft emails
- Move deals
- Create quotes
- Summarize accounts
- Predict risk & opportunity
- Execute assigned tasks

---

## 4. Key Features Described in Detail

### 4.1 Department Switching

**Feature Description**

Users with multiple roles (Sales, Support, Billing) can switch departments via a persistent selector.

**Functional Requirements**

- [ ] Department switcher shows only permitted departments.
- [ ] Switching updates navigation, dashboards, and actions.
- [ ] AI agents available per department.
- [ ] Role-based access enforced.

---

### 4.2 Organizations & Memberships

**Feature Description**

Each organisation is a unified view of a customer with users, subscriptions, deals, and interactions.

**Functional Requirements**

**Organisation profile with:**
- [ ] Basic info
- [ ] Contacts
- [ ] Subscriptions
- [ ] Historical invoices
- [ ] Usage metrics
- [ ] Health score (AI-driven)
- [ ] Open deals
- [ ] Notes & tasks

- [ ] Multi-user memberships with roles.
- [ ] Quick actions: create deal, quote, task, subscription.

---

### 4.3 Subscriptions Management

**Feature Description**

View and manage all customer subscriptions.

**Functional Requirements**

**Subscription constraints:**
- [x] Each company can only have one active subscription at a time
- [x] Each subscription can only have one product plan
- [x] System prevents duplicate active subscriptions (returns 409 Conflict)
- [x] Canceled subscriptions can be replaced with new subscriptions

**Subscription creation:**
- [x] Create subscription from CRM customer view
- [x] Create subscription from subscriptions page
- [x] Select company from dropdown (with active subscription indicator)
- [x] Select product plan from active plans
- [x] Choose billing cycle (monthly/yearly)
- [x] Set seat count
- [x] Add optional notes

**Create/edit subscriptions:**
- [x] Choose plan, billing cycle, payment method
- [ ] Add seats, add-ons
- [ ] Apply discounts
- [ ] Switch plans with proration
- [ ] Pause/cancel/reactivate

**Customer subscription display:**
- [x] Show subscription details in customer profile (plan name, status, billing cycle, seats, MRR, renewal date)
- [x] Show "Create Subscription" action for customers without active subscription
- [x] Hide "Create Subscription" action for customers with active subscription

**Usage-based billing:**
- [ ] Meter definitions
- [ ] Usage history display
- [ ] Overage charge calculation

- [ ] Activity audit trail
- [ ] Link subscription to deals (auto or manual)

---

### 4.4 Trial Management

**Feature Description**

Manage customer trials from lead to conversion.

**Functional Requirements**

- [ ] Create/modify trials
- [ ] Extend trial duration
- [ ] Trial health score (AI predicts conversion likelihood)
- [ ] Trial ending alerts
- [ ] Auto link trial → deal stage
- [ ] Convert trial → subscription with 1 click

**AI suggestions:**
- [ ] "Extend trial for orgs showing X usage"
- [ ] "Push upgrade offer"

---

### 4.5 Product Catalog

**Feature Description**

Central system to define plans, pricing, and add-ons.

**Functional Requirements**

- [ ] Multiple product families

**Plans with:**
- [ ] Monthly/yearly pricing
- [ ] Seat-based pricing
- [ ] Usage-based pricing

**Add-ons:**
- [ ] Flat pricing
- [ ] Seat-based pricing
- [ ] Usage-based pricing

**Coupons:**
- [ ] Percentage discounts
- [ ] Fixed amount discounts
- [ ] Free month offers
- [ ] Trial extension offers

- [ ] Feature flags per plan
- [ ] Pricing preview for internal teams

---

### 4.6 Manual Invoicing

**Feature Description**

Allows sales and finance to issue one-time or custom invoices.

**Functional Requirements**

**Create invoice with:**
- [ ] Line items
- [ ] Quantities
- [ ] Rates
- [ ] Discounts
- [ ] Add usage charges for a date range
- [ ] Apply credits
- [ ] Save as draft / send via email
- [ ] Generate PDF and public link
- [ ] Manual or automatic payment logging

**Invoice status workflow:**
- [ ] Draft → Sent → Paid → Overdue

---

### 4.7 Sales CRM (Multi-Pipeline)

**Feature Description**

Deal and pipeline management for complex sales cycles.

**Functional Requirements**

- [ ] Unlimited pipelines (SMB, Enterprise, Partners)
- [ ] Custom stages per pipeline

**Deal card:**
- [ ] Name
- [ ] Value
- [ ] Contacts
- [ ] Linked organization
- [ ] Linked subscription or trial
- [ ] Next task
- [ ] Custom fields

- [ ] Kanban board with drag-and-drop
- [ ] Deal activity timeline
- [ ] Deal scoring: manual + AI predicted score

**Automated movements:**
- [ ] Trial start → Evaluation
- [ ] Trial end → Conversion
- [ ] Upgrade → Won

---

### 4.8 Email Automation (Sales Sequences)

**Feature Description**

Automated outbound and follow-up sequences.

**Functional Requirements**

**Create sequences with:**
- [ ] Email steps
- [ ] Task steps
- [ ] AI-agent steps
- [ ] Personalization tokens (name, usage stats, trial end date)
- [ ] Sequence analytics

**Assign sequences to:**
- [ ] Leads
- [ ] Organizations
- [ ] Deals

**AI generates:**
- [ ] Full sequence drafts
- [ ] Subject line variants
- [ ] Personalized message based on usage

---

### 4.9 Quotations & Proposals

**Feature Description**

Sales reps can generate quotes and customers can accept them online.

**Functional Requirements**

**Quote builder:**
- [ ] Add plans, add-ons, discounts
- [ ] Custom pricing fields
- [ ] Terms & conditions section
- [ ] Quote version history

**Public quote page:**
- [ ] Branded
- [ ] Summary + line items
- [ ] Accept/decline
- [ ] Optional signature capture

**Acceptance flows:**
- [ ] Trigger deal updates
- [ ] Convert to subscription

---

### 4.10 Sales Dashboard

**Feature Description**

Provides high-level sales analytics and forecasts.

**Functional Requirements**

**KPIs:**
- [ ] MRR/ARR growth
- [ ] Pipeline value (per pipeline)
- [ ] Conversion rates
- [ ] Sales cycle length
- [ ] Active trials / trial conversions
- [ ] Renewals forecast

**AI Insights:**
- [ ] Upsell opportunities
- [ ] Churn likelihood
- [ ] Deal momentum score
- [ ] Revenue anomalies

- [ ] Custom date ranges
- [ ] Export functionality

---

### 4.11 AI Agents as Sales Employees

**Feature Description**

AI agents can be assigned tasks and operate autonomously.

**Functional Requirements**

- [ ] Agents appear in team roster
- [ ] Agents can be assigned tasks such as:
  - [ ] Draft outreach email
  - [ ] Create quote
  - [ ] Analyze usage
  - [ ] Move deals
  - [ ] Generate renewal recommendations

**Agents have:**
- [ ] Workload view
- [ ] Activity timeline
- [ ] Performance metrics

**Clear labeling:**
- [ ] "Completed by Agent Apollo"

**AI insights panel:**
- [ ] Risk scores
- [ ] Upsell recommendations
- [ ] Suggested actions

---

## 5. Non-Functional Requirements

### Performance
- [ ] Pipelines load in under 1.5 seconds.
- [ ] Quote builder operations under 0.3 seconds per interaction.

### Security
- [ ] Role-based access
- [ ] GDPR compliant
- [ ] Logging of all agent and user activity

### Reliability
- [ ] Autosave drafts (quotes, invoices, deals)
- [ ] 99.95% uptime target

### Scalability
- [ ] Support for orgs with 10k+ users
- [ ] Handle large datasets for usage-based billing

---

## 6. Success Metrics

- [ ] Increase trial-to-paid conversion by X%
- [ ] Reduce manual rep tasks by Y%
- [ ] Agent completion rate vs human completion
- [ ] Pipeline velocity improvements
- [ ] Reduction in time-to-create a quote
- [ ] Reduction in overdue renewals

---

## 7. Dependencies

- [ ] Billing Department APIs
- [ ] Support Department ticket integration
- [ ] Notifications system
- [ ] AI model integration
- [ ] Authentication & roles system

---

## 8. Risks

- Incorrect proration or billing logic could create financial discrepancies.
- AI agents must be clearly understood as non-human to avoid confusion.
- Multiple pipelines increase UI complexity if not well designed.
- Usage-based billing requires reliable meter ingestion.


