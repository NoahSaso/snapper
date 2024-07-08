import { indexerQueries, makeReactQueryClient } from '@dao-dao/state'
import { transformIpfsUrlToHttpsIfNecessary } from '@dao-dao/utils'

import { Query, QueryType } from '@/types'
import { validateChainId } from '@/utils'

import { isContractQuery } from './contract'
import { cosmosNftInfoQuery, cosmosNftOwnerQuery } from './rpc'
import { NftInfoResponse } from './types'

export const nftImageUrlQuery: Query<
  string,
  { chainId: string; collectionAddress: string; tokenId: string }
> = {
  type: QueryType.Custom,
  name: 'nft-image-url',
  parameters: ['chainId', 'collectionAddress', 'tokenId'],
  validate: validateChainId,
  execute: async ({ chainId, collectionAddress, tokenId }, query) => {
    const queryClient = makeReactQueryClient()

    // Attempt to fetch from indexer.
    let info: NftInfoResponse | null = await queryClient
      .fetchQuery(
        indexerQueries.queryContract(queryClient, {
          chainId,
          contractAddress: collectionAddress,
          formula: 'cw721/nftInfo',
          args: {
            tokenId,
          },
          noFallback: true,
        })
      )
      .catch(() => null)

    // Fallback to chain.
    info ||= (
      await query(cosmosNftInfoQuery, {
        chainId,
        collectionAddress,
        tokenId,
      })
    ).body

    if (!info) {
      throw new Error('NFT not found')
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

    if (!imageUrl) {
      throw new Error('NFT image not found')
    }

    return imageUrl
  },
  // This query should really never change...
  // Cache for 2 weeks.
  ttl: 2 * 7 * 24 * 60 * 60,
}

export const nftOwnerQuery: Query<
  string,
  { chainId: string; collectionAddress: string; tokenId: string }
> = {
  type: QueryType.Custom,
  name: 'nft-owner',
  parameters: ['chainId', 'collectionAddress', 'tokenId'],
  validate: validateChainId,
  execute: async ({ chainId, collectionAddress, tokenId }, query) => {
    const queryClient = makeReactQueryClient()

    // Attempt to fetch from indexer.
    let owner: string | null = await queryClient
      .fetchQuery(
        indexerQueries.queryContract(queryClient, {
          chainId,
          contractAddress: collectionAddress,
          formula: 'cw721/ownerOf',
          args: {
            tokenId,
          },
          noFallback: true,
        })
      )
      .then(({ owner }) => owner)
      .catch(() => null)

    // Fallback to chain.
    owner ||= (
      await query(cosmosNftOwnerQuery, {
        chainId,
        collectionAddress,
        tokenId,
      })
    ).body

    if (!owner) {
      throw new Error('Failed to retrieve NFT owner.')
    }

    return owner
  },
  // Cache for 30 minutes.
  ttl: 30 * 60,
}

export const nftImageAndOwner: Query<
  {
    imageUrl: string
    owner: string
    /**
     * If NFT staked in a DAO, `owner` is a dao-voting-cw721-staked address and
     * `staker` is the address that staked the NFT.
     */
    staker?: string
  },
  { chainId: string; collectionAddress: string; tokenId: string }
> = {
  type: QueryType.Custom,
  name: 'nft-image-and-owner',
  parameters: ['chainId', 'collectionAddress', 'tokenId'],
  validate: validateChainId,
  execute: async ({ chainId, collectionAddress, tokenId }, query) => {
    const queryClient = makeReactQueryClient()

    const [{ body: imageUrl }, { owner, staker }] = await Promise.all([
      query(nftImageUrlQuery, {
        chainId,
        collectionAddress,
        tokenId,
      }),
      query(nftOwnerQuery, {
        chainId,
        collectionAddress,
        tokenId,
      }).then(async ({ body: owner }) => {
        // Check if owner is a dao-voting-cw721-staked address.
        const isDaoVotingCw721Staked = await query(isContractQuery, {
          chainId,
          address: owner,
          name: 'crates.io:dao-voting-cw721-staked',
        })
          .then(({ body }) => body)
          .catch(() => false)

        // Get staker from indexer if staked.
        let staker: string | null = null
        if (isDaoVotingCw721Staked) {
          staker = await queryClient
            .fetchQuery(
              indexerQueries.queryContract(queryClient, {
                chainId,
                contractAddress: owner,
                formula: 'daoVotingCw721Staked/staker',
                args: {
                  tokenId,
                },
              })
            )
            .catch(() => null)
        }

        return {
          owner,
          staker,
        }
      }),
    ])

    return {
      imageUrl,
      owner,
      ...(staker && { staker }),
    }
  },
  // Cache for 30 minutes.
  ttl: 30 * 60,
}
