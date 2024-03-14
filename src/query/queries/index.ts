import { Query } from '@/types'

import { coingeckoPriceHistoryQuery, coingeckoPriceQuery } from './coingecko'
import {
  daodaoAccountsQuery,
  daodaoBankBalancesHistoryQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoCommunityPoolQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCw20BalancesQuery,
  daodaoIcasQuery,
  daodaoListItemsQuery,
  daodaoListItemsWithPrefixQuery,
  daodaoManyValueHistoryQuery,
  daodaoManyValueQuery,
  daodaoTvlQuery,
  daodaoValueHistoryQuery,
  daodaoValueQuery,
} from './daodao'
import {
  ibcChainRegistryQuery,
  ibcTransferInfoQuery,
  icaRemoteAddressQuery,
} from './ibc'
import { cosmosBalancesQuery } from './rpc'
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
  daodaoCw20BalancesQuery,
  daodaoCw20BalancesHistoryQuery,
  daodaoCommunityPoolQuery,
  daodaoCommunityPoolHistoryQuery,
  daodaoValueQuery,
  daodaoValueHistoryQuery,
  daodaoManyValueQuery,
  daodaoManyValueHistoryQuery,
  daodaoListItemsQuery,
  daodaoListItemsWithPrefixQuery,
  daodaoIcasQuery,
  daodaoAccountsQuery,
  daodaoTvlQuery,
  ibcChainRegistryQuery,
  ibcTransferInfoQuery,
  icaRemoteAddressQuery,
  skipChainsQuery,
  skipChainQuery,
  skipAssetsQuery,
  skipAssetQuery,
  skipRecommendedAssetsQuery,
  cosmosBalancesQuery,
]
