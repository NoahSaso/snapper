import Fastify from 'fastify'

import { HOST, PORT } from '@/config'
import { health } from '@/server/routes'

import { QUEUES, getBullWorker } from './core'

const main = async () => {
  console.log(`\n[${new Date().toISOString()}] Starting queue workers...`)

  // Create Bull workers.
  const workers = QUEUES.map(({ queue, processor }) => {
    const worker = getBullWorker(queue, processor)
    worker.on('error', (err) => {
      console.error(`[worker-error] ${queue}`, err)
    })
    return worker
  })

  // Add shutdown signal handler.
  process.on('SIGINT', () => {
    if (workers.every((w) => w.closing)) {
      console.log('Already shutting down.')
    } else {
      console.log('Shutting down after current worker jobs complete...')
      // Exit once all workers close.
      Promise.all(workers.map((worker) => worker.close())).then(() =>
        process.exit(0)
      )
    }
  })

  // Tell pm2 we're ready.
  if (process.send) {
    process.send('ready')
  }

  // Start server with just the health check.
  const server = Fastify()
  server.get('/health', health)
  await server.listen({
    host: HOST,
    port: PORT,
  })

  console.log(`Health check listening at ${HOST}:${PORT}/health...`)
}

main().catch((err) => {
  console.error('Worker queue process error:', err)
  process.exit(1)
})
