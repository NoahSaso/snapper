import { FastifyReply, FastifyRequest } from 'fastify'

import { fetchQuery, getQuery, validateQueryParams } from '@/query'

export const query = async (
  req: FastifyRequest<{
    Params: {
      query: string
    }
  }>,
  reply: FastifyReply
) => {
  const start = Date.now()
  const logPrefix = `${req.method} ${req.url}`

  const queryName = 'query' in req.params ? req.params.query : 'undefined'
  const query = getQuery(queryName)
  if (!query) {
    console.log(`${logPrefix} - 404`)
    reply.status(404).send(`query "${queryName}" not found`)
    return
  }

  // Validate query parameters.
  let params
  try {
    params = await validateQueryParams(query, req.query)
  } catch (err) {
    const error = err instanceof Error ? err.message : `${err}`
    console.log(`${logPrefix} - 400 ${error}`)
    reply.status(400).send(error)
    return
  }

  let queryState
  try {
    queryState = await fetchQuery(
      query,
      params,
      false,
      // Params validated above; no need to validate again.
      true
    )
  } catch (err) {
    console.error(`${logPrefix} - 500`, err)
    reply
      .status(500)
      .send(err instanceof Error ? err.message : `unknown error: ${err}`)
    return
  }

  // Set cache headers if enabled.
  if (!!queryState.data.staleAt) {
    let maxAge = Math.round((queryState.data.staleAt - Date.now()) / 1000)
    // Set stale floor at 5 seconds. This ensures that if it's already stale
    // (negative), clients know to revalidate soon.
    if (maxAge < 5) {
      maxAge = 5
    }

    reply.header(
      'cache-control',
      `max-age=${BigInt(maxAge).toString()}, public, stale-while-revalidate`
    )
  }

  const elapsed = Date.now() - start

  const { body } = queryState.data
  if (body === undefined) {
    console.log(
      `${logPrefix} - 204 - ${queryState.cached ? 'cached' : 'not cached'} - ${queryState.stale ? 'stale' : 'fresh'} - ${elapsed.toLocaleString()}ms`
    )
    reply.status(204).send()
  } else {
    console.log(
      `${logPrefix} - 200 - ${queryState.cached ? 'cached' : 'not cached'} - ${queryState.stale ? 'stale' : 'fresh'} - ${elapsed.toLocaleString()}ms`
    )
    reply.status(200).header('content-type', 'application/json').send(body)
  }
}
