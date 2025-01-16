import fs from 'fs'

import { FastifyReply, FastifyRequest } from 'fastify'

import { PUBLIC_KEY_FILE } from '@/config'

export const pk = async (_req: FastifyRequest, reply: FastifyReply) => {
  const publicKey = fs.readFileSync(PUBLIC_KEY_FILE)
  reply.status(200).send(publicKey)
}
