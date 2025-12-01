export interface Member {
  id: string
  name: string
  email: string
  initials: string
  organization: string
  role: 'Admin' | 'User' | 'Viewer'
  isOwner?: boolean
  status: 'Active' | 'Suspended'
  lastLogin: string
}

export const members: Member[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@acme.com',
    initials: 'JD',
    organization: 'Acme Corp',
    role: 'Admin',
    isOwner: true,
    status: 'Active',
    lastLogin: '2h ago',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@acme.com',
    initials: 'JS',
    organization: 'Acme Corp',
    role: 'User',
    status: 'Active',
    lastLogin: '1d ago',
  },
  {
    id: '3',
    name: 'Mike Ross',
    email: 'mike@techflow.io',
    initials: 'MR',
    organization: 'TechFlow',
    role: 'Admin',
    isOwner: true,
    status: 'Suspended',
    lastLogin: '5d ago',
  },
  {
    id: '4',
    name: 'Emily Blunt',
    email: 'emily@logistics.global',
    initials: 'EB',
    organization: 'Global Logistics',
    role: 'Viewer',
    status: 'Active',
    lastLogin: '30m ago',
  },
]

