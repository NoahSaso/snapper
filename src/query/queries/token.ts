import { assets, chains } from 'chain-registry'

import { Query, QueryType } from '@/types'

import { astroportResolvedPriceQuery } from './astroport'
import { coingeckoPriceQuery } from './coingecko'
import { moralisTokenPriceQuery } from './moralis'
import { osmosisPriceQuery } from './osmosis'
import { rujiraPriceQuery } from './rujira'
import { skipAssetQuery } from './skip'

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

    let asset:
      | {
          denom: string
          symbol: string
          recommended_symbol?: string
          coingecko_id?: string
        }
      | undefined = (
      await query(skipAssetQuery, {
        chainId,
        denom,
        cw20,
      })
    ).body
    if (!asset) {
      // If asset not found, try the chain registry.
      const chain = chains.find((c) => c.chain_id === chainId)
      if (chain) {
        const foundAsset = assets
          .find((a) => a.chain_name === chain.chain_name)
          ?.assets.find((a) =>
            cw20 === 'true' ? a.address === denom : a.base === denom
          )
        if (foundAsset) {
          asset = {
            denom: foundAsset.base,
            symbol: foundAsset.symbol,
            coingecko_id: foundAsset.coingecko_id,
          }
        }
      }

      if (!asset) {
        throw new Error('Asset not found')
      }
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
        query(rujiraPriceQuery, {
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
