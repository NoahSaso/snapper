import { ConnectionOptions, Processor, Queue, Worker } from 'bullmq'

import { redis } from '@/config'

import { revalidate } from './processors'

export enum QueueName {
  Revalidate = 'revalidate',
}

export const QUEUES: {
  queue: QueueName
  processor: Processor
}[] = [
  {
    queue: QueueName.Revalidate,
    processor: revalidate,
  },
]

const getBullConnection = (): ConnectionOptions => redis

/**
 * Cache bull queues by name so we don't make duplicates and can close all at
 * once on exit.
 */
export const activeBullQueues: Partial<Record<QueueName, Queue>> = {}

export const getBullQueue = <T extends unknown>(name: QueueName): Queue<T> => {
  if (!activeBullQueues[name]) {
    activeBullQueues[name] = new Queue<T>(name, {
      connection: getBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 300,
        },
      },
    })

    activeBullQueues[name]?.on('error', async (err) => {
      console.error('Queue error', err)
    })
  }
  return activeBullQueues[name]!
}

/**
 * Closes all active bull queues.
 *
 * @returns `Promise` that resolves when all queues are closed.
 */
export const closeAllBullQueues = async () =>
  await Promise.all(
    Object.values(activeBullQueues).map((queue) => queue.close())
  )

/**
 * Create bull worker for the given queue and processor function.
 */
export const getBullWorker = <T extends unknown>(
  name: QueueName,
  processor: Processor<T>
) =>
  new Worker<T>(name, processor, {
    connection: getBullConnection(),
    concurrency: 10,
    removeOnComplete: {
      // Keep last 7 days of successful jobs.
      age: 7 * 24 * 60 * 60,
    },
    // Keep all failed jobs.
  })
