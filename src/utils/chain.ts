import { Chain } from '@chain-registry/types'
import { chains } from 'chain-registry'

/**
 * Get chain for chain ID.
 */
export const getChainForChainId = (chainId: string): Chain | undefined =>
  chains.find(({ chain_id }) => chain_id === chainId)
