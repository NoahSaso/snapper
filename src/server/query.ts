import axios from 'axios'

import { Query, QueryState } from '@/types'

import { redis } from './config'

const QUERY_PREFIX = 'Q:'

/**
 * Find and parse the query state from the cache.
 */
export const getQueryState = async (
  query: Query,
  params: Record<string, string>
): Promise<QueryState | undefined> => {
  const data = await redis.get(getQueryKey(query, params))
  if (data) {
    return JSON.parse(data)
  }
}

/**
 * Fetch the query, store it in the cache, and return the state.
 */
export const fetchQuery = async (
  query: Query,
  params: Record<string, string>
): Promise<QueryState> => {
  const url = typeof query.url === 'function' ? query.url(params) : query.url
  const headers =
    typeof query.headers === 'function' ? query.headers(params) : query.headers
  const ttl = typeof query.ttl === 'function' ? query.ttl(params) : query.ttl

  const response = await (query.method === 'POST' ? axios.post : axios.get)(
    url,
    {
      headers,
    }
  )
  const body = query.transform?.(response.data, params) || response.data

  const queryState: QueryState = {
    status: response.status,
    statusText: response.statusText,
    body,
    fetchedAt: Date.now(),
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
export const getQueryKey = (query: Query, params: Record<string, string>) =>
  QUERY_PREFIX +
  query.name +
  (query.parameters?.length
    ? '?' +
      query.parameters.map((param) => `${param}=${params[param]}`).join('&')
    : '')
