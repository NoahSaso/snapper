import { Query } from '@/types'

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'
import {
  daodaoBankBalancesHistoryQuery,
  daodaoBankBalancesQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoCommunityPoolQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCw20BalancesQuery,
  daodaoManyValueHistoryQuery,
  daodaoManyValueQuery,
  daodaoValueHistoryQuery,
  daodaoValueQuery,
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
  daodaoBankBalancesQuery,
  daodaoBankBalancesHistoryQuery,
  daodaoCw20BalancesQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCommunityPoolQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoValueQuery,
  daodaoValueHistoryQuery,
  daodaoManyValueQuery,
  daodaoManyValueHistoryQuery,
  skipChainsQuery,
  skipChainQuery,
  skipAssetsQuery,
  skipAssetQuery,
  skipRecommendedAssetsQuery,
]
