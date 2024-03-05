import { Command } from 'commander'

import { redis } from '@/config'
import { QUERY_PREFIX } from '@/query'

const program = new Command()
program.requiredOption('-q, --query <query>', 'ID of query to flush')
program.parse()
const { query } = program.opts()

const main = async () => {
  const prefix = QUERY_PREFIX + query + '*'
  const keys = await redis.keys(prefix)

  console.log(`Found ${keys.length} ${keys.length === 1 ? 'key' : 'keys'}`)

  await Promise.all(keys.map(async (key) => redis.unlink(key)))

  console.log(`Flushed query ${query}`)

  process.exit(0)
}

main()
