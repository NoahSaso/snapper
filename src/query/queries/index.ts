import { Query } from '@/types'

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'
import {
  daodaoBankBalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoManyValueHistoryQuery,
  daodaoValueHistoryQuery,
} from './daodao'
import {
  skipAssetQuery,
  skipAssetsQuery,
  skipChainQuery,
  skipChainsQuery,
  skipRecommendedAssetsQuery,
} from './skip'

export const queries: Query<any, any>[] = [
  coingeckoPriceQuery,
  coingeckoPriceHistoryQuery,
  daodaoBankBalancesHistoryQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoValueHistoryQuery,
  daodaoManyValueHistoryQuery,
  skipChainsQuery,
  skipChainQuery,
  skipAssetsQuery,
  skipAssetQuery,
  skipRecommendedAssetsQuery,
]
