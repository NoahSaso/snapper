import { MORALIS_API_KEY } from '@/config/env'
import { Query, QueryType } from '@/types'

export const moralisTokenPriceQuery: Query<
  number,
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Url,
  name: 'moralis-token-price',
  parameters: ['chainId', 'address'],
  url: ({ chainId, address }) =>
    `https://deep-index.moralis.io/api/v2.2/erc20/${address}/price?chain=${chainId === 'ethereum' ? 'eth' : chainId}`,
  headers: () => ({
    'x-api-key': MORALIS_API_KEY,
  }),
  transform: ({ usdPrice }) => usdPrice,
  // Cache for 5 minutes.
  ttl: 5 * 60,
}

export const moralisTokenMetadataQuery: Query<
  {
    address: string
    name: string
    symbol: string
    decimals: number
    total_supply: string
    logo: string | null
  },
  {
    chainId: string
    address: string
  }
> = {
  type: QueryType.Url,
  name: 'moralis-token-metadata',
  parameters: ['chainId', 'address'],
  url: ({ chainId, address }) =>
    `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainId === 'ethereum' ? 'eth' : chainId}&addresses=${address}`,
  headers: () => ({
    'x-api-key': MORALIS_API_KEY,
  }),
  transform: ([{ address, name, symbol, decimals, total_supply, logo }]) => ({
    address,
    name,
    symbol,
    decimals: Number(decimals),
    total_supply,
    logo,
  }),
  // Cache for 5 minutes.
  ttl: 5 * 60,
}
