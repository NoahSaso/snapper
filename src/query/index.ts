import axios, { AxiosError } from 'axios'
import stringify from 'json-stringify-deterministic'

import { redis } from '@/config'
import { Query, QueryState, QueryType } from '@/types'

import { queries } from './queries'

const QUERY_PREFIX = 'Q:'

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
  query: Query<Body>,
  params: Parameters
): Promise<QueryState<Body> | undefined> => {
  const data = await redis.get(getQueryKey(query, params))
  if (data) {
    return JSON.parse(data)
  }
}

/**
 * Fetch the query, store it in the cache, and return the state.
 */
export const fetchQuery = async <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>(
  query: Query<Body, Parameters>,
  params: Parameters
): Promise<QueryState<Body>> => {
  const ttl = typeof query.ttl === 'function' ? query.ttl(params) : query.ttl

  let queryState: QueryState<Body>
  if (query.type === QueryType.Url) {
    const url = typeof query.url === 'function' ? query.url(params) : query.url
    const headers =
      typeof query.headers === 'function'
        ? query.headers(params)
        : query.headers

    let response
    try {
      response = await (query.method === 'POST' ? axios.post : axios.get)(url, {
        headers,
      })
    } catch (error) {
      // manually capture rate limits
      if (error instanceof AxiosError) {
        if (error.response?.status === 429) {
          throw new Error('429 too many requests')
        }
      }

      throw error
    }

    const body = query.transform?.(response.data, params) || response.data

    queryState = {
      status: response.status,
      statusText: response.statusText,
      body,
      fetchedAt: Date.now(),
    }
  } else if (query.type === QueryType.Custom) {
    const body = await query.execute(params, fetchQuery as any)
    queryState = {
      body,
      fetchedAt: Date.now(),
    }
  } else {
    throw new Error(`invalid query type: ${query['type']}`)
  }

  if (ttl) {
    await redis.set(
      getQueryKey(query, params),
      JSON.stringify(queryState),
      // Expire in <TTL> seconds.
      'EX',
      ttl
    )
  } else {
    await redis.set(getQueryKey(query, params), JSON.stringify(queryState))
  }

  return queryState
}

/**
 * Get query storage key given the query and its parameters.
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
): { name: string; parameters: Record<string, string> } => {
  const [name, params] = key
    .replace(new RegExp('^' + QUERY_PREFIX), '')
    .split('?')
  return {
    name,
    parameters: params ? JSON.parse(params) : {},
  }
}

/**
 * Find all queries that are almost expired.
 *
 * @param remainingTtlRatio - The max ratio of a query's validity that must
 * remain before it is considered almost expired. Defaults to 0.25.
 */
export const findAlmostExpiredQueries = async (remainingTtlRatio = 0.25) => {
  const queryKeys = await redis.keys(QUERY_PREFIX + '*')
  const queryKeyTtls = await Promise.all(queryKeys.map((key) => redis.ttl(key)))

  const queries = (
    await Promise.all(
      queryKeys.map(async (key) => {
        const { name, parameters } = parseQueryKey(key)
        const query = getQuery(name)
        const state = query && (await getQueryState(query, parameters))
        return (
          query &&
          state && {
            query,
            parameters,
            state,
          }
        )
      })
    )
  ).flatMap((data, index) =>
    data
      ? {
          key: queryKeys[index],
          ttlMs: queryKeyTtls[index] * 1000,
          ...data,
        }
      : []
  )

  const now = Date.now()

  // Almost expired if the time remaining is less than the threshold.
  const almostExpiredQueries = queries.filter(
    ({ ttlMs, state }) =>
      ttlMs < 0 || ttlMs <= (now + ttlMs - state.fetchedAt) * remainingTtlRatio
  )

  return almostExpiredQueries
}
