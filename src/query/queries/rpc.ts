import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { fromUtf8, toUtf8 } from '@cosmjs/encoding'
import { StargateClient } from '@cosmjs/stargate'
import { cosmos } from '@dao-dao/types/protobuf'
import { getAllRpcResponse, getRpcForChainId, retry } from '@dao-dao/utils'

import { Query, QueryState, QueryType } from '@/types'
import { validateChainId } from '@/utils'

import { NftInfoResponse, OwnerOfResponse } from './types'

type RpcClient = Awaited<
  ReturnType<typeof cosmos.ClientFactory.createRPCQueryClient>
>['cosmos']

const getStargateClient = (chainId: string) =>
  retry(5, (attempt) =>
    StargateClient.connect(getRpcForChainId(chainId, attempt))
  )

const getCosmWasmClient = (chainId: string) =>
  retry(5, (attempt) =>
    CosmWasmClient.connect(getRpcForChainId(chainId, attempt))
  )

const getRpcClient = (chainId: string): Promise<RpcClient> =>
  retry(
    5,
    async (attempt) =>
      (
        await cosmos.ClientFactory.createRPCQueryClient({
          rpcEndpoint: getRpcForChainId(chainId, attempt),
        })
      ).cosmos
  )

const makeStargateQuery = <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>(
  name: string,
  parameters: string[],
  execute: (client: StargateClient, parameters: Parameters) => Promise<Body>
): Query<Body, Parameters & { chainId: string }> => ({
  type: QueryType.Custom,
  name,
  parameters: ['chainId', ...parameters],
  validate: validateChainId,
  execute: async (parameters) =>
    execute(await getStargateClient(parameters.chainId), parameters),
  ttl: 5,
})

const makeCosmWasmQuery = <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>(
  name: string,
  parameters: string[],
  execute: (client: CosmWasmClient, parameters: Parameters) => Promise<Body>
): Query<Body, Parameters & { chainId: string }> => ({
  type: QueryType.Custom,
  name,
  parameters: ['chainId', ...parameters],
  validate: validateChainId,
  execute: async (parameters) =>
    execute(await getCosmWasmClient(parameters.chainId), parameters),
  ttl: 5,
})

const makeRpcQuery = <
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
>(
  name: string,
  parameters: string[],
  execute: (
    client: RpcClient,
    parameters: Parameters,
    fetchQuery: <
      InnerBody = unknown,
      InnerParameters extends Record<string, string> = Record<string, string>,
    >(
      query: Query<InnerBody, InnerParameters>,
      params: InnerParameters
    ) => Promise<QueryState<InnerBody>>
  ) => Promise<Body>
): Query<Body, Parameters & { chainId: string }> => ({
  type: QueryType.Custom,
  name,
  parameters: ['chainId', ...parameters],
  validate: validateChainId,
  execute: async (parameters, fetchQuery) =>
    execute(await getRpcClient(parameters.chainId), parameters, fetchQuery),
  ttl: 5,
})

export const cosmosBalancesQuery = makeStargateQuery(
  'cosmos-balances',
  ['address'],
  (client, { address }) => client.getAllBalances(address)
)

export const cosmosStakedBalanceQuery = makeStargateQuery(
  'cosmos-staked-balance',
  ['address'],
  (client, { address }) => client.getBalanceStaked(address)
)

export const cosmosCommunityPoolBalancesQuery = makeRpcQuery(
  'cosmos-community-pool-balances',
  [],
  async (client) => (await client.distribution.v1beta1.communityPool({})).pool
)

export const cosmosUnstakingBalanceQuery = makeRpcQuery(
  'cosmos-unstaking-balance',
  ['address'],
  (client, { address }) =>
    getAllRpcResponse(
      client.staking.v1beta1.delegatorUnbondingDelegations,
      {
        delegatorAddr: address,
        pagination: undefined,
      },
      'unbondingResponses'
    )
)

export const cosmosClaimableRewardsQuery = makeRpcQuery(
  'cosmos-claimable-rewards',
  ['address'],
  async (client, { address }) =>
    (
      await client.distribution.v1beta1.delegationTotalRewards({
        delegatorAddress: address,
      })
    ).total
)

export const cosmosAccountTypeQuery = makeRpcQuery(
  'cosmos-account-type',
  ['address'],
  async (client, { address }) => {
    const { account } = await client.auth.v1beta1.account({
      address,
    })
    return account?.typeUrl
  }
)

export const cosmosIsIcaQuery: Query<
  boolean,
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Custom,
  name: 'cosmos-is-ica',
  parameters: ['chainId', 'address'],
  execute: async ({ chainId, address }, query) =>
    (
      await query(cosmosAccountTypeQuery, {
        chainId,
        address,
      })
    ).body === '/ibc.applications.interchain_accounts.v1.InterchainAccount',
  // Update once per month. Really this should never change...
  ttl: 30 * 24 * 60 * 60,
}

export const cosmosContractStateKeyQuery = makeCosmWasmQuery(
  'cosmos-contract-state-key',
  ['address', 'key'],
  async (client, { address, key }) => {
    const data = await client.queryContractRaw(address, toUtf8(key))
    return data ? fromUtf8(data) : null
  }
)

export const cosmosNftInfoQuery = makeCosmWasmQuery<NftInfoResponse>(
  'cosmos-nft-info',
  ['collectionAddress', 'tokenId'],
  (client, { collectionAddress, tokenId }) =>
    client.queryContractSmart(collectionAddress, {
      nft_info: {
        token_id: tokenId,
      },
    })
)

export const cosmosNftOwnerQuery = makeCosmWasmQuery<string>(
  'cosmos-nft-owner',
  ['collectionAddress', 'tokenId'],
  async (client, { collectionAddress, tokenId }) =>
    (
      (await client.queryContractSmart(collectionAddress, {
        owner_of: {
          token_id: tokenId,
        },
      })) as OwnerOfResponse
    ).owner
)

/**
 * Get all NFTs staked by an address in a dao-voting-cw721-staked contract.
 */
export const cosmosStakedNftsByAddressQuery = makeCosmWasmQuery<string[]>(
  'cosmos-staked-nfts-by-address',
  ['daoVotingCw721StakedAddress', 'address'],
  async (client, { daoVotingCw721StakedAddress, address }) => {
    const tokens: string[] = []

    const limit = 30
    while (true) {
      const response: string[] = await client.queryContractSmart(
        daoVotingCw721StakedAddress,
        {
          staked_nfts: {
            address,
            start_after: tokens[tokens.length - 1],
            limit,
          },
        }
      )

      if (!response?.length) {
        break
      }

      tokens.push(...response)

      // If we have less than the limit of items, we've exhausted them.
      if (response.length < limit) {
        break
      }
    }

    return tokens
  }
)

// TODO: write generalizable cosmos RPC querier
// export const cosmosRpcQuery: Query<any, { chainId: string; query: string }> = {
//   type: QueryType.Custom,
//   name: 'cosmos-rpc',
//   execute: async ({ chainId }) => {
//     ...
//   },
//   ttl: 5,
// }
