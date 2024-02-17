import { Asset, SKIP_API_URL, SkipRouter } from '@skip-router/core'

import { Query, QueryType } from '@/types'

const client = new SkipRouter({
  apiURL: SKIP_API_URL,
})

export const skipAssetsQuery: Query<
  Asset[],
  {
    chainId: string
  }
> = {
  type: QueryType.Custom,
  name: 'skip-assets',
  parameters: ['chainId'],
  execute: async ({ chainId }) =>
    (
      await client.assets({
        chainID: chainId,
      })
    )[chainId] || [],
  // Cache chain assets for a day.
  ttl: 24 * 60 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

export const skipAssetQuery: Query<
  Asset | undefined,
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
          (asset) => asset.denom === denom && (cw20 !== 'true' || asset.isCW20)
        )
      : undefined
  },
  // Cache chain assets for a day.
  ttl: 24 * 60 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}
