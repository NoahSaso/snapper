import cors from 'cors'
import { Server } from 'hyper-express'

import { ALLOWED_ORIGINS, HOST, PORT } from '@/config'

import { query } from './routes'

const server = new Server()

server.use(
  cors({
    origin: ALLOWED_ORIGINS.length
      ? ALLOWED_ORIGINS.map((origin) => new RegExp(origin))
      : undefined,
  })
)

server.get('/q/:query', query)

const serve = async () => {
  await server.listen(PORT, HOST)

  console.log(`Listening on ${PORT}...`)

  // Tell pm2 we're ready.
  if (process.send) {
    process.send('ready')
  }
}

serve()
