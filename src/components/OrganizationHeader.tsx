import { Building2, Globe, Mail, Edit, UserPlus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Customer {
  id: string
  name: string
  slug: string
  logo: string | null
  industry: string | null
  website: string | null
  billingEmail: string | null
  subscriptionStatus: string | null
  tags: string[]
}

interface Subscription {
  id: string
  subscriptionNumber: string
  planName: string
  status: string
  billingCycle: string
  mrr: number
}

interface OrganizationHeaderProps {
  customer: Customer
  subscription: Subscription | null
}

export function OrganizationHeader({ customer, subscription }: OrganizationHeaderProps) {
  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800'

    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trialing':
        return 'bg-blue-100 text-blue-800'
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      case 'paused':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {customer.logo ? (
              <img
                src={customer.logo}
                alt={customer.name}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Organization Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              {customer.subscriptionStatus && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.subscriptionStatus)}`}>
                  {customer.subscriptionStatus}
                </span>
              )}
            </div>

            {/* Quick Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {customer.industry && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.industry}
                </span>
              )}
              {customer.website && (
                <a
                  href={customer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {new URL(customer.website).hostname}
                </a>
              )}
              {customer.billingEmail && (
                <a
                  href={`mailto:${customer.billingEmail}`}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {customer.billingEmail}
                </a>
              )}
            </div>

            {/* Tags */}
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Subscription Info */}
            {subscription && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plan: </span>
                    <span className="font-medium">{subscription.planName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MRR: </span>
                    <span className="font-medium">${(subscription.mrr / 100).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Billing: </span>
                    <span className="font-medium capitalize">{subscription.billingCycle}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>
    </div>
  )
}
