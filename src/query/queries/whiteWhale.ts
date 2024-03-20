import { Query, QueryType } from '@/types'

import { osmosisPriceQuery } from './osmosis'

type WhiteWhalePool = {
  pool_id: string
  chain_name: string
  displayName: string
  displayLogo1: string
  displayLogo2: string
  volume_24h: number
  volume_7d: number
  TVL: string
  Price: string
  APR: number
}

export const whiteWhalePoolsQuery: Query<WhiteWhalePool[]> = {
  type: QueryType.Url,
  name: 'white-whale-pools',
  url: 'https://www.api-white-whale.enigma-validator.com/summary/migaloo/all/current',
  // Cache price for 1 hour.
  ttl: 60 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const whiteWhalePriceQuery: Query<number, { symbol: string }> = {
  type: QueryType.Custom,
  name: 'white-whale-price',
  parameters: ['symbol'],
  execute: async ({ symbol }, query) => {
    const { body: pools } = await query(whiteWhalePoolsQuery, {})

    // Find SYMBOL-WHALE pool.
    const pool = pools.find((pool) => pool.pool_id === `${symbol}-WHALE`)
    if (!pool) {
      throw new Error(`${symbol}-WHALE pool not found`)
    }

    // Get WHALE USD price from Osmosis.
    const { body: whalePrice } = await query(osmosisPriceQuery, {
      symbol: 'WHALE',
    })

    // Amount of WHALE for 1 token.
    const priceInWhale = Number(pool.Price)
    const usdPrice = priceInWhale * whalePrice

    return usdPrice
  },
  // Cache for 5 minutes.
  ttl: 5 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}
