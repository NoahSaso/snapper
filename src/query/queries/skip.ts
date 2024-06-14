import { Query, QueryType } from '@/types'

const SKIP_API_BASE = 'https://api.skip.money'

export type SkipChain = {
  chain_name: string
  chain_id: string
  pfm_enabled: boolean
  cosmos_module_support: Record<string, boolean | undefined>
  supports_memo: boolean
  logo_uri: string
  bech32_prefix: string
  fee_assets: {
    denom: string
    gas_price: {
      low: string
      average: string
      high: string
    }
  }[]
  chain_type: string
  ibc_capabilities: Record<string, boolean | undefined>
}

export type SkipAsset = {
  denom: string
  chain_id: string
  origin_denom: string
  origin_chain_id: string
  trace: string
  is_cw20: boolean
  is_evm: boolean
  symbol: string
  name: string
  logo_uri: string
  decimals: number
  description: string
  coingecko_id?: string
  token_contract?: string
  recommended_symbol: string
}

export type SkipAssetRecommendation = {
  asset: SkipAsset
  reason: string
}

export const skipChainsQuery: Query<SkipChain[]> = {
  type: QueryType.Url,
  name: 'skip-chains',
  url: SKIP_API_BASE + '/v2/info/chains',
  transform: (body: any) => body?.chains || [],
  // Cache for a day.
  ttl: 24 * 60 * 60,
}

export const skipChainQuery: Query<
  SkipChain | undefined,
  { chainId: string; chainName: string }
> = {
  type: QueryType.Custom,
  name: 'skip-chain',
  optionalParameters: ['chainId', 'chainName'],
  validate: ({ chainId, chainName }) => {
    if (!chainId && !chainName) {
      return new Error('chainId or chainName is required')
    }

    if (chainId && chainName) {
      return new Error('chainId and chainName are mutually exclusive')
    }

    return true
  },
  execute: async ({ chainId, chainName }, query) => {
    const { body: chains } = await query(skipChainsQuery, {})

    return chains && Array.isArray(chains)
      ? chains.find(
          (chain) =>
            (chainId && chain.chain_id === chainId) ||
            (chainName && chain.chain_name === chainName)
        )
      : undefined
  },
  // Cache for a day.
  ttl: 24 * 60 * 60,
}

export const skipAssetsQuery: Query<
  SkipAsset[],
  {
    chainId: string
  }
> = {
  type: QueryType.Url,
  name: 'skip-assets',
  parameters: ['chainId'],
  url: ({ chainId }) =>
    SKIP_API_BASE +
    '/v1/fungible/assets?chainId=' +
    chainId +
    '&include_cw20_assets=true',
  transform: (body: any, { chainId }) =>
    body?.chain_to_assets_map?.[chainId]?.assets || [],
  // Cache for a day.
  ttl: 24 * 60 * 60,
}

export const skipAssetQuery: Query<
  SkipAsset | undefined,
  {
    chainId: string
    denom: string
    cw20?: string
  }
> = {
  type: QueryType.Custom,
  name: 'skip-asset',
  parameters: ['chainId', 'denom'],
  optionalParameters: ['cw20'],
  execute: async ({ chainId, denom, cw20 }, query) => {
    const { body: assets } = await query(skipAssetsQuery, { chainId })

    return assets && Array.isArray(assets)
      ? assets.find(
          (asset) =>
            (cw20 !== 'true' ? asset.denom : asset.token_contract) === denom
        )
      : undefined
  },
  // Cache for a day.
  ttl: 24 * 60 * 60,
}

export const skipRecommendedAssetsQuery: Query<
  SkipAssetRecommendation[],
  {
    sourceAssetChainId: string
    sourceAssetDenom: string
    destChainId: string
  }
> = {
  type: QueryType.Url,
  name: 'skip-recommended-assets',
  parameters: ['sourceAssetChainId', 'sourceAssetDenom', 'destChainId'],
  method: 'POST',
  url: SKIP_API_BASE + '/v1/fungible/recommend_assets',
  data: ({ sourceAssetChainId, sourceAssetDenom, destChainId }) => ({
    requests: [
      {
        source_asset_chain_id: sourceAssetChainId,
        source_asset_denom: sourceAssetDenom,
        dest_chain_id: destChainId,
      },
    ],
  }),
  transform: (body: any) =>
    body?.recommendation_entries?.flatMap(
      ({ recommendations }: { recommendations: SkipAssetRecommendation[] }) =>
        recommendations
    ) || [],
  // Cache for a day.
  ttl: 24 * 60 * 60,
}

export const skipRecommendedAssetQuery: Query<
  SkipAssetRecommendation | undefined,
  {
    sourceAssetChainId: string
    sourceAssetDenom: string
    destChainId: string
  }
> = {
  type: QueryType.Custom,
  name: 'skip-recommended-asset',
  parameters: skipRecommendedAssetsQuery.parameters,
  execute: async (params, query) => {
    const { body: recommendations } = await query(
      skipRecommendedAssetsQuery,
      params
    )

    return (
      recommendations.find(({ reason }) => reason === 'BASE_TOKEN') ||
      recommendations.find(({ reason }) => reason === 'MOST_LIQUID') ||
      recommendations.find(({ reason }) => reason === 'DIRECT') ||
      recommendations[0]
    )
  },
  ttl: skipRecommendedAssetsQuery.ttl,
}
