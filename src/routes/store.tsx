import { createFileRoute, Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

import { fullName, store } from '@/lib/demo-store'

export const Route = createFileRoute('/store')({
  component: DemoStore,
})

function FirstName() {
  const firstName = useStore(store, (state) => state.firstName)
  return (
    <div>
      <label className="block text-white mb-2 font-semibold">First Name</label>
      <input
        type="text"
        value={firstName}
        onChange={(e) =>
          store.setState((state) => ({ ...state, firstName: e.target.value }))
        }
        className="bg-white/10 rounded-lg px-4 py-2 outline-none border border-white/20 hover:border-white/40 focus:border-white/60 transition-colors duration-200 placeholder-white/40 w-full"
      />
    </div>
  )
}

function LastName() {
  const lastName = useStore(store, (state) => state.lastName)
  return (
    <div>
      <label className="block text-white mb-2 font-semibold">Last Name</label>
      <input
        type="text"
        value={lastName}
        onChange={(e) =>
          store.setState((state) => ({ ...state, lastName: e.target.value }))
        }
        className="bg-white/10 rounded-lg px-4 py-2 outline-none border border-white/20 hover:border-white/40 focus:border-white/60 transition-colors duration-200 placeholder-white/40 w-full"
      />
    </div>
  )
}

function FullName() {
  const fName = useStore(fullName)
  return (
    <div>
      <label className="block text-white mb-2 font-semibold">Full Name</label>
      <div className="bg-white/10 rounded-lg px-4 py-2 outline-none text-white text-lg">
        {fName}
      </div>
    </div>
  )
}

function DemoStore() {
  return (
    <div
      className="min-h-screen text-white p-8"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 80% 80%, #f4a460 0%, #8b4513 70%, #1a0f0a 100%)',
      }}
    >
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-8">TanStack Store Demo</h1>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-lg flex flex-col gap-6">
          <p className="text-gray-200 text-lg">
            This demo showcases TanStack Store with reactive state management.
            Edit the first and last name fields to see the full name update
            automatically.
          </p>
          <FirstName />
          <LastName />
          <FullName />
        </div>
      </div>
    </div>
  )
}





