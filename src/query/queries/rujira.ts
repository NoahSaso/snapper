import { Query, QueryType } from '@/types'

type RujiraTIcker = {
  ask: string
  bid: string
  base_volume: string
  target_volume: string
  ticker_id: string
  base_currency: string
  last_price: string | null
  pair_id: string
  target_currency: string
}

export const rujiraTickersQuery: Query<RujiraTIcker[]> = {
  type: QueryType.Url,
  name: 'rujira-tickers',
  url: 'https://api.rujira.network/api/trade/tickers',
  // Cache price for 1 hour.
  ttl: 60 * 60,
}

export const rujiraPriceQuery: Query<number, { symbol: string }> = {
  type: QueryType.Custom,
  name: 'rujira-price',
  parameters: ['symbol'],
  execute: async ({ symbol }, query) => {
    const { body: tickers } = await query(rujiraTickersQuery, {})

    // Find SYMBOL_USDC ticker.
    const ticker = tickers.find(
      (ticker) => ticker.ticker_id === `${symbol}_USDC`
    )
    if (!ticker) {
      throw new Error(`${symbol}_USDC ticker not found`)
    }

    if (!ticker.last_price || isNaN(Number(ticker.last_price))) {
      throw new Error(`${symbol}'s USDC last price is not available`)
    }

    return Number(ticker.last_price)
  },
  // Cache for 5 minutes.
  ttl: 5 * 60,
}
