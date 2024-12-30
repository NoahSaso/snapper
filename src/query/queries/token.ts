import { Query, QueryType } from '@/types'

import { astroportResolvedPriceQuery } from './astroport'
import { coingeckoPriceQuery } from './coingecko'
import { moralisTokenPriceQuery } from './moralis'
import { osmosisPriceQuery } from './osmosis'
import { skipAssetQuery } from './skip'
import { whiteWhalePriceQuery } from './whiteWhale'

export const tokenPriceQuery: Query<
  number,
  {
    chainId: string
    denom: string
    cw20?: string
  }
> = {
  type: QueryType.Custom,
  name: 'token-price',
  parameters: ['chainId', 'denom'],
  optionalParameters: ['cw20'],
  execute: async ({ chainId, denom, cw20 }, query) => {
    // Ethereum
    if (chainId === 'ethereum') {
      return (
        await query(moralisTokenPriceQuery, {
          chainId,
          address: denom,
        })
      ).body
    } else if (chainId === 'holesky') {
      throw new Error('Holesky not supported')
    }

    const { body: asset } = await query(skipAssetQuery, {
      chainId,
      denom,
      cw20,
    })
    if (!asset) {
      throw new Error('Asset not found')
    }

    // Load prices from all sources and use first that is available.
    const price = (
      await Promise.allSettled([
        asset.coingecko_id
          ? query(coingeckoPriceQuery, {
              id: asset.coingecko_id,
            })
          : Promise.reject(),
        query(osmosisPriceQuery, {
          symbol: asset.recommended_symbol || asset.symbol,
        }),
        query(astroportResolvedPriceQuery, {
          chainId,
          denom: asset.denom,
        }),
        query(whiteWhalePriceQuery, {
          symbol: asset.symbol,
        }),
      ])
    ).flatMap((p) =>
      p.status === 'fulfilled' && p.value.body !== undefined ? p.value : []
    )[0]?.body

    if (!price) {
      throw new Error('Price not found')
    }

    return price
  },
  // Cache for 5 minutes.
  ttl: 5 * 60,
}
