import auth from '@fastify/basic-auth'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import safeCompare from 'safe-compare'

import { ADMIN_DASHBOARD_PASSWORD, ALLOWED_ORIGINS, HOST, PORT } from '@/config'

import { health, makeBullBoardRouter, pk, query } from './routes'

const serve = async () => {
  const server = Fastify()

  server.register(
    cors,
    ALLOWED_ORIGINS.length
      ? {
          origin: ALLOWED_ORIGINS.map((origin) => new RegExp(origin)),
        }
      : {}
  )
  await server.after()

  server.register((instance, _opts, next) => {
    instance.get('/', (_, reply) => reply.status(200).send('snap'))
    instance.get('/health', health)
    instance.get('/pk', pk)
    instance.get('/q/:query', query)
    next()
  })

  server.register(async (instance, _opts, next) => {
    // Install auth.
    instance.register(auth, {
      validate: (_username, password, _req, _reply, done) => {
        if (safeCompare(password, ADMIN_DASHBOARD_PASSWORD)) {
          done()
        } else {
          done(new Error('unauthorized'))
        }
      },
      authenticate: true,
    })

    await instance.after()

    // Apply auth.
    instance.addHook('onRequest', (req, reply, next) => {
      instance.basicAuth(req, reply, (error) => {
        if (!error) {
          return next()
        }

        reply.code(401).send(error.message)
      })
    })

    // Add bull board.
    instance.register(makeBullBoardRouter('/admin'), {
      basePath: '/admin',
      prefix: '/admin',
    })

    next()
  })

  // Listen.
  await server.listen({
    host: HOST,
    port: PORT,
  })

  console.log(`Listening at ${HOST}:${PORT}...`)

  // Tell pm2 we're ready.
  if (process.send) {
    process.send('ready')
  }
}

serve()
