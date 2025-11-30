import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Zap,
  Database,
  ClipboardType,
  Store,
  Table,
  Webhook,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const features = [
    {
      icon: <ClipboardType className="w-12 h-12 text-cyan-400" />,
      title: 'Forms',
      description: 'Powerful form management with TanStack Form. Type-safe, performant, and developer-friendly.',
      link: '/forms',
      color: 'from-purple-500/10 to-blue-500/10',
    },
    {
      icon: <Store className="w-12 h-12 text-cyan-400" />,
      title: 'Store',
      description: 'Reactive state management with TanStack Store. Simple, fast, and scalable.',
      link: '/store',
      color: 'from-orange-500/10 to-red-500/10',
    },
    {
      icon: <Table className="w-12 h-12 text-cyan-400" />,
      title: 'Table',
      description: 'Headless table UI with TanStack Table. Powerful filtering, sorting, and pagination.',
      link: '/table',
      color: 'from-gray-500/10 to-slate-500/10',
    },
    {
      icon: <Database className="w-12 h-12 text-cyan-400" />,
      title: 'Database',
      description: 'Type-safe database operations with Drizzle ORM. PostgreSQL integration included.',
      link: '/database',
      color: 'from-indigo-500/10 to-purple-500/10',
    },
    {
      icon: <Webhook className="w-12 h-12 text-cyan-400" />,
      title: 'MCP Todos',
      description: 'Model Context Protocol integration. Real-time todos with server-sent events.',
      link: '/todos',
      color: 'from-teal-500/10 to-emerald-500/10',
    },
    {
      icon: <Zap className="w-12 h-12 text-cyan-400" />,
      title: 'TanStack Start',
      description: 'Full-stack framework with server functions, SSR, and type safety.',
      link: 'https://tanstack.com/start',
      external: true,
      color: 'from-cyan-500/10 to-blue-500/10',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img
              src="/tanstack-circle-logo.png"
              alt="TanStack Logo"
              className="w-24 h-24 md:w-32 md:h-32"
            />
            <h1 className="text-6xl md:text-7xl font-black text-white tracking-[-0.08em]">
              <span className="text-gray-300">SAASQUATCH</span>
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            TanStack Start Application
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            A full-stack application showcasing TanStack Router, Form, Store, Table, Query, and more.
            Built with TanStack Start for modern web applications.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const content = (
              <div
                className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 h-full flex flex-col ${feature.color}`}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed grow">
                  {feature.description}
                </p>
                {feature.link && (
                  <div className="mt-4">
                    {feature.external ? (
                      <a
                        href={feature.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Learn more →
                      </a>
                    ) : (
                      <Link
                        to={feature.link}
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        View demo →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )

            return feature.external ? (
              <a
                key={index}
                href={feature.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {content}
              </a>
            ) : (
              <Link key={index} to={feature.link} className="block">
                {content}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
