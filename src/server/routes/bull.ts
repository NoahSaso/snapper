import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'

import { QueueName, getBullQueue } from '@/queues'

export const makeBullBoardRouter = (basePath: string) => {
  const serverAdapter = new FastifyAdapter().setBasePath(basePath)

  createBullBoard({
    queues: Object.values(QueueName).map(
      (name) => new BullMQAdapter(getBullQueue(name))
    ),
    serverAdapter,
  })

  return serverAdapter.registerPlugin()
}
