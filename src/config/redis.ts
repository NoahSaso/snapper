import Redis from 'ioredis'

import { REDIS_URL } from './env'

const { hostname, port, username, password } = new URL(REDIS_URL)

export const redis = new Redis({
  host: hostname,
  port: port ? Number(port) : undefined,
  username: username || undefined,
  password: password || undefined,
  // TLS is required in the cloud.
  ...(REDIS_URL.includes('rediss://') ? { tls: {} } : {}),
  connectTimeout: 30_000,
  // Required for BullMQ
  maxRetriesPerRequest: null,
})
