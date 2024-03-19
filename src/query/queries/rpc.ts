import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { fromUtf8, toUtf8 } from '@cosmjs/encoding'
import { StargateClient } from '@cosmjs/stargate'
import { cosmos } from '@dao-dao/types/protobuf'
import retry from 'async-await-retry'

import { Query, QueryState, QueryType } from '@/types'
import { getChainForChainId } from '@/utils'

type RpcClient = Awaited<
  ReturnType<typeof cosmos.ClientFactory.createRPCQueryClient>
>['cosmos']

const getStargateClient = (chainId: string) =>
  retry(
    () =>
      StargateClient.connect(
        // Validated chain existence.
        `https://rpc.cosmos.directory/${getChainForChainId(chainId)!.chain_name}`
      ),
    undefined,
    {
      retriesMax: 3,
      interval: 100,
      exponential: true,
    }
  )

const getCosmWasmClient = (chainId: string) =>
  retry(
    () =>
      CosmWasmClient.connect(
        // Validated chain existence.
        `https://rpc.cosmos.directory/${getChainForChainId(chainId)!.chain_name}`
      ),
    undefined,
    {
      retriesMax: 3,
      interval: 100,
      exponential: true,
    }
  )

const getRpcClient = (chainId: string): Promise<RpcClient> =>
  retry(
    async () =>
      (
        await cosmos.ClientFactory.createRPCQueryClient({
          // Validated chain existence.
          rpcEndpoint: `https://rpc.cosmos.directory/${getChainForChainId(chainId)!.chain_name}`,
        })
      ).cosmos,
    undefined,
    {
      retriesMax: 3,
      interval: 100,
      exponential: true,
    }
  )

const validateChainId = ({ chainId }: { chainId: string }) => {
  if (!getChainForChainId(chainId)) {
    return new Error('Invalid chain ID')
  }
  return true
}

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
  revalidate: false,
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
  revalidate: false,
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
  revalidate: false,
})

export const cosmosBalancesQuery = makeStargateQuery(
  'cosmos-balances',
  ['address'],
  (client, { address }) => client.getAllBalances(address)
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
  revalidate: true,
}

export const cosmosContractStateKeyQuery = makeCosmWasmQuery(
  'cosmos-contract-state-key',
  ['address', 'key'],
  async (client, { address, key }) => {
    const data = await client.queryContractRaw(address, toUtf8(key))
    return data ? fromUtf8(data) : null
  }
)

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
