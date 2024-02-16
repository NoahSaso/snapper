import { Query } from '@/types'
import { TimeRange, getRangeConstraints, isValidTimeRange } from '@/utils'

export const daodaoBankBalancesHistoryQuery: Query = {
  name: 'daodao-bank-balances-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ chainId, address, range }) => {
    const { start, interval } = getRangeConstraints(range as TimeRange)

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/bank/balances?times=${BigInt(start * 1000).toString()}..&timeStep=${BigInt(interval * 1000).toString()}`
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
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ chainId, address, range }) => {
    const { start, interval } = getRangeConstraints(range as TimeRange)

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/tokens/list?times=${BigInt(start * 1000).toString()}..&timeStep=${BigInt(interval * 1000).toString()}`
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
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ chainId, range }) => {
    const { start, interval } = getRangeConstraints(range as TimeRange)

    return `https://indexer.daodao.zone/${chainId}/generic/_/communityPool/balances?times=${BigInt(start * 1000).toString()}..&timeStep=${BigInt(interval * 1000).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === 'hour' ? 60 : range === 'day' ? 60 * 60 : 24 * 60 * 60,
}
