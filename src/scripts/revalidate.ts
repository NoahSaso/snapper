import { Command } from 'commander'

import { fetchQuery, findAlmostExpiredQueries } from '@/query'

const program = new Command()
program.option(
  '-r, --ratio <ratio>',
  "ratio of a query's validity that must remain before it is considered almost expired",
  (value) => parseFloat(value),
  0.25
)
program.option(
  '-i, --interval <interval>',
  'revalidation interval in seconds',
  (value) => parseInt(value),
  60
)
program.option(
  '-b, --batch <batch>',
  'how many queries to revalidate at once',
  (value) => parseInt(value),
  20
)
program.parse()
const { ratio, interval: intervalSeconds, batch } = program.opts()

console.log(
  `[${new Date().toISOString()}] Starting revalidation with ratio=${ratio}, interval=${intervalSeconds}, batch=${batch}...`
)

let timeout: NodeJS.Timeout | null = null

// Scan for and revalidate almost expired queries.
const revalidate = async () => {
  timeout = null

  try {
    const almostExpiredQueries = (await findAlmostExpiredQueries(ratio)).filter(
      ({ query: { revalidate = true }, parameters }) =>
        typeof revalidate === 'function' ? revalidate(parameters) : revalidate
    )

    if (almostExpiredQueries.length > 0) {
      console.log(
        `[${new Date().toISOString()}] Revalidating ${almostExpiredQueries.length.toLocaleString()} ${almostExpiredQueries.length === 1 ? 'query' : 'queries'}...`
      )

      // Batch revalidate queries.
      for (let i = 0; i < almostExpiredQueries.length; i += batch) {
        await Promise.allSettled(
          almostExpiredQueries
            .slice(i, i + batch)
            .map(({ query, parameters }) =>
              // Ignore errors. Will retry on next revalidation.
              fetchQuery(query, parameters, true).catch((error) =>
                console.error(
                  `error revalidating query "${query.name}" with parameters ${JSON.stringify(
                    parameters
                  )}`,
                  error
                )
              )
            )
        )
      }

      console.log(`[${new Date().toISOString()}] Revalidation complete.`)
    }
  } catch (err) {
    console.error(`error revalidating queries`, err)
  } finally {
    // Revalidate in the next interval.
    timeout = setTimeout(revalidate, intervalSeconds * 1000)
  }
}

revalidate()

// Stop revalidation on SIGINT.
process.on('SIGINT', () => {
  if (timeout !== null) {
    clearTimeout(timeout)
  }
  process.exit(0)
})

// Tell pm2 we're ready.
if (process.send) {
  process.send('ready')
}
