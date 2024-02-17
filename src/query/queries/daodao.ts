import uniq from 'lodash.uniq'

import { Query, QueryType } from '@/types'
import {
  TimeRange,
  findValueAtTimestamp,
  getRangeBounds,
  isValidTimeRange,
} from '@/utils'

import { coingeckoPriceHistoryQuery } from './coingecko'
import { skipAssetQuery } from './skip'

export const daodaoBankBalancesHistoryQuery: Query<
  | {
      // Map of denom to balance.
      value: Record<string, string | undefined>
      blockHeight: number
      blockTimeUnixMs: number
    }[]
  | undefined
> = {
  type: QueryType.Url,
  name: 'daodao-bank-balances-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ chainId, address, range }) => {
    const { start, end } = getRangeBounds(range as TimeRange)

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/bank/balances?times=${BigInt(start * 1000).toString()}..${BigInt(end * 1000).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
}

export const daodaoCw20BalancesHistoryQuery: Query<
  | {
      // List of contract addresses and balances.
      value: { contractAddress: string; balance: string }[]
      blockHeight: number
      blockTimeUnixMs: number
    }[]
  | undefined
> = {
  type: QueryType.Url,
  name: 'daodao-cw20-balances-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ chainId, address, range }) => {
    const { start, end } = getRangeBounds(range as TimeRange)

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/tokens/list?times=${BigInt(start * 1000).toString()}..${BigInt(end * 1000).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
}

export const daodaoCommunityPoolHistoryQuery: Query = {
  type: QueryType.Url,
  name: 'daodao-community-pool-history',
  parameters: ['chainId', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ chainId, range }) => {
    const { start, end } = getRangeBounds(range as TimeRange)

    return `https://indexer.daodao.zone/${chainId}/generic/_/communityPool/balances?times=${BigInt(start * 1000).toString()}..${BigInt(end * 1000).toString()}`
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
}

export const daodaoValueHistoryQuery: Query = {
  type: QueryType.Custom,
  name: 'daodao-value-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  execute: async ({ chainId, address, range }, query) => {
    const [{ body: nativeBody }, { body: cw20Body }] = await Promise.all([
      query(daodaoBankBalancesHistoryQuery, {
        chainId,
        address,
        range,
      }),
      query(daodaoCw20BalancesHistoryQuery, {
        chainId,
        address,
        range,
      }),
    ])

    const nativeSnapshots = nativeBody || []
    const cw20Snapshots = cw20Body || []

    const uniqueAssets = uniq([
      ...nativeSnapshots.flatMap(({ value }) => Object.keys(value)),
      ...cw20Snapshots.flatMap(({ value }) =>
        value.map(({ contractAddress }) => `cw20:${contractAddress}`)
      ),
    ])

    const assets = (
      await Promise.all(
        uniqueAssets.map(async (denom) => {
          const cw20 = denom.startsWith('cw20:')
          denom = cw20 ? denom.slice(5) : denom

          const { body: asset } = await query(skipAssetQuery, {
            chainId,
            denom,
            cw20: cw20.toString(),
          })
          if (!asset?.coingecko_id || !asset.decimals) {
            return
          }

          const { body: prices } = await query(coingeckoPriceHistoryQuery, {
            id: asset.coingecko_id,
            range,
          })

          const balances = cw20
            ? cw20Snapshots.flatMap(({ value, blockTimeUnixMs }) => {
                const balance = value.find(
                  ({ contractAddress }) => contractAddress === denom
                )?.balance

                return balance
                  ? {
                      timestamp: blockTimeUnixMs,
                      balance,
                    }
                  : []
              })
            : nativeSnapshots.flatMap(({ value, blockTimeUnixMs }) => {
                const balance = value[denom]
                return balance
                  ? {
                      timestamp: blockTimeUnixMs,
                      balance,
                    }
                  : []
              })

          return prices.length && balances.length
            ? {
                denom,
                asset,
                prices: prices.map(([timestamp, price]) => ({
                  timestamp,
                  price,
                })),
                balances,
              }
            : undefined
        })
      )
    ).flatMap((data) => data || [])

    // All prices have the same timestamps, so just use the first one.
    const timestamps = assets[0]?.prices.map(({ timestamp }) => timestamp) || []

    const snapshots = timestamps.map((timestamp) => {
      // Order of values in each snapshot matches order of assets.
      const values = assets.map(({ asset, balances, prices }) => {
        const balance = findValueAtTimestamp(balances, timestamp)?.balance
        const price = findValueAtTimestamp(prices, timestamp)?.price
        const value =
          balance && price !== undefined
            ? price * (Number(balance) / Math.pow(10, asset.decimals))
            : undefined

        return { price, balance, value }
      })

      const totalValue = values.reduce(
        (acc, { value }) => acc + (value || 0),
        0
      )

      return {
        timestamp,
        values,
        totalValue,
      }
    })

    return {
      assets: assets.map(({ asset }) => asset),
      snapshots,
    }
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
}
