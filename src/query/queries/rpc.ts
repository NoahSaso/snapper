import { Coin, StargateClient } from '@cosmjs/stargate'
import { getChainForChainId } from '@dao-dao/utils'

import { Query, QueryType } from '@/types'

export const cosmosBalancesQuery: Query<
  readonly Coin[],
  { chainId: string; address: string }
> = {
  type: QueryType.Custom,
  name: 'cosmos-balances',
  parameters: ['chainId', 'address'],
  validate: ({ chainId }) => {
    if (!getChainForChainId(chainId)) {
      return new Error('Invalid chain ID')
    }
    return true
  },
  execute: async ({ chainId, address }) => {
    const chainName = getChainForChainId(chainId)?.chain_name

    const client = await StargateClient.connect(
      `https://rpc.cosmos.directory/${chainName}`
    )

    return client.getAllBalances(address)
  },
  ttl: 5,
  revalidate: false,
}

// TODO: write generalizable cosmos RPC querier
// export const cosmosRpcQuery: Query<any, { chainId: string; query: string }> = {
//   type: QueryType.Custom,
//   name: 'cosmos-rpc',
//   execute: async ({ chainId }) => {
//     const chainName = getChainForChainId(chainId)?.chain_name

//     const client = await StargateClient.connect(
//       `https://rpc.cosmos.directory/${chainName}`
//     )

//     ...
//   },
//   ttl: 5,
//   revalidate: false,
// }
