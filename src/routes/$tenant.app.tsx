import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/$tenant/app')({
  component: AppLayout,
})

function AppLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check authentication by calling Better Auth API directly (no imports of server code)
    const checkAuth = async () => {
      try {
        // Call the Better Auth session endpoint
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsAuthenticated(!!data?.session)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    // Redirect if not authenticated (after session check completes)
    if (!isChecking && !isAuthenticated) {
      const currentPath = window.location.pathname
      const returnTo = encodeURIComponent(currentPath)
      window.location.href = `/auth/sign-in?returnTo=${returnTo}`
    }
  }, [isAuthenticated, isChecking])

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Checking authentication...</div>
      </div>
    )
  }

  // If not authenticated, show redirect message (redirect is happening)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Redirecting to sign in...</div>
      </div>
    )
  }

  // If authenticated, render the outlet
  return <Outlet />
}
