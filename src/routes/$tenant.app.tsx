import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'

type AuthState = 'checking' | 'not-authenticated' | 'not-member' | 'authenticated'

async function checkTenantMembership(tenantSlug: string): Promise<{ isMember: boolean; role?: string; error?: string }> {
  try {
    const response = await fetch(`/api/tenant/${tenantSlug}/membership`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      return { isMember: data.isMember, role: data.role }
    }
    
    if (response.status === 403) {
      return { isMember: false, error: 'You are not a member of this organization' }
    }
    
    if (response.status === 401) {
      return { isMember: false, error: 'Not authenticated' }
    }
    
    return { isMember: false, error: 'Failed to check membership' }
  } catch {
    return { isMember: false, error: 'Failed to check membership' }
  }
}

export const Route = createFileRoute('/$tenant/app')({
  component: AppLayout,
})

function AppLayout() {
  const { tenant: tenantSlug } = useParams({ from: '/$tenant/app' })
  const [authState, setAuthState] = useState<AuthState>('checking')
  
  // Check if we're on the login page - skip auth check for login route
  const isLoginPage = typeof window !== 'undefined' && window.location.pathname?.endsWith('/app/login')

  useEffect(() => {
    // Skip auth check on login page
    if (isLoginPage) {
      setAuthState('authenticated') // Allow rendering the login page
      return
    }

    // Check authentication and membership with retry logic
    const checkAuth = async (retryCount = 0) => {
      try {
        // Use Better Auth client to get session
        const session = await authClient.getSession()
        
        if (session?.data?.session) {
          // User is authenticated, now check membership
          const membershipResult = await checkTenantMembership(tenantSlug)
          
          if (membershipResult.isMember) {
            setAuthState('authenticated')
            return
          } else {
            setAuthState('not-member')
            return
          }
        }

        // If no session and we haven't retried yet, wait and retry (for race conditions after login)
        if (retryCount < 5) {
          const delay = retryCount === 0 ? 500 : 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          return checkAuth(retryCount + 1)
        }

        setAuthState('not-authenticated')
      } catch (error) {
        console.error('Auth check failed:', error)
        // Retry on error too
        if (retryCount < 5) {
          const delay = retryCount === 0 ? 500 : 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          return checkAuth(retryCount + 1)
        }
        setAuthState('not-authenticated')
      }
    }

    checkAuth()
  }, [tenantSlug, isLoginPage])

  useEffect(() => {
    // Don't redirect if on login page
    if (isLoginPage) return
    
    // Redirect if not authenticated or not a member
    if (authState === 'not-authenticated' || authState === 'not-member') {
      const currentPath = window.location.pathname
      const returnTo = encodeURIComponent(currentPath)
      const errorParam = authState === 'not-member' ? '&error=not-member' : ''
      window.location.href = `/${tenantSlug}/app/login?returnTo=${returnTo}${errorParam}`
    }
  }, [authState, tenantSlug, isLoginPage])

  // Show loading while checking (but not on login page)
  if (authState === 'checking' && !isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Checking authentication...</div>
      </div>
    )
  }

  // If not authenticated or not a member, show redirect message (but not on login page)
  if ((authState === 'not-authenticated' || authState === 'not-member') && !isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Redirecting to sign in...</div>
      </div>
    )
  }

  // If authenticated and is a member (or on login page), render the outlet
  return <Outlet />
}
