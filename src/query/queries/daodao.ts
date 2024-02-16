import { Query } from '@/types'

type Range = 'year' | 'month' | 'week' | 'day' | 'hour'

// The interval of data returned from CoinGecko at these ranges.
// https://www.coingecko.com/api/documentation
const rangeInterval: Record<Range, number> = {
  // Daily.
  year: 24 * 60 * 60 * 1000,
  // Hourly.
  month: 60 * 60 * 1000,
  week: 60 * 60 * 1000,
  // Every 5 minutes.
  day: 5 * 60 * 1000,
  hour: 5 * 60 * 1000,
}
// The milliseconds duration of a token price history range.
const rangeDuration: Record<Range, number> = {
  year: 365 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
}

export const daodaoBankBalancesHistoryQuery: Query = {
  name: 'daodao-bank-balances-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) =>
    !['year', 'month', 'week', 'day', 'hour'].includes(range),
  url: ({ chainId, address, range }) => {
    const stepMs = rangeInterval[range as Range]
    // Should never happen.
    if (!stepMs) {
      throw new Error(`invalid range: ${range}`)
    }

    const start = new Date(Date.now() - (rangeDuration[range as Range] || 0))
    if (range === 'hour') {
      start.setMinutes(0, 0, 0)
    } else {
      start.setHours(0, 0, 0, 0)
    }
    const startUnixMs = start.getTime()

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/bank/balances?times=${BigInt(startUnixMs).toString()}..&timeStep=${BigInt(stepMs).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === 'hour' ? 60 : range === 'day' ? 60 * 60 : 24 * 60 * 60,
}

export const daodaoCw20BalancesHistoryQuery: Query = {
  name: 'daodao-cw20-balances-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) =>
    !['year', 'month', 'week', 'day', 'hour'].includes(range),
  url: ({ chainId, address, range }) => {
    const stepMs = rangeInterval[range as Range]
    // Should never happen.
    if (!stepMs) {
      throw new Error(`invalid range: ${range}`)
    }

    const start = new Date(Date.now() - (rangeDuration[range as Range] || 0))
    if (range === 'hour') {
      start.setMinutes(0, 0, 0)
    } else {
      start.setHours(0, 0, 0, 0)
    }
    const startUnixMs = start.getTime()

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/tokens/list?times=${BigInt(startUnixMs).toString()}..&timeStep=${BigInt(stepMs).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === 'hour' ? 60 : range === 'day' ? 60 * 60 : 24 * 60 * 60,
}

export const daodaoCommunityPoolHistoryQuery: Query = {
  name: 'daodao-community-pool-history',
  parameters: ['chainId', 'range'],
  validate: ({ range }) =>
    !['year', 'month', 'week', 'day', 'hour'].includes(range),
  url: ({ chainId, range }) => {
    const stepMs = rangeInterval[range as Range]
    // Should never happen.
    if (!stepMs) {
      throw new Error(`invalid range: ${range}`)
    }

    const start = new Date(Date.now() - (rangeDuration[range as Range] || 0))
    if (range === 'hour') {
      start.setMinutes(0, 0, 0)
    } else {
      start.setHours(0, 0, 0, 0)
    }
    const startUnixMs = start.getTime()

    return `https://indexer.daodao.zone/${chainId}/generic/_/communityPool/balances?times=${BigInt(startUnixMs).toString()}..&timeStep=${BigInt(stepMs).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === 'hour' ? 60 : range === 'day' ? 60 * 60 : 24 * 60 * 60,
}
