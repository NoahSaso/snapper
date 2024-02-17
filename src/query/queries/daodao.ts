import { Asset } from '@skip-router/core'
import uniq from 'lodash.uniq'

import { Query, QueryType } from '@/types'
import {
  TimeRange,
  deserializeSkipAssetOrigin,
  findValueAtTimestamp,
  getRangeBounds,
  isValidTimeRange,
  serializeSkipAssetOrigin,
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
  | undefined,
  {
    chainId: string
    address: string
    range: TimeRange
    // Optionally specify an end timestamp.
    end?: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-bank-balances-history',
  parameters: ['chainId', 'address', 'range'],
  optionalParameters: ['end'],
  validate: ({ range, end }) =>
    isValidTimeRange(range) &&
    (!end || (!isNaN(Number(end)) && Number(end) > 0)),
  url: ({ chainId, address, range, end: endTime }) => {
    const { start, end, interval } = getRangeBounds(
      range,
      endTime ? new Date(Number(endTime)) : undefined
    )

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/bank/balances?times=${BigInt(start * 1000).toString()}..${BigInt(end * 1000).toString()}&timeStep=${BigInt(interval * 1000).toString()}`
  },
  // Cache for:
  // - 1 minute when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
  // No need to auto-revalidate for short ranges.
  revalidate: ({ range }) =>
    range !== TimeRange.Hour && range !== TimeRange.Day,
}

export const daodaoCw20BalancesHistoryQuery: Query<
  | {
      // List of contract addresses and balances.
      value: { contractAddress: string; balance: string }[]
      blockHeight: number
      blockTimeUnixMs: number
    }[]
  | undefined,
  {
    chainId: string
    address: string
    range: TimeRange
    // Optionally specify an end timestamp.
    end?: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-cw20-balances-history',
  parameters: ['chainId', 'address', 'range'],
  optionalParameters: ['end'],
  validate: ({ range, end }) =>
    isValidTimeRange(range) &&
    (!end || (!isNaN(Number(end)) && Number(end) > 0)),
  url: ({ chainId, address, range, end: endTime }) => {
    const { start, end, interval } = getRangeBounds(
      range,
      endTime ? new Date(Number(endTime)) : undefined
    )

    return `https://indexer.daodao.zone/${chainId}/wallet/${address}/tokens/list?times=${BigInt(start * 1000).toString()}..${BigInt(end * 1000).toString()}&timeStep=${BigInt(interval * 1000).toString()}`
  },
  // Cache for:
  // - 1 minute when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
  // No need to auto-revalidate for short ranges.
  revalidate: ({ range }) =>
    range !== TimeRange.Hour && range !== TimeRange.Day,
}

export const daodaoCommunityPoolHistoryQuery: Query<
  | {
      // Map of denom to balance.
      value: Record<string, string | undefined>
      blockHeight: number
      blockTimeUnixMs: number
    }[]
  | undefined,
  {
    chainId: string
    range: TimeRange
    // Optionally specify an end timestamp.
    end?: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-community-pool-history',
  parameters: ['chainId', 'range'],
  optionalParameters: ['end'],
  validate: ({ range, end }) =>
    isValidTimeRange(range) &&
    (!end || (!isNaN(Number(end)) && Number(end) > 0)),
  url: ({ chainId, range, end: endTime }) => {
    const { start, end, interval } = getRangeBounds(
      range,
      endTime ? new Date(Number(endTime)) : undefined
    )

    return `https://indexer.daodao.zone/${chainId}/generic/_/communityPool/balances?times=${BigInt(start * 1000).toString()}..${BigInt(end * 1000).toString()}&timeStep=${BigInt(interval * 1000).toString()}`
  },
  // Cache for:
  // - 1 minute when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
  // No need to auto-revalidate for short ranges.
  revalidate: ({ range }) =>
    range !== TimeRange.Hour && range !== TimeRange.Day,
}

/**
 * The address passed to the query to indicate that it should load tokens from
 * the community pool instead.
 */
const COMMUNITY_POOL_ADDRESS_PLACEHOLDER = 'COMMUNITY_POOL'

export const daodaoValueHistoryQuery: Query<
  {
    assets: Asset[]
    snapshots: {
      timestamp: number
      values: {
        price?: number
        balance?: string
        value?: number
      }[]
      totalValue: number
    }[]
  },
  {
    chainId: string
    address: string
    range: TimeRange
    // Optionally filter by token denom/address. Comma separated.
    tokenFilter?: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-value-history',
  parameters: ['chainId', 'address', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  execute: async (
    { chainId, address, range, tokenFilter: _tokenFilter },
    query
  ) => {
    const tokenFilter = _tokenFilter?.split(',')
    const end = Date.now().toString()
    const isCommunityPool = address === COMMUNITY_POOL_ADDRESS_PLACEHOLDER

    const [{ body: nativeBody }, { body: cw20Body }] = await Promise.all([
      isCommunityPool
        ? query(daodaoCommunityPoolHistoryQuery, {
            chainId,
            range,
            end,
          })
        : query(daodaoBankBalancesHistoryQuery, {
            chainId,
            address,
            range,
            end,
          }),
      query(daodaoCw20BalancesHistoryQuery, {
        chainId,
        address,
        range,
        end,
      }),
    ])

    const nativeSnapshots = nativeBody || []
    const cw20Snapshots = cw20Body || []

    const uniqueAssets = uniq([
      ...nativeSnapshots
        .flatMap(({ value }) => Object.keys(value))
        .filter((denom) => !tokenFilter || tokenFilter.includes(denom)),
      ...cw20Snapshots
        .flatMap(({ value }) =>
          value.map(({ contractAddress }) => contractAddress)
        )
        .filter(
          (contractAddress) =>
            !tokenFilter || tokenFilter.includes(contractAddress)
        )
        .map((contractAddress) => `cw20:${contractAddress}`),
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
          if (!asset?.coingeckoID || !asset.decimals) {
            return
          }

          const { body: prices } = await query(coingeckoPriceHistoryQuery, {
            id: asset.coingeckoID,
            range,
            end,
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

    // All prices have similar timestamps since they use the same range (though
    // they may have been cached at different times), so choose the one with the
    // most timestamps available.
    const assetWithMostPrices = assets.reduce((acc, asset) =>
      asset.prices.length > acc.prices.length ? asset : acc
    )
    // Chop off the first two timestamps. Even though we fetch the same range
    // for each asset, they tend to start/end at slightly different times,
    // meaning we can't guarantee that we know the price of every asset at any
    // of their first timestamps. Since they all use the same range, the
    // interval should remain constant. Thus each asset's second timestamp
    // should be after all of the first timestamps for each asset and be safe to
    // use. To be extra safe, chop off the first two timestamps. Also the price
    // history queries add some buffer at the beginning to account for this.
    const timestamps =
      assetWithMostPrices?.prices.map(({ timestamp }) => timestamp).slice(2) ||
      []

    const snapshots = timestamps.flatMap((timestamp) => {
      // Order of values in each snapshot matches order of assets.
      const values = assets.map(({ asset, balances, prices }) => {
        const balance = findValueAtTimestamp(balances, timestamp)?.balance
        const price = findValueAtTimestamp(prices, timestamp)?.price
        const value =
          balance && price !== undefined && asset.decimals
            ? price * (Number(balance) / Math.pow(10, asset.decimals))
            : undefined

        return { price, balance, value }
      })

      // Ignore snapshots with no values.
      if (!values.some(({ value }) => value !== undefined)) {
        return []
      }

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
      ? 5 * 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
  // No need to auto-revalidate for short ranges.
  revalidate: ({ range }) => range !== TimeRange.Hour,
}

export const daodaoManyValueHistoryQuery: Query<
  {
    timestamps: number[]
    assets: {
      origin: {
        chainId: string
        denom: string
      }
      // Value at each timestamp.
      values: (number | null)[]
    }[]
    // Total value at each timestamp.
    totals: (number | null)[]
  },
  {
    // Comma-separated list of <chainId>:<address>
    accounts: string
    range: TimeRange
    // Optionally filter by tokens. Comma-separated list of
    // <chainId>:<denomOrAddress>.
    tokenFilter?: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-many-value-history',
  parameters: ['accounts', 'range'],
  validate: ({ accounts, range }) =>
    accounts.split(',').every((account) => account.includes(':')) &&
    isValidTimeRange(range),
  execute: async ({ accounts, range, tokenFilter: _tokenFilter }, query) => {
    // Group by chain ID.
    const tokenFilter = _tokenFilter?.split(',').reduce(
      (acc, filter) => {
        const [chainId, denomOrAddress] = filter.split(':')
        return {
          ...acc,
          [chainId]: [...(acc[chainId] || []), denomOrAddress],
        }
      },
      {} as Record<string, string[]>
    )

    const accountHistories = await Promise.all(
      accounts.split(',').map(async (account) => {
        const [chainId, address] = account.split(':')
        return (
          await query(daodaoValueHistoryQuery, {
            chainId,
            address,
            range,
            tokenFilter: tokenFilter?.[chainId].join(','),
          })
        ).body
      })
    )

    // All queries have similar timestamps since they use the same range
    // (though they may have been cached at different times), so choose the
    // one with the most timestamps available.
    const oldestAccount = accountHistories.reduce((acc, account) =>
      account.snapshots.length > acc.snapshots.length ? account : acc
    )
    let timestamps =
      oldestAccount?.snapshots.map(({ timestamp }) => timestamp) || []

    // Get unique tokens across all accounts.
    const uniqueAssetOrigins = uniq(
      accountHistories.flatMap(({ assets }) =>
        assets.map(serializeSkipAssetOrigin)
      )
    )

    const assets = uniqueAssetOrigins.map((assetOrigin) => {
      // Get the snapshots of this token at each timestamp for each account.
      const accountTokenSnapshots = accountHistories.map(
        ({ assets, snapshots }) => {
          // Get the index of this asset in the snapshots for this account's
          // historical balances.
          const snapshotAssetIndex = assets.findIndex(
            (asset) => serializeSkipAssetOrigin(asset) === assetOrigin
          )

          if (snapshotAssetIndex === -1) {
            return []
          }

          // Extract this token's value at each timestamp.
          return snapshots.map(({ timestamp, values }) => ({
            timestamp,
            value: values[snapshotAssetIndex].value,
          }))
        }
      )

      const values = timestamps.map((timestamp) => {
        // Get the account values at this timestamp for each account.
        const accountValues = accountTokenSnapshots.map(
          (snapshots) => findValueAtTimestamp(snapshots, timestamp)?.value
        )

        // Sum the values at this timestamp. If all are undefined, return null
        // to indicate there's no data for this timestamp.
        return accountValues.reduce(
          (acc, value) =>
            acc === null && value === undefined
              ? null
              : (acc || 0) + (value || 0),
          null as number | null
        )
      })

      return {
        origin: deserializeSkipAssetOrigin(assetOrigin),
        values,
      }
    })

    // Sum up the values at each timestamp, ignoring null values.
    let totals = timestamps.map((_, index) =>
      assets.reduce((acc, { values }) => acc + (values[index] || 0), 0)
    )

    // Remove timestamps at the front that have no data for all tokens.

    // Get first timestamp with a value.
    let firstNonNullTimestamp = timestamps.findIndex((_, index) =>
      assets.some(({ values }) => values[index] !== null)
    )

    // If no non-null timestamps, remove all.
    if (firstNonNullTimestamp === -1) {
      firstNonNullTimestamp = totals.length
    }

    if (firstNonNullTimestamp > 0) {
      timestamps = timestamps.slice(firstNonNullTimestamp)
      assets.forEach(
        (data) => (data.values = data.values.slice(firstNonNullTimestamp))
      )
      totals = totals.slice(firstNonNullTimestamp)
    }

    return {
      timestamps,
      assets,
      totals,
    }
  },
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour
      ? 5 * 60
      : range === TimeRange.Day
        ? 60 * 60
        : 24 * 60 * 60,
  // No need to auto-revalidate for short ranges.
  revalidate: ({ range }) => range !== TimeRange.Hour,
}
