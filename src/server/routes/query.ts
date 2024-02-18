import { MiddlewareHandler } from 'hyper-express'

import { redis } from '@/config'
import { fetchQuery, getQuery, getQueryKey } from '@/query'

export const query: MiddlewareHandler = async (req, res) => {
  const logPrefix = `${req.method} ${req.url}`

  const queryName = req.path_parameters.query
  const query = getQuery(queryName)
  if (!query) {
    console.log(`${logPrefix} - 404`)
    res.status(404).send(`query "${queryName}" not found`)
    return
  }

  // Validate required parameters.
  if (query.parameters?.length) {
    const missingParams = query.parameters.filter(
      (param) => !req.query_parameters[param]
    )
    if (missingParams.length) {
      const error = `missing parameters: ${missingParams.join(', ')}`
      console.log(`${logPrefix} - 400 ${error}`)
      res.status(400).send(error)
      return
    }

    if (query.validate) {
      try {
        const valid = await query.validate?.(req.query_parameters)
        if (!valid) {
          throw new Error('invalid parameters')
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : `unknown error: ${err}`
        console.log(`${logPrefix} - 400 ${error}`)
        res.status(400).send(error)
        return
      }
    }
  }

  let queryState
  try {
    queryState = await fetchQuery(query, req.query_parameters)
  } catch (err) {
    console.error(`${logPrefix} - 500`, err)
    res
      .status(500)
      .send(err instanceof Error ? err.message : `unknown error: ${err}`)
    return
  }

  // Set cache headers.
  const ttl = await redis.ttl(getQueryKey(query, req.query_parameters))
  if (ttl > 0) {
    res.set('cache-control', `max-age=${ttl}, public, must-revalidate`)
  }

  const elapsed = Date.now() - req.locals.startTime

  const { body } = queryState.data
  if (body === undefined) {
    console.log(
      `${logPrefix} - 204 ${queryState.cached ? 'cached' : 'not cached'} - ${elapsed.toLocaleString()}ms`
    )
    res.status(204).send()
  } else {
    console.log(
      `${logPrefix} - 200 ${queryState.cached ? 'cached' : 'not cached'} - ${elapsed.toLocaleString()}ms`
    )
    res.status(200).json(body)
  }
}
