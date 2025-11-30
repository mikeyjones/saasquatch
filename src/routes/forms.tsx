import { createFileRoute, Link } from '@tanstack/react-router'
import { ClipboardType } from 'lucide-react'

export const Route = createFileRoute('/forms')({ component: FormsPage })

function FormsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <ClipboardType className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">Forms</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Explore TanStack Form with different form examples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/forms/simple"
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <h2 className="text-2xl font-semibold text-white mb-3">
              Simple Form
            </h2>
            <p className="text-gray-300">
              A basic form with title and description fields. Perfect for
              getting started with TanStack Form.
            </p>
          </Link>

          <Link
            to="/forms/address"
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <h2 className="text-2xl font-semibold text-white mb-3">
              Address Form
            </h2>
            <p className="text-gray-300">
              A more complex form with multiple fields including address
              information and validation.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
