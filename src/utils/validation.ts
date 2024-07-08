import { getChainForChainId } from '@dao-dao/utils'

export const validateChainId = ({ chainId }: { chainId: string }) => {
  if (!getChainForChainId(chainId)) {
    return new Error('Invalid chain ID')
  }
  return true
}
