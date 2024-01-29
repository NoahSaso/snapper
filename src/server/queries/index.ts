import { Query } from '@/types'

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'

export const queries: Query[] = [
  coingeckoPriceQuery,
  coingeckoPriceHistoryQuery,
]
