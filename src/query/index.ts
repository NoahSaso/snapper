import axios, { AxiosError } from 'axios'
import stringify from 'json-stringify-deterministic'

import { redis } from '@/config'
import { QueueName, getBullQueue } from '@/queues'
import { RevalidateProcessorPayload } from '@/queues/processors'
import { Query, QueryState, QueryType } from '@/types'

import { queries } from './queries'

export const QUERY_PREFIX = 'Q:'

/**
 * Get query given its name.
 */
export const getQuery = (name: string) => queries.find((q) => q.name === name)

/**
 * Find and parse the query state from the cache.
 */
export const getQueryState = async <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>(
  query: Query<Body, Parameters>,
  params: Parameters
): Promise<QueryState<Body> | undefined> => {
  const data = await redis.get(getQueryKey(query, params))
  if (data) {
    return JSON.parse(data)
  }
}

/**
 * Validate parameters for a query and return only parameters the query accepts.
 *
 * This prevents people from storing arbitrary data in our cache or refetching
 * queries based on irrelevant parameters.
 */
export const validateQueryParams = async <
  Parameters extends Record<string, string> = Record<string, string>,
>(
  query: Query<unknown, Parameters>,
  params: Parameters
): Promise<Parameters> => {
  // Extract only the parameters the query accepts.
  const acceptedParams = [
    ...(query.parameters || []),
    ...(query.optionalParameters || []),
  ].reduce(
    (acc, param) => ({
      ...acc,
      ...(param in params
        ? {
            [param]: params[param],
          }
        : {}),
    }),
    {} as Parameters
  )

  if (query.parameters?.length) {
    const missingParams = query.parameters.filter(
      (param) => !acceptedParams[param]
    )
    if (missingParams.length) {
      throw new Error(`missing parameters: ${missingParams.join(', ')}`)
    }
  }

  if (query.validate) {
    const valid = await query.validate?.(acceptedParams)
    if (!valid) {
      throw new Error('invalid parameters')
    }
  }

  return acceptedParams
}

/**
 * Fetch the query (from cache if available, or executing it otherwise), store
 * it in the cache, and return the state.
 */
export const fetchQuery = async <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>(
  /**
   * The query to fetch.
   */
  query: Query<Body, Parameters>,
  /**
   * Parameters to validate (unless validation disabled) and pass to the query.
   */
  params: Parameters,
  /**
   * Whether or not to force fetch the query even if it's already in the cache.
   * This may be used to revalidate the cache before it expires.
   *
   * Defaults to fase.
   */
  forceFetch = false,
  /**
   * Whether or not to ignore parameter validation.
   *
   * Defaults to false.
   */
  noValidate = false
): Promise<{
  data: QueryState<Body>
  /**
   * Whether or not the query was fetched from the cache.
   */
  cached: boolean
  /**
   * Whether or not the cached query is stale. This can only be true if `cached`
   * is also true.
   */
  stale: boolean
}> => {
  // Validate query parameters.
  params = noValidate ? params : await validateQueryParams(query, params)

  if (!forceFetch) {
    const currentQueryState = await getQueryState(query, params)
    if (currentQueryState) {
      const stale =
        !!currentQueryState.staleAt && currentQueryState.staleAt <= Date.now()

      // If cached value is stale, queue background job to revalidate the query.
      //
      // Create an ID unique to the stale query to avoid overlapping jobs. If
      // multiple requests come in for the same stale query before the job is
      // complete, we don't want to revalidate multiple times. Adding a job to
      // the queue with an ID that already exist is a no-op.
      //
      // See https://docs.bullmq.io/guide/jobs/job-ids
      if (stale) {
        const id = `${getQueryKey(query, params)
          // Remove query prefix.
          .slice(QUERY_PREFIX.length)
          // Replace question mark with underscore so it can be clicked in the
          // Bull Board. The question mark doesn't get escaped so it doesn't
          // open the correct URL.
          .replace('?', '_')}_${currentQueryState.fetchedAt}`

        await getBullQueue<RevalidateProcessorPayload>(
          QueueName.Revalidate
        ).add(
          id,
          {
            query: query.name,
            params,
          },
          {
            jobId: id,
          }
        )
      }

      return {
        data: currentQueryState,
        cached: true,
        stale,
      }
    }
  }

  const ttl = typeof query.ttl === 'function' ? query.ttl(params) : query.ttl
  const fetchedAt = Date.now()

  let queryState: QueryState<Body>
  if (query.type === QueryType.Url) {
    const url = typeof query.url === 'function' ? query.url(params) : query.url
    const headers =
      typeof query.headers === 'function'
        ? query.headers(params)
        : query.headers
    const data =
      typeof query.data === 'function' ? query.data(params) : query.data

    let response
    try {
      response = await (query.method === 'POST'
        ? axios.post(url, data, { headers })
        : axios.get(url, { headers }))
    } catch (error) {
      if (error instanceof AxiosError) {
        // manually capture rate limits
        if (error.response?.status === 429) {
          throw new Error('429 too many requests')
        } else {
          throw new Error(
            `Axios Error: ${error.response?.status}: ${error.response?.statusText}. Response data: ${JSON.stringify(error.response?.data)}`
          )
        }
      }

      throw error
    }

    const body = query.transform
      ? query.transform(response.data, params)
      : response.data

    queryState = {
      status: response.status,
      statusText: response.statusText,
      body,
      fetchedAt,
      staleAt: ttl > 0 ? fetchedAt + ttl * 1000 : 0,
    }
  } else if (query.type === QueryType.Custom) {
    const body = await query.execute(
      params,
      async (...p) => (await fetchQuery(...p)).data
    )
    queryState = {
      body,
      fetchedAt,
      staleAt: ttl > 0 ? fetchedAt + ttl * 1000 : 0,
    }
  } else {
    throw new Error(`invalid query type: ${query['type']}`)
  }

  // Save query without an expiration, since we cache with
  // stale-while-revalidate. We will manually examine `staleAt` when this is
  // queried in the future to determine whether or not to kick off a background
  // process to update the cache.
  await redis.set(getQueryKey(query, params), JSON.stringify(queryState))

  return {
    data: queryState,
    cached: false,
    stale: false,
  }
}

/**
 * Get query storage key given the query and its accepted parameters.
 */
export const getQueryKey = (
  query: Query<any, any>,
  params: Record<string, string>
): string =>
  QUERY_PREFIX +
  query.name +
  (query.parameters?.length || query.optionalParameters?.length
    ? '?' +
      stringify(
        Object.fromEntries(
          [
            ...(query.parameters || []),
            ...(query.optionalParameters || []),
          ].map((param) => [param, params[param]])
        )
      )
    : '')

/**
 * Get query name and parameters from the key.
 */
export const parseQueryKey = (
  key: string
): {
  name: string
  params: Record<string, string>
} => {
  const [name, params] = key
    .replace(new RegExp('^' + QUERY_PREFIX), '')
    .split('?')
  return {
    name,
    params: params ? JSON.parse(params) : {},
  }
}
