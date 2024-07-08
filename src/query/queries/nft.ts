import { transformIpfsUrlToHttpsIfNecessary } from '@dao-dao/utils'

import { Query, QueryType } from '@/types'
import { validateChainId } from '@/utils'

import { cosmosNftInfoQuery } from './rpc'

type NftInfoResponse = {
  // Extension can be anything. Let's check if any common image fields are
  // present and use them if so.
  extension?: {
    image?: string
    image_uri?: string
    image_url?: string
  } | null
  token_uri?: string | null
}

export const indexerNftInfoQuery: Query<
  NftInfoResponse | undefined,
  {
    chainId: string
    collectionAddress: string
    tokenId: string
  }
> = {
  type: QueryType.Url,
  name: 'indexer-nft-info',
  parameters: ['chainId', 'collectionAddress', 'tokenId'],
  validate: validateChainId,
  url: ({ chainId, collectionAddress, tokenId }) =>
    `https://indexer.daodao.zone/${chainId}/contract/${collectionAddress}/cw721/nftInfo?tokenId=${tokenId}`,
  // This query should really never change...
  // Cache for 2 weeks.
  ttl: 2 * 7 * 24 * 60 * 60,
}

export const nftImageUrlQuery: Query<
  string | undefined,
  { chainId: string; collectionAddress: string; tokenId: string }
> = {
  type: QueryType.Custom,
  name: 'nft-image-url',
  parameters: ['chainId', 'collectionAddress', 'tokenId'],
  validate: validateChainId,
  execute: async ({ chainId, collectionAddress, tokenId }, query) => {
    // Attempt to fetch from indexer.
    let info: NftInfoResponse | undefined = await query(indexerNftInfoQuery, {
      chainId,
      collectionAddress,
      tokenId,
    })
      .then(({ body }) => body)
      .catch(() => undefined)

    // Fallback to chain.
    info ||= (
      await query(cosmosNftInfoQuery, {
        chainId,
        collectionAddress,
        tokenId,
      })
    ).body

    if (!info) {
      return
    }

    // If NFT has extension with image, we're satisfied. Checks `image`,
    // `image_uri`, and `image_url`.
    if ('extension' in info && info.extension) {
      if ('image' in info.extension && info.extension.image) {
        return info.extension.image
      }
      if ('image_uri' in info.extension && info.extension.image_uri) {
        return info.extension.image_uri
      }
      if ('image_url' in info.extension && info.extension.image_url) {
        return info.extension.image_url
      }
    }

    // Check token URI data.
    let imageUrl: string | undefined
    if ('token_uri' in info && info.token_uri) {
      // Transform IPFS url if necessary.
      const response = await fetch(
        transformIpfsUrlToHttpsIfNecessary(info.token_uri)
      )
      const data = await response.text()

      // Only try to parse if there's a good chance this is JSON, the
      // heuristic being the first non-whitespace character is a "{".
      if (data.trimStart().startsWith('{')) {
        try {
          const json = JSON.parse(data)
          if (typeof json.image === 'string' && json.image) {
            imageUrl = json.image
          }
        } catch (err) {
          console.error(err)
          throw new Error('Failed to parse token_uri data as JSON.')
        }
      } else {
        // If not JSON, hope token_uri is an image.
        imageUrl = info.token_uri
      }
    }

    return imageUrl
  },
  // This query should really never change...
  // Cache for 2 weeks.
  ttl: 2 * 7 * 24 * 60 * 60,
}
