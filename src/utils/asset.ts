import { Asset } from '@skip-router/core'
import stringify from 'json-stringify-deterministic'

/**
 * Serialize Skip asset origin.
 */
export const serializeSkipAssetOrigin = (asset: Asset) =>
  stringify({
    chainId: asset.originChainID,
    denom: asset.originDenom,
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
