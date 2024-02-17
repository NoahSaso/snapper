import { Asset } from '@skip-router/core'

/**
 * Serialize Skip asset origin.
 */
export const serializeSkipAssetOrigin = (asset: Asset) =>
  `${asset.originChainID}:${asset.originDenom}`
