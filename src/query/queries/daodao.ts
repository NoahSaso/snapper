import {
  ContractName,
  DAO_CORE_CONTRACT_NAMES,
  INVALID_CONTRACT_ERROR_SUBSTRINGS,
  POLYTONE_CONFIG_PER_CHAIN,
  encodeMessageAsBase64,
  parseEncodedMessage,
  polytoneNoteProxyMapToChainIdMap,
} from '@dao-dao/utils'
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

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'
import { icaRemoteAddressQuery } from './ibc'
import {
  cosmosBalancesQuery,
  cosmosContractStateKeyQuery,
  cosmosIsIcaQuery,
} from './rpc'
import { SkipAsset, skipAssetQuery } from './skip'

/**
 * The address passed to the query to indicate that it should load tokens from
 * the community pool instead.
 */
const COMMUNITY_POOL_ADDRESS_PLACEHOLDER = 'COMMUNITY_POOL'

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

export const daodaoCw20BalancesQuery: Query<
  // List of contract addresses and balances.
  { contractAddress: string; balance: string }[],
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-cw20-balances',
  parameters: ['chainId', 'address'],
  url: ({ chainId, address }) =>
    `https://indexer.daodao.zone/${chainId}/wallet/${address}/tokens/list`,
  ttl: 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
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

