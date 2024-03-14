import { Command } from 'commander'

import { redis } from '@/config'

const program = new Command()
program.requiredOption('-k, --key <key>', 'key pattern to match')
program.parse()
const { key } = program.opts()

const main = async () => {
  const keys = await redis.keys(key)

  console.log(`Found ${keys.length} ${keys.length === 1 ? 'key' : 'keys'}`)

  await Promise.all(keys.map(async (key) => redis.unlink(key)))

  console.log(`Flushed pattern ${key}`)

  process.exit(0)
}

main()
