import { Query } from '@/types'

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'
import {
  daodaoBankBalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoCw20BalancesHistoryQuery,
} from './daodao'

export const queries: Query[] = [
  coingeckoPriceQuery,
  coingeckoPriceHistoryQuery,
  daodaoBankBalancesHistoryQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
]
