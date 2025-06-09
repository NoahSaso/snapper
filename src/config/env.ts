import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv'

dotenv.config()

/**
 * Server host
 */
export const HOST = process.env.HOST || '0.0.0.0'

/**
 * Server port
 */
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

/**
 * Redis connection URL.
 */
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Allowed origins for CORS, comma-separated. If empty, all origins are allowed.
 * Interpreted as regex.
 */
export const ALLOWED_ORIGINS =
  (process.env.ALLOWED_ORIGINS?.trim() || undefined)?.split(',') || []

/**
 * Admin dashboard password.
 */
export const ADMIN_DASHBOARD_PASSWORD =
  process.env.ADMIN_DASHBOARD_PASSWORD || 'admin'

/**
 * Background revalidation concurrency.
 */
export const CONCURRENCY = parseInt(process.env.CONCURRENCY || '50', 10)

/**
 * CoinGecko API Key.
 */
export const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || ''

/**
 * EigenExplorer API Key.
 */
export const EIGENEXPLORER_API_KEY = process.env.EIGENEXPLORER_API_KEY || ''

/**
 * Moralis API Key.
 */
export const MORALIS_API_KEY = process.env.MORALIS_API_KEY || ''

/**
 * DAO DAO Meilisearch instance for listing DAOs.
 */
export const DAODAO_MEILISEARCH_HOST = process.env.DAODAO_MEILISEARCH_HOST || ''
export const DAODAO_MEILISEARCH_API_KEY =
  process.env.DAODAO_MEILISEARCH_API_KEY || ''

/**
 * Public key file.
 */
export const PUBLIC_KEY_FILE = process.env.PUBLIC_KEY_FILE
  ? path.resolve(process.env.PUBLIC_KEY_FILE)
  : path.join(__dirname, '../../key.pub.pem')

/**
 * Private key file.
 */
export const PRIVATE_KEY_FILE = process.env.PRIVATE_KEY_FILE
  ? path.resolve(process.env.PRIVATE_KEY_FILE)
  : path.join(__dirname, '../../key.priv.pem')

if (!fs.existsSync(PUBLIC_KEY_FILE) || !fs.existsSync(PRIVATE_KEY_FILE)) {
  console.warn(
    `Public or private key file not found at ${PUBLIC_KEY_FILE} or ${PRIVATE_KEY_FILE}. Run "npm run generateKeyPair:default" to generate a key pair.`
  )
}
