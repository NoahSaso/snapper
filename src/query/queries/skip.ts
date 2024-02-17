import { Query, QueryType } from '@/types'

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
  coingecko_id: string
  recommended_symbol: string
}

export const skipAssetsQuery: Query<SkipAsset[]> = {
  type: QueryType.Url,
  name: 'skip-assets',
  parameters: ['chainId'],
  url: ({ chainId }) =>
    `https://api.skip.money/v1/fungible/assets?include_cw20_assets=true&chain_id=${chainId}`,
  transform: (body, { chainId }) =>
    (body as any).chain_to_assets_map?.[chainId]?.assets || [],
  // Cache chain assets for a day.
  ttl: 24 * 60 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const skipAssetQuery: Query<SkipAsset | undefined> = {
  type: QueryType.Custom,
  name: 'skip-asset',
  parameters: ['chainId', 'denom'],
  optionalParameters: ['cw20'],
  execute: async ({ chainId, denom, cw20 }, query) => {
    const { body: assets } = await query(skipAssetsQuery, { chainId })

    return assets && Array.isArray(assets)
      ? assets.find(
          (asset) => asset.denom === denom && (cw20 !== 'true' || asset.is_cw20)
        )
      : undefined
  },
  // Cache chain assets for a day.
  ttl: 24 * 60 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}
