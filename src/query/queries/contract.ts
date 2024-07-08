import { contractQueries, makeReactQueryClient } from '@dao-dao/state'

import { Query, QueryType } from '@/types'
import { validateChainId } from '@/utils'

export const isContractQuery: Query<
  boolean,
  {
    chainId: string
    address: string
    name: string
  }
> = {
  type: QueryType.Custom,
  name: 'is-contract',
  parameters: ['chainId', 'address', 'name'],
  validate: validateChainId,
  execute: async ({ chainId, address, name }) => {
    const queryClient = makeReactQueryClient()
    return await queryClient.fetchQuery(
      contractQueries.isContract(queryClient, {
        chainId,
        address,
        nameOrNames: name,
      })
    )
  },
  // This query should really never change...
  // Cache for 2 weeks.
  ttl: 2 * 7 * 24 * 60 * 60,
}
