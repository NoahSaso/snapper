import stringify from 'json-stringify-deterministic'

import { SkipAsset } from '@/query/queries/skip'

/**
 * Serialize Skip asset origin.
 */
export const serializeSkipAssetOrigin = (asset: SkipAsset) =>
  stringify({
    chainId: asset.origin_chain_id,
    denom: asset.origin_denom,
  })

/**
 * Deserialize Skip asset origin.
 */
export const deserializeSkipAssetOrigin = (
  serialized: string
): {
  chainId: string
  denom: string
} => JSON.parse(serialized)
