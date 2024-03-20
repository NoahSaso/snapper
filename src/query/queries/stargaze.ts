import { ApolloClient, InMemoryCache } from '@apollo/client'
import { stargazeWalletTotalValueUsdQuery } from '@dao-dao/state'
import { ChainId } from '@dao-dao/types'

import { Query, QueryType } from '@/types'

const STARGAZE_API_MAINNET = 'https://graphql.mainnet.stargaze-apis.com/graphql'
const STARGAZE_API_TESTNET = 'https://galaxy-graphql-testnet.fly.dev/graphql'

export const stargazeUsdValueQuery: Query<
  number,
  { chainId: string; address: string }
> = {
  type: QueryType.Custom,
  name: 'stargaze-usd-value',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }) => {
    if (
      chainId !== ChainId.StargazeMainnet &&
      chainId !== ChainId.StargazeTestnet
    ) {
      throw new Error('Expected Stargaze chain')
    }

    const client = new ApolloClient({
      uri:
        chainId === ChainId.StargazeMainnet
          ? STARGAZE_API_MAINNET
          : STARGAZE_API_TESTNET,
      cache: new InMemoryCache(),
    })

    const { error, data } = await client.query({
      query: stargazeWalletTotalValueUsdQuery,
      variables: {
        address,
      },
    })

    if (error) {
      throw error
    }

    if (!data?.wallet?.stats?.totalValueUsd) {
      return 0
    }

    return data.wallet.stats.totalValueUsd
  },
  // Cache for an hour.
  ttl: 60 * 60,
  // No need to auto-revalidate since this query is quick.
  revalidate: false,
}