export const daodaoCommunityPoolQuery: Query<
  // Map of denom to balance.
  Record<string, string | undefined>,
  {
    chainId: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-community-pool',
  parameters: ['chainId'],
  url: ({ chainId }) =>
    `https://indexer.daodao.zone/${chainId}/generic/_/communityPool/balances`,
  ttl: 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
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

export const daodaoValueQuery: Query<
  {
    assets: {
      asset: SkipAsset
      balance: string
      price: number
      value: number
    }[]
    totalValue: number
  },
  {
    chainId: string
    address: string
    // Optionally filter by token denom/address. Comma separated.
    tokenFilter?: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-value',
  parameters: ['chainId', 'address'],
  optionalParameters: ['tokenFilter'],
  execute: async ({ chainId, address, tokenFilter: _tokenFilter }, query) => {
    const tokenFilter = _tokenFilter?.split(',')
    const isCommunityPool = address === COMMUNITY_POOL_ADDRESS_PLACEHOLDER

    const [
      { body: communityPoolBody },
      { body: nativeBody },
      { body: cw20Body },
    ] = await Promise.all([
      isCommunityPool
        ? query(daodaoCommunityPoolQuery, {
            chainId,
          })
        : { body: {} as Record<string, string | undefined> },
      !isCommunityPool
        ? query(cosmosBalancesQuery, {
            chainId,
            address,
          })
        : { body: [] },
      query(daodaoCw20BalancesQuery, {
        chainId,
        address,
      }),
    ])

    const uniqueAssets = uniq([
      ...Object.keys(communityPoolBody).filter(
        (denom) => !tokenFilter || tokenFilter.includes(denom)
      ),
      ...nativeBody.flatMap(({ denom }) =>
        !tokenFilter || tokenFilter.includes(denom) ? denom : []
      ),
      ...cw20Body
        .map(({ contractAddress }) => contractAddress)
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
          if (!asset?.coingecko_id || !asset.decimals) {
            return
          }

          const { body: price } = await query(coingeckoPriceQuery, {
            id: asset.coingecko_id,
          })

          const balance = cw20
            ? cw20Body.find(({ contractAddress }) => contractAddress === denom)
                ?.balance
            : isCommunityPool
              ? communityPoolBody[denom]
              : nativeBody.find((coin) => coin.denom === denom)?.amount

          return balance
            ? {
                asset,
                balance,
                price,
                value: price * (Number(balance) / Math.pow(10, asset.decimals)),
              }
            : undefined
        })
      )
    )
      .flatMap((data) => data || [])
      .sort((a, b) => b.value - a.value)

    const totalValue = assets.reduce((acc, { value }) => acc + (value || 0), 0)

    return {
      assets,
      totalValue,
    }
  },
  ttl: 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const daodaoValueHistoryQuery: Query<
  {
    assets: SkipAsset[]
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
  optionalParameters: ['tokenFilter'],
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
          if (!asset?.coingecko_id || !asset.decimals) {
            return
          }

          const { body: prices } = await query(coingeckoPriceHistoryQuery, {
            id: asset.coingecko_id,
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

    if (!assets.length) {
      return {
        assets: [],
        snapshots: [],
      }
    }

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

export type ManyValueResponse = {
  accounts: {
    // Used in daodaoTvlQuery.
    type?: string
    chainId: string
    address: string
    assets: {
      asset: SkipAsset
      balance: string
      price: number
      value: number
    }[]
    totalValue: number
  }[]
  assets: {
    origin: {
      chainId: string
      denom: string
    }
    value: number
  }[]
  total: number
}

export const daodaoManyValueQuery: Query<
  ManyValueResponse,
  {
    // Comma-separated list of <chainId>:<address>
    accounts: string
    // Optionally filter by tokens. Comma-separated list of
    // <chainId>:<denomOrAddress>.
    tokenFilter?: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-many-value',
  parameters: ['accounts'],
  optionalParameters: ['tokenFilter'],
  validate: ({ accounts }) =>
    accounts.split(',').every((account) => account.includes(':')),
  execute: async (
    { accounts: _accounts, tokenFilter: _tokenFilter },
    query
  ) => {
    // Group by chain ID.
    const tokenFilter =
      _tokenFilter?.split(',').reduce(
        (acc, filter) => {
          const [chainId, denomOrAddress] = filter.split(':')
          return {
            ...acc,
            [chainId]: [...(acc[chainId] || []), denomOrAddress],
          }
        },
        {} as Record<string, string[]>
      ) || {}

    const accounts = await Promise.all(
      _accounts.split(',').map(async (account) => {
        const [chainId, address] = account.split(':')
        return {
          chainId,
          address,
          ...(
            await query(daodaoValueQuery, {
              chainId,
              address,
              tokenFilter: tokenFilter[chainId]?.join(','),
            })
          ).body,
        }
      })
    )

    if (!accounts.length) {
      return {
        accounts: [],
        assets: [],
        total: 0,
      }
    }

    // Get unique tokens across all accounts.
    const uniqueAssetOrigins = uniq(
      accounts.flatMap(({ assets }) =>
        assets.map(({ asset }) => serializeSkipAssetOrigin(asset))
      )
    )

    const assets = uniqueAssetOrigins
      .map((assetOrigin) => {
        // Get the value of this asset for each account.
        const accountAssetValues = accounts
          .map(
            ({ assets }) =>
              assets.find(
                ({ asset }) => serializeSkipAssetOrigin(asset) === assetOrigin
              )?.value
          )
          .flatMap((v) => (v ? [v] : []))

        // Sum account values.
        const value = accountAssetValues.reduce((acc, v) => acc + v, 0)

        return {
          origin: deserializeSkipAssetOrigin(assetOrigin),
          value,
        }
      })
      .sort((a, b) => b.value - a.value)

    const total = accounts
      .map(({ totalValue }) => totalValue)
      .reduce((acc, v) => acc + v, 0)

    return {
      accounts,
      assets,
      total,
    }
  },
  ttl: 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
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
  optionalParameters: ['tokenFilter'],
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

    if (!accountHistories.length) {
      return {
        timestamps: [],
        assets: [],
        totals: [],
      }
    }

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

export const daodaoListItemsQuery: Query<
  // List of key and value.
  [string, string][],
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-list-items',
  parameters: ['chainId', 'address'],
  url: ({ chainId, address }) =>
    `https://indexer.daodao.zone/${chainId}/contract/${address}/daoCore/listItems`,
  ttl: 30,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const daodaoListItemsWithPrefixQuery: Query<
  // List of key and value, where key has the prefix removed.
  [string, string][],
  {
    chainId: string
    address: string
    prefix: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-list-items-with-prefix',
  parameters: ['chainId', 'address', 'prefix'],
  execute: async ({ chainId, address, prefix }, query) =>
    (await query(daodaoListItemsQuery, { chainId, address })).body
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  ttl: 30,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const daodaoIcasQuery: Query<
  // List of chain ID and address of ICAs.
  {
    chainId: string
    address: string
  }[],
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-icas',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }, query) =>
    (
      await Promise.allSettled(
        (
          await query(daodaoListItemsWithPrefixQuery, {
            chainId,
            address,
            prefix: 'ica:',
          })
        ).body.map(async ([key]) => ({
          chainId: key,
          address: (
            await query(icaRemoteAddressQuery, {
              address,
              srcChainId: chainId,
              destChainId: key,
            })
          ).body,
        }))
      )
    ).flatMap((p) => (p.status === 'fulfilled' ? p.value : [])),
  ttl: 30,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const daodaoPolytoneAccountsQuery: Query<
  // List of chain ID and address of ICAs.
  {
    chainId: string
    address: string
  }[],
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-polytone-accounts',
  parameters: ['chainId', 'address'],
  // Mapping from polytone note contract to remote proxy address.
  url: ({ chainId, address }) =>
    `https://indexer.daodao.zone/${chainId}/contract/${address}/daoCore/polytoneProxies`,
  transform: (body, { chainId }) =>
    Object.entries(
      polytoneNoteProxyMapToChainIdMap(
        chainId,
        (body || {}) as Record<string, string>
      )
    ).map(([chainId, address]) => ({
      chainId,
      address,
    })),
  ttl: 30,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const daodaoAccountsQuery: Query<
  // List of chain ID and address of ICAs.
  {
    type: string
    chainId: string
    address: string
  }[],
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-accounts',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }, query) => {
    const [{ body: isIca }, { body: isPolytoneProxy }] = await Promise.all([
      query(cosmosIsIcaQuery, {
        chainId,
        address,
      }),
      query(daodaoIsPolytoneProxyQuery, {
        chainId,
        address,
      }),
    ])

    // For now, error for ICAs since we can't resolve controller from a host.
    if (isIca) {
      throw new Error('ICA reverse lookup not yet supported')
    }
    // Reverse lookup DAO from polytone proxy.
    if (isPolytoneProxy) {
      const { body: reverseLookup } = await query(
        daodaoReverseLookupPolytoneProxyQuery,
        {
          chainId,
          proxy: address,
        }
      )

      chainId = reverseLookup.chainId
      address = reverseLookup.address
    }

    const { body: isDao } = await query(daodaoIsDaoQuery, {
      chainId,
      address,
    })

    if (!isDao) {
      throw new Error('not a DAO')
    }

    const [{ body: icas }, { body: polytoneAccounts }] = await Promise.all([
      await query(daodaoIcasQuery, {
        chainId,
        address,
      }),
      await query(daodaoPolytoneAccountsQuery, {
        chainId,
        address,
      }),
    ])

    return [
      // Native account.
      {
        type: 'base',
        chainId,
        address,
      },
      // Polytone accounts.
      ...polytoneAccounts.map((account) => ({
        type: 'polytone',
        ...account,
      })),
      // ICAs.
      ...icas.map((account) => ({
        type: 'ica',
        ...account,
      })),
    ]
  },
  ttl: 30,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const daodaoTvlQuery: Query<
  ManyValueResponse,
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-tvl',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }, query) => {
    const { body: _accounts } = await query(daodaoAccountsQuery, {
      chainId,
      address,
    })

    const accounts = _accounts
      .map(({ chainId, address }) => `${chainId}:${address}`)
      .join(',')

    const { body: value } = await query(daodaoManyValueQuery, {
      accounts,
    })

    // Add types to accounts.
    value.accounts.forEach((account) => {
      account.type = _accounts.find(
        (a) => a.chainId === account.chainId && a.address === account.address
      )?.type
    })

    return value
  },
  // Update once per hour.
  ttl: 60 * 60,
  revalidate: false,
}

export const daodaoIndexerContractQuery: Query<
  any,
  {
    chainId: string
    address: string
    formula: string
    // Base64-encoded JSON object.
    args?: string
  }
> = {
  type: QueryType.Url,
  name: 'daodao-indexer-contract',
  parameters: ['chainId', 'address', 'formula'],
  optionalParameters: ['args'],
  // If args is defined, ensure it parses correctly. Otherwise, no args is also
  // valid.
  validate: ({ args }) =>
    args ? parseEncodedMessage(args) !== undefined : true,
  url: ({ chainId, address, formula, args }) =>
    `https://indexer.daodao.zone/${chainId}/contract/${address}/${formula}?${new URLSearchParams(
      parseEncodedMessage(args)
    ).toString()}`,
  // Once every 5 seconds, since this may change at every chain block.
  ttl: 5,
  revalidate: false,
}

export const daodaoIsContractQuery: Query<
  boolean,
  {
    chainId: string
    address: string
    name?: string
    names?: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-is-contract',
  parameters: ['chainId', 'address'],
  // Only one of `name` or `names` is required. `names` is a comma-separated
  // list of contract names.
  optionalParameters: ['name', 'names'],
  validate: ({ name, names }) => {
    if (!name && !names) {
      throw new Error('Either `name` or `names` is required')
    }

    if (name && names) {
      throw new Error('Only one of `name` or `names` is allowed')
    }

    return true
  },
  execute: async ({ chainId, address, name, names }, query) => {
    let contract: string | undefined
    try {
      const { body } = await query(daodaoIndexerContractQuery, {
        chainId,
        address,
        formula: 'info',
      })
      contract = body.contract
    } catch (err) {
      if (
        err instanceof Error &&
        INVALID_CONTRACT_ERROR_SUBSTRINGS.some((substring) =>
          (err as Error).message.includes(substring)
        )
      ) {
        return false
      }
    }

    // On failure, attempt to load from chain.
    if (!contract) {
      try {
        const { body: data } = await query(cosmosContractStateKeyQuery, {
          chainId,
          address,
          key: 'contract_info',
        })
        const info = data && JSON.parse(data)
        if (info && typeof info.contract === 'string' && info.contract) {
          contract = info.contract
        }
      } catch (err) {
        if (
          err instanceof Error &&
          INVALID_CONTRACT_ERROR_SUBSTRINGS.some((substring) =>
            (err as Error).message.includes(substring)
          )
        ) {
          return false
        }

        // Rethrow other errors because it should not have failed.
        throw err
      }
    }

    return !contract
      ? false
      : name
        ? contract.includes(name)
        : names
          ? names.split(',').some((name) => contract!.includes(name))
          : false
  },
  // Update once per week.
  ttl: 7 * 24 * 60 * 60,
  revalidate: true,
}

export const daodaoIsDaoQuery: Query<
  boolean,
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-is-dao',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }, query) =>
    (
      await query(daodaoIsContractQuery, {
        chainId,
        address,
        names: DAO_CORE_CONTRACT_NAMES.join(','),
      })
    ).body,
  // Update once per week. Really this should never change...
  ttl: 7 * 24 * 60 * 60,
  revalidate: true,
}

export const daodaoIsPolytoneProxyQuery: Query<
  boolean,
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-is-polytone-proxy',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }, query) =>
    (
      await query(daodaoIsContractQuery, {
        chainId,
        address,
        name: ContractName.PolytoneProxy,
      })
    ).body,
  // Update once per week. Really this should never change...
  ttl: 7 * 24 * 60 * 60,
  revalidate: true,
}

