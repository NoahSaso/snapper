import { MiddlewareHandler } from 'hyper-express'

import { fetchQuery, getQuery, getQueryState } from '@/query'

export const query: MiddlewareHandler = async (request, response) => {
  const queryName = request.path_parameters.query
  const query = getQuery(queryName)
  if (!query) {
    response.status(404).send(`query "${queryName}" not found`)
    return
  }

  // Validate required parameters.
  if (query.parameters?.length) {
    const missingParams = query.parameters.filter(
      (param) => !request.query_parameters[param]
    )
    if (missingParams.length) {
      response
        .status(400)
        .send(`missing parameters: ${missingParams.join(', ')}`)
      return
    }

    if (query.validate) {
      try {
        const valid = await query.validate?.(request.query_parameters)
        if (!valid) {
          throw new Error('invalid parameters')
        }
      } catch (error) {
        response
          .status(400)
          .send(
            error instanceof Error ? error.message : `unknown error: ${error}`
          )
        return
      }
    }
  }

  let queryState = await getQueryState(query, request.query_parameters)
  // If no query state, fetch it.
  if (!queryState) {
    try {
      queryState = await fetchQuery(query, request.query_parameters)
    } catch (error) {
      response
        .status(500)
        .send(
          error instanceof Error ? error.message : `unknown error: ${error}`
        )
      return
    }
  }

  // Set cache headers.
  const ttl =
    typeof query.ttl === 'function'
      ? query.ttl(request.query_parameters)
      : query.ttl
  if (ttl) {
    response.set('cache-control', `max-age=${ttl}, public, must-revalidate`)
  }

  response.status(200).json(queryState.body)
}
