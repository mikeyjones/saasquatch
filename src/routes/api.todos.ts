import { createFileRoute } from '@tanstack/react-router'
import { getTodos, subscribeToTodos, addTodo } from '@/mcp-todos'

export const Route = createFileRoute('/api/todos')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Check if this is an SSE request
        const acceptHeader = request.headers.get('accept')
        if (acceptHeader?.includes('text/event-stream')) {
          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder()
              const send = (data: unknown) => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
                )
              }

              const unsubscribe = subscribeToTodos((todos) => {
                send(todos)
              })

              // Send initial data
              send(getTodos())

              // Cleanup on close
              request.signal.addEventListener('abort', () => {
                unsubscribe()
                controller.close()
              })
            },
          })

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          })
        }

        // Regular GET request
        const todos = getTodos()
        return new Response(JSON.stringify(todos), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
      POST: async ({ request }) => {
        const body = await request.json()
        const { title } = body as { title: string }
        addTodo(title)
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
    },
  },
})
