import { QUEUES, getBullWorker } from './core'

const main = () => {
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
}

main()
