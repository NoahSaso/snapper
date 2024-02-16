import cors from 'cors'
import { Server } from 'hyper-express'

import { HOST, PORT } from '@/config'

import { query } from './routes'

const server = new Server()

server.use(
  cors({
    origin: ['http://localhost:3000'],
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
