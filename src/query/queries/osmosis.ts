import { Query, QueryType } from '@/types'

export const osmosisPriceQuery: Query<
  number | undefined,
  {
    symbol: string
  }
> = {
  type: QueryType.Url,
  name: 'osmosis-price',
  parameters: ['symbol'],
  url: ({ symbol }) =>
    `https://api-osmosis.imperator.co/tokens/v2/price/${symbol}`,
  transform: (body) => (body as { price: number }).price,
  // Cache price for 5 minutes.
  ttl: 5 * 60,
}
