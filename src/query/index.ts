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

export type FetchQueryOptions<
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
> = {
  /**
   * The query to fetch.
   */
  query: Query<Body, Parameters>
  /**
   * Parameters to validate (unless validation disabled) and pass to the query.
   */
  params: Parameters
  /**
   * Control how the query should be fetched.
   * - `staleBackgroundRevalidate`: The cached value will be returned, even if
   *   stale, and a background process will revalidate it in the background for
   *   future queries.
   * - `revalidateStale`: If the cached value is stale, the query will be
   *   revalidated synchronously and returned immediately, so the value returned
   *   will always be fresh.
   * - `forceFresh`: The query will always be fetched fresh.
   *
   * Defaults to `staleBackgroundRevalidate`. `revalidateStale` is used for
   * subqueries, where one query depends on another query, since we want to have
   * fresh values for a query when we do decide to recompute it. Without this,
   * chains of stale values with background revalidation when a query depends on
   * other queries cause stale data to stick around for too long.
   */
  behavior?: 'staleBackgroundRevalidate' | 'revalidateStale' | 'forceFresh'
  /**
   * Whether or not to ignore parameter validation.
   *
   * Defaults to false.
   */
  noValidate?: boolean
}

export type FetchQueryResult<Body = unknown> = {
  /**
   * Resulting query state with data.
   */
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
}

/**
 * Fetch the query (from cache if available, or executing it otherwise), store
 * it in the cache, and return the state.
 */
export const fetchQuery = async <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>({
  query,
  params,
  behavior = 'staleBackgroundRevalidate',
  noValidate = false,
}: FetchQueryOptions<Body, Parameters>): Promise<FetchQueryResult<Body>> => {
  // Validate query parameters.
  params = noValidate ? params : await validateQueryParams(query, params)

  // If not force fetching a fresh value, check cache.
  if (behavior !== 'forceFresh') {
    const currentQueryState = await getQueryState(query, params)
    if (currentQueryState) {
      const stale =
        !!currentQueryState.staleAt && currentQueryState.staleAt <= Date.now()

      // If query is not stale, return the cached value. If it is stale, and we
      // are using the stale with background revalidate behavior, queue a
      // background job to revalidate it and still return the cached value.
      //
      // Otherwise, it must be stale and we are using the revalidate stale
      // behavior, so fetch the fresh value by executing the query and return it
      // immediately.
      if (!stale || behavior === 'staleBackgroundRevalidate') {
        // If cached value is stale, queue background job to revalidate the
        // query.
        //
        // Create an ID unique to the stale query to avoid overlapping jobs. If
        // multiple requests come in for the same stale query before the job is
        // complete, we don't want to revalidate multiple times. Adding a job to
        // the queue with an ID that already exist is a no-op.
        //
        // See https://docs.bullmq.io/guide/jobs/job-ids
        if (stale) {
          const baseId = `${getQueryKey(query, params)
            // Remove query prefix.
            .slice(QUERY_PREFIX.length)
            // Replace question mark with underscore so it can be clicked in the
            // Bull Board. The question mark doesn't get escaped so it doesn't
            // open the correct URL.
            .replace('?', '_')}_${currentQueryState.fetchedAt}`

          const queue = await getBullQueue<RevalidateProcessorPayload>(
            QueueName.Revalidate
          )

          // Check if failed job exists, and modify ID so it retries. Since
          // completed jobs replace the cached query state with a newer value and
          // a more recent `fetchedAt` value, the job state should only ever be
          // completed here if there are multiple simultaneous requests and
          // another request triggered the revalidation which happened to complete
          // very quickly. If that's the case, no need to retry like we do with
          // failed jobs since the cache should already be updated.
          let id = baseId
          let attempt = 1
          while (true) {
            const existingJobState = await queue.getJobState(id)
            if (existingJobState !== 'failed') {
              break
            }

            id = `${baseId}_try${++attempt}`
          }

          queue.add(
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
  }

  const ttl = typeof query.ttl === 'function' ? query.ttl(params) : query.ttl

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
      if (error instanceof AxiosError && error.response) {
        // manually capture rate limits
        if (error.response.status === 429) {
          throw new Error('429 too many requests')
        } else {
          throw new Error(
            `${error.response.status} ${error.response.statusText}. Response: ${JSON.stringify(error.response.data)}`
          )
        }
      }

      throw error
    }

    const body = query.transform
      ? query.transform(response.data, params)
      : response.data

    const fetchedAt = Date.now()

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
      async (query, params) =>
        (
          await fetchQuery({
            query,
            params,
            // Make sure to use fresh values when performing subqueries.
            behavior: 'revalidateStale',
          })
        ).data
    )

    // Get date after request is complete. This ensures that subqueries are
    // correctly cached before their top-level query is cached, so that if the
    // TTLs of a top-level query and its subqueries are the same, the subqueries
    // will need revalidation before or at the same time as the top-level query.
    // If the top-level query were cached before its subqueries, the top-level
    // query might revalidate with the same cached subquery values from the
    // previous fetch, resulting in the same value for another cycle.
    const fetchedAt = Date.now()

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
