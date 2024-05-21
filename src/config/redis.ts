import Redis from 'ioredis'

import { REDIS_URL, REDIS_API_KEY } from './env'

const [host,port] = REDIS_URL.split(":")

export const redis = new Redis(
    {
        host: host,
        port: Number(port),
        password: REDIS_API_KEY,
        username:'default'
    }
)
