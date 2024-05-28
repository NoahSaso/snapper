import { COINGECKO_API_KEY } from '@/config'
import { Query, QueryType } from '@/types'
import { TimeRange, getRangeBounds, isValidTimeRange } from '@/utils'

export const coingeckoPriceQuery: Query<
  number,
  {
    id: string
  }
> = {
  type: QueryType.Url,
  name: 'coingecko-price',
  parameters: ['id'],
  url: ({ id }) =>
    `https://pro-api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
  headers: {
    'x-cg-pro-api-key': COINGECKO_API_KEY,
  },
  transform: (body, { id }) => (body[id] as { usd: number }).usd,
  // Cache price for 5 minutes.
  ttl: 5 * 60,
}

export const coingeckoPriceHistoryQuery: Query<
  [number, number][],
  {
    id: string
    range: TimeRange
    // Optionally specify an end timestamp.
    end?: string
  }
> = {
  type: QueryType.Url,
  name: 'coingecko-price-history',
  parameters: ['id', 'range'],
  optionalParameters: ['end'],
  validate: ({ range, end }) =>
    isValidTimeRange(range) &&
    (!end || (!isNaN(Number(end)) && Number(end) > 0)),
  url: ({ id, range, end: endTime }) => {
    const { start, end } = getRangeBounds(
      range,
      endTime ? new Date(Number(endTime)) : undefined
    )

    return `https://pro-api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${BigInt(start).toString()}&to=${BigInt(end).toString()}`
  },
  headers: {
    'x-cg-pro-api-key': COINGECKO_API_KEY,
  },
  transform: (body) => body.prices as [number, number][],
  // Cache for:
  // - 1 minute when querying the past hour or day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === TimeRange.Hour || range === TimeRange.Day ? 60 : 24 * 60 * 60,
}
