import { Store } from '@tanstack/store'

export interface Ticket {
  id: string
  title: string
  company: string
  ticketNumber: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  status: 'open' | 'closed' | 'pending'
  timeAgo: string
  preview: string
  hasAI?: boolean
  customer: {
    name: string
    company: string
    initials: string
  }
  messages: Array<{
    type: 'customer' | 'agent' | 'ai'
    author: string
    timestamp: string
    content: string
  }>
  aiTriage?: {
    category: string
    sentiment: string
    suggestedAction: string
    playbook: string
    playbookLink: string
  }
}

export interface CreateTicketInput {
  title: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  message: string
  customer: {
    name: string
    company: string
    initials: string
  }
}

const initialTickets: Ticket[] = [
  {
    id: '1',
    title: 'Login Failure on SSO',
    company: 'Acme Corp',
    ticketNumber: '#9942',
    priority: 'urgent',
    status: 'open',
    timeAgo: '2h ago',
    preview: 'Customer reported an issue with login via SSO on the stagin...',
    customer: {
      name: 'John Doe',
      company: 'Acme Corp',
      initials: 'JD',
    },
    messages: [
      {
        type: 'customer',
        author: 'John Doe',
        timestamp: '2h ago',
        content: `Hi Team,

We are unable to login using our Okta SSO integration on the staging environment. It was working yesterday. Getting a 500 error.

This is blocking our UAT testing. Please help ASAP.`,
      },
    ],
    aiTriage: {
      category: 'Authentication / SSO',
      sentiment: 'Negative (Urgency Detected)',
      suggestedAction: "Check Error Logs for 'Okta Connection Timeout'.",
      playbook: 'SSO Troubleshooting Guide',
      playbookLink: '#',
    },
  },
  {
    id: '2',
    title: 'Billing question for Nov invoice',
    company: 'TechFlow',
    ticketNumber: '#9941',
    priority: 'normal',
    status: 'open',
    timeAgo: '4h ago',
    preview: 'Customer reported an issue with login via SSO on the stagin...',
    customer: {
      name: 'Sarah Miller',
      company: 'TechFlow',
      initials: 'SM',
    },
    messages: [
      {
        type: 'customer',
        author: 'Sarah Miller',
        timestamp: '4h ago',
        content: `Hello,

I have a question about our November invoice. There seems to be a discrepancy in the number of users billed vs our actual usage.

Can someone review this?`,
      },
    ],
  },
  {
    id: '3',
    title: 'How to add new users?',
    company: 'StartUp Inc',
    ticketNumber: '#9938',
    priority: 'low',
    status: 'open',
    timeAgo: '1d ago',
    preview: 'Customer reported an issue with login via SSO on the stagin...',
    hasAI: true,
    customer: {
      name: 'Mike Chen',
      company: 'StartUp Inc',
      initials: 'MC',
    },
    messages: [
      {
        type: 'customer',
        author: 'Mike Chen',
        timestamp: '1d ago',
        content: `Hi there,

I'm a new admin and trying to figure out how to add new users to our account. Can you point me to the right documentation?

Thanks!`,
      },
    ],
  },
  {
    id: '4',
    title: 'API Rate Limit increase request',
    company: 'DataMinds',
    ticketNumber: '#9920',
    priority: 'high',
    status: 'open',
    timeAgo: '2d ago',
    preview: 'Customer reported an issue with login via SSO on the stagin...',
    customer: {
      name: 'Alex Johnson',
      company: 'DataMinds',
      initials: 'AJ',
    },
    messages: [
      {
        type: 'customer',
        author: 'Alex Johnson',
        timestamp: '2d ago',
        content: `Hello Support,

We're hitting our API rate limits frequently now that we've scaled up our integration. We'd like to request an increase to our current limits.

Our current plan is Enterprise and we're willing to discuss pricing for higher limits.`,
      },
    ],
  },
]

// Create a store for tickets
export const ticketsStore = new Store<Ticket[]>(initialTickets)

// Helper to get current tickets (for backwards compatibility)
export const tickets = initialTickets

// Track the next ticket number
let nextTicketNumber = 9943

// Function to add a new ticket
export function addTicket(input: CreateTicketInput): Ticket {
  const newTicket: Ticket = {
    id: String(Date.now()),
    title: input.title,
    company: input.customer.company,
    ticketNumber: `#${nextTicketNumber++}`,
    priority: input.priority,
    status: 'open',
    timeAgo: 'Just now',
    preview: input.message.slice(0, 60) + (input.message.length > 60 ? '...' : ''),
    customer: input.customer,
    messages: [
      {
        type: 'customer',
        author: input.customer.name,
        timestamp: 'Just now',
        content: input.message,
      },
    ],
  }

  ticketsStore.setState((prev) => [newTicket, ...prev])

  return newTicket
}

export const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'my-tickets', label: 'My Tickets' },
  { id: 'urgent', label: 'Urgent' },
]