/**
 * Given a polytone proxy, get the source chain, address, and polytone note.
 */
export const daodaoReverseLookupPolytoneProxyQuery: Query<
  {
    chainId: string
    address: string
    note: string
  },
  {
    chainId: string
    proxy: string
  }
> = {
  type: QueryType.Custom,
  name: 'daodao-reverse-lookup-polytone-proxy',
  parameters: ['chainId', 'proxy'],
  execute: async ({ chainId, proxy }, query) => {
    const { body: voice } = await query(daodaoIndexerContractQuery, {
      chainId,
      address: proxy,
      formula: 'polytone/proxy/instantiator',
    })

    if (typeof voice !== 'string') {
      throw new Error('No voice found')
    }

    const srcPolytoneInfo = POLYTONE_CONFIG_PER_CHAIN.find(([, config]) =>
      Object.entries(config).some(
        ([destChainId, connection]) =>
          destChainId === chainId && connection.voice === voice
      )
    )
    if (!srcPolytoneInfo) {
      throw new Error('No polytone config found for voice')
    }

    const { body: address } = await query(daodaoIndexerContractQuery, {
      chainId,
      address: voice,
      formula: 'polytone/voice/remoteController',
      args: encodeMessageAsBase64({
        address: proxy,
      }),
    })

    if (typeof address !== 'string') {
      throw new Error('No address found')
    }

    return {
      chainId: srcPolytoneInfo[0],
      address,
      note: srcPolytoneInfo[1][chainId].note,
    }
  },
  // Update once per week. Really this should never change...
  ttl: 7 * 24 * 60 * 60,
  revalidate: true,
}
