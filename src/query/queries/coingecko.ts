import { COINGECKO_API_KEY } from '@/config'
import { Query } from '@/types'
import { TimeRange, getRangeConstraints, isValidTimeRange } from '@/utils'

export const coingeckoPriceQuery: Query = {
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

export const coingeckoPriceHistoryQuery: Query = {
  name: 'coingecko-price-history',
  parameters: ['id', 'range'],
  validate: ({ range }) => isValidTimeRange(range),
  url: ({ id, range }) => {
    const { start, end } = getRangeConstraints(range as TimeRange)

    return `https://pro-api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${BigInt(start).toString()}&to=${BigInt(end).toString()}`
  },
  headers: {
    'x-cg-pro-api-key': COINGECKO_API_KEY,
  },
  transform: (body) => body.prices,
  // Cache for:
  // - 5 minutes when querying the past hour
  // - 1 hour when querying the past day
  // - 1 day when querying the rest
  ttl: ({ range }) =>
    range === 'hour' ? 60 : range === 'day' ? 60 * 60 : 24 * 60 * 60,
}
