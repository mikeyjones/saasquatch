import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/$tenant/app')({
  component: AppLayout,
})

function AppLayout() {
  const { data: session, isPending } = useSession()

  useEffect(() => {
    // Redirect if not authenticated (after session check completes)
    if (!isPending) {
      if (!session?.session) {
        const currentPath = window.location.pathname
        const returnTo = encodeURIComponent(currentPath)
        window.location.href = `/auth/sign-in?returnTo=${returnTo}`
      }
    }
  }, [session, isPending])

  // Show loading while checking
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Checking authentication...</div>
      </div>
    )
  }

  // If not authenticated, show redirect message (redirect is happening)
  if (!session?.session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Redirecting to sign in...</div>
      </div>
    )
  }

  // If authenticated, render the outlet
  return <Outlet />
}
