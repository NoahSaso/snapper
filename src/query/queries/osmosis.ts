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
    `https://public-osmosis-api.numia.xyz/tokens/v2/${symbol}`,
  transform: (body) =>
    (body as { price: number }[])?.find((p) => p.price)?.price,
  // Cache price for 5 minutes.
  ttl: 5 * 60,
}
