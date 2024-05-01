import { Configuration } from '@hcengineering/core'
import { RateLimiter } from '@hcengineering/server-core'

/**
 * @public
 */
export interface OpenAIConfiguration extends Configuration {
  token: string
  endpoint: string
  tokenLimit: number
  embeddings: boolean
}
/**
 * @public
 *
 */
export const openAIRatelimitter = new RateLimiter(3)
