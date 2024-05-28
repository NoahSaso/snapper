import { Processor } from 'bullmq'

import { fetchQuery, getQuery } from '@/query'

export type RevalidateProcessorPayload = {
  query: string
  params: Record<string, string>
}

export const revalidate: Processor<RevalidateProcessorPayload> = async ({
  data: { query: queryName, params },
}) => {
  const query = getQuery(queryName)
  if (!query) {
    throw new Error(`query "${queryName}" not found`)
  }

  const start = Date.now()

  await fetchQuery(
    query,
    params,
    // Force fetch, ignoring cache.
    true
  )

  const duration = Date.now() - start

  console.log(`revalidated "${queryName}" in ${duration.toLocaleString()}ms`)
}
