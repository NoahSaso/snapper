import { ChainId } from '@dao-dao/types'

import { Query, QueryType } from '@/types'

import { skipRecommendedAssetQuery } from './skip'

type AstroportToken = {
  chainId: string
  denom: string
  symbol: string
  description: string
  decimals: number
  priceUSD: number
  totalLiquidityUSD: number
  dayVolumeUSD: number
}

export const astroportPriceQuery: Query<
  number,
  {
    denom: string
  }
> = {
  type: QueryType.Url,
  name: 'astroport-price',
  parameters: ['denom'],
  url: ({ denom }) =>
    `https://api.astroport.fi/api/tokens/${denom}?chainId=neutron-1`,
  transform: (body) => (body as AstroportToken).priceUSD,
  // Cache price for 5 minutes.
  ttl: 5 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}

/**
 * Resolve asset from any chain to Neutron denom in order to fetch its price
 * from Astroport on Neutron.
 */
export const astroportResolvedPriceQuery: Query<
  number,
  {
    chainId: string
    denom: string
  }
> = {
  type: QueryType.Custom,
  name: 'astroport-resolved-price',
  parameters: ['chainId', 'denom'],
  execute: async ({ chainId, denom }, query) => {
    if (chainId !== ChainId.NeutronMainnet) {
      const { body: recommendation } = await query(skipRecommendedAssetQuery, {
        sourceAssetChainId: chainId,
        sourceAssetDenom: denom,
        destChainId: ChainId.NeutronMainnet,
      })
      if (!recommendation) {
        throw new Error('Asset not found')
      }

      denom = recommendation.asset.denom
    }

    return (
      await query(astroportPriceQuery, {
        denom,
      })
    ).body
  },
  // Cache price for 5 minutes.
  ttl: 5 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}
