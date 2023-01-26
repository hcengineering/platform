import { FullTextPipelineStage } from '@hcengineering/server-core'

import { Configuration } from '@hcengineering/core'

/**
 * @public
 */
export const translateStateId = 'trn-v2'

/**
 * @public
 */
export interface TranslationStage extends FullTextPipelineStage {}

/**
 * @public
 */
export interface TranslateConfiguration extends Configuration {
  token: string
  endpoint: string
}
