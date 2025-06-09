import { FastifyReply, FastifyRequest } from 'fastify'

export const health = async (_req: FastifyRequest, reply: FastifyReply) => {
  reply.status(200).send({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
