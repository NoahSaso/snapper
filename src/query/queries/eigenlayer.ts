import { Query, QueryType } from '@/types'

const getEigenExplorerUrl = (chainId: string) =>
  chainId === 'mainnet'
    ? 'https://api.eigenexplorer.com'
    : chainId === 'holesky'
      ? 'https://api-holesky.eigenexplorer.com'
      : ''

export const eigenExplorerApiQuery: Query<
  any,
  {
    chainId: string
    path: string
  }
> = {
  type: QueryType.Url,
  name: 'eigenexplorer-api',
  parameters: ['chainId', 'path'],
  validate: ({ chainId }) => !!getEigenExplorerUrl(chainId),
  url: ({ chainId, path }) => getEigenExplorerUrl(chainId) + path,
  // Cache for 5 minutes.
  ttl: 5 * 60,
}
