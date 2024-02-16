import { COINGECKO_API_KEY } from '@/config'
import { Query } from '@/types'

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
  validate: ({ range }) =>
    !['year', 'month', 'week', 'day', 'hour'].includes(range),
  url: ({ id, range }) => {
    // unix since epoch in seconds
    let from
    let to = Math.floor(Date.now() / 1000)
    switch (range) {
      case 'year':
        from = to - 365 * 24 * 60 * 60
        break
      case 'month':
        from = to - 30 * 24 * 60 * 60
        break
      case 'week':
        from = to - 7 * 24 * 60 * 60
        break
      case 'day':
        from = to - 24 * 60 * 60
        break
      case 'hour':
        from = to - 60 * 60
        break
      default:
        // Should never happen because of validation above.
        throw new Error(`invalid range: ${range}`)
    }

    return `https://pro-api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${from.toString()}&to=${to.toString()}`
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
