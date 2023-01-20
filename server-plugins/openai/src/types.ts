import { Configuration } from '@hcengineering/core'
import { RateLimitter } from '@hcengineering/server-core'

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
 */
export const openAIConfigDefaults: {
  [key in keyof Pick<
  OpenAIConfiguration,
  'enabled' | 'endpoint' | 'tokenLimit' | 'embeddings'
  >]: OpenAIConfiguration[key]
} = {
  endpoint: 'https://api.openai.com/v1',
  tokenLimit: 8191,
  embeddings: false,
  enabled: true
}

/**
 * @public
 *
 */
export const openAIRatelimitter = new RateLimitter(() => ({ rate: 3 }))
