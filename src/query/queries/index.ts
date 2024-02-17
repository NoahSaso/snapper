import { Query } from '@/types'

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'
import {
  daodaoBankBalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoCw20BalancesHistoryQuery,
} from './daodao'
import { skipAssetQuery, skipAssetsQuery } from './skip'

export const queries: Query[] = [
  coingeckoPriceQuery,
  coingeckoPriceHistoryQuery,
  daodaoBankBalancesHistoryQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
  skipAssetsQuery,
  skipAssetQuery,
]
